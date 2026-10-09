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
  const [apartados, setApartados] = useState([]); // Para guardar los productos

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
        .from('pruebas') 
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error("Error trayendo datos:", error);
      } else {
        setApartados(data); // Guardamos los productos en la memoria
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
        Panel de Control - Apartados
      </h1>
      
      <div>
        <AgregarProductos />
      </div>

      <div className="grid gap-4 max-w-2xl mt-4">
        {apartados?.map((item) => (
          <div key={item.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            <p className="text-red-900 font-bold">Cliente: {item.nombre}</p>
            <p className="text-gray-600">Producto: {item.descripcion}</p>
            <p className="text-sm text-gray-400 mt-2">ID: {item.id}</p>
            
            <EliminarProducto id={item.id} rutaImagen={item.imagen} />
            <EditarProducto id={item.id} nombreActual={item.nombre} descActual={item.descripcion} cantActual={item.cantidad} imgActual={item.imagen} />
            
            {item.imagen && <img className='w-6 h-6' src={item.imagen} alt={item.nombre} />} 
            <BotonPDF apartado={item} />
          </div>
        ))}
      </div>
      
      {(!apartados || apartados.length === 0) && (
        <p className="text-gray-500 mt-4">No hay apartados todavía.</p>
      )}
    </main>
  );
}