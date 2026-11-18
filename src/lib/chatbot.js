import { crearSupabaseAdmin } from "@/lib/supabaseAdmin";

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------
const EXPIRA_MINUTOS = 30;

// Debe coincidir con c_max_unidades en registrar_apartado (SQL)
const MAX_UNIDADES_BOT = 10;

// Número o texto de contacto del personal. Ej: "614 123 4567, de lunes a sábado de 10 a 6"
const CONTACTO_PERSONAL = process.env.BAZAR_CONTACTO?.trim();

// Horas que se conserva un apartado. Debe coincidir con el cron:
//   select public.expirar_apartados(216)
const HORAS_APARTADO = 216;

// Zona horaria para mostrar la fecha límite (Delicias, Chihuahua)
const ZONA_HORARIA = process.env.BAZAR_ZONA_HORARIA || "America/Chihuahua";

export const menu = `¡Hola! 👋 Bienvenido al bazar.

¿En qué podemos ayudarte?

1. Consultar productos
2. Apartar un producto
3. Hablar con el personal`;

// ---------------------------------------------------------------------
// Tipos de respuesta (el webhook los convierte en mensajes de Meta)
//   { tipo: "texto",           texto }
//   { tipo: "menu",            texto, aviso }
//   { tipo: "botones",         texto, botones: [{ id, titulo }] }
//   { tipo: "lista_productos", texto, productos: [{ id, nombre, cantidad, precio }] }
// ---------------------------------------------------------------------
const soloTexto = (t) => ({ tipo: "texto", texto: t });

const mostrarMenu = (aviso = null) => ({
  tipo: "menu",
  texto: aviso ? `${aviso}\n\n${menu}` : menu,
  aviso
});

const conBotones = (t, botones) => ({ tipo: "botones", texto: t, botones });

const BOTONES_INTERES = [
  { id: "interes_si", titulo: "Sí, apartar" },
  { id: "interes_no", titulo: "No, regresar" }
];

const BOTONES_CONFIRMAR = [
  { id: "apartado_confirmar", titulo: "Confirmar" },
  { id: "apartado_cancelar", titulo: "Cancelar" }
];

const BOTONES_REINTENTAR = [
  { id: "apartado_confirmar", titulo: "Reintentar" },
  { id: "apartado_cancelar", titulo: "Cancelar" }
];

// Un botón solo vale en el estado en el que se mostró
const BOTONES_POR_ESTADO = {
  menu: ["menu_consultar", "menu_apartar", "menu_personal"],
  confirmando_interes: ["interes_si", "interes_no"],
  confirmando_apartado: ["apartado_confirmar", "apartado_cancelar"]
};

const OPCION_POR_BOTON = {
  menu_consultar: "1",
  menu_apartar: "2",
  menu_personal: "3"
};

const CAMPOS_LIMPIOS = {
  id_producto: null,
  cantidad: null,
  nombre_cliente: null,
  opciones_producto: [],
  solicitud_id: null,
  precio_unitario: null
};

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN"
});

// "lunes 26 de noviembre, 3:45 p.m."
function formatoFechaLimite(creadoEn) {
  const base = creadoEn ? new Date(creadoEn) : new Date();
  const limite = new Date(base.getTime() + HORAS_APARTADO * 60 * 60 * 1000);

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: ZONA_HORARIA
  }).format(limite);
}

