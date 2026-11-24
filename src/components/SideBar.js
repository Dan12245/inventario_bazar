"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [cerrando, setCerrando] = useState(false);

  const inventarioActivo = pathname === "/lista";
  const apartadosActivo = pathname === "/apartados";

  // Mostrar quién tiene la sesión abierta (útil en compus compartidas)
  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (activo) setCorreo(data.session?.user?.email ?? "");
    });

    return () => {
      activo = false;
    };
  }, []);

  const cerrarSesion = async () => {
    if (cerrando) return;

    setCerrando(true);

    try {
      // scope "local": solo cierra esta sesión, no las de otros dispositivos
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        console.error("Error cerrando sesión:", error);
      }
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      // Pase lo que pase, mandamos al login
      router.replace("/login");
    }
  };

  return (
    <aside className="w-64 min-h-screen bg-[#151A24] border-r border-gray-800 p-6 flex flex-col">

      {/* Identidad de la aplicación */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white">
          Bazar <span className="text-violet-400">Admin</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Gestión de inventario
        </p>
      </div>

      {/* Navegación */}
      <nav className="flex flex-col gap-2">

        <Link
          href="/lista"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            inventarioActivo
              ? "bg-violet-600/15 text-violet-400 font-medium"
              : "text-gray-400 hover:bg-[#252B36] hover:text-white"
          }`}
        >
          Inventario
        </Link>

        <Link
          href="/apartados"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            apartadosActivo
              ? "bg-violet-600/15 text-violet-400 font-medium"
              : "text-gray-400 hover:bg-[#252B36] hover:text-white"
          }`}
        >
          Apartados
        </Link>

      </nav>

      {/* Sesión */}
      <div className="mt-auto pt-8">
        {correo && (
          <p
            className="text-xs text-gray-500 mb-3 truncate"
            title={correo}
          >
            {correo}
          </p>
        )}

        <button
          type="button"
          onClick={cerrarSesion}
          disabled={cerrando}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>

        <p className="mt-4 text-xs text-gray-600">
          Sistema de inventario
        </p>
      </div>
    </aside>
  );
}
