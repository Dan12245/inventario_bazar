import { NextResponse } from "next/server";
import {
  autenticar,
  leerJson,
  respuestaErrorDb,
  responderError
} from "@/lib/authApi";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ESTADOS = ["Pendiente", "Entregado", "Cancelado"];

// Registrar un apartado desde el panel
export async function POST(request) {
  try {
    const { supabase } = await autenticar(request);

    const datos = await leerJson(request);

    if (!datos) {
      return NextResponse.json(
        { error: "Datos de apartado inválidos" },
        { status: 400 }
      );
    }

    const { id_producto, cliente, telefono, cantidad, solicitud_id } = datos;

    if (
      !Number.isSafeInteger(id_producto) ||
      id_producto <= 0 ||
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      typeof cliente !== "string" ||
      !cliente.trim() ||
      cliente.trim().length > 100 ||
      typeof telefono !== "string" ||
      !/^\d{10}$/.test(telefono.trim()) ||
      typeof solicitud_id !== "string" ||
      !UUID.test(solicitud_id)
    ) {
      return NextResponse.json(
        { error: "Datos de apartado inválidos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("registrar_apartado", {
      p_id_producto: id_producto,
      p_cliente: cliente.trim(),
      p_telefono: telefono.trim(),
      p_cantidad: cantidad,
      p_solicitud_id: solicitud_id,
      p_origen: "panel"
    });

    if (error) {
      console.error("Error registrando apartado:", error);
      return respuestaErrorDb(error, "No se pudo registrar el apartado");
    }

    return NextResponse.json(
      {
        mensaje: "Apartado registrado correctamente",
        id_apartado: data
      },
      { status: 201 }
    );
  } catch (error) {
    return responderError(error, "Error en POST /api/apartados:");
  }
}

// Listar apartados (opcional: ?estado=Pendiente)
export async function GET(request) {
  try {
    const { supabase } = await autenticar(request);

    const estado = new URL(request.url).searchParams.get("estado");

    let consulta = supabase
      .from("apartados")
      .select(`
        id,
        persona_que_aparto,
        numero_persona,
        cantidad_apartada,
        precio_unitario,
        precio_total,
        estado,
        created_at,
        id_producto,
        productos (
          nombre
        )
      `)
      .order("created_at", { ascending: false })
      .limit(500);

    if (ESTADOS.includes(estado)) {
      consulta = consulta.eq("estado", estado);
    }

    const { data, error } = await consulta;

    if (error) {
      console.error("Error consultando apartados:", error);

      return NextResponse.json(
        { error: "No se pudieron obtener los apartados" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return responderError(error, "Error en GET /api/apartados:");
  }
}