const NOMBRE_VALIDO = /^[\p{L}\p{M}\s.'’-]{2,100}$/u;

class ConversacionObsoleta extends Error {}

function botonValido(id, conversacion) {
  if (id.startsWith("producto_")) {
    const idProducto = Number(id.slice("producto_".length));
    return (
      conversacion.estado === "seleccionando_producto" &&
      Number.isSafeInteger(idProducto) &&
      (conversacion.opciones_producto ?? []).includes(idProducto)
    );
  }

  return (BOTONES_POR_ESTADO[conversacion.estado] ?? []).includes(id);
}

// ---------------------------------------------------------------------
// Punto de entrada
//   entrada: { tipo: "texto" | "boton" | "otro", valor }
//   (también acepta un string, para el simulador)
// ---------------------------------------------------------------------
export async function procesarMensaje(telefono, entrada) {
  if (typeof entrada === "string") {
    entrada = { tipo: "texto", valor: entrada };
  }

  if (!entrada || entrada.tipo === "otro") {
    return soloTexto(
      `Por ahora solo puedo leer mensajes de texto 😅.

Escribe "menu" para ver las opciones.`
    );
  }

  try {
    return await flujo(telefono, entrada);
  } catch (error) {
    if (error instanceof ConversacionObsoleta) {
      return soloTexto(
        "Estoy terminando de procesar tu mensaje anterior 😅. Espera un momento e inténtalo de nuevo."
      );
    }

    throw error;
  }
}

async function flujo(telefono, entrada) {
  const supabase = crearSupabaseAdmin();

  const esBoton = entrada.tipo === "boton";
  const original = String(entrada.valor ?? "").trim();
  const mensaje = original.toLowerCase();

  // Crear la conversación si el teléfono es nuevo
  const { error: upsertError } = await supabase
    .from("conversaciones_whatsapp")
    .upsert(
      { telefono, estado: "menu" },
      { onConflict: "telefono", ignoreDuplicates: true }
    );

  if (upsertError) throw upsertError;

  const { data: conversacion, error } = await supabase
    .from("conversaciones_whatsapp")
    .select(
      "estado, id_producto, cantidad, opciones_producto, nombre_cliente, solicitud_id, precio_unitario, updated_at"
    )
    .eq("telefono", telefono)
    .single();

  if (error) throw error;

  // Cambiar de estado SOLO si nadie lo cambió mientras tanto
  async function cambiarEstado(nuevoEstado, cambios = {}) {
    const { data, error } = await supabase
      .from("conversaciones_whatsapp")
      .update({
        estado: nuevoEstado,
        ...cambios,
        updated_at: new Date().toISOString()
      })
      .eq("telefono", telefono)
      .eq("estado", conversacion.estado)
      .select("telefono");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new ConversacionObsoleta();
    }

    conversacion.estado = nuevoEstado;
    Object.assign(conversacion, cambios);
  }

  const volverAlMenu = (aviso = null) =>
    cambiarEstado("menu", CAMPOS_LIMPIOS).then(() => mostrarMenu(aviso));

  const esSaludo =
    !esBoton && ["hola", "menu", "menú"].includes(mensaje);

  // -------------------------------------------------------------------
  // Conversaciones abandonadas: caducan
  // -------------------------------------------------------------------
  const inactivoMs = Date.now() - new Date(conversacion.updated_at).getTime();

  if (
    conversacion.estado !== "menu" &&
    inactivoMs > EXPIRA_MINUTOS * 60 * 1000
  ) {
    return volverAlMenu(
      esSaludo ? null : "Tu conversación anterior caducó por inactividad."
    );
  }

  // Volver al menú desde cualquier estado
  if (esSaludo) {
    return volverAlMenu();
  }

  // -------------------------------------------------------------------
  // Botones: solo valen en el estado donde se mostraron
  // -------------------------------------------------------------------
  if (esBoton && !botonValido(mensaje, conversacion)) {
    return soloTexto(
      `Ese botón pertenece a un mensaje anterior.

Escribe "menu" para volver al menú principal.`
    );
  }

  // -------------------------------------------------------------------
  // 1. Esperando el nombre del producto a buscar
  // -------------------------------------------------------------------
  if (conversacion.estado === "esperando_producto") {
    const busqueda = original.slice(0, 60);

    if (busqueda.length < 2) {
      return soloTexto("Escribe al menos 2 letras del nombre del producto.");
    }

    // Escapar comodines de LIKE para que "%" o "_" no coincidan con todo
    const patron = busqueda.replace(/[\\%_]/g, "\\$&");

    const { data: productos, error } = await supabase
      .from("productos")
      .select("id, nombre, cantidad, precio")
      .eq("activo", true)
      .gt("cantidad", 0)
      .ilike("nombre", `%${patron}%`)
      .order("id", { ascending: true })
      .limit(5);

    if (error) {
      console.error("Error buscando productos:", error);
      return soloTexto("No pude consultar el inventario. Intenta nuevamente.");
    }

    if (productos.length === 0) {
      return soloTexto(
        "No encontré productos con ese nombre. Intenta otra búsqueda."
      );
    }

    await cambiarEstado("seleccionando_producto", {
      opciones_producto: productos.map((p) => p.id),
      id_producto: null
    });

    const lista = productos
      .map((p) => `ID: ${p.id} - ${p.nombre} (${p.cantidad} disponibles)`)
      .join("\n");

    return {
      tipo: "lista_productos",
      texto: `Encontré estos productos:

${lista}

Escribe el ID del producto que te interesa.
O escribe "menu" para regresar.`,
      productos
    };
  }

  // -------------------------------------------------------------------
  // 2. Seleccionando uno de los productos ofrecidos
  // -------------------------------------------------------------------
  if (conversacion.estado === "seleccionando_producto") {
    let idProducto = NaN;

    if (esBoton) {
      idProducto = Number(mensaje.slice("producto_".length));
    } else if (/^\d{1,15}$/.test(mensaje)) {
      idProducto = Number(mensaje);
    }

    const opciones = conversacion.opciones_producto ?? [];

    if (!Number.isSafeInteger(idProducto) || !opciones.includes(idProducto)) {
      return soloTexto(
        `Ese ID no está entre las opciones que te mostré.

Escribe uno de los IDs de la lista o "menu" para regresar.`
      );
    }

    const { data: producto, error } = await supabase
      .from("productos")
      .select("id, nombre, cantidad, precio")
      .eq("id", idProducto)
      .eq("activo", true)
      .gt("cantidad", 0)
      .maybeSingle();

    if (error) {
      console.error("Error consultando producto:", error);
      return soloTexto("No pude comprobar el producto. Intenta nuevamente.");
    }

    if (!producto) {
      await cambiarEstado("esperando_producto", {
        opciones_producto: [],
        id_producto: null
      });

      return soloTexto(
        `Ese producto ya no está disponible.

Escribe otro nombre para buscar nuevamente.`
      );
    }

    if (producto.precio === null) {
      return soloTexto(
        "Este producto todavía no tiene un precio registrado. Comunícate con el personal del bazar."
      );
    }

    await cambiarEstado("confirmando_interes", {
      id_producto: producto.id,
      precio_unitario: producto.precio,
      opciones_producto: []
    });

    return conBotones(
      `Seleccionaste: ${producto.nombre}

Cantidad disponible: ${producto.cantidad}
Precio: ${formatoMoneda.format(Number(producto.precio))}

¿Deseas apartar este producto?`,
      BOTONES_INTERES
    );
  }

  // -------------------------------------------------------------------
  // 3. ¿Quiere apartarlo?
  // -------------------------------------------------------------------
  if (conversacion.estado === "confirmando_interes") {
    const dijoSi =
      mensaje === "interes_si" ||
      (!esBoton && ["1", "si", "sí"].includes(mensaje));

    const dijoNo =
      mensaje === "interes_no" ||
      (!esBoton && ["2", "no"].includes(mensaje));

    if (dijoSi) {
      await cambiarEstado("esperando_cantidad", {
        solicitud_id: crypto.randomUUID(),
        cantidad: null,
        nombre_cliente: null
      });

      return soloTexto("¡Perfecto! 😄 ¿Cuántas unidades deseas apartar?");
    }

    if (dijoNo) {
      return volverAlMenu();
    }

    return conBotones(
      `No entendí tu respuesta 😅.

¿Deseas apartar este producto?`,
      BOTONES_INTERES
    );
  }

  // -------------------------------------------------------------------
  // 4. Cantidad (se valida contra existencias y precio actual)
  // -------------------------------------------------------------------
  if (conversacion.estado === "esperando_cantidad") {
    if (!/^\d{1,4}$/.test(mensaje) || Number(mensaje) <= 0) {
      return soloTexto("Ingresa una cantidad válida, por ejemplo: 1");
    }

    const cantidad = Number(mensaje);

    const { data: producto, error } = await supabase
      .from("productos")
      .select("cantidad, precio")
      .eq("id", conversacion.id_producto)
      .eq("activo", true)
      .maybeSingle();

    if (error) {
      console.error("Error consultando existencias:", error);
      return soloTexto("No pude comprobar las existencias. Intenta nuevamente.");
    }

    if (!producto || producto.cantidad <= 0) {
      return volverAlMenu("Ese producto ya no está disponible.");
    }

    if (Number(producto.precio) !== Number(conversacion.precio_unitario)) {
      return volverAlMenu(
        "El precio de ese producto cambió. Consúltalo de nuevo desde el menú."
      );
    }

    if (cantidad > producto.cantidad) {
      return soloTexto(
        `Solo hay ${producto.cantidad} disponible(s).

¿Cuántas unidades deseas apartar?`
      );
    }

    if (cantidad > MAX_UNIDADES_BOT) {
      return soloTexto(
        `Por WhatsApp puedes apartar hasta ${MAX_UNIDADES_BOT} unidades por apartado.

¿Cuántas unidades deseas apartar?`
      );
    }

    await cambiarEstado("esperando_nombre", { cantidad });

    return soloTexto("¿A nombre de quién registramos el apartado?");
  }

  // -------------------------------------------------------------------
  // 5. Nombre
  // -------------------------------------------------------------------
  if (conversacion.estado === "esperando_nombre") {
    const nombre = original.replace(/\s+/g, " ");

    if (!NOMBRE_VALIDO.test(nombre)) {
      return soloTexto(
        "Ingresa un nombre válido (solo letras, de 2 a 100 caracteres)."
      );
    }

    const { data: producto, error } = await supabase
      .from("productos")
      .select("nombre")
      .eq("id", conversacion.id_producto)
      .maybeSingle();

    if (error) {
      console.error("Error consultando producto:", error);
      return soloTexto("No pude comprobar el producto. Intenta nuevamente.");
    }

    if (!producto) {
      return volverAlMenu("Ese producto ya no está disponible.");
    }

    await cambiarEstado("confirmando_apartado", { nombre_cliente: nombre });

    const precioUnitario = Number(conversacion.precio_unitario);
    const total = precioUnitario * Number(conversacion.cantidad);

    return conBotones(
      `Revisa tu apartado:

Producto: ${producto.nombre}
Nombre: ${nombre}
Cantidad: ${conversacion.cantidad}
Precio por unidad: ${formatoMoneda.format(precioUnitario)}
Total: ${formatoMoneda.format(total)}

¿Confirmas tu apartado?`,
      BOTONES_CONFIRMAR
    );
  }

  // -------------------------------------------------------------------
  // 6. Confirmación final
  // -------------------------------------------------------------------
  if (conversacion.estado === "confirmando_apartado") {
    const confirma =
      mensaje === "apartado_confirmar" ||
      (!esBoton && ["1", "confirmar"].includes(mensaje));

    const cancela =
      mensaje === "apartado_cancelar" ||
      (!esBoton && ["2", "cancelar"].includes(mensaje));

    if (cancela) {
      return volverAlMenu();
    }

    if (!confirma) {
      return conBotones(
        `No entendí tu respuesta 😅.

¿Confirmas tu apartado?`,
        BOTONES_CONFIRMAR
      );
    }

    if (
      !conversacion.solicitud_id ||
      !conversacion.id_producto ||
      !Number.isSafeInteger(conversacion.cantidad) ||
      conversacion.cantidad <= 0 ||
      !conversacion.nombre_cliente
    ) {
      return volverAlMenu("Faltaron datos para registrar el apartado.");
    }

    const { data: idApartado, error: errorApartado } = await supabase.rpc(
      "registrar_apartado",
      {
        p_id_producto: conversacion.id_producto,
        p_cliente: conversacion.nombre_cliente,
        p_telefono: telefono,
        p_cantidad: conversacion.cantidad,
        p_solicitud_id: conversacion.solicitud_id,
        p_precio_unitario: conversacion.precio_unitario,
        p_origen: "bot"
      }
    );

    if (errorApartado) {
      console.error("Error registrando apartado:", errorApartado);

      // Errores que NO se arreglan reintentando: limpiamos y avisamos
      const erroresDefinitivos = {
        BZ001: "Ya no hay existencias suficientes para tu apartado.",
        BZ002: "El precio de ese producto cambió. Consúltalo de nuevo.",
        BZ003: "Ese producto ya no está disponible.",
        BZ004: errorApartado.message,
        BZ005:
          "No pude registrar tu apartado con los datos recibidos. Comunícate con el personal del bazar."
      };

      const aviso = erroresDefinitivos[errorApartado.code];

      if (aviso) {
        return volverAlMenu(aviso);
      }

      // Error temporal: conservamos el mismo solicitud_id para reintentar
      return conBotones(
        `No fue posible registrar tu apartado por un problema temporal.

¿Quieres intentarlo de nuevo?`,
        BOTONES_REINTENTAR
      );
    }

    const { data: producto, error: errorProducto } = await supabase
      .from("productos")
      .select("nombre")
      .eq("id", conversacion.id_producto)
      .maybeSingle();

    if (errorProducto) {
      console.error("Error consultando nombre del producto:", errorProducto);
    }

    const nombreProducto =
      producto?.nombre ?? `Producto #${conversacion.id_producto}`;

    // La fecha límite se calcula desde la creación REAL del apartado
    // (así una repetición o doble confirmación muestra siempre la misma)
    const { data: apartado, error: errorFecha } = await supabase
      .from("apartados")
      .select("created_at")
      .eq("id", idApartado)
      .maybeSingle();

    if (errorFecha) {
      console.error("Error consultando fecha del apartado:", errorFecha);
    }

    const fechaLimite = formatoFechaLimite(apartado?.created_at);

    // Limpiar solo si la conversación sigue siendo de esta solicitud
    const { error: errorLimpieza } = await supabase
      .from("conversaciones_whatsapp")
      .update({
        estado: "menu",
        ...CAMPOS_LIMPIOS,
        updated_at: new Date().toISOString()
      })
      .eq("telefono", telefono)
      .eq("estado", "confirmando_apartado")
      .eq("solicitud_id", conversacion.solicitud_id);

    if (errorLimpieza) {
      // No pasa nada grave: si vuelve a confirmar, la solicitud es idempotente
      console.error("Apartado creado, pero falló la limpieza:", errorLimpieza);
    }

    return soloTexto(`✅ ¡Tu apartado se registró correctamente!

Número de apartado: #${idApartado}
Producto: ${nombreProducto}
Cantidad: ${conversacion.cantidad}
A nombre de: ${conversacion.nombre_cliente}

⏰ Te lo guardamos hasta el ${fechaLimite}. Pasada esa fecha, el apartado se cancela y el producto vuelve a estar disponible.

¡Gracias por apartar con nosotros! 😄

Escribe "menu" para regresar.`);
  }

  // -------------------------------------------------------------------
  // 7. Menú principal
  // -------------------------------------------------------------------
  if (conversacion.estado !== "menu") {
    // Estado desconocido: no dejamos al cliente atorado
    return volverAlMenu();
  }

  const opcion = esBoton ? OPCION_POR_BOTON[mensaje] : mensaje;

  switch (opcion) {
    case "1":
      await cambiarEstado("esperando_producto", {
        id_producto: null,
        opciones_producto: []
      });

      return soloTexto(
        "¡Claro! ¿Qué producto estás buscando? Escribe el nombre o parte del nombre."
      );

    case "2":
      await cambiarEstado("esperando_producto", {
        id_producto: null,
        opciones_producto: []
      });

      return soloTexto(
        "¡Va! Para apartar, escribe el nombre del producto que te interesa y te muestro lo que hay disponible."
      );

    case "3":
      return soloTexto(
        CONTACTO_PERSONAL
          ? `Puedes comunicarte con el personal del bazar:

${CONTACTO_PERSONAL}

Escribe "menu" para regresar.`
          : `Por ahora no tengo un contacto para compartirte por este medio. Intenta de nuevo más tarde.

Escribe "menu" para regresar.`
      );

    default:
      return mostrarMenu("No entendí tu mensaje 😅.");
  }
}
