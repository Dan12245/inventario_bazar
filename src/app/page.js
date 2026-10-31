
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0E14] text-white flex flex-col">

      {/* Barra de navegación */}
      <header className="w-full border-b border-gray-800">
        <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="bg-violet-500/15 text-violet-400 rounded-lg p-2">
              <span className="text-xl font-bold">B</span>
            </div>

            <h1 className="text-xl font-bold">
              Bazar <span className="text-violet-400">Admin</span>
            </h1>
          </div>

          <Link
            href="/login"
            className="text-sm font-medium text-gray-300 hover:text-violet-400 transition-colors"
          >
            Iniciar sesión
          </Link>

        </nav>
      </header>

      {/* Sección principal */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">

        <div className="max-w-3xl text-center">

          <span className="inline-block bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm px-4 py-2 rounded-full mb-8">
            Sistema de gestión de inventario
          </span>

          <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
            Organiza tu inventario
            <span className="text-violet-400"> en un solo lugar.</span>
          </h2>

          <p className="text-gray-400 text-lg mt-6 leading-relaxed">
            Una plataforma para registrar productos, consultar existencias
            y administrar el catálogo del bazar de forma sencilla.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-3 mt-10 bg-violet-600 hover:bg-violet-700 px-8 py-4 rounded-xl font-semibold transition-colors shadow-lg shadow-violet-900/20"
          >
            Acceder al sistema
            <span aria-hidden="true">→</span>
          </Link>

        </div>

        {/* Tarjetas informativas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20 w-full max-w-4xl">

          <div className="bg-[#171C27] border border-gray-800 rounded-xl p-7">
            <div className="text-violet-400 text-3xl mb-4">
              ▣
            </div>

            <h3 className="text-xl font-semibold mb-3">
              Control de productos
            </h3>

            <p className="text-gray-400 leading-relaxed">
              Registra, consulta y administra los artículos del inventario
              desde una interfaz centralizada.
            </p>
          </div>

          <div className="bg-[#171C27] border border-gray-800 rounded-xl p-7">
            <div className="text-violet-400 text-3xl mb-4">
              ◈
            </div>

            <h3 className="text-xl font-semibold mb-3">
              Acceso seguro
            </h3>

            <p className="text-gray-400 leading-relaxed">
              Accede a las herramientas de administración mediante
              una cuenta autorizada.
            </p>
          </div>

        </div>
      </section>

      {/* Pie de página */}
      <footer className="border-t border-gray-800 py-6 px-6">
        <p className="text-center text-gray-500 text-sm">
          Bazar Admin · Sistema de gestión de inventario
        </p>
      </footer>

    </main>
  );
}
