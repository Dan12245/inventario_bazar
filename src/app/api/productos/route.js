import { NextResponse } from "next/server";
import { autenticar, leerJson, responderError } from "@/lib/authApi";

// Listar productos activos
export async function GET(request) {
  try {
    const { supabase } = await autenticar(request);

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("activo", true)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error al obtener productos:", error);

      return NextResponse.json(
        { error: "Error al obtener productos" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return responderError(error, "Error en GET /api/productos:");
  }
}

// Crear un producto
export async function POST(request) {
  try {
    const { supabase } = await autenticar(request);

    const producto = await leerJson(request);

    if (!producto) {
      return NextResponse.json(
        { error: "Datos del producto inválidos" },
        { status: 400 }
      );
    }

    const { nombre, descripcion, cantidad, imagen, precio } = producto;

    if (
      typeof nombre !== "string" ||
      !nombre.trim() ||
      !Number.isSafeInteger(cantidad) ||
      cantidad < 0 ||
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

    const { data, error } = await supabase
      .from("productos")
      .insert({
        nombre: nombre.trim(),
        descripcion: descripcion ?? "",
        cantidad,
        imagen: imagen || null,
        precio
      })
      .select()
      .single();

    if (error) {
      console.error("Error en Supabase:", error);

      return NextResponse.json(
        { error: "No se pudo guardar el producto" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return responderError(error, "Error en POST /api/productos:");
  }
}