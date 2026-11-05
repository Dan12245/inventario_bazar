"use client";

import { supabase } from "../../lib/supabase";
import BotonPDF from "@/components/BotonPDF";
import AgregarProductos from "@/components/AgregarProductos";
import EliminarProducto from "@/components/EliminarProducto";
import EditarProducto from "@/components/EditarProducto";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/SideBar";
import ApartarProducto from "@/components/ApartarProductos";

export default function Home() {
  const router = useRouter();

  // Estados
  const [cargando, setCargando] = useState(true);
  const [productos, setProductos] = useState([]);
  const [autenticado, setAutenticado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  

  // Obtener productos desde nuestra API
  const traerProductos = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("No hay una sesión válida");
        return;
      }

      const respuesta = await fetch("/api/productos", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        console.error(
          "Error trayendo productos:",
          data.error
        );
        return;
      }

      setProductos(data);
    } catch (error) {
      console.error("Error en la petición:", error);
    }
  };

  // Verificar sesión
  useEffect(() => {
    let activo = true;

    const revisarSesion = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!activo) return;

        if (error || !user) {
          setAutenticado(false);
          router.replace("/login");
          return;
        }

        setAutenticado(true);
        await traerProductos();
      } catch (error) {
        console.error(
          "Error verificando sesión:",
          error
        );

        if (activo) {
          setAutenticado(false);
          router.replace("/login");
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

  // Pantalla de carga
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-gray-300">
        Revisando credenciales de seguridad...
      </div>
    );
  }

  if (!autenticado) {
    return null;
  }

  // Filtrar productos por nombre
  const productosFiltrados = productos.filter(
    (producto) =>
      producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  // Total de unidades
  const totalUnidades = productos.reduce(
    (total, producto) =>
      total + Number(producto.cantidad || 0),
    0
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0E14] text-gray-100">

      {/* Menú lateral */}
      <Sidebar />

      {/* Contenido principal */}
      <main className="flex-1 min-w-0 min-h-0 p-8 flex flex-col overflow-hidden">

        {/* Título principal */}
        <div className="shrink-0 mb-8 no-imprimir">
          <p className="text-sm font-medium text-violet-400 mb-2">
            PANEL DE ADMINISTRACIÓN
          </p>

          <h1 className="text-3xl font-bold text-white">
            Inventario
          </h1>

          <p className="text-gray-400 mt-2">
            Administra los productos disponibles
            en el bazar.
          </p>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 shrink-0">

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
              {totalUnidades}
            </h2>
          </div>

        </div>

        {/* Panel de inventario */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#171C27] border border-gray-800 rounded-xl">

          {/* Encabezado del panel */}
          <div className="shrink-0 p-6 border-b border-gray-800">

            {/* Título y botón de agregar */}
            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>
                <h2 className="text-xl font-semibold text-white">
                  Lista de productos
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  Consulta y administra los artículos
                  del inventario.
                </p>
              </div>

              <AgregarProductos
                onProductoAgregado={traerProductos}
              />
            </div>

            {/* Buscador */}
            <div className="mt-6">
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                className="w-full max-w-md bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500"
              />
            </div>

          </div>

          {/* ÚNICA SECCIÓN CON SCROLL */}
          <div className="flex-1 min-h-0 min-w-0 overflow-auto">

            <table className="w-full min-w-[750px] text-sm">

              {/* Encabezados fijos */}
              <thead className="sticky top-0 z-10 bg-[#252B36]">
                <tr>
                  <th className="p-4 font-medium">
                    Imagen
                  </th>

                  <th className="p-4 font-medium">
                    ID
                  </th>

                  <th className="p-4 font-medium">
                    Nombre
                  </th>

                  <th className="p-4 font-medium">
                    Cantidad
                  </th>

                  <th className="p-4 font-medium">
                    Estado
                  </th>

                  <th className="p-4 font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* Productos */}
              <tbody className="divide-y divide-gray-800">

                {productosFiltrados.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#202633] transition-colors"
                  >

                    {/* Imagen */}
                    <td className="p-4">
                      <img
                        src={
                          item.imagen ||
                          "/placeholder.png"
                        }
                        alt={item.nombre}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-800"
                      />
                    </td>

                    {/* ID */}
                    <td className="p-4 text-gray-400">
                      {item.id}
                    </td>

                    {/* Nombre */}
                    <td className="p-4 font-medium text-white">
                      {item.nombre}
                    </td>

                    {/* Cantidad */}
                    <td className="p-4 text-gray-300">
                      {item.cantidad}
                    </td>

                    {/* Estado */}
                    <td className="p-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-300">
                        {item.estado || "Sin estado"}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">

                        {/* PDF */}
                        <BotonPDF producto={item} />

                        {/* Editar */}
                        <EditarProducto
                          id={item.id}
                          nombreActual={item.nombre}
                          descActual={item.descripcion}
                          cantActual={item.cantidad}
                          imgActual={item.imagen}
                          onProductoEditado={traerProductos}
                        />

                        {/* Eliminar */}
                        <EliminarProducto
                          id={item.id}
                          onProductoEliminado={traerProductos}
                        />

                        <ApartarProducto
                          producto={item}
                          onApartadoCreado={traerProductos}
                        />

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>

            {/* Mensaje dentro del área de scroll */}
            {productosFiltrados.length === 0 && (
              <p className="text-center text-gray-400 py-10">
                {productos.length === 0
                  ? "No hay productos todavía."
                  : "No se encontraron productos."}
              </p>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
