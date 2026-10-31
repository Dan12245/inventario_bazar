
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EliminarProducto({
  id,
  onProductoEliminado
}) {
  const [eliminando, setEliminando] = useState(false);

  const eliminarProducto = async () => {
    const confirma = window.confirm(
      "¿Desea eliminar este producto?"
    );

    if (!confirma) return;

    setEliminando(true);

    try {
      // Obtenemos la sesión
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session) {
        alert("Debes iniciar sesión");
        return;
      }

      // Solicitamos la eliminación al endpoint
      const respuesta = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        console.error("Error eliminando:", data.error);
        alert(data.error || "No se pudo eliminar el producto");
        return;
      }

      // Ya se eliminó el registro. Ahora limpiamos la imagen.
      const rutaImagen = data.producto?.imagen;

      if (rutaImagen) {
        const marcador = '/imagenes-productos/';
        const posicion = rutaImagen.indexOf(marcador);

        if (posicion !== -1) {
          const rutaArchivo = decodeURIComponent(
            rutaImagen
              .slice(posicion + marcador.length)
              .split('?')[0]
          );

          // Comprobamos que corresponda a nuestro bucket
          const { data: { publicUrl } } = supabase.storage
            .from('imagenes-productos')
            .getPublicUrl(rutaArchivo);

          if (publicUrl === rutaImagen) {
            const { error: errorImagen } = await supabase.storage
              .from('imagenes-productos')
              .remove([rutaArchivo]);

            if (errorImagen) {
              console.warn(
                "El producto se eliminó, pero su imagen no:",
                errorImagen
              );
            }
          }
        }
      }

      alert("Producto eliminado correctamente");

      // Actualizamos la lista
      if (onProductoEliminado) {
        await onProductoEliminado();
      }

    } catch (error) {
      console.error("Error al eliminar producto:", error);
      alert("Ocurrió un error al eliminar el producto");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <button
      onClick={eliminarProducto}
      disabled={eliminando}
      title="Eliminar producto"
    >
      <img
        src="/eliminar.png"
        alt="Eliminar producto"
        className="w-6 h-6 hover:scale-110 transition-transform"
      />
    </button>
  );
}
