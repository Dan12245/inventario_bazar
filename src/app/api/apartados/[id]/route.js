
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;

    const idApartado = Number(id);

    if (!Number.isSafeInteger(idApartado) || idApartado <= 0) {
      return NextResponse.json(
        { error: "ID de apartado inválido" },
        { status: 400 }
      );
    }

    // Obtener token
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // Crear cliente con la sesión del usuario
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

    // Verificar sesión
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

    // Leer estado solicitado
    const { estado } = await request.json();

    let funcion;

    if (estado === "Cancelado") {
      funcion = "cancelar_apartado";
    } else if (estado === "Entregado") {
      funcion = "entregar_apartado";
    } else {
      return NextResponse.json(
        { error: "Estado no permitido" },
        { status: 400 }
      );
    }

    // PostgreSQL se encarga de la transición
    const { data, error } = await supabase.rpc(funcion, {
      p_id_apartado: idApartado
    });

    if (error) {
      console.error("Error actualizando apartado:", error);

      if (error.code === "P0001") {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "No se pudo actualizar el apartado" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mensaje: `Apartado marcado como ${estado}`,
      id_apartado: data,
      estado
    });

  } catch (error) {
    console.error("Error inesperado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
