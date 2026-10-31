
import { createClient } from '@supabase/supabase-js';

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

    const { nombre, descripcion, cantidad, imagen } = producto;

    // Validamos los campos obligatorios
    if (
      typeof nombre !== 'string' ||
      !nombre.trim() ||
      !Number.isSafeInteger(cantidad) ||
      cantidad < 0 ||
      (descripcion != null && typeof descripcion !== 'string') ||
      (imagen != null && typeof imagen !== 'string')
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
      cantidad
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
    // Obtenemos el ID desde la URL
    const { id } = await params;

    if (
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id))
    ) {
      return Response.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Obtenemos el token de autenticación
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // Cliente de Supabase para esta petición
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

    // Verificamos al usuario
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return Response.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    // Eliminamos el producto indicado
    const { data, error } = await supabase
      .from('productos')
      .delete()
      .eq('id', Number(id))
      .select('id, imagen')
      .maybeSingle();

    if (error) {
      console.error('Error al eliminar:', error);

      return Response.json(
        { error: 'No se pudo eliminar el producto' },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: 'Producto no encontrado o sin permiso' },
        { status: 404 }
      );
    }

    return Response.json({
      mensaje: 'Producto eliminado correctamente',
      producto: data
    });

  } catch (error) {
    console.error('Error en DELETE:', error);

    return Response.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
