
import { createHmac, timingSafeEqual } from "node:crypto";
import { crearSupabaseAdmin } from "@/lib/supabaseAdmin";
import { procesarMensaje, menu } from "@/lib/chatbot";

export const runtime = "nodejs";

// Convertir la respuesta del chatbot en un mensaje de Meta

async function construirMensaje(respuesta, supabase, numero) {

  // 1. Menú principal con botones
  if (respuesta === menu) {
    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: "¡Hola! 👋 Bienvenido al bazar.\n\n¿Qué deseas hacer?"
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "menu_consultar",
                title: "Consultar productos"
              }
            },
            {
              type: "reply",
              reply: {
                id: "menu_apartar",
                title: "Apartar producto"
              }
            },
            {
              type: "reply",
              reply: {
                id: "menu_personal",
                title: "Hablar con personal"
              }
            }
          ]
        }
      }
    };
  }

  // 2. Lista interactiva cuando hay resultados de búsqueda
  if (respuesta.startsWith("Encontré estos productos:")) {

    // Recuperar los IDs que el chatbot ofreció
    const { data: conversacion, error: errorConversacion } =
      await supabase
        .from("conversaciones_whatsapp")
        .select("estado, opciones_producto")
        .eq("telefono", numero)
        .single();

    if (errorConversacion) throw errorConversacion;

    if (conversacion.estado === "seleccionando_producto") {
      const ids = conversacion.opciones_producto ?? [];

      if (ids.length > 0) {
        // Recuperar los productos ofrecidos
        const { data: productos, error: errorProductos } =
          await supabase
            .from("productos")
            .select("id, nombre, precio, cantidad")
            .in("id", ids)
            .eq("activo", true)
            .gt("cantidad", 0);

        if (errorProductos) throw errorProductos;

        // Mantener el orden de las opciones originales
        const filas = ids
          .map((id) => productos.find((p) => p.id === id))
          .filter(Boolean)
          .slice(0, 5)
          .map((producto) => ({
            id: `producto_${producto.id}`,
            title: producto.nombre.slice(0, 24),
            description: producto.precio == null
              ? `${producto.cantidad} disponibles · Sin precio`
              : `${producto.cantidad} disponibles · $${Number(producto.precio).toFixed(2)} MXN`
          }));

        if (filas.length > 0) {
          return {
            type: "interactive",
            interactive: {
              type: "list",
              body: {
                text: "Encontré estos productos. 👇\n\nSelecciona el que te interesa."
              },
              action: {
                button: "Ver productos",
                sections: [
                  {
                    title: "Disponibles",
                    rows: filas
                  }
                ]
              }
            }
          };
        }
      }
    }
  }

// Mostrar botones cuando el cliente elige un producto
const { data: conversacionActual, error: errorEstado } =
  await supabase
    .from("conversaciones_whatsapp")
    .select("estado")
    .eq("telefono", numero)
    .single();

if (errorEstado) throw errorEstado;

if (
  conversacionActual.estado === "confirmando_interes" &&
  respuesta.includes("¿Deseas apartar este producto?")
) {
  // Quitar las opciones numéricas del texto
  const textoBotones = respuesta
    .replace(/\n\s*1\.\s*Sí\s*\n\s*2\.\s*No\s*$/i, "")
    .trim();

  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: textoBotones
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "interes_si",
              title: "Sí, apartar"
            }
          },
          {
            type: "reply",
            reply: {
              id: "interes_no",
              title: "No, regresar"
            }
          }
        ]
      }
    }
  };
}


// Botones para confirmar o cancelar el apartado
if (
  conversacionActual.estado === "confirmando_apartado" &&
  respuesta.includes("¿Confirmas tu apartado?")
) {
  const textoBotones = respuesta
    .replace(
      /\n\s*1\.\s*Confirmar\s*\n\s*2\.\s*Cancelar\s*$/i,
      ""
    )
    .trim();

  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: textoBotones
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "apartado_confirmar",
              title: "Confirmar"
            }
          },
          {
            type: "reply",
            reply: {
              id: "apartado_cancelar",
              title: "Cancelar"
            }
          }
        ]
      }
    }
  };
}



  // 3. Mensajes normales
  return {
    type: "text",
    text: {
      body: respuesta
    }
  };
}


// Enviar o simular un mensaje de WhatsApp
async function enviarMensaje(numero, contenido) {

  if (
    process.env.NODE_ENV === "development" &&
    process.env.WHATSAPP_DRY_RUN === "true"
  ) {
    console.log("🧪 WhatsApp simulado:");
    console.log(JSON.stringify(contenido, null, 2));
    return;
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION;

  if (!token || !phoneNumberId || !version) {
    throw new Error("Faltan variables de WhatsApp.");
  }

  // Normalización del número mexicano
  const destinatario = /^521\d{10}$/.test(numero)
    ? `52${numero.slice(3)}`
    : numero;

  const respuesta = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: destinatario,
        ...contenido
      })
    }
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    console.error("Error de Meta:", resultado);
    throw new Error("No se pudo enviar el WhatsApp.");
  }

  console.log(
    "Respuesta aceptada por Meta:",
    resultado.messages?.[0]?.id
  );
}

