"use client"; 
import { PDFDownloadLink } from '@react-pdf/renderer';
import EtiquetaPDF from './EtiquetaPDF';
import { useState, useEffect } from 'react';

// Este componente recibe la información del apartado como "prop"
export default function BotonPDF({ apartado }) {
  // Verificamos que estamos en el navegador antes de renderizar el PDF
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <button className="mt-4 text-gray-400">Cargando...</button>;

  return (
    <PDFDownloadLink
      document={<EtiquetaPDF apartado={apartado} />}
      fileName={`etiqueta-${apartado.cliente}.pdf`}
      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors inline-block"
    >
      {({ loading }) => (loading ? 'Generando PDF...' : 'Descargar PDF')}
    </PDFDownloadLink>
  );
}