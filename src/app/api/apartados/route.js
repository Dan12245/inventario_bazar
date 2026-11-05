
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    // 1. Obtener el token de la solicitud
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // 2. Crear cliente de Supabase para esta solicitud
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // 3. Verificar que el usuario exista
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sesión inválida" },
        { status: 401 }
      );
    }

    // 4. Recibir los datos
    const datos = await request.json();

    const {
      id_producto,
      cliente,
      telefono,
      cantidad
    } = datos ?? {};

    // 5. Validaciones básicas
    if (
      !Number.isSafeInteger(id_producto) ||
      id_producto <= 0 ||
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      typeof cliente !== "string" ||
      !cliente.trim() ||
      typeof telefono !== "string" ||
      !telefono.trim()
    ) {
      return NextResponse.json(
        { error: "Datos de apartado inválidos" },
        { status: 400 }
      );
    }

    // 6. Ejecutar la función PostgreSQL
    const { data, error } = await supabase.rpc(
      "registrar_apartado",
      {
        p_id_producto: id_producto,
        p_cliente: cliente.trim(),
        p_telefono: telefono.trim(),
        p_cantidad: cantidad
      }
    );

    if (error) {
      console.error("Error registrando apartado:", error);

      if (error.code === "P0001") {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "No se pudo registrar el apartado" },
        { status: 500 }
      );
    }

    // 7. Responder con el ID creado
    return NextResponse.json(
      {
        mensaje: "Apartado registrado correctamente",
        id_apartado: data
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error inesperado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
// ruta get
export async function GET(request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sesión inválida" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("apartados")
      .select(`
        id,
        persona_que_aparto,
        numero_persona,
        cantidad_apartada,
        estado,
        created_at,
        id_producto,
        productos (
          nombre
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error consultando apartados:", error);

      return NextResponse.json(
        { error: "No se pudieron obtener los apartados" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("Error inesperado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}