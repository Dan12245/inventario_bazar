"use client";

import { useState } from "react";

// Genera la etiqueta SOLO al hacer clic (antes se generaba un PDF por fila al cargar la tabla)
export default function BotonPDF({ producto }) {
  const [generando, setGenerando] = useState(false);

  const descargar = async () => {
    if (generando) return;

    setGenerando(true);

    try {
      const [{ pdf }, { default: EtiquetaPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./EtiquetaPDF")
      ]);

      const blob = await pdf(<EtiquetaPDF producto={producto} />).toBlob();
      const url = URL.createObjectURL(blob);

      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `etiqueta-${producto.id}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generando la etiqueta:", error);
      alert("No se pudo generar la etiqueta");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={descargar}
      disabled={generando}
      title="Descargar etiqueta PDF"
      aria-label={`Descargar etiqueta de ${producto.nombre}`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-violet-500/15 transition-colors disabled:opacity-40"
    >
      {generando ? (
        <span className="text-xs text-gray-400">...</span>
      ) : (
        <img
          src="/pdf.png"
          alt=""
          className="w-6 h-6 hover:scale-110 transition-transform"
        />
      )}
    </button>
  );
}
