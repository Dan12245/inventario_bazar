"use client";

import { supabase } from '../../lib/supabase';
import BotonPDF from '@/components/BotonPDF';
import AgregarProductos from '@/components/AgregarProductos';
import EliminarProducto from '@/components/EliminarProducto';
import EditarProducto from '@/components/EditarProducto';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/SideBar';

export default function Home() {
  const router = useRouter();
  
  // Estados de memoria
  const [cargando, setCargando] = useState(true); // Para el guardia
  const [productos, setProductos] = useState([]); // Para guardar los productos
  const [autenticado, setAutenticado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
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
  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  // Cuando el guardia nos deja pasar, mostramos tu pantalla original
  return (
     <div className="flex h-screen overflow-hidden bg-[#0B0E14] text-gray-100">
      <Sidebar />

      <main className="flex-1 min-w-0 min-h-0 p-8 flex flex-col overflow-hidden">
        <div className="mb-8 no-imprimir">
          <p className="text-sm font-medium text-violet-400 mb-2">
            PANEL DE ADMINISTRACIÓN
          </p>

          <h1 className="text-3xl font-bold text-white">
            Inventario
          </h1>

          <p className="text-gray-400 mt-2">
            Administra los productos disponibles en el bazar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#171C27] border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">
              Productos registrados
            </p>

            <h2 className="text-3xl font-bold text-white mt-2">
              {productos.length}
            </h2>
          </div>

          <div className="bg-[#171C27] border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">
              Unidades en inventario
            </p>

            <h2 className="text-3xl font-bold text-white mt-2">
              {productos.reduce(
                (total, producto) => total + Number(producto.cantidad || 0),
                0
              )}
            </h2>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#171C27] border border-gray-800 rounded-xl p-6">

          {/* Encabezado de la tabla */}
          <div className="p-6 border-b border-gray-800">

            {/* Primera fila: título y botón */}
            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>
                <h2 className="text-xl font-semibold text-white">
                  Lista de productos
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  Consulta y administra los artículos del inventario.
                </p>
              </div>

              <AgregarProductos  onProductoAgregado={traerProductos} />

            </div>

            {/* Segunda fila: buscador */}
            <div className="mt-6">
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full max-w-md bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500"
              />
            </div>

          </div>

            {/* Tabla */}
          <div className="h-[250px] shrink-0 overflow-auto">
            <table className="w-full">

                <thead  className="sticky top-0 z-10 bg-[#252B36]">
                  <tr>
                    <th className="p-4 font-medium">Imagen</th>
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Nombre</th>
                    <th className="p-4 font-medium">Cantidad</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-800">
                  {productosFiltrados.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#202633] transition-colors"
                    >
                      <td className="p-4">
                        <img
                          src={item.imagen || "/placeholder.png"}
                          alt={item.nombre}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-800"
                        />
                      </td>

                      <td className="p-4 text-gray-400">
                        {item.id}
                      </td>

                      <td className="p-4 font-medium text-white">
                        {item.nombre}
                      </td>

                      <td className="p-4 text-gray-300">
                        {item.cantidad}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-300">
                          {item.estado}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <BotonPDF producto={item} />

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
                            onProductoEliminado={traerProductos}
                          />

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            {/* Mensaje cuando no hay coincidencias */}
            {productosFiltrados.length === 0 && (
              <p className="text-center text-gray-400 py-10">
                No se encontraron productos.
              </p>
            )}
          </div>
                  
          {(!productos || productos.length === 0) && (
            <p className="text-gray-500 mt-4">No hay productos todavía.</p>
            )}
          </main>
        </div>
        
      );
}