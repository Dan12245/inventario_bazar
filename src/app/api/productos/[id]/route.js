import { NextResponse } from "next/server";
import {
  autenticar,
  leerJson,
  respuestaErrorDb,
  responderError
} from "@/lib/authApi";

function leerId(id) {
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
    ? Number(id)
    : null;
}

// Editar un producto
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const idProducto = leerId(id);

    if (!idProducto) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { supabase } = await autenticar(request);

    const producto = await leerJson(request);

    if (!producto) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { nombre, descripcion, imagen, precio } = producto;
    const ajuste = producto.ajuste_cantidad ?? 0;

    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      !Number.isSafeInteger(ajuste) ||
      typeof precio !== "number" ||
      !Number.isFinite(precio) ||
      precio < 0 ||
      precio > 99999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(String(precio)) ||
      (descripcion != null && typeof descripcion !== "string") ||
      (imagen != null && typeof imagen !== "string")
    ) {
      return NextResponse.json(
        { error: "Datos del producto inválidos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("editar_producto", {
      p_id: idProducto,
      p_nombre: nombre.trim(),
      p_descripcion: descripcion ?? "",
      p_precio: precio,
      p_ajuste_cantidad: ajuste,
      p_imagen: imagen || null
    });

    if (error) {
      console.error("Error actualizando producto:", error);
      return respuestaErrorDb(error, "No se pudo actualizar el producto");
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return responderError(error, "Error en PATCH /api/productos/[id]:");
  }
}

// Retirar un producto (borrado lógico)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const idProducto = leerId(id);

    if (!idProducto) {
      return NextResponse.json(
        { error: "ID de producto inválido" },
        { status: 400 }
      );
    }

    const { supabase } = await autenticar(request);

    const { data, error } = await supabase.rpc("retirar_producto", {
      p_id_producto: idProducto
    });

    if (error) {
      console.error("Error retirando producto:", error);
      return respuestaErrorDb(error, "No se pudo retirar el producto");
    }

    return NextResponse.json({
      mensaje: "Producto retirado correctamente",
      id_producto: data
    });
  } catch (error) {
    return responderError(error, "Error en DELETE /api/productos/[id]:");
  }
}
