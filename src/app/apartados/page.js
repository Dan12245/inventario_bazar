import { supabase } from '../../lib/supabase';

import BotonPDF from '@/components/BotonPDF';
import AgregarProductos from '@/components/AgregarProductos';
import EliminarProducto from '@/components/EliminarProducto';

// Al poner 'async' aquí, Next.js sabe que tiene que esperar a la base de datos
export default async function Home() {

  
  // 1. Vamos a Supabase, buscamos tu tabla y nos traemos TODO (*)
  const { data: apartados, error } = await supabase
    .from('pruebas') 
    .select('*');
  // Si hay un error, lo mostramos en consola para saber qué pasó
  if (error) {
    console.error("Error trayendo datos:", error);
  }

  // 2. Pintamos la pantalla
  return (
    <main className="p-10 font-sans">
      <h1 className="text-4xl font-bold text-blue-600 mb-8 no-imprimir">
        Panel de Control - Apartados
      </h1>
      {/* 3. Recorremos los datos y creamos una "tarjeta" por cada uno */}
      <div>
        <AgregarProductos/>
      </div>
      <div className="grid gap-4 max-w-2xl">
        {apartados?.map((item) => (
          <div key={item.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            {/* Datos del producto */}
            <p className="text-red-900 font-bold">Cliente: {item.nombre}</p>
            <p className="text-gray-600">Producto: {item.descripcion}</p>
            <p className="text-sm text-gray-400 mt-2">ID: {item.id}</p>
            {/* Boton de eliminar */}
            <EliminarProducto className="" id={item.id} rutaImagen={item.imagen}/>
            {/** Imagen del producto */}
            {item.imagen && <img className='w-6 h-6' src={item.imagen} alt={item.nombre}/>} 
            <BotonPDF apartado={item}/>
          </div>
        ))}
      </div>
      
      {/* Si la tabla está vacía, mostramos este mensaje */}
      {(!apartados || apartados.length === 0) && (
        <p className="text-gray-500">No hay apartados todavía.</p>
      )}
    </main>
  );
}