"use client";

import { supabase } from '../../lib/supabase';
import BotonPDF from '@/components/BotonPDF';
import AgregarProductos from '@/components/AgregarProductos';
import EliminarProducto from '@/components/EliminarProducto';
import EditarProducto from '@/components/EditarProducto';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  // Estados de memoria
  const [cargando, setCargando] = useState(true); // Para el guardia
  const [productos, setProductos] = useState([]); // Para guardar los productos
  const [autenticado, setAutenticado] = useState(false);
  const traerProductos = async () => {
  try {
    const { data: { session }, error: sessionError } =
      await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("No hay una sesión válida");
        return;
      }

      const respuesta = await fetch('/api/productos', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        console.error("Error trayendo productos:", data.error);
        return;
      }

      setProductos(data);

    } catch (error) {
      console.error("Error en la petición:", error);
    }
  };
   // 2. Revisamos la sesión al cargar la página
  useEffect(() => {
    let activo = true;

    const revisarSesion = async () => {
      try {
        const { data: { user }, error } =
          await supabase.auth.getUser();

        if (!activo) return;

        if (error || !user) {
          setAutenticado(false);
          router.replace("/login")
          return;
        }

        setAutenticado(true);
        await traerProductos();

      } catch (error) {
        console.error("Error verificando sesión:", error);

        if (activo) {
          setAutenticado(false);
          router.replace('/login');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    revisarSesion();

    return () => {
      activo = false;
    };
  }, [router]);
  // Mientras el guardia revisa, mostramos esto
  if (cargando) {
    return <p>Revisando credenciales de seguridad...</p>;
  }

  if (!autenticado) {
    return null;
  }
  
  // Cuando el guardia nos deja pasar, mostramos tu pantalla original
  return (
    <main className="p-10 font-sans">
      <h1 className="text-4xl font-bold text-blue-600 mb-8 no-imprimir">
        Panel de Control - productos
      </h1>
      
      <div>
        <AgregarProductos onProductoAgregado={traerProductos}/>
      </div>

      <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse bg-white text-black">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-3 text-left">Imagen</th>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Nombre</th>
            <th className="p-3 text-left">Cantidad</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {productos?.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-3">
                <img
                  src={item.imagen || "/placeholder.png"}
                  alt={item.nombre}
                  className="w-12 h-12 object-cover rounded"
                />
              </td>

              <td className="p-3">{item.id}</td>
              <td className="p-3">{item.nombre}</td>
              <td className="p-3">{item.cantidad}</td>
              <td className="p-3">{item.estado}</td>

              <td className="p-3">
                <div className="flex gap-3">
                  <EditarProducto
                    id={item.id}
                    nombreActual={item.nombre}
                    descActual={item.descripcion}
                    cantActual={item.cantidad}
                    imgActual={item.imagen}
                    onProductoEditado={traerProductos}
                  />

                  <EliminarProducto
                    id={item.id}
                    rutaImagen={item.imagen}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      
      {(!productos || productos.length === 0) && (
        <p className="text-gray-500 mt-4">No hay productos todavía.</p>
      )}
    </main>
  );
}