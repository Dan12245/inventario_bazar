"use client";

import { supabase } from '../../lib/supabase';
import BotonPDF from '@/components/BotonPDF';
import AgregarProductos from '@/components/AgregarProductos';
import EliminarProducto from '@/components/EliminarProducto';
import EditarProducto from '@/components/EditarProducto';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() { // <-- ¡Sin la palabra async!
  const router = useRouter();
  
  // Estados de memoria
  const [cargando, setCargando] = useState(true); // Para el guardia
  const [productos, setProductos] = useState([]); // Para guardar los productos

  useEffect(() => {
    // 1. Función del guardia
    const revisarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setCargando(false);
      }
    };

    // 2. Función para traer productos
    const traerProductos = async () => {
      const { data, error } = await supabase
        .from('productos') 
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error("Error trayendo datos:", error);
      } else {
        setProductos(data); // Guardamos los productos en la memoria
      }
    };

    revisarSesion();
    traerProductos();
  }, []); // <-- Corchetes vacíos para que solo se ejecute al abrir la página

  // Mientras el guardia revisa, mostramos esto
  if (cargando) {
    return (
      <div className="p-10 font-sans">
        <p>Revisando credenciales de seguridad...</p>
      </div>
    );
  }
  
  // Cuando el guardia nos deja pasar, mostramos tu pantalla original
  return (
    <main className="p-10 font-sans">
      <h1 className="text-4xl font-bold text-blue-600 mb-8 no-imprimir">
        Panel de Control - productos
      </h1>
      
      <div>
        <AgregarProductos />
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