'use client';

import { useState, useEffect } from 'react';

const CLAVE_CORRECTA = 'Matias$4925107';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [claveIngresada, setClaveIngresada] = useState('');
  const [errorClave, setErrorClave] = useState(false);

  useEffect(() => {
    // Al cargar, verificar si ya se ingresó la clave previamente en este dispositivo
    const claveGuardada = localStorage.getItem('clave_acceso_ricos');
    if (claveGuardada === CLAVE_CORRECTA) {
      setAutenticado(true);
    } else {
      setAutenticado(false);
    }
  }, []);

  function verificarClave(e: React.FormEvent) {
    e.preventDefault();
    if (claveIngresada === CLAVE_CORRECTA) {
      localStorage.setItem('clave_acceso_ricos', CLAVE_CORRECTA);
      setAutenticado(true);
      setErrorClave(false);
    } else {
      setErrorClave(true);
      setClaveIngresada('');
    }
  }

  // Mientras se comprueba localStorage, evitamos destellos de pantalla
  if (autenticado === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
        <p className="font-extrabold text-gray-600">Verificando acceso...</p>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de bloqueo
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-md border-2 border-gray-300 max-w-md w-full text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-2xl font-black mb-1 text-black">RicosMediodias</h1>
          <p className="text-xs text-gray-600 font-bold mb-6">
            Ingresá la clave del sistema para continuar. Solo te la pedirá una vez en este dispositivo.
          </p>

          <form onSubmit={verificarClave} className="space-y-4">
            <input
              type="password"
              value={claveIngresada}
              onChange={(e) => setClaveIngresada(e.target.value)}
              placeholder="Ingresar Clave"
              className="w-full border-2 border-gray-400 p-3 rounded-lg text-center font-black text-lg text-black focus:outline-none focus:border-black"
              autoFocus
            />

            {errorClave && (
              <p className="text-xs text-red-600 font-extrabold bg-red-50 p-2 rounded border border-red-200">
                ⚠️ Clave incorrecta.
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white font-extrabold py-3 rounded-lg hover:bg-gray-800 transition-colors shadow"
            >
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Si está autenticado, renderiza toda la aplicación normalmente
  return <>{children}</>;
}