"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


export default function EliminarProducto ({id, rutaImagen}){

    const router = useRouter();
    //variable para cambiar la tabla donde se hacen las queries
    const tabla = 'pruebas'

    const eliminarProducto = async () =>{

        //borramos la imagen del bucket de supabase usando la ruta que obtenemos  del front
        const recorte = rutaImagen.split('/').pop()
        console.log(recorte);
        await supabase.storage.from('imagenes-productos').remove([recorte])

        const {data, error} = await supabase.
        from(tabla).delete().
        eq('id',id)

        if(error){
            console.log(error);
        }else{
            router.refresh();
        }
    };

    return(
        <button onClick={()=>{
            const confirma = window.confirm("Desea eliminar este producto?");

            if (confirma) {
                eliminarProducto(id, rutaImagen)
            }
            }}>
            <img src="eliminar.png" className="w-6 h-6 hover:scale-110 transition-transform"/>
         </button>
    );
}