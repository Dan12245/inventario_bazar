
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/SideBar";

export default function ApartadosPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [apartados, setApartados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [errorApartados, setErrorApartados] = useState("");
  const [procesandoId, setProcesandoId] = useState(null);

  
    const actualizarApartado = async (id, estado) => {
        // Evitar solicitudes mientras se procesa otra
        if (procesandoId !== null) return;

        const accion =
            estado === "Entregado" ? "entregar" : "cancelar";

        const confirmado = window.confirm(
            `¿Estás seguro de que deseas ${accion} el apartado #${id}?`
        );

        if (!confirmado) return;

        try {
            setProcesandoId(id);

            // Obtener la sesión actual
            const {
            data: { session },
            error: sessionError
            } = await supabase.auth.getSession();

            if (sessionError || !session) {
            alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
            router.replace("/login");
            return;
            }

            // Llamar al endpoint PATCH
            const respuesta = await fetch(`/api/apartados/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ estado })
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
            throw new Error(
                resultado.error || "No se pudo actualizar el apartado"
            );
            }

            // Volver a consultar los apartados
            await traerApartados();

        } catch (error) {
            console.error("Error actualizando apartado:", error);
            alert(error.message);

        } finally {
            setProcesandoId(null);
        }
    };


  // Obtener apartados desde nuestra API
  const traerApartados = async () => {
    try {
      setErrorApartados("");

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorApartados("No hay una sesión activa");
        return;
      }

      const respuesta = await fetch("/api/apartados", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        cache: "no-store"
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudieron cargar los apartados"
        );
      }

      setApartados(resultado);

    } catch (error) {
      console.error("Error obteniendo apartados:", error);
      setErrorApartados(error.message);
    }
  };

  // Verificar sesión al entrar
  useEffect(() => {
    let activo = true;

    const revisarSesion = async () => {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (!activo) return;

        if (error || !user) {
          router.replace("/login");
          return;
        }

        setAutenticado(true);
        await traerApartados();

      } catch (error) {
        console.error("Error verificando sesión:", error);
        if (activo) router.replace("/login");
      } finally {
        if (activo) setCargando(false);
      }
    };

    revisarSesion();

    return () => {
      activo = false;
    };
  }, [router]);

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-gray-300">
        Cargando apartados...
      </div>
    );
  }

  if (!autenticado) return null;

  // Estadísticas
  const pendientes = apartados.filter(
    (a) => a.estado === "Pendiente"
  ).length;

  const entregados = apartados.filter(
    (a) => a.estado === "Entregado"
  ).length;

  const cancelados = apartados.filter(
    (a) => a.estado === "Cancelado"
  ).length;

  // Buscador
  const apartadosFiltrados = apartados.filter((a) => {
    const texto = busqueda.toLowerCase();

    const cliente = (a.persona_que_aparto || "").toLowerCase();
    const producto = (a.productos?.nombre || "").toLowerCase();

    return cliente.includes(texto) || producto.includes(texto);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0E14] text-gray-100">

      <Sidebar />

      <main className="flex-1 min-w-0 min-h-0 p-8 flex flex-col overflow-hidden">

        {/* Encabezado principal */}
        <div className="shrink-0 mb-8">
          <p className="text-sm font-medium text-violet-400 mb-2">
            PANEL DE ADMINISTRACIÓN
          </p>

          <h1 className="text-3xl font-bold text-white">
            Apartados
          </h1>

          <p className="text-gray-400 mt-2">
            Consulta y administra las reservas de productos del bazar.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mb-8 shrink-0">

          <div className="bg-[#171C27] border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400">
              Pendientes
            </p>
            <h2 className="text-3xl font-bold text-yellow-400 mt-2">
              {pendientes}
            </h2>
          </div>

          <div className="bg-[#171C27] border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400">
              Entregados
            </p>
            <h2 className="text-3xl font-bold text-green-400 mt-2">
              {entregados}
            </h2>
          </div>

          <div className="bg-[#171C27] border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400">
              Cancelados
            </p>
            <h2 className="text-3xl font-bold text-red-400 mt-2">
              {cancelados}
            </h2>
          </div>

        </div>

        {/* Panel de apartados */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#171C27] border border-gray-800 rounded-xl">

          {/* Encabezado y buscador */}
          <div className="shrink-0 p-6 border-b border-gray-800">

            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Lista de apartados
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  Consulta las reservas registradas.
                </p>
              </div>

              {/* Aquí agregaremos NuevoApartado */}
            </div>

            <div className="mt-6">
              <input
                type="text"
                placeholder="Buscar por cliente o producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full max-w-md bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-violet-500"
              />
            </div>

          </div>

          {/* Tabla con scroll independiente */}
          <div className="flex-1 min-h-0 min-w-0 overflow-auto">

            <table className="w-full min-w-[950px] text-sm">

              <thead className="sticky top-0 z-10 bg-[#252B36]">
                <tr>
                  <th className="p-4 font-medium text-left">ID</th>
                  <th className="p-4 font-medium text-left">Cliente</th>
                  <th className="p-4 font-medium text-left">Teléfono</th>
                  <th className="p-4 font-medium text-left">Producto</th>
                  <th className="p-4 font-medium text-center">Cantidad</th>
                  <th className="p-4 font-medium text-left">Fecha</th>
                  <th className="p-4 font-medium text-center">Estado</th>
                  <th className="p-4 font-medium text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800">
                {apartadosFiltrados.map((apartado) => (

                  <tr
                    key={apartado.id}
                    className="hover:bg-[#202633] transition-colors"
                  >
                    <td className="p-4 text-gray-400">
                      {apartado.id}
                    </td>

                    <td className="p-4 font-medium text-white">
                      {apartado.persona_que_aparto}
                    </td>

                    <td className="p-4 text-gray-300">
                      {apartado.numero_persona}
                    </td>

                    <td className="p-4 text-gray-300">
                      {apartado.productos?.nombre || "Sin producto"}
                    </td>

                    <td className="p-4 text-center text-gray-300">
                      {apartado.cantidad_apartada}
                    </td>

                    <td className="p-4 text-gray-400">
                      {new Date(apartado.created_at).toLocaleDateString(
                        "es-MX"
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          apartado.estado === "Pendiente"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : apartado.estado === "Entregado"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {apartado.estado}
                      </span>
                    </td>

                    
                    <td className="p-4">
                    {apartado.estado === "Pendiente" ? (
                        <div className="flex items-center justify-center gap-2">

                        {/* Botón Entregar */}
                        <button
                            type="button"
                            onClick={() =>
                            actualizarApartado(apartado.id, "Entregado")
                            }
                            disabled={procesandoId !== null}
                            title="Marcar como entregado"
                            className="px-3 py-2 text-xs font-medium rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {procesandoId === apartado.id
                            ? "Procesando..."
                            : "Entregar"}
                        </button>

                        {/* Botón Cancelar */}
                        <button
                            type="button"
                            onClick={() =>
                            actualizarApartado(apartado.id, "Cancelado")
                            }
                            disabled={procesandoId !== null}
                            title="Cancelar apartado"
                            className="px-3 py-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {procesandoId === apartado.id
                            ? "Procesando..."
                            : "Cancelar"}
                        </button>

                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                        —
                        </div>
                    )}
                    </td>


                  </tr>
                ))}
              </tbody>

            </table>

            {apartadosFiltrados.length === 0 && (
              <p className="text-center text-gray-400 py-10">
                {errorApartados
                  ? errorApartados
                  : apartados.length === 0
                  ? "No hay apartados registrados."
                  : "No se encontraron coincidencias."}
              </p>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}