// Guardar la respuesta y el mensaje completo
async function guardarRespuesta(
  supabase,
  mensajeId,
  respuesta,
  contenido
) {
  const { data, error } = await supabase
    .from("mensajes_whatsapp")
    .update({
      respuesta,
      mensaje_salida: contenido,
      estado: "pendiente_envio",
      updated_at: new Date().toISOString()
    })
    .eq("mensaje_id", mensajeId)
    .eq("estado", "procesando")
    .select("mensaje_id")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("No se pudo guardar la respuesta.");
  }
}

// Cambiar el estado de procesamiento de un mensaje
async function actualizarEstado(supabase, mensajeId, estado) {
  const { error } = await supabase
    .from("mensajes_whatsapp")
    .update({
      estado,
      updated_at: new Date().toISOString()
    })
    .eq("mensaje_id", mensajeId);

  if (error) throw error;
}

// Verificación inicial del webhook por Meta
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    console.log("Webhook de WhatsApp verificado");

    return new Response(challenge, { status: 200 });
  }

  return new Response("Verificación fallida", {
    status: 403
  });
}

// Recibir eventos de WhatsApp
export async function POST(request) {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const firma = request.headers.get("x-hub-signature-256");
    const cuerpo = await request.text();

    if (!appSecret || !firma) {
      return new Response("No autorizado", { status: 401 });
    }

    const firmaEsperada =
      "sha256=" +
      createHmac("sha256", appSecret)
        .update(cuerpo)
        .digest("hex");

    const firmaRecibida = Buffer.from(firma);
    const firmaCalculada = Buffer.from(firmaEsperada);

    if (
      firmaRecibida.length !== firmaCalculada.length ||
      !timingSafeEqual(firmaRecibida, firmaCalculada)
    ) {
      return new Response("Firma inválida", {
        status: 401
      });
    }

    const evento = JSON.parse(cuerpo);
    const supabase = crearSupabaseAdmin();

    for (const entrada of evento.entry ?? []) {
      for (const cambio of entrada.changes ?? []) {
        for (const mensaje of cambio.value?.messages ?? []) {

          const mensajeId = mensaje.id;
          const numero = mensaje.from;
          let texto;

          // Leer mensajes escritos o botones interactivos
          if (mensaje.type === "text") {
            texto = mensaje.text?.body?.trim();

          } else if (mensaje.type === "interactive") {
            const id =
              mensaje.interactive?.button_reply?.id ??
              mensaje.interactive?.list_reply?.id;

            if (id?.startsWith("producto_")) {
              // Convertir "producto_21" en "21"
              texto = id.slice("producto_".length);
            } else {
              // Mantener los IDs del menú
              texto = id;
            }
          }

          if (!mensajeId || !numero || !texto) {
            continue;
          }

          // Reclamar el mensaje en PostgreSQL
          const { data: registros, error: errorRegistro } =
            await supabase.rpc("reclamar_mensaje_whatsapp", {
              p_mensaje_id: mensajeId,
              p_telefono: numero
            });

          if (errorRegistro) throw errorRegistro;

          const registro = registros?.[0];

          if (!registro?.aceptado) {
            console.log(
              "Mensaje duplicado o en procesamiento:",
              mensajeId
            );
            continue;
          }

          try {
            let respuesta = registro.respuesta_guardada;
            let contenido;

            if (respuesta !== null && respuesta !== undefined) {
              // Reutilizar la respuesta original
              console.log(
                "Reutilizando respuesta guardada:",
                mensajeId
              );

              const { data: guardado, error } = await supabase
                .from("mensajes_whatsapp")
                .select("mensaje_salida")
                .eq("mensaje_id", mensajeId)
                .single();

              if (error) throw error;

              // Compatibilidad con mensajes anteriores
              contenido =
              guardado?.mensaje_salida ??
              await construirMensaje(respuesta, supabase, numero);

            } else {
              // Procesar un mensaje nuevo
              console.log("Procesando mensaje nuevo:", {
                mensajeId,
                numero,
                texto
              });

              respuesta = await procesarMensaje(
                numero,
                texto
              );

              if (typeof respuesta !== "string") {
                throw new Error(
                  "El chatbot no devolvió una respuesta válida."
                );
              }

            contenido = await construirMensaje(
              respuesta,
              supabase,
              numero
            );
              // Guardar antes de intentar enviar
              await guardarRespuesta(
                supabase,
                mensajeId,
                respuesta,
                contenido
              );
            }

            // Enviar el mismo contenido que quedó guardado
            await enviarMensaje(numero, contenido);

            await actualizarEstado(
              supabase,
              mensajeId,
              "completado"
            );

            console.log(
              "Mensaje completado:",
              mensajeId
            );

          } catch (error) {
            console.error(
              "Error procesando mensaje:",
              mensajeId,
              error
            );

            try {
              await actualizarEstado(
                supabase,
                mensajeId,
                "fallido"
              );
            } catch (errorEstado) {
              console.error(
                "Error actualizando estado:",
                errorEstado
              );
            }

            throw error;
          }
        }
      }
    }

    return new Response("EVENT_RECEIVED", {
      status: 200
    });

  } catch (error) {
    console.error("Error en webhook:", error);

    return new Response("Error interno", {
      status: 500
    });
  }
}
