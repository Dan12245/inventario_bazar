
"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ApartarProducto({
  producto,
  onApartadoCreado
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Evitar envíos duplicados
  const enviandoRef = useRef(false);

  const disponibles = Number(producto.cantidad || 0);

  // Abrir el modal
  const abrirModal = () => {
    setCliente("");
    setTelefono("");
    setCantidad("1");
    setError("");
    setIsOpen(true);
  };

  // Cerrar el modal
  const cerrarModal = () => {
    if (enviandoRef.current) return;

    setIsOpen(false);
    setError("");
  };

  // Registrar el apartado
  const guardarApartado = async (e) => {
    e.preventDefault();

    if (enviandoRef.current) return;

    const nombreLimpio = cliente.trim();
    const telefonoLimpio = telefono.trim();
    const cantidadNumero = Number(cantidad);

    // Validar nombre
    if (!nombreLimpio) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }

    const nombreValido = /^[\p{L}\p{M}\s.'’-]+$/u;

    if (!nombreValido.test(nombreLimpio)) {
      setError(
        "El nombre solo puede contener letras y signos válidos."
      );
      return;
    }

    // Validar teléfono
    if (!/^\d{10}$/.test(telefonoLimpio)) {
      setError("El teléfono debe contener exactamente 10 dígitos.");
      return;
    }

    // Validar cantidad
    if (
      cantidad === "" ||
      !Number.isSafeInteger(cantidadNumero) ||
      cantidadNumero <= 0
    ) {
      setError("Introduce una cantidad válida.");
      return;
    }

    if (cantidadNumero > disponibles) {
      setError("La cantidad supera las existencias disponibles.");
      return;
    }

    enviandoRef.current = true;
    setGuardando(true);
    setError("");

    try {
      // Obtener sesión
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("No hay una sesión activa.");
      }

      // Registrar apartado mediante nuestra API
      const respuesta = await fetch("/api/apartados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id_producto: producto.id,
          cliente: nombreLimpio,
          telefono: telefonoLimpio,
          cantidad: cantidadNumero
        })
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudo registrar el apartado."
        );
      }

      // Cerrar modal y avisar del éxito
      setIsOpen(false);

      toast.success(
        `Apartado de "${producto.nombre}" registrado correctamente.`
      );

      // Actualizar existencias en la tabla
      if (onApartadoCreado) {
        try {
          await onApartadoCreado();
        } catch (refreshError) {
          console.error(
            "El apartado se registró, pero no se pudo actualizar la tabla:",
            refreshError
          );
        }
      }

    } catch (err) {
      console.error("Error registrando apartado:", err);

      const mensaje =
        err.message || "Ocurrió un error inesperado.";

      setError(mensaje);
      toast.error(mensaje);

    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <div>
      {/* Botón Apartar */}
      <button
        type="button"
        onClick={abrirModal}
        disabled={disponibles <= 0}
        title={
          disponibles <= 0
            ? "Producto agotado"
            : "Apartar producto"
        }
        aria-label={`Apartar ${producto.nombre}`}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-violet-300 hover:bg-violet-500/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          <path d="M12 7v6" />
          <path d="M9 10h6" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={cerrarModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`titulo-apartar-${producto.id}`}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-[#171C27] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="flex items-start justify-between border-b border-gray-800 p-6">
              <div>
                <h2
                  id={`titulo-apartar-${producto.id}`}
                  className="text-xl font-semibold text-white"
                >
                  Apartar producto
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Registra una reserva para este artículo.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar"
                className="text-2xl text-gray-400 hover:text-white disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarApartado}>
              <div className="space-y-5 p-6">

                {/* Producto seleccionado */}
                <div className="rounded-lg border border-gray-700 bg-[#10151E] p-4">
                  <p className="mb-1 text-xs text-gray-400">
                    Producto seleccionado
                  </p>

                  <p className="font-medium text-white">
                    {producto.nombre}
                  </p>

                  <p className="mt-1 text-sm text-green-400">
                    {disponibles} unidades disponibles
                  </p>
                </div>

                {/* Nombre del cliente */}
                <div>
                  <label
                    htmlFor={`cliente-${producto.id}`}
                    className="mb-2 block text-sm text-gray-300"
                  >
                    Nombre del cliente *
                  </label>

                  <input
                    id={`cliente-${producto.id}`}
                    type="text"
                    value={cliente}
                    onChange={(e) =>
                      setCliente(e.target.value)
                    }
                    placeholder="Nombre completo"
                    required
                    disabled={guardando}
                    className="w-full rounded-lg border border-gray-700 bg-[#10151E] px-4 py-3 text-white outline-none focus:border-violet-500 disabled:opacity-50"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label
                    htmlFor={`telefono-${producto.id}`}
                    className="mb-2 block text-sm text-gray-300"
                  >
                    Teléfono *
                  </label>

                  <input
                    id={`telefono-${producto.id}`}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={telefono}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "");
                      setTelefono(valor);
                    }}
                    placeholder="10 dígitos"
                    required
                    disabled={guardando}
                    className="w-full rounded-lg border border-gray-700 bg-[#10151E] px-4 py-3 text-white outline-none focus:border-violet-500 disabled:opacity-50"
                  />
                </div>

                {/* Cantidad */}
                <div>
                  <label
                    htmlFor={`cantidad-apartada-${producto.id}`}
                    className="mb-2 block text-sm text-gray-300"
                  >
                    Cantidad a apartar *
                  </label>

                  <input
                    id={`cantidad-apartada-${producto.id}`}
                    type="number"
                    min="1"
                    step="1"
                    max={disponibles}
                    value={cantidad}
                    onChange={(e) =>
                      setCantidad(e.target.value)
                    }
                    required
                    disabled={guardando}
                    className="w-full rounded-lg border border-gray-700 bg-[#10151E] px-4 py-3 text-white outline-none focus:border-violet-500 disabled:opacity-50"
                  />
                </div>

                {/* Errores de validación */}
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 border-t border-gray-800 px-6 py-5">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-lg bg-gray-700 px-5 py-3 text-gray-200 hover:bg-gray-600 disabled:opacity-40"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? "Registrando..."
                    : "Confirmar apartado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
