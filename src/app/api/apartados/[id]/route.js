import { NextResponse } from "next/server";
import {
  autenticar,
  leerJson,
  respuestaErrorDb,
  responderError
} from "@/lib/authApi";

const FUNCIONES = {
  Cancelado: "cancelar_apartado",
  Entregado: "entregar_apartado"
};

// Marcar un apartado como Entregado o Cancelado
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const idApartado = /^[1-9]\d*$/.test(id) ? Number(id) : NaN;

    if (!Number.isSafeInteger(idApartado)) {
      return NextResponse.json(
        { error: "ID de apartado inválido" },
        { status: 400 }
      );
    }

    const { supabase } = await autenticar(request);

    const cuerpo = await leerJson(request);
    const estado = cuerpo?.estado;

    if (typeof estado !== "string" || !Object.hasOwn(FUNCIONES, estado)) {
      return NextResponse.json(
        { error: "Estado no permitido" },
        { status: 400 }
      );
    }

    // PostgreSQL se encarga de la transición (y de devolver el stock al cancelar)
    const { data, error } = await supabase.rpc(FUNCIONES[estado], {
      p_id_apartado: idApartado
    });

    if (error) {
      console.error("Error actualizando apartado:", error);
      return respuestaErrorDb(error, "No se pudo actualizar el apartado");
    }

    return NextResponse.json({
      mensaje: `Apartado marcado como ${estado}`,
      id_apartado: data,
      estado
    });
  } catch (error) {
    return responderError(error, "Error en PATCH /api/apartados/[id]:");
  }
}