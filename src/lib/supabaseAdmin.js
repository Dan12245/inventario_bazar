
import { createClient } from "@supabase/supabase-js";

export function crearSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !clave) {
    throw new Error("Faltan credenciales de Supabase.");
  }

  return createClient(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
