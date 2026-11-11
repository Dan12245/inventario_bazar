
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ProductosRetirados({
  onProductoReactivado
}) {
  const [abierto, setAbierto] = useState(false);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [reactivandoId, setReactivandoId] = useState(null);

  const obtenerToken = async () => {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("No hay una sesión activa.");
    }

    return session.access_token;
  };

  const traerRetirados = async () => {
    setCargando(true);

    try {
      const token = await obtenerToken();

      const respuesta = await fetch(
        "/api/productos/retirados",
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: "no-store"
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
          "No se pudieron cargar los productos."
        );
      }

      setProductos(resultado);

    } catch (error) {
      console.error(error);
      toast.error(error.message);

    } finally {
      setCargando(false);
    }
  };

  const abrirModal = () => {
    setAbierto(true);
    traerRetirados();
  };

  const reactivarProducto = async (producto) => {
    if (reactivandoId !== null) return;

    const confirmado = window.confirm(
      `¿Deseas reactivar el producto "${producto.nombre}"?`
    );

    if (!confirmado) return;

    setReactivandoId(producto.id);

    try {
      const token = await obtenerToken();

      const respuesta = await fetch(
        `/api/productos/${producto.id}/reactivar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
          "No se pudo reactivar el producto."
        );
      }

      // Actualizar lista de retirados
      setProductos((anteriores) =>
        anteriores.filter(
          (item) => item.id !== producto.id
        )
      );

      toast.success("Producto reactivado correctamente.");

      // Actualizar inventario principal
      if (onProductoReactivado) {
        try {
          await onProductoReactivado();
        } catch (error) {
          console.error("Error actualizando inventario:", error);
          toast.warning(
            "Reactivado, pero no se pudo actualizar el inventario."
          );
        }
      }

    } catch (error) {
      console.error(error);
      toast.error(error.message);

    } finally {
      setReactivandoId(null);
    }
  };

  return (
    <>
      {/* Botón para abrir el historial */}
      <button
        type="button"
        onClick={abrirModal}
        className="px-4 py-2 rounded-lg bg-[#252B36] text-gray-200 hover:bg-[#343D4D] transition-colors"
      >
        Ver retirados
      </button>

      {/* Modal */}
      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">

          <div className="w-full max-w-2xl max-h-[85vh] bg-[#171C27] rounded-xl border border-gray-700 shadow-xl flex flex-col overflow-hidden">

            {/* Encabezado */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Productos retirados
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  Consulta y recupera productos del inventario.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-gray-400 hover:text-white text-2xl"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">

              {cargando ? (
                <p className="text-center text-gray-400 py-8">
                  Cargando productos...
                </p>

              ) : productos.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  No hay productos retirados.
                </p>

              ) : (
                <div className="space-y-3">
                  {productos.map((producto) => (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between gap-4 bg-[#202633] p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">

                        <img
                          src={
                            producto.imagen ||
                            "/placeholder.png"
                          }
                          alt={producto.nombre}
                          className="w-14 h-14 object-cover rounded-lg bg-gray-800 shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="text-white font-medium break-words">
                            {producto.nombre}
                          </p>

                          <p className="text-xs text-gray-400">
                            ID: {producto.id}
                          </p>

                          <p className="text-xs text-gray-400">
                            Cantidad: {producto.cantidad}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => reactivarProducto(producto)}
                        disabled={reactivandoId !== null}
                        className="shrink-0 px-3 py-2 text-sm rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {reactivandoId === producto.id
                          ? "Reactivando..."
                          : "Reactivar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="p-4 border-t border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="px-4 py-2 rounded-lg bg-[#252B36] text-gray-200 hover:bg-[#343D4D]"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
