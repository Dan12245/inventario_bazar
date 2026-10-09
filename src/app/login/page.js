"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login (){

    const [usuario, setUsuario] = useState("");
    const [pass, setPass] = useState("");
    const router = useRouter();

    const InicioSesion = async ()=>{
        if(!usuario || !pass){
            alert("Rellene todos los campos")
            return;
        }
        let usuarioCorreo = usuario;
        //con esta variable controlamos el dominio del correo, porque desconozco que se use
        const dominio = "@gmail.com";

        //arreglamos el usuario para que sea un correo en caso de que sea solamento un numero
        if (!usuario.includes("@")){
            //esto pasa si el usuario no usa el correo de la empresa
            usuarioCorreo = usuario + dominio;
        }
        
        const {data, error} = await supabase.auth.signInWithPassword({
            email:usuarioCorreo,
            password:pass
        });

        if(error){
            alert("No se pudo iniciar sesion")
            return;
        }
        router.push('/lista')
        return;
    }

    return(
        <div>
            <h1>
                Inicio de sesión
            </h1>
            <p>Usuario o correo</p>
            <input
            placeholder="Usuario o correo"
            type="text"
            value={usuario}
            onChange={(e)=>setUsuario(e.target.value)} 
            />

            <p>contraseña</p>
            <input
            placeholder="contraseña"
            type="password"
            value={pass}
            onChange={(e)=>setPass(e.target.value)} 
            />

            <button onClick={()=>InicioSesion()}>Iniciar sesión</button>
        </div>
    )
}