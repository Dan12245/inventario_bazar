"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {useRouter} from "next/navigation";


export default function AgregarProductos({ onProductoAgregado })
{
    const router = useRouter();
    const [isOpen, setIsOpen] = useState (false);
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [cantidad, setCantidad] = useState("");
    const [imagen, setImagen] = useState(null);
    const [precio, setPrecio] = useState("");

    const borrarImagenSubida = async () => {
        if (!nuevoNombre) return;

        const { error } = await supabase.storage
            .from("imagenes-productos")
            .remove([nuevoNombre]);

        if (error) console.error("No se pudo limpiar la imagen:", error);
    };

    const guardarProducto = async ()=>{
        //revisamos que se hayan llenado los campos necesarios
        if (
            !nombre.trim() ||
            cantidad === "" ||
            precio === ""
            ) {
                alert("Por favor, llene los campos obligatorios");
                return;
            }

            const cantidadNumero = Number(cantidad);
            const precioNumero = Number(precio);

            if (
                !Number.isSafeInteger(cantidadNumero) ||
                cantidadNumero < 0
            ) {
                alert("La cantidad debe ser un número entero mayor o igual a 0");
                return;
            }

            if (
                !/^\d+(\.\d{1,2})?$/.test(precio.trim()) ||
                !Number.isFinite(precioNumero) ||
                precioNumero > 99999999.99
            ) {
                alert("Ingrese un precio válido con máximo dos decimales");
                return;
            }
        

        let imagenRuta = null;
        let nuevoNombre = null;
        
        try{

            // Obtenemos la sesión
            const { data: { session }, error: sessionError } =
            await supabase.auth.getSession();
            if (sessionError || !session) {
                alert("Debes iniciar sesión");
                return;
            }

            if (imagen) {
                // Nombre único y seguro: solo UUID + extensión
                const extension =
                    imagen.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";

                nuevoNombre = `${crypto.randomUUID()}.${extension}`;

                const { error: errorImagen } = await supabase.storage
                    .from("imagenes-productos")
                    .upload(nuevoNombre, imagen);

                if (errorImagen) {
                    alert("No se pudo subir la imagen");
                    console.error(errorImagen);
                    return;
                }

                const { data: imagenNombre } = supabase.storage
                    .from("imagenes-productos")
                    .getPublicUrl(nuevoNombre);

                imagenRuta = imagenNombre.publicUrl;
            }

            //creamos nuestro objeto a mandar a la base de datos
            const productoNuevo={
                nombre:nombre.trim(),
                descripcion:descripcion.trim(),
                cantidad:Number(cantidad),
                imagen:imagenRuta,
                precio: Number(precio)
            };

          

            // Enviamos el producto a nuestro endpoint
            const respuesta = await fetch('/api/productos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify(productoNuevo)
            });

            // Leemos la respuesta
            const data = await respuesta.json();

            if (!respuesta.ok) {
                await borrarImagenSubida();
                console.error("Error al guardar:", data.error);
                alert(data.error || "No se pudo guardar el producto");
                return;
            }else{
                alert("Producto guardado con exito");
                setNombre("");
                setDescripcion("");
                setCantidad("");
                setImagen(null);
                setIsOpen(false);
                setPrecio("");
                await onProductoAgregado();
                return;

            }
        }catch(e){
            await borrarImagenSubida();
            console.log("Error",e);
            alert("Ocurrió un error al guardar el producto.")

        }
    };

    
return (
    <>
        <button
        onClick={() => setIsOpen(true)}
        className="bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg px-5 py-3 transition-colors"
        >
        + Añadir producto
        </button>

        {isOpen && (
        <div
            className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
        >
            <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-agregar"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#171C27] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl"
            >
            {/* Encabezado */}
            <div className="flex items-start justify-between p-6 border-b border-gray-800">
                <div>
                <h2 id="titulo-agregar" className="text-xl font-semibold text-white">
                    Agregar producto
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Ingresa la información del artículo.
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

            {/* Campos */}
            <div className="p-6 space-y-5">
                <div>
                <label className="block text-sm text-gray-300 mb-2">
                    Nombre del producto *
                </label>
                <input
                    type="text"
                    placeholder="Ej. Mesa de madera"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500"
                />
                </div>

                <div>
                <label className="block text-sm text-gray-300 mb-2">
                    Descripción
                </label>
                <textarea
                    placeholder="Describe el artículo..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500 resize-none"
                />
                </div>

                <div>
                <label className="block text-sm text-gray-300 mb-2">
                    Cantidad *
                </label>
                <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500"
                />
                </div>
                <div>
                    <label htmlFor="precio_nuevo" className="block text-sm text-gray-300 mb-2">Precio (MXN)*</label>
                    <input
                    id="precio_nuevo"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Ej. 250.00"
                    className="w-full bg-[#10151E] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-violet-500"

                    />
                </div>

                <div>
                <label className="block text-sm text-gray-300 mb-2">
                    Imagen del producto
                </label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-500/15 file:px-4 file:py-3 file:text-violet-300 hover:file:bg-violet-500/25"
                />
                <p className="text-xs text-gray-500 mt-2">
                    Opcional. Selecciona una fotografía del producto.
                </p>
                </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 px-6 py-5 border-t border-gray-800">
                <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-3 rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                Cancelar
                </button>

                <button
                type="button"
                onClick={guardarProducto}
                className="px-5 py-3 rounded-lg text-white bg-violet-600 hover:bg-violet-700 transition-colors"
                >
                Guardar producto
                </button>
            </div>
            </div>
        </div>
        )}
    </>
    );
}