
"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import EtiquetaPDF from "./EtiquetaPDF";
import { useState, useEffect } from "react";

export default function BotonPDF({ producto }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <PDFDownloadLink
      document={<EtiquetaPDF producto={producto} />}
      fileName={`etiqueta-${producto.id}.pdf`}
      title="Descargar etiqueta PDF"
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-violet-500/15 transition-colors"
    >
      {({ loading, error }) =>
        loading ? (
          <span className="text-xs text-gray-400">
            ...
          </span>
        ) : error ? (
          <span className="text-red-400" title="Error al generar PDF">
            !
          </span>
        ) : (
          <img
            src="/pdf.png"
            alt={`Descargar etiqueta de ${producto.nombre}`}
            className="w-6 h-6 hover:scale-110 transition-transform"
          />
        )
      }
    </PDFDownloadLink>
  );
}
