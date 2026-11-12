
import { crearSupabaseAdmin } from "@/lib/supabaseAdmin";

const menu = `¡Hola! 👋 Bienvenido al bazar.

¿En qué podemos ayudarte?

1. Consultar productos
2. Apartar un producto
3. Hablar con el personal`;

export async function procesarMensaje(telefono, texto) {
  const supabase = crearSupabaseAdmin();
  const mensaje = texto.trim().toLowerCase();

  // Crear una conversación si el teléfono es nuevo
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

  // Recuperar la conversación actual
  const { data: conversacion, error } = await supabase
    .from("conversaciones_whatsapp")
    .select("estado, id_producto, cantidad, opciones_producto")
    .eq("telefono", telefono)
    .single();

  if (error) throw error;

  // Actualizar el estado y los datos de la conversación
  async function cambiarEstado(nuevoEstado, cambios = {}) {
    const { error } = await supabase
      .from("conversaciones_whatsapp")
      .update({
        estado: nuevoEstado,
        ...cambios,
        updated_at: new Date().toISOString()
      })
      .eq("telefono", telefono);

    if (error) throw error;
  }

  // Regresar al menú desde cualquier estado
  if (["hola", "menu", "menú"].includes(mensaje)) {
    await cambiarEstado("menu", {
      id_producto: null,
      opciones_producto: [],
      cantidad: null,
      nombre_cliente: null
    });

    return menu;
  }

  // 1. Estamos esperando una búsqueda
  if (conversacion.estado === "esperando_producto") {
    const busqueda = texto.trim();

    const { data: productos, error } = await supabase
      .from("productos")
      .select("id, nombre, cantidad")
      .eq("activo", true)
      .gt("cantidad", 0)
      .ilike("nombre", `%${busqueda}%`)
      .order("id", { ascending: true })
      .limit(5);

    if (error) {
      console.error("Error buscando productos:", error);
      return "No pude consultar el inventario. Intenta nuevamente.";
    }

    if (productos.length === 0) {
      return "No encontré productos con ese nombre. Intenta otra búsqueda.";
    }

    // Guardar únicamente los IDs ofrecidos
    const ids = productos.map((producto) => producto.id);

    await cambiarEstado("seleccionando_producto", {
      opciones_producto: ids,
      id_producto: null
    });

    const lista = productos
      .map(
        (producto) =>
          `ID: ${producto.id} - ${producto.nombre} (${producto.cantidad} disponibles)`
      )
      .join("\n");

    return `Encontré estos productos:

${lista}

Escribe el ID del producto que te interesa.
O escribe "menu" para regresar.`;
  }

  // 2. Estamos esperando que seleccione un ID
  if (conversacion.estado === "seleccionando_producto") {
    const idProducto = Number(mensaje);
    const opciones = conversacion.opciones_producto ?? [];

    // Verificar que el ID sea válido y haya sido ofrecido
    if (
      !/^\d+$/.test(mensaje) ||
      !Number.isSafeInteger(idProducto) ||
      !opciones.includes(idProducto)
    ) {
      return `Ese ID no está entre las opciones que te mostré.

Escribe uno de los IDs de la lista o "menu" para regresar.`;
    }

    // Verificar que el producto siga disponible
    const { data: producto, error } = await supabase
      .from("productos")
      .select("id, nombre, cantidad")
      .eq("id", idProducto)
      .eq("activo", true)
      .gt("cantidad", 0)
      .maybeSingle();

    if (error) {
      console.error("Error consultando producto:", error);
      return "No pude comprobar el producto. Intenta nuevamente.";
    }

    if (!producto) {
      await cambiarEstado("esperando_producto", {
        opciones_producto: [],
        id_producto: null
      });

      return `Ese producto ya no está disponible.

Escribe otro nombre para buscar nuevamente.`;
    }

    // Guardar el producto seleccionado
    await cambiarEstado("confirmando_interes", {
      id_producto: producto.id,
      opciones_producto: []
    });

    return `Seleccionaste: ${producto.nombre}

Cantidad disponible: ${producto.cantidad}

¿Deseas apartar este producto?

1. Sí
2. No`;
  }

  // 3. Estamos esperando Sí o No
  if (conversacion.estado === "confirmando_interes") {
    if (mensaje === "1" || mensaje === "si" || mensaje === "sí") {
  await cambiarEstado("esperando_cantidad", {
    cantidad: null,
    nombre_cliente: null
  });

  return "¡Perfecto! 😄 ¿Cuántas unidades deseas apartar?";
    }

    if (mensaje === "2" || mensaje === "no") {
      await cambiarEstado("menu", {
        id_producto: null,
        opciones_producto: []
      });

      return `Entendido, no se registró ningún apartado.

${menu}`;
    }

    return `Responde:
1. Sí
2. No

O escribe "menu" para regresar.`;
  }
  // Esperar cantidad
if (conversacion.estado === "esperando_cantidad") {
  const cantidad = Number(mensaje);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return "Ingresa una cantidad válida, por ejemplo: 1";
  }

  await cambiarEstado("esperando_nombre", {
    cantidad
  });

  return "¿A nombre de quién registramos el apartado?";
}

// Esperar nombre
if (conversacion.estado === "esperando_nombre") {
  const nombre = texto.trim();

  if (nombre.length < 2 || nombre.length > 100) {
    return "Ingresa un nombre válido de 2 a 100 caracteres.";
  }

  await cambiarEstado("confirmando_apartado", {
    nombre_cliente: nombre
  });

  return `¡Perfecto! 😄

Nombre: ${nombre}
Cantidad: ${conversacion.cantidad}

¿Confirmas tu apartado?

1. Confirmar
2. Cancelar`;
}


if (conversacion.estado === "confirmando_apartado") {

  // El cliente confirma
  if (mensaje === "1" || mensaje === "confirmar") {
    await cambiarEstado("menu", {
      id_producto: null,
      cantidad: null,
      nombre_cliente: null,
      opciones_producto: []
    });

    return `¡Perfecto! 😄

Recibimos tu confirmación correctamente.

Por ahora es una prueba, así que no se ha registrado ningún apartado.

Escribe "menu" para regresar.`;
  }

  // El cliente cancela
  if (mensaje === "2" || mensaje === "cancelar") {
    await cambiarEstado("menu", {
      id_producto: null,
      cantidad: null,
      nombre_cliente: null,
      opciones_producto: []
    });

    return `Se canceló la solicitud correctamente.

No se realizó ningún apartado.

${menu}`;
  }

  return `No entendí tu respuesta 😅.

1. Confirmar
2. Cancelar`;
}


  // 4. Opciones del menú principal
  switch (mensaje) {
    case "1":
      await cambiarEstado("esperando_producto", {
        id_producto: null,
        opciones_producto: []
      });

      return "¡Claro! ¿Qué producto estás buscando?";

    case "2":
      return "Próximamente podrás apartar productos desde aquí.";

    case "3":
      return "Puedes comunicarte con el personal del bazar.";

    default:
      return "No entendí tu mensaje 😅. Escribe 'hola' para ver el menú.";
  }
}
