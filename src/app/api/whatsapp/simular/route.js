
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { procesarMensaje } from "@/lib/chatbot";

export const runtime = "nodejs";

export async function POST(request) {
  // Endpoint disponible solamente en desarrollo
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Ruta no disponible" },
      { status: 404 }
    );
  }

  // Verificar clave de pruebas
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
    // Recibir datos desde Postman
    const { telefono, texto } = await request.json();

    // Validar teléfono y mensaje
    if (
      typeof telefono !== "string" ||
      !/^[0-9]{8,15}$/.test(telefono) ||
      typeof texto !== "string" ||
      !texto.trim() ||
      texto.length > 1000
    ) {
      return NextResponse.json(
        { error: "Teléfono o mensaje inválido" },
        { status: 400 }
      );
    }

    // Ejecutar la lógica del chatbot
    const respuesta = await procesarMensaje(telefono, texto);

    return NextResponse.json({
      telefono,
      mensaje_recibido: texto,
      respuesta
    });

  } catch (error) {
    console.error("Error del simulador:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el mensaje" },
      { status: 500 }
    );
  }
}
