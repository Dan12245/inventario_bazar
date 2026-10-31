
"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");

  const InicioSesion = async (e) => {
    e.preventDefault();

    if (cargando) return;

    setErrorMensaje("");

    if (!usuario.trim() || !pass) {
      setErrorMensaje("Por favor, rellene todos los campos.");
      return;
    }

    setCargando(true);

    try {
      let usuarioCorreo = usuario.trim();

      // Conservamos tu lógica del dominio
      if (!usuarioCorreo.includes("@")) {
        usuarioCorreo += "@gmail.com";
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: usuarioCorreo,
        password: pass
      });

      if (error) {
        setErrorMensaje("Usuario o contraseña incorrectos.");
        return;
      }

      router.replace("/lista");

    } catch (error) {
      console.error("Error iniciando sesión:", error);
      setErrorMensaje("Ocurrió un error de conexión.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-md">

        {/* Logo y nombre */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-violet-500/15 text-violet-400 rounded-xl p-3">
            <span className="text-2xl font-bold">B</span>
          </div>

          <h1 className="text-3xl font-bold text-white">
            Bazar <span className="text-violet-400">Admin</span>
          </h1>
        </div>

        {/* Tarjeta de login */}
        <div className="bg-[#171C27] border border-gray-800 rounded-2xl p-8 shadow-2xl">

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              Bienvenido de nuevo
            </h2>

            <p className="text-gray-400 text-sm mt-2">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={InicioSesion} className="space-y-6">

            {/* Usuario */}
            <div>
              <label
                htmlFor="usuario"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Usuario o correo electrónico
              </label>

              <input
                id="usuario"
                type="text"
                autoComplete="username"
                placeholder="Ingresa tu usuario o correo"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Contraseña
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={mostrarPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 pr-20 text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
                />

                <button
                  type="button"
                  onClick={() => setMostrarPass(!mostrarPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-violet-400 hover:text-violet-300"
                >
                  {mostrarPass ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {errorMensaje && (
              <div
                role="alert"
                className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg"
              >
                {errorMensaje}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>

          </form>
        </div>

        {/* Pie de página */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Acceso exclusivo para personal autorizado
        </p>

      </div>
    </main>
  );
}
