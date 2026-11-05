
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const inventarioActivo = pathname === "/lista";
  const apartadosActivo = pathname === "/apartados";

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

      <div className="mt-auto pt-8 text-xs text-gray-600">
        Sistema de inventario
      </div>
    </aside>
  );
}
