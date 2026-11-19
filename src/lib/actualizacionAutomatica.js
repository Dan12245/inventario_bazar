"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// Llama a `alCambiar` cada vez que cambia alguna de las tablas indicadas.
// Uso:  useActualizacionAutomatica(["apartados"], cargarApartados);
//
// Agrupa los eventos (un apartado toca dos tablas) para recargar una sola vez.
export function useActualizacionAutomatica(tablas, alCambiar) {
  const funcionRef = useRef(alCambiar);

  // Siempre usamos la versión más reciente de la función
  useEffect(() => {
    funcionRef.current = alCambiar;
  });

  const clave = tablas.join(",");

  useEffect(() => {
    let temporizador;

    const canal = supabase.channel(`en-vivo-${clave}`);

    for (const tabla of clave.split(",")) {
      canal.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tabla },
        () => {
          clearTimeout(temporizador);
          temporizador = setTimeout(() => {
            Promise.resolve(funcionRef.current?.()).catch((error) =>
              console.error("Error al refrescar en vivo:", error)
            );
          }, 400);
        }
      );
    }

    canal.subscribe();

    return () => {
      clearTimeout(temporizador);
      supabase.removeChannel(canal);
    };
  }, [clave]);
}
