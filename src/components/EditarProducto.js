"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function EditarProducto({id, nombreActual, descActual, cantActual, imgActual, onProductoEditado, }){

    const router = useRouter();
    const [isOpen, setIsOpen] = useState (false);
    const [nombre, setNombre] = useState(nombreActual || "");
    const [descripcion, setDescripcion] = useState(descActual || "");
    const [cantidad, setCantidad] = useState(cantActual || "");
    const [imagen, setImagen] = useState(null);
    //variable para cambiar la tabla donde se hacen las queries
    const tabla = 'productos'
    
    const abrirModal = () => {
            setNombre(nombreActual ?? "");
            setDescripcion(descActual ?? "");
            setCantidad(cantActual ?? "");
            setImagen(null);
            setIsOpen(true);
        };

    const editarProducto = async () => {
    if (!nombre.trim() || cantidad === "") {
        alert("Por favor, llene los campos obligatorios");
        return;
    }

    const cantidadNumero = Number(cantidad);

    if (!Number.isSafeInteger(cantidadNumero) || cantidadNumero < 0) {
        alert("La cantidad debe ser un número entero no negativo");
        return;
    }

    let nuevaImagenNombre = null;

    try {
        const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

        if (sessionError || !session) {
        alert("Debes iniciar sesión");
        return;
        }

        let imagenRuta = null;

        // Si se seleccionó una imagen nueva, la subimos
        if (imagen) {
        nuevaImagenNombre = `${crypto.randomUUID()}-${imagen.name}`;

        const { error: errorImagen } = await supabase.storage
            .from('imagenes-productos')
            .upload(nuevaImagenNombre, imagen);

        if (errorImagen) {
            console.error(errorImagen);
            alert("No se pudo subir la imagen");
            return;
        }

        const { data: imagenNombre } = supabase.storage
            .from('imagenes-productos')
            .getPublicUrl(nuevaImagenNombre);

        imagenRuta = imagenNombre.publicUrl;
        }

        // Construimos los datos para el PATCH
        const productoEditado = {
        nombre,
        descripcion,
        cantidad: cantidadNumero
        };

        if (imagenRuta) {
        productoEditado.imagen = imagenRuta;
        }

        // Enviamos los datos a nuestro endpoint
        const respuesta = await fetch(`/api/productos/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(productoEditado)
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
        // Si el PATCH falla, intentamos limpiar la imagen recién subida
        if (nuevaImagenNombre) {
            const { error: limpiezaError } = await supabase.storage
            .from('imagenes-productos')
            .remove([nuevaImagenNombre]);

            if (limpiezaError) console.error(limpiezaError);
        }

        alert(data.error || "No se pudo editar el producto");
        return;
        }

        // Si se guardó correctamente, intentamos borrar la imagen anterior
        if (nuevaImagenNombre && imgActual) {
        const marcador = '/imagenes-productos/';
        const posicion = imgActual.indexOf(marcador);

        if (posicion !== -1) {
            const rutaAnterior = decodeURIComponent(
            imgActual.slice(posicion + marcador.length).split('?')[0]
            );

            const { error: errorEliminar } = await supabase.storage
            .from('imagenes-productos')
            .remove([rutaAnterior]);

            if (errorEliminar) {
            console.warn("No se pudo eliminar la imagen anterior:", errorEliminar);
            }
        }
        }

        alert("Producto actualizado con éxito");

        setImagen(null);
        setIsOpen(false);

        if (onProductoEditado) {
        await onProductoEditado();
        }

    } catch (error) {
        console.error("Error editando producto:", error);
        alert("Ocurrió un error al editar el producto");
    }
    };

    
     
return (
  <div>
        {/* Botón para abrir el modal */}
        <button
        type="button"
        onClick={abrirModal}
        title="Editar producto"
        aria-label={`Editar producto ${nombreActual}`}
        className="hover:scale-110 transition-transform"
        >
        <img
            src="/editar.png"
            alt=""
            className="w-6 h-6"
        />
        </button>

        {isOpen && (
        <div
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
        >
            <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-editar"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#171C27] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
            {/* Encabezado */}
            <div className="flex items-start justify-between p-6 border-b border-gray-800">
                <div>
                <h2
                    id="titulo-editar"
                    className="text-xl font-semibold text-white"
                >
                    Editar producto
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                    Actualiza la información del artículo.
                </p>
                </div>

                <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-white text-2xl"
                >
                ×
                </button>
            </div>

            {/* Campos del formulario */}
            <div className="p-6 space-y-5">

                {/* Nombre */}
                <div>
                <label
                    htmlFor={`nombre-${id}`}
                    className="block text-sm text-gray-300 mb-2"
                >
                    Nombre del producto *
                </label>

                <input
                    id={`nombre-${id}`}
                    type="text"
                    placeholder="Nombre del producto"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500"
                />
                </div>

                {/* Descripción */}
                <div>
                <label
                    htmlFor={`descripcion-${id}`}
                    className="block text-sm text-gray-300 mb-2"
                >
                    Descripción
                </label>

                <textarea
                    id={`descripcion-${id}`}
                    placeholder="Describe el producto..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500 resize-none"
                />
                </div>

                {/* Cantidad */}
                <div>
                <label
                    htmlFor={`cantidad-${id}`}
                    className="block text-sm text-gray-300 mb-2"
                >
                    Cantidad *
                </label>

                <input
                    id={`cantidad-${id}`}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Cantidad del producto"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500"
                />
                </div>

                {/* Imagen actual */}
                <div>
                <p className="text-sm text-gray-300 mb-2">
                    Imagen actual
                </p>

                {imgActual ? (
                    <div className="flex items-center gap-4 bg-[#10151E] border border-gray-700 rounded-lg p-3">
                    <img
                        src={imgActual}
                        alt={`Imagen actual de ${nombreActual}`}
                        className="w-20 h-20 object-cover rounded-lg bg-gray-800"
                    />

                    <div>
                        <p className="text-sm text-gray-200">
                        Fotografía registrada
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                        Puedes reemplazar esta imagen.
                        </p>
                    </div>
                    </div>
                ) : (
                    <div className="bg-[#10151E] border border-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                        Este producto no tiene imagen.
                    </p>
                    </div>
                )}
                </div>

                {/* Nueva imagen */}
                <div>
                <label
                    htmlFor={`imagen-${id}`}
                    className="block text-sm text-gray-300 mb-2"
                >
                    Nueva imagen (opcional)
                </label>

                <input
                    id={`imagen-${id}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                    setImagen(e.target.files?.[0] ?? null)
                    }
                    className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-500/15 file:px-4 file:py-3 file:text-violet-300 hover:file:bg-violet-500/25"
                />

                <p className="text-xs text-gray-500 mt-2">
                    Si no seleccionas otra imagen, se conservará la actual.
                </p>
                </div>

            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 px-6 py-5 border-t border-gray-800">

                <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                >
                Cancelar
                </button>

                <button
                type="button"
                onClick={editarProducto}
                className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
                >
                Guardar cambios
                </button>

            </div>
            </div>
        </div>
        )}
    </div>
    );
}