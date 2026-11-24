import { NextResponse } from "next/server";
import { autenticar, responderError } from "@/lib/authApi";

// Listar productos retirados
export async function GET(request) {
  try {
    const { supabase } = await autenticar(request);

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("activo", false)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error consultando retirados:", error);

      return NextResponse.json(
        { error: "No se pudieron consultar los productos retirados" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return responderError(error, "Error en GET /api/productos/retirados:");
  }
}