
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { procesarMensaje } from "@/lib/chatbot";

export const runtime = "nodejs";

export async function POST(request) {
  // Solo disponible durante el desarrollo
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Ruta no disponible" },
      { status: 404 }
    );
  }

  // Verificar la clave de pruebas
  const clave = process.env.WHATSAPP_TEST_SECRET;
  const recibida = request.headers.get("x-test-secret") || "";

  if (!clave) {
    return NextResponse.json(
      { error: "Falta configurar WHATSAPP_TEST_SECRET" },
      { status: 500 }
    );
  }

  const a = Buffer.from(clave);
  const b = Buffer.from(recibida);

  if (
    a.length !== b.length ||
    !timingSafeEqual(a, b)
  ) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const { texto } = await request.json();

    if (
      typeof texto !== "string" ||
      texto.trim().length === 0 ||
      texto.length > 1000
    ) {
      return NextResponse.json(
        { error: "Debes enviar un texto válido" },
        { status: 400 }
      );
    }

    const respuesta = procesarMensaje(texto);

    return NextResponse.json({
      mensaje_recibido: texto,
      respuesta
    });

  } catch (error) {
    console.error("Error simulando mensaje:", error);

    return NextResponse.json(
      { error: "Solicitud JSON inválida" },
      { status: 400 }
    );
  }
}
