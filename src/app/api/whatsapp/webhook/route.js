import { createHmac, timingSafeEqual } from "node:crypto";
import { crearSupabaseAdmin } from "@/lib/supabaseAdmin";
import { procesarMensaje } from "@/lib/chatbot";

export const runtime = "nodejs";
export const maxDuration = 30;

// Tipos de mensaje a los que respondemos "solo entiendo texto"
// (reacciones, mensajes de sistema, etc. se ignoran en silencio)
const TIPOS_NO_TEXTO = new Set([
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts"
]);

// ---------------------------------------------------------------------
// Convertir la respuesta del chatbot en un mensaje de Meta.
// Es una función PURA: no consulta nada, así que no puede fallar por la red.
// ---------------------------------------------------------------------
function construirMensaje(respuesta) {
  // Menú principal
  if (respuesta.tipo === "menu") {
    const aviso = respuesta.aviso ? `${respuesta.aviso}\n\n` : "";

    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: `${aviso}¡Hola! 👋 Bienvenido al bazar.\n\n¿Qué deseas hacer?`
        },
        action: {
          buttons: [
            { type: "reply", reply: { id: "menu_buscar", title: "Buscar y apartar" } },
            { type: "reply", reply: { id: "menu_apartados", title: "Mis apartados" } }
          ]
        }
      }
    };
  }

  // Botones genéricos (máx. 3, título de hasta 20 caracteres)
  if (respuesta.tipo === "botones" && respuesta.botones?.length) {
    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: respuesta.texto.slice(0, 1024) },
        action: {
          buttons: respuesta.botones.slice(0, 3).map((boton) => ({
            type: "reply",
            reply: {
              id: boton.id,
              title: boton.titulo.slice(0, 20)
            }
          }))
        }
      }
    };
  }

  // Lista de productos
  if (respuesta.tipo === "lista_productos" && respuesta.productos?.length) {
    const filas = respuesta.productos.slice(0, 10).map((producto) => ({
      id: `producto_${producto.id}`,
      title: String(producto.nombre).slice(0, 24),
      description: (
        producto.precio == null
          ? `${producto.cantidad} disponibles · Sin precio`
          : `${producto.cantidad} disponibles · $${Number(producto.precio).toFixed(2)} MXN`
      ).slice(0, 72)
    }));

    return {
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: "Encontré estos productos. 👇\n\nSelecciona el que te interesa."
        },
        action: {
          button: "Ver productos",
          sections: [
            { title: "Disponibles", rows: filas },
            {
              title: "Otras opciones",
              rows: [{ id: "volver_menu", title: "Regresar al menú" }]
            }
          ]
        }
      }
    };
  }

  // Texto normal
  return {
    type: "text",
    text: { body: respuesta.texto.slice(0, 4096) }
  };
}

function construirMensajeSeguro(respuesta) {
  try {
    return construirMensaje(respuesta);
  } catch (error) {
    console.error("Error construyendo mensaje interactivo:", error);
    return { type: "text", text: { body: respuesta.texto.slice(0, 4096) } };
  }
}

// ---------------------------------------------------------------------
// Enviar (o simular) un mensaje de WhatsApp
// Los errores llevan .permanente = true si reintentar no sirve de nada
// ---------------------------------------------------------------------
async function enviarMensaje(numero, contenido) {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.WHATSAPP_DRY_RUN === "true"
  ) {
    console.log("🧪 WhatsApp simulado:");
    console.log(JSON.stringify(contenido, null, 2));
    return;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION;

  if (!token || !phoneNumberId || !version) {
    throw new Error("Faltan variables de WhatsApp.");
  }

  // Normalización del número mexicano (521 + 10 dígitos -> 52 + 10 dígitos)
  const destinatario = /^521\d{10}$/.test(numero)
    ? `52${numero.slice(3)}`
    : numero;

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
        ...contenido
      }),
      signal: AbortSignal.timeout(10000)
    }
  );

  const resultado = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    console.error("Error de Meta:", respuesta.status, resultado);

    const error = new Error(
      `Meta rechazó el mensaje (${respuesta.status}): ${resultado.error?.message ?? "sin detalle"}`
    );

    // 4xx = problema con ese mensaje o número (ventana de 24h, número inválido...)
    // Excepto 401 (token vencido), 408 y 429: esos sí conviene reintentarlos
    error.permanente =
      respuesta.status >= 400 &&
      respuesta.status < 500 &&
      ![401, 408, 429].includes(respuesta.status);

    throw error;
  }

  console.log("Respuesta aceptada por Meta:", resultado.messages?.[0]?.id);
}

// ---------------------------------------------------------------------
// Acceso a mensajes_whatsapp
// ---------------------------------------------------------------------
async function guardarRespuesta(supabase, mensajeId, respuesta, contenido) {
  const { data, error } = await supabase
    .from("mensajes_whatsapp")
    .update({
      respuesta,
      mensaje_salida: contenido,
      estado: "pendiente_envio",
      updated_at: new Date().toISOString()
    })
    .eq("mensaje_id", mensajeId)
    .eq("estado", "procesando")
    .select("mensaje_id")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("No se pudo guardar la respuesta.");
  }
}

