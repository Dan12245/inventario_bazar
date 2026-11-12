
import { createHmac, timingSafeEqual } from "node:crypto";
import { crearSupabaseAdmin } from "@/lib/supabaseAdmin";
import { procesarMensaje } from "@/lib/chatbot";

export const runtime = "nodejs";

// Enviar la respuesta a WhatsApp
async function enviarMensaje(numero, texto) {
   // Normalizar números mexicanos para el envío
const destinatario = /^521\d{10}$/.test(numero)
  ? `52${numero.slice(3)}`
  : numero;
  if (
  process.env.NODE_ENV === "development" &&
  process.env.WHATSAPP_DRY_RUN === "true"
) 
{
 
  console.log("🧪 WhatsApp simulado:", {
    numero,
    respuesta: texto
  });

  return;
}

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION;

  if (!token || !phoneNumberId || !version) {
    throw new Error("Faltan variables de WhatsApp.");
  }

  const respuesta = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: destinatario,
        type: "text",
        text: {
          body: texto
        }
      })
    }
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    console.error("Error de Meta:", resultado);
    throw new Error("No se pudo enviar el WhatsApp.");
  }

  console.log(
    "Respuesta enviada:",
    resultado.messages?.[0]?.id
  );
}

// Actualizar el estado de un mensaje recibido
async function actualizarMensaje(supabase, mensajeId, estado) {
  const { error } = await supabase
    .from("mensajes_whatsapp")
    .update({
      estado,
      updated_at: new Date().toISOString()
    })
    .eq("mensaje_id", mensajeId);

  if (error) throw error;
}

// Verificación inicial del webhook
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    console.log("Webhook de WhatsApp verificado");

    return new Response(challenge, {
      status: 200
    });
  }

  return new Response("Verificación fallida", {
    status: 403
  });
}

// Recibir mensajes de Meta
export async function POST(request) {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const firma = request.headers.get("x-hub-signature-256");
    const cuerpo = await request.text();

    if (!appSecret || !firma) {
      return new Response("No autorizado", {
        status: 401
      });
    }

    // Verificar que el mensaje venga de Meta
    const firmaEsperada =
      "sha256=" +
      createHmac("sha256", appSecret)
        .update(cuerpo)
        .digest("hex");

    const firmaRecibida = Buffer.from(firma);
    const firmaCalculada = Buffer.from(firmaEsperada);

    if (
      firmaRecibida.length !== firmaCalculada.length ||
      !timingSafeEqual(firmaRecibida, firmaCalculada)
    ) {
      return new Response("Firma inválida", {
        status: 401
      });
    }

    const evento = JSON.parse(cuerpo);
    const supabase = crearSupabaseAdmin();

    for (const entrada of evento.entry ?? []) {
      for (const cambio of entrada.changes ?? []) {
        for (const mensaje of cambio.value?.messages ?? []) {

          // De momento solo atendemos mensajes de texto
          if (mensaje.type !== "text") continue;

          const mensajeId = mensaje.id;
          const numero = mensaje.from;
          const texto = mensaje.text?.body?.trim();

          if (!mensajeId || !numero || !texto) {
            continue;
          }

          // Reclamar el mensaje de forma atómica
          const { data: procesar, error: errorRegistro } =
            await supabase.rpc("iniciar_mensaje_whatsapp", {
              p_mensaje_id: mensajeId,
              p_telefono: numero
            });

          if (errorRegistro) {
            throw errorRegistro;
          }

          if (!procesar) {
            console.log(
              "Mensaje duplicado o en procesamiento:",
              mensajeId
            );

            continue;
          }

          try {
            console.log("Procesando mensaje:", {
              mensajeId,
              numero,
              texto
            });

            // ¡Aquí utilizamos nuestro chatbot real!
            const respuesta = await procesarMensaje(
              numero,
              texto
            );

            await enviarMensaje(numero, respuesta);

            // El procesamiento terminó correctamente
            await actualizarMensaje(
              supabase,
              mensajeId,
              "completado"
            );

          } catch (error) {
            console.error(
              "Error procesando mensaje:",
              mensajeId,
              error
            );

            // Permitir reintentar el mismo mensaje
            try {
              await actualizarMensaje(
                supabase,
                mensajeId,
                "fallido"
              );
            } catch (errorEstado) {
              console.error(
                "No se pudo marcar el mensaje como fallido:",
                errorEstado
              );
            }

            throw error;
          }
        }
      }
    }

    return new Response("EVENT_RECEIVED", {
      status: 200
    });

  } catch (error) {
    console.error("Error en webhook:", error);

    // Meta puede reintentar la entrega
    return new Response("Error interno", {
      status: 500
    });
  }
}
