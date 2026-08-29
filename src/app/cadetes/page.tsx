'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface PedidoEnvio {
  id: string;
  created_at: string;
  cliente_nombre: string;
  cliente_telefono: string;
  monto_total: number;
  costo_envio: number;
  observaciones: string;
  cadete: string | null;
}

export default function CadetesPage() {
  const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [pedidos, setPedidos] = useState<PedidoEnvio[]>([]);
  const [cargando, setCargando] = useState(false);

  const [nombreCadete1, setNombreCadete1] = useState('Cadete 1');
  const [nombreCadete2, setNombreCadete2] = useState('Cadete 2');
  const [editandoCadete1, setEditandoCadete1] = useState(false);
  const [editandoCadete2, setEditandoCadete2] = useState(false);

  useEffect(() => {
    cargarEnvios();
  }, []);

  async function cargarEnvios() {
    setCargando(true);
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('tipo_entrega', 'ENVIO')
      .gte('created_at', `${hoyArg}T03:00:00`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPedidos(data as PedidoEnvio[]);
    }
    setCargando(false);
  }

  async function asignarCadete(idPedido: string, nombreCadete: string | null) {
    const { error } = await supabase
      .from('pedidos')
      .update({ cadete: nombreCadete })
      .eq('id', idPedido);

    if (!error) {
      setPedidos((prev) =>
        prev.map((p) => (p.id === idPedido ? { ...p, cadete: nombreCadete } : p))
      );
    } else {
      alert('Error al asignar cadete: ' + error.message);
    }
  }

  const enviosSinAsignar = pedidos.filter((p) => !p.cadete);
  const enviosCadete1 = pedidos.filter((p) => p.cadete === nombreCadete1 || p.cadete === 'Cadete 1');
  const enviosCadete2 = pedidos.filter((p) => p.cadete === nombreCadete2 || p.cadete === 'Cadete 2');

  const totalEnvios1 = enviosCadete1.reduce((acc, p) => acc + (p.costo_envio || 0), 0);
  const totalRendir1 = enviosCadete1.reduce((acc, p) => acc + p.monto_total, 0);

  const totalEnvios2 = enviosCadete2.reduce((acc, p) => acc + (p.costo_envio || 0), 0);
  const totalRendir2 = enviosCadete2.reduce((acc, p) => acc + p.monto_total, 0);

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
          🛵 Control de Cadetes y Envíos
        </h1>
        <Link href="/" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
          ⬅ Inicio
        </Link>
      </header>

      {/* ENVIOS PENDIENTES */}
      <div className="bg-white p-5 rounded-lg border-2 border-red-300 space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-black text-red-700">
            📦 Envíos Pendientes de Salida ({enviosSinAsignar.length})
          </h2>
          <button onClick={cargarEnvios} className="text-xs bg-gray-200 hover:bg-gray-300 font-bold px-3 py-1 rounded">
            🔄 Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="text-xs text-gray-500 font-bold py-2">Cargando envíos...</p>
        ) : enviosSinAsignar.length === 0 ? (
          <p className="text-xs text-gray-500 font-bold py-2">No hay envíos pendientes de asignar.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enviosSinAsignar.map((p) => (
              <div key={p.id} className="p-3 border rounded bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-sm" style={styleTextoNegro}>{p.cliente_nombre}</p>
                  <p className="text-xs text-gray-600 font-bold">{p.observaciones || 'Sin observaciones'}</p>
                  <p className="text-xs font-black text-green-700">Total: ${p.monto_total} (Envío: ${p.costo_envio})</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => asignarCadete(p.id, nombreCadete1)}
                    className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-700"
                  >
                    + {nombreCadete1}
                  </button>
                  <button
                    onClick={() => asignarCadete(p.id, nombreCadete2)}
                    className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-purple-700"
                  >
                    + {nombreCadete2}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CADETES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CADETE 1 */}
        <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏍️</span>
              {editandoCadete1 ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={nombreCadete1}
                    onChange={(e) => setNombreCadete1(e.target.value)}
                    className="border-2 border-blue-400 px-2 py-0.5 rounded text-sm font-bold"
                  />
                  <button onClick={() => setEditandoCadete1(false)} className="bg-green-600 text-white text-xs px-2 py-1 rounded font-bold">
                    ✓
                  </button>
                </div>
              ) : (
                <h2 className="text-xl font-black text-blue-900 cursor-pointer" onClick={() => setEditandoCadete1(true)}>
                  {nombreCadete1} <span className="text-xs text-gray-400 font-normal">✏️</span>
                </h2>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-500">Pagar envío: <span className="text-blue-900 font-black">${totalEnvios1}</span></p>
              <p className="text-xs font-bold text-gray-500">Rendir caja: <span className="text-green-700 font-black">${totalRendir1}</span></p>
            </div>
          </div>

          <div className="space-y-2">
            {enviosCadete1.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Sin envíos asignados.</p>
            ) : (
              enviosCadete1.map((p) => (
                <div key={p.id} className="p-2.5 border rounded bg-blue-50 flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-xs" style={styleTextoNegro}>{p.cliente_nombre}</p>
                    <p className="text-xs text-gray-700">${p.monto_total} (Envío: ${p.costo_envio})</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => asignarCadete(p.id, nombreCadete2)}
                      className="text-xs bg-white text-purple-800 border border-purple-300 font-bold px-2 py-1 rounded hover:bg-purple-100"
                    >
                      ➡️ Pasar a {nombreCadete2}
                    </button>
                    <button onClick={() => asignarCadete(p.id, null)} className="text-xs text-red-600 font-bold px-1.5 py-1">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CADETE 2 */}
        <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏍️</span>
              {editandoCadete2 ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={nombreCadete2}
                    onChange={(e) => setNombreCadete2(e.target.value)}
                    className="border-2 border-purple-400 px-2 py-0.5 rounded text-sm font-bold"
                  />
                  <button onClick={() => setEditandoCadete2(false)} className="bg-green-600 text-white text-xs px-2 py-1 rounded font-bold">
                    ✓
                  </button>
                </div>
              ) : (
                <h2 className="text-xl font-black text-purple-900 cursor-pointer" onClick={() => setEditandoCadete2(true)}>
                  {nombreCadete2} <span className="text-xs text-gray-400 font-normal">✏️</span>
                </h2>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-500">Pagar envío: <span className="text-purple-900 font-black">${totalEnvios2}</span></p>
              <p className="text-xs font-bold text-gray-500">Rendir caja: <span className="text-green-700 font-black">${totalRendir2}</span></p>
            </div>
          </div>

          <div className="space-y-2">
            {enviosCadete2.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Sin envíos asignados.</p>
            ) : (
              enviosCadete2.map((p) => (
                <div key={p.id} className="p-2.5 border rounded bg-purple-50 flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-xs" style={styleTextoNegro}>{p.cliente_nombre}</p>
                    <p className="text-xs text-gray-700">${p.monto_total} (Envío: ${p.costo_envio})</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => asignarCadete(p.id, nombreCadete1)}
                      className="text-xs bg-white text-blue-800 border border-blue-300 font-bold px-2 py-1 rounded hover:bg-blue-100"
                    >
                      ⬅️ Pasar a {nombreCadete1}
                    </button>
                    <button onClick={() => asignarCadete(p.id, null)} className="text-xs text-red-600 font-bold px-1.5 py-1">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}