import { NextResponse } from "next/server";
import { autenticar, responderError } from "@/lib/authApi";

// Reactivar un producto retirado
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const idProducto = /^[1-9]\d*$/.test(id) ? Number(id) : NaN;

    if (!Number.isSafeInteger(idProducto)) {
      return NextResponse.json(
        { error: "ID de producto inválido" },
        { status: 400 }
      );
    }

    const { supabase } = await autenticar(request);

    const { data, error } = await supabase
      .from("productos")
      .update({ activo: true })
      .eq("id", idProducto)
      .eq("activo", false)
      .select("id, nombre, activo")
      .maybeSingle();

    if (error) {
      console.error("Error reactivando producto:", error);

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
    return responderError(error, "Error en PATCH /api/productos/[id]/reactivar:");
  }
}