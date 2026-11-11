
"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function EliminarProducto({
  id,
  onProductoEliminado
}) {
  const [eliminando, setEliminando] = useState(false);
  const procesandoRef = useRef(false);

  const retirarProducto = async () => {
    // Evitar solicitudes duplicadas
    if (procesandoRef.current) return;

    // Confirmar antes de retirar
    const confirmado = window.confirm(
      "¿Estás seguro de que deseas retirar este producto del inventario?"
    );

    if (!confirmado) return;

    procesandoRef.current = true;
    setEliminando(true);

    try {
      // Obtener sesión de Supabase
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("No hay una sesión activa.");
      }

      // Solicitar retiro mediante nuestra API
      const respuesta = await fetch(
        `/api/productos/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      const texto = await respuesta.text();

      let resultado = {};

      try {
        resultado = texto ? JSON.parse(texto) : {};
      } catch {
        throw new Error(
          `El servidor devolvió una respuesta inválida (${respuesta.status}).`
        );
      }

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
          `No se pudo retirar el producto (${respuesta.status}).`
        );
      }

      if (!texto) {
        throw new Error(
          "El servidor respondió sin contenido. Revisa el endpoint DELETE."
        );
      }

      // Notificar éxito
      toast.success("Producto retirado correctamente.");

      // Actualizar la tabla del inventario
      if (onProductoEliminado) {
        try {
          await onProductoEliminado();
        } catch (refreshError) {
          console.error(
            "El producto fue retirado, pero no se pudo actualizar la tabla:",
            refreshError
          );

          toast.warning(
            "El producto se retiró, pero no se pudo actualizar la lista."
          );
        }
      }

    } catch (error) {
      console.error("Error retirando producto:", error);

      toast.error(
        error.message || "Ocurrió un error al retirar el producto."
      );

    } finally {
      procesandoRef.current = false;
      setEliminando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={retirarProducto}
      disabled={eliminando}
      title="Retirar producto"
      aria-label={`Retirar producto ${id}`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {eliminando ? (
        <span className="text-xs">...</span>
      ) : (
        <img
          src="/eliminar.png"
          alt=""
          className="w-6 h-6 hover:scale-110 transition-transform"
        />
      )}
    </button>
  );
}
