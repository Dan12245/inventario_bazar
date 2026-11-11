
import { crearSupabaseAdmin } from "@/lib/supabaseAdmin";

const menu = `¡Hola! 👋 Bienvenido al bazar.

¿En qué podemos ayudarte?

1. Consultar productos
2. Apartar un producto
3. Hablar con el personal`;

export async function procesarMensaje(telefono, texto) {
  const supabase = crearSupabaseAdmin();
  const mensaje = texto.trim().toLowerCase();

  // Crear conversación si todavía no existe.
  // Si ya existe, conservar sus datos.
  const { error: upsertError } = await supabase
    .from("conversaciones_whatsapp")
    .upsert(
      {
        telefono,
        estado: "menu"
      },
      {
        onConflict: "telefono",
        ignoreDuplicates: true
      }
    );

  if (upsertError) throw upsertError;

  // Consultar el estado actual
  const { data: conversacion, error } = await supabase
    .from("conversaciones_whatsapp")
    .select("estado")
    .eq("telefono", telefono)
    .single();

  if (error) throw error;

  // Función para actualizar el estado
  async function cambiarEstado(nuevoEstado) {
    const { error } = await supabase
      .from("conversaciones_whatsapp")
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq("telefono", telefono);

    if (error) throw error;
  }

  // Permitir regresar al menú en cualquier momento
  if (["hola", "menu", "menú"].includes(mensaje)) {
    await cambiarEstado("menu");
    return menu;
  }

  // Si estamos esperando el nombre de un producto
  if (conversacion.estado === "esperando_producto") {
    await cambiarEstado("menu");

    return `Entendido, estás buscando: ${texto.trim()}.

Por ahora solamente estamos probando la conversación.

Escribe "menu" para volver.`;
  }

  // Opciones del menú
  switch (mensaje) {
    case "1":
      await cambiarEstado("esperando_producto");
      return "¡Claro! ¿Qué producto estás buscando?";

    case "2":
      return "¡Perfecto! Próximamente podrás apartar productos.";

    case "3":
      return "Puedes comunicarte con el personal del bazar.";

    default:
      return "No entendí tu mensaje 😅. Escribe 'hola' para ver el menú.";
  }
}
