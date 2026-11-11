
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";


async function enviarMensaje(numero, texto) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION;

  if (!token || !phoneNumberId || !version) {
    throw new Error("Faltan variables de WhatsApp.");
  }

  const mensaje = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: numero,
    type: "text",
    text: {
      body: texto
    }
  };

  const respuesta = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mensaje)
    }
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    console.error("Error de Meta:", resultado);
    throw new Error("No se pudo enviar el WhatsApp.");
  }

  console.log("Respuesta enviada:", resultado.messages?.[0]?.id);
}


// Meta verifica el webhook mediante GET
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

  return new Response("Verificación fallida", {
    status: 403
  });
}

// Meta envía mensajes a nuestro servidor mediante POST

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
      createHmac("sha256", appSecret)
        .update(cuerpo)
        .digest("hex");

    const firmaRecibida = Buffer.from(firma);
    const firmaCalculada = Buffer.from(firmaEsperada);

    if (
      firmaRecibida.length !== firmaCalculada.length ||
      !timingSafeEqual(firmaRecibida, firmaCalculada)
    ) {
      return new Response("Firma inválida", { status: 401 });
    }

    const evento = JSON.parse(cuerpo);

    for (const entrada of evento.entry ?? []) {
      for (const cambio of entrada.changes ?? []) {
        for (const mensaje of cambio.value?.messages ?? []) {

          // Por ahora solamente contestamos texto
          if (mensaje.type !== "text") continue;

          const numero = mensaje.from;
          const texto = mensaje.text?.body?.trim().toLowerCase();

          console.log("Mensaje recibido:", {
            numero,
            texto
          });

          // Nuestro primer bot: responde solamente a "hola"
          if (texto === "hola") {
            await enviarMensaje(
              numero,
              "¡Hola! 👋 Bienvenido al bazar. ¿En qué podemos ayudarte?"
            );
          }
        }
      }
    }

    return new Response("EVENT_RECEIVED", {
      status: 200
    });

  } catch (error) {
    console.error("Error en webhook:", error);

    return new Response("Error interno", {
      status: 500
    });
  }
}

