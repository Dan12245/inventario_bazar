import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

// Valida el Bearer token y devuelve un cliente de Supabase con la sesión del usuario
export async function autenticar(request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new ErrorApi("No autorizado", 401);
  }

  const token = authorization.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw new ErrorApi("Sesión inválida", 401);
  }

  // Los usuarios anónimos de Supabase también son "authenticated": los rechazamos
  if (data.user.is_anonymous) {
    throw new ErrorApi("No autorizado", 403);
  }

  return { supabase, user: data.user };
}

// Lee el body JSON; devuelve null si viene malformado o no es un objeto
export async function leerJson(request) {
  try {
    const cuerpo = await request.json();

    return cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
      ? cuerpo
      : null;
  } catch {
    return null;
  }
}

// Traduce un error de Postgres (códigos BZxxx / P0001) a una respuesta HTTP
export function respuestaErrorDb(error, mensajeGenerico) {
  const estados = {
    BZ001: 409, // sin existencias
    BZ002: 409, // precio cambió
    BZ003: 404, // producto inexistente o retirado
    BZ004: 429, // límite excedido
    BZ005: 400, // datos inválidos
    P0001: 409  // reglas de las demás funciones
  };

  const status = estados[error?.code];

  if (status) {
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ error: mensajeGenerico }, { status: 500 });
}

// Respuesta estándar para errores lanzados dentro de una ruta
export function responderError(error, etiqueta) {
  if (error instanceof ErrorApi) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(etiqueta, error);

  return NextResponse.json(
    { error: "Error interno del servidor" },
    { status: 500 }
  );
}
