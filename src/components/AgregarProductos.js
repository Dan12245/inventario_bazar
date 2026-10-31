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

    const guardarProducto = async ()=>{
        //revisamos que se hayan llenado los campos necesarios
        if(!nombre || !cantidad){

            alert("Porfavor llene los campos obligatorios");

            return;
        }

        let imagenRuta = null;
        
        try{
            if (imagen){ 
                //le hacemos un nuevo nombre a nuestra imagen para que este no se repita
                const nuevoNombre = Date.now()+'-'+imagen.name;
                //le mandamos la imagen a un bucket de supabase para que este la guarde y nos traemos la ruta
                const {data:dataImagen, error:errorImagen} =
                    await supabase.storage.
                    from('imagenes-productos').
                    upload(nuevoNombre,imagen);
                    
                    //revisamos que se haya subido y nos traemos el url
                    if(errorImagen){
                        alert("No se pudo subir la imagen");
                        console.log(errorImagen);
                        return;
                    }
                const {data:imagenNombre} = supabase.storage.
                        from('imagenes-productos').
                        getPublicUrl(nuevoNombre);
                 imagenRuta = imagenNombre.publicUrl;
            }
           

            //creamos nuestro objeto a mandar a la base de datos
            const productoNuevo={
                nombre:nombre,
                descripcion:descripcion,
                cantidad:Number(cantidad),
                imagen:imagenRuta
            };

            // Obtenemos la sesión
            const { data: { session }, error: sessionError } =
            await supabase.auth.getSession();

            if (sessionError || !session) {
                alert("Debes iniciar sesión");
                return;
            }

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
                console.error("Error al guardar:", data.error);
                alert(data.error || "No se pudo guardar el producto");
                return;
            }else{
                alert("Producto guardado con exito");
                setNombre("");
                setDescripcion("");
                setCantidad("");
                setImagen("");
                setIsOpen(false);
                await onProductoAgregado();
                return;

            }
        }catch(e){

            console.log("Error",e);

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