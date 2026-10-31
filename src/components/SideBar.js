
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

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
          className={`px-4 py-3 rounded-lg transition-colors ${
            pathname === "/lista"
              ? "bg-violet-600/20 text-violet-300"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          Inventario
        </Link>

        {/* Esta sección la activaremos después */}
        <div className="px-4 py-3 rounded-lg text-gray-600 cursor-not-allowed">
          Apartados (próximamente)
        </div>

      </nav>

      <div className="mt-auto pt-8 text-xs text-gray-600">
        Sistema de inventario
      </div>
    </aside>
  );
}
