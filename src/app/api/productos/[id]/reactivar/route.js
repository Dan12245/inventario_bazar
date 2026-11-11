
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const idProducto = Number(id);

    if (
      !Number.isSafeInteger(idProducto) ||
      idProducto <= 0
    ) {
      return NextResponse.json(
        { error: "ID de producto inválido" },
        { status: 400 }
      );
    }

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
      .from("productos")
      .update({ activo: true })
      .eq("id", idProducto)
      .eq("activo", false)
      .select("id, nombre, activo")
      .maybeSingle();

    if (error) {
      console.error(error);

      return NextResponse.json(
        { error: "No se pudo reactivar el producto" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Producto no encontrado o ya activo" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Producto reactivado correctamente",
      producto: data
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
