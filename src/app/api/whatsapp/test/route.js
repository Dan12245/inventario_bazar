
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request) {
  // Nunca permitir esta ruta en producción
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Ruta disponible solo en desarrollo" },
      { status: 404 }
    );
  }

  const clave = process.env.WHATSAPP_TEST_SECRET;
  const recibida = request.headers.get("x-test-secret") || "";

  if (!clave) {
    return NextResponse.json(
      { error: "Falta configurar la clave de pruebas" },
      { status: 500 }
    );
  }

  const a = Buffer.from(clave);
  const b = Buffer.from(recibida);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION;
  const destinatario = process.env.WHATSAPP_TEST_RECIPIENT;

  if (!token || !phoneId || !version || !destinatario) {
    return NextResponse.json(
      { error: "Faltan variables de WhatsApp" },
      { status: 500 }
    );
  }

  try {
    const respuesta = await fetch(
      `https://graph.facebook.com/${version}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: destinatario,
          type: "template",
          template: {
            name: "hello_world",
            language: {
              code: "en_US"
            }
          }
        })
      }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      console.error("Meta rechazó el mensaje:", resultado);

      return NextResponse.json(
        {
          error: "Meta rechazó el mensaje",
          detalle: resultado.error?.message
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      mensaje: "Solicitud aceptada por Meta",
      id_mensaje: resultado.messages?.[0]?.id
    });

  } catch (error) {
    console.error("Error enviando WhatsApp:", error);

    return NextResponse.json(
      { error: "No se pudo conectar con Meta" },
      { status: 500 }
    );
  }
}
