"use client"; // Le decimos a Next que esto corre en el navegador
import { useRouter } from 'next/navigation'; // Ojo: en App Router se importa de 'next/navigation'

export default function Login() {
  const router = useRouter(); // Inicializamos la herramienta de navegación

  const manejarLogin = () => {
    router.push('/login');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="p-8 bg-white border border-gray-200 rounded-lg shadow-sm w-96 text-center">
        <h1 className="text-2xl font-bold mb-4 text-blue-600">Bienvenido</h1>
        <p className="text-gray-600 mb-6">sistema de registro para el bazar</p>
        
        <button 
          onClick={manejarLogin} // Conectamos el clic con nuestra función
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          iniciar sesión
        </button>
      </div>
    </main>
  );
}