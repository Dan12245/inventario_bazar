"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function EditarProducto({id, nombreActual, descActual, cantActual, imgActual}){

    const router = useRouter();
    const [isOpen, setIsOpen] = useState (false);
    const [nombre, setNombre] = useState(nombreActual || "");
    const [descripcion, setDescripcion] = useState(descActual || "");
    const [cantidad, setCantidad] = useState(cantActual || "");
    const [imagen, setImagen] = useState("");
    //variable para cambiar la tabla donde se hacen las queries
    const tabla = 'pruebas'

    const editarProducto = async ()=>{
        if(!imagen){
            try{
                //si el usuario no quiere subir una imagen entoces hacemos este camino
                const {data, error} = await supabase.from(tabla).update({
                    nombre:nombre,
                    descripcion:descripcion,
                    cantidad:cantidad
                }).eq('id',id);

                if(error){
                    alert("No se pudo editar el producto");
                    console.log(error);
                    return;
                }

                alert("Producto actualizado con exito");
                setNombre("");
                setDescripcion("");
                setCantidad("");
                setImagen("");
                setIsOpen(false);
                router.refresh();
                return;

            }catch(e){
                alert("No se pudo actualizar el producto");
                console.log(e);
                return;
            }
        }
        try{
            //eliminamos la imagen antigua para guardar espacio en supabase
            const recorte = imgActual.split('/').pop()
            console.log(recorte);
            await supabase.storage.from('imagenes-productos').remove([recorte])

            const nuevoNombre = Date.now()+'-'+imagen.name;

            //esto es lo que se hará en caso de tener una imagen nueva a subir
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

            const imagenRuta = imagenNombre.publicUrl;

            const {data, error} = await supabase.from(tabla).update({
                nombre:nombre,
                descripcion:descripcion,
                cantidad:cantidad,
                imagen:imagenRuta
            }).eq('id',id);

            if(error){
                alert("No se pudo editar el producto");
                console.log(error);
                return;
            } 
            alert("Producto actualizado con exito");
            setNombre("");
            setDescripcion("");
            setCantidad("");
            setImagen("");
            setIsOpen(false);
            router.refresh();
            return;

        }catch(e){
            alert("No se pudo actualizar el producto");
            console.log(e);
            return;
        }

    }
    
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