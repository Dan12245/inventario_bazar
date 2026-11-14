import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    // Obtener el token enviado por el frontend para autorizar la sesion del usuario
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // Crear cliente de Supabase para esta petición
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

    // Verificar la identidad del usuario
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return Response.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    // Consultar los productos
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq("activo", true)
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    return Response.json(data);

  } catch (error) {
    console.error('Error al obtener productos:', error);

    return Response.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

export async function POST(request) {

  try{
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    // Crear cliente de Supabase para esta petición
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

    // Verificar la identidad del usuario
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return Response.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }
    const producto = await request.json();

    const { nombre, descripcion, cantidad, imagen, precio } = producto;

    // 6. Validamos los datos
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

    // 7. Insertamos en Supabase
    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre: nombre.trim(),
        descripcion: descripcion ?? '',
        cantidad,
        imagen: imagen || null,
        precio:precio
      })
      .select()
      .single();

    if (error) {
      console.error('Error en Supabase:', error);

      return Response.json(
        { error: 'No se pudo guardar el producto' },
        { status: 500 }
      );
    }

    // 8. Devolvemos el producto creado
    return Response.json(data, { status: 201 });
  }catch(e){
      console.error('Error en POST:', e);

    return Response.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
  
}