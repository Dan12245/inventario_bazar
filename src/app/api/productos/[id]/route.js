
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    // Obtenemos el ID de la URL
    const { id } = await params;

    if (!/^[1-9]\d*$/.test(id)) {
      return Response.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificamos el encabezado de autorización
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // Creamos el cliente de Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Verificamos la identidad
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return Response.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    // Recibimos los datos del frontend
    const producto = await request.json();

    if (
      !producto ||
      typeof producto !== 'object' ||
      Array.isArray(producto)
    ) {
      return Response.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { nombre, descripcion, cantidad, imagen, precio } = producto;

    // Validamos los campos obligatorios
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
      return Response.json(
        { error: 'Datos del producto inválidos' },
        { status: 400 }
      );
    }

    // Construimos los cambios
    const cambios = {
      nombre: nombre.trim(),
      descripcion: descripcion ?? '',
      cantidad,
      precio
    };

    // Solo modificamos la imagen si recibimos una nueva
    if (typeof imagen === 'string' && imagen) {
      cambios.imagen = imagen;
    }

    // Actualizamos únicamente el producto indicado
    const { data, error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', Number(id))
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error actualizando producto:', error);

      return Response.json(
        { error: 'No se pudo actualizar el producto' },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: 'Producto no encontrado o sin permiso' },
        { status: 404 }
      );
    }

    return Response.json(data, { status: 200 });

  } catch (error) {
    console.error('Error en PATCH:', error);

    return Response.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

//ruta delete para los productos

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const idProducto = Number(id);

    // Validar ID
    if (!Number.isSafeInteger(idProducto) || idProducto <= 0) {
      return NextResponse.json(
        { error: "ID de producto inválido" },
        { status: 400 }
      );
    }

    // Obtener token
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // Crear cliente Supabase autenticado
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Validar sesión
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sesión inválida" },
        { status: 401 }
      );
    }

    // Retirar producto mediante PostgreSQL
    const { data, error } = await supabase.rpc(
      "retirar_producto",
      {
        p_id_producto: idProducto
      }
    );

    if (error) {
      console.error("Error retirando producto:", error);

      if (error.code === "P0001") {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "No se pudo retirar el producto" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mensaje: "Producto retirado correctamente",
      id_producto: data
    });

  } catch (error) {
    console.error("Error inesperado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
