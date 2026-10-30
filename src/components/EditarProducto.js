"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function EditarProducto({id, nombreActual, descActual, cantActual, imgActual, onProductoEditado}){

    const router = useRouter();
    const [isOpen, setIsOpen] = useState (false);
    const [nombre, setNombre] = useState(nombreActual || "");
    const [descripcion, setDescripcion] = useState(descActual || "");
    const [cantidad, setCantidad] = useState(cantActual || "");
    const [imagen, setImagen] = useState(null);
    //variable para cambiar la tabla donde se hacen las queries
    const tabla = 'productos'

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

    
     return(
        <div>
            <button onClick={()=>setIsOpen(true)} ><img src="editar.png" className="w-6 h-6 hover:scale-110"></img></button>
            {isOpen && 
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center">      
                    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md flex flex-col gap-4">
                        {/* //campo para el nombre */}
                        Nombre*
                        <input
                        type="text"
                        placeholder="Nombre del producto"
                        value={nombre}
                        onChange={(e)=>setNombre(e.target.value)}
                        />
                        {/* //campo para la descripcion */}
                        Descripcion
                        <input
                        type="text"
                        placeholder="Descripción del producto"
                        value={descripcion}
                        onChange={(e)=>setDescripcion(e.target.value)}
                        />
                        {/* //campo de la cantidad de productos */}
                        Cantidad*
                        <input
                        type="number"
                        placeholder="Cantidad del producto"
                        value={cantidad}
                        onChange={(e)=>setCantidad(e.target.value)}
                        />

                        {/* campo para la imagen de producto */}
                        imagen
                        <input
                        type="file"
                        onChange={(e)=>setImagen(e.target.files[0])}
                        />
                        <div className="flex-2">
                        <button className="mt-4 bg-green-800 rounded px-4 py-2 content-center" onClick={()=>editarProducto()}>Confirmar</button>
                        <button className="mt-4 bg-red-800 rounded px-4 py-2 content-center" onClick={()=>setIsOpen(false)}>cancelar</button>

                        </div>
                    </div>          
                    
                </div>
            }
        </div>
    )
}