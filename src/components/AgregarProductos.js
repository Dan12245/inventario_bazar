"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {useRouter} from "next/navigation";


export default function AgregarProductos()
{
    const router = useRouter();
    const [isOpen, setIsOpen] = useState (false);
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [cantidad, setCantidad] = useState("");
    const [imagen, setImagen] = useState("");
    //variable para cambiar la tabla donde se hacen las queries
    const tabla = 'pruebas'

    const guardarProducto = async ()=>{
        //revisamos que se hayan llenado los campos necesarios
        if(!nombre || !cantidad){

            alert("Porfavor llene los campos obligatorios");

            return;
        }

        //le hacemos un nuevo nombre a nuestra imagen para que este no se repita
        const nuevoNombre = Date.now()+'-'+imagen.name;

        try{
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

            const imagenRuta = imagenNombre.publicUrl;

            //creamos nuestro objeto a mandar a la base de datos
            const productoNuevo={
                nombre:nombre,
                descripcion:descripcion,
                cantidad:Number(cantidad),
                imagen:imagenRuta
            };

            //y lo enviamos
            const {data,error} = await supabase
            .from(tabla)
            .insert(productoNuevo)
            .select();

            //en caso de que falle damos el error al usuario, si no entonces le decimos que todo salió bien y borramos los datos necesarios
            if(error){
                alert("No se pudo guardar el producto");
                return;
            }else{
                alert("Producto guardado con exito");
                setNombre("");
                setDescripcion("");
                setCantidad("");
                setImagen("");
                setIsOpen(false);
                router.refresh();
                return;

            }
        }catch(e){

            console.log("Error",e);

        }
    };

    return(
        <div>
            <button onClick={()=>setIsOpen(true)} className="mt-4 mb-4 bg-blue-800 rounded px-4 py-2 content-center">Añadir producto</button>
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
                        <button className="mt-4 bg-green-800 rounded px-4 py-2 content-center" onClick={()=>guardarProducto()}>Confirmar</button>
                        <button className="mt-4 bg-red-800 rounded px-4 py-2 content-center" onClick={()=>setIsOpen(false)}>cancelar</button>

                        </div>
                    </div>          
                    
                </div>
            }
        </div>
    )
}