async function actualizarEstado(supabase, mensajeId, estado, detalle = null) {
  const { error } = await supabase
    .from("mensajes_whatsapp")
    .update({
      estado,
      // Se guarda el motivo del fallo; al completarse se limpia
      error: detalle ? String(detalle).slice(0, 500) : null,
      updated_at: new Date().toISOString()
    })
    .eq("mensaje_id", mensajeId);

  if (error) throw error;
}

// ---------------------------------------------------------------------
// Leer lo que mandó el cliente
// ---------------------------------------------------------------------
function leerEntrada(mensaje) {
  if (mensaje.type === "text") {
    const valor = mensaje.text?.body?.trim();
    return valor ? { tipo: "texto", valor: valor.slice(0, 1000) } : null;
  }

  if (mensaje.type === "interactive") {
    const id =
      mensaje.interactive?.button_reply?.id ??
      mensaje.interactive?.list_reply?.id;

    return id ? { tipo: "boton", valor: String(id) } : null;
  }

  if (TIPOS_NO_TEXTO.has(mensaje.type)) {
    return { tipo: "otro", valor: "" };
  }

  return null;
}

// ---------------------------------------------------------------------
// Procesar UN mensaje. Si lanza, el que llama decide si Meta debe reintentar.
// ---------------------------------------------------------------------
async function procesarUno(supabase, mensaje) {
  const mensajeId = mensaje.id;
  const numero = mensaje.from;
  const entrada = leerEntrada(mensaje);

  if (!mensajeId || !numero || !entrada) return;

  // Reclamar el mensaje en PostgreSQL (evita duplicados)
  const { data: registros, error: errorRegistro } = await supabase.rpc(
    "reclamar_mensaje_whatsapp",
    { p_mensaje_id: mensajeId, p_telefono: numero }
  );

  if (errorRegistro) throw errorRegistro;

  const registro = registros?.[0];

  if (!registro?.aceptado) {
    console.log("Mensaje duplicado o en procesamiento:", mensajeId);
    return;
  }

  try {
    let contenido;

    if (registro.respuesta_guardada !== null && registro.respuesta_guardada !== undefined) {
      // Reintento: reutilizamos exactamente lo que ya se había decidido responder
      console.log("Reutilizando respuesta guardada:", mensajeId);

      const { data: guardado, error } = await supabase
        .from("mensajes_whatsapp")
        .select("mensaje_salida")
        .eq("mensaje_id", mensajeId)
        .single();

      if (error) throw error;

      contenido =
        guardado?.mensaje_salida ??
        construirMensajeSeguro({
          tipo: "texto",
          texto: registro.respuesta_guardada
        });
    } else {
      console.log("Procesando mensaje nuevo:", { mensajeId, numero, tipo: entrada.tipo });

      const respuesta = await procesarMensaje(numero, entrada);

      if (!respuesta || typeof respuesta.texto !== "string") {
        throw new Error("El chatbot no devolvió una respuesta válida.");
      }

      contenido = construirMensajeSeguro(respuesta);

      // Guardar ANTES de enviar
      await guardarRespuesta(supabase, mensajeId, respuesta.texto, contenido);
    }

    await enviarMensaje(numero, contenido);
    await actualizarEstado(supabase, mensajeId, "completado");

    console.log("Mensaje completado:", mensajeId);
  } catch (error) {
    try {
      await actualizarEstado(
        supabase,
        mensajeId,
        "fallido",
        error?.message ?? String(error)
      );
    } catch (errorEstado) {
      console.error("Error actualizando estado:", errorEstado);
    }

    throw error;
  }
}

// ---------------------------------------------------------------------
// Verificación inicial del webhook por Meta
// ---------------------------------------------------------------------
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
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verificación fallida", { status: 403 });
}

// ---------------------------------------------------------------------
// Recibir eventos de WhatsApp
// ---------------------------------------------------------------------
export async function POST(request) {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const firma = request.headers.get("x-hub-signature-256");
    const cuerpo = await request.text();

    if (!appSecret || !firma) {
      return new Response("No autorizado", { status: 401 });
    }

    const firmaEsperada =
      "sha256=" +
      createHmac("sha256", appSecret).update(cuerpo).digest("hex");

    const firmaRecibida = Buffer.from(firma);
    const firmaCalculada = Buffer.from(firmaEsperada);

    if (
      firmaRecibida.length !== firmaCalculada.length ||
      !timingSafeEqual(firmaRecibida, firmaCalculada)
    ) {
      return new Response("Firma inválida", { status: 401 });
    }

    let evento;

    try {
      evento = JSON.parse(cuerpo);
    } catch {
      return new Response("JSON inválido", { status: 400 });
    }

    const supabase = crearSupabaseAdmin();
    let hayErrorTemporal = false;

    for (const entrada of evento.entry ?? []) {
      for (const cambio of entrada.changes ?? []) {
        for (const mensaje of cambio.value?.messages ?? []) {
          // Un mensaje con problemas no bloquea a los demás del lote
          try {
            await procesarUno(supabase, mensaje);
          } catch (error) {
            console.error("Error procesando mensaje:", mensaje?.id, error);

            if (!error?.permanente) {
              hayErrorTemporal = true;
            }
          }
        }
      }
    }

    // 500 solo si vale la pena que Meta reintente (los ya completados se ignoran)
    // Los errores permanentes responden 200 para que Meta no insista por días
    if (hayErrorTemporal) {
      return new Response("Error temporal", { status: 500 });
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Error en webhook:", error);
    return new Response("Error interno", { status: 500 });
  }
}