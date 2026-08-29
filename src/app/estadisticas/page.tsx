'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface DetallePedido {
  cantidad: number;
  menus: { nombre: string; es_fijo: boolean } | null;
  guarniciones: { nombre: string } | null;
  salsas: { nombre: string } | null;
}

interface Pedido {
  id: string;
  created_at: string;
  observaciones: string;
  detalle_pedidos: DetallePedido[];
}

export default function EstadisticasPage() {
  const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [fechaInicio, setFechaInicio] = useState(hoyArg);
  const [fechaFin, setFechaFin] = useState(hoyArg);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin]);

  async function cargarDatos() {
    setCargando(true);

    const fFin = new Date(`${fechaFin}T00:00:00`);
    fFin.setDate(fFin.getDate() + 1);
    const fechaFinSiguiente = fFin.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        created_at,
        observaciones,
        detalle_pedidos (
          cantidad,
          menus ( nombre, es_fijo ),
          guarniciones ( nombre ),
          salsas ( nombre )
        )
      `)
      .gte('created_at', `${fechaInicio}T03:00:00`)
      .lte('created_at', `${fechaFinSiguiente}T02:59:59`);

    if (!error && data) {
      setPedidos(data as unknown as Pedido[]);
    }
    setCargando(false);
  }

  // --- CÁLCULO DE RANKINGS ---
  const rankingMenusMap: Record<string, { cantidad: number; es_fijo: boolean }> = {};
  const rankingGuarnicionesMap: Record<string, number> = {};
  const rankingSalsasMap: Record<string, number> = {};
  let totalHuevosFritos = 0;

  pedidos.forEach((p) => {
    // Contar huevos fritos registrados en el detalle/observaciones
    if (p.observaciones && p.observaciones.includes('Huevo Frito')) {
      const match = p.observaciones.match(/(\d+)\s*Huevo/i);
      totalHuevosFritos += match ? parseInt(match[1]) : 1;
    }

    p.detalle_pedidos?.forEach((d) => {
      // 1. Menús
      if (d.menus) {
        const nombre = d.menus.nombre;
        const esFijo = d.menus.es_fijo;
        if (!rankingMenusMap[nombre]) {
          rankingMenusMap[nombre] = { cantidad: 0, es_fijo: esFijo };
        }
        rankingMenusMap[nombre].cantidad += d.cantidad;
      }

      // 2. Guarniciones
      if (d.guarniciones) {
        const nombreGuarni = d.guarniciones.nombre;
        rankingGuarnicionesMap[nombreGuarni] = (rankingGuarnicionesMap[nombreGuarni] || 0) + d.cantidad;
      }

      // 3. Salsas
      if (d.salsas) {
        const nombreSalsa = d.salsas.nombre;
        rankingSalsasMap[nombreSalsa] = (rankingSalsasMap[nombreSalsa] || 0) + d.cantidad;
      }
    });
  });

  const rankingMenusCompleto = Object.entries(rankingMenusMap)
    .map(([nombre, data]) => ({ nombre, cantidad: data.cantidad, es_fijo: data.es_fijo }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const rankingFijos = rankingMenusCompleto.filter((m) => m.es_fijo);
  const rankingDelDia = rankingMenusCompleto.filter((m) => !m.es_fijo);

  const rankingGuarniciones = Object.entries(rankingGuarnicionesMap)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const rankingSalsas = Object.entries(rankingSalsasMap)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
          🏆 Ranking de Platos Estrella
        </h1>
        <div className="flex gap-2">
          <Link href="/reportes" className="bg-green-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-green-800">
            📈 Cierre de Caja
          </Link>
          <Link href="/" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
            ⬅ Inicio
          </Link>
        </div>
      </header>

      {/* FILTROS DE FECHA */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Desde:</label>
            <input
              type="date"
              style={styleTextoNegro}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border-2 border-gray-400 p-2 rounded text-sm font-bold bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Hasta:</label>
            <input
              type="date"
              style={styleTextoNegro}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border-2 border-gray-400 p-2 rounded text-sm font-bold bg-white"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setFechaInicio(hoyArg);
              setFechaFin(hoyArg);
            }}
            className="bg-blue-600 text-white font-extrabold text-xs px-3 py-2 rounded hover:bg-blue-700"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* METRICA DE HUEVOS FRITOS */}
      <div className="bg-amber-100 border-2 border-amber-300 p-4 rounded-lg text-center">
        <p className="text-xs font-black text-amber-900 uppercase">🍳 Total Huevos Fritos Marchados en el Período</p>
        <p className="text-3xl font-black text-amber-950 mt-1">{totalHuevosFritos}</p>
      </div>

      {/* TABLERO DE RANKINGS */}
      {cargando ? (
        <p className="text-center py-8 font-bold text-gray-500">Calculando estadisticas...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMNA 1: PLATOS */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-3">
              <h2 className="text-lg font-black border-b pb-2 text-blue-900">⭐ Top Platos Fijos</h2>
              {rankingFijos.length === 0 ? (
                <p className="text-xs text-gray-500 font-bold">Sin datos en este rango.</p>
              ) : (
                <div className="space-y-2">
                  {rankingFijos.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
                      <span className="font-bold text-sm" style={styleTextoNegro}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•'} {m.nombre}
                      </span>
                      <span className="font-black text-sm bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded">
                        {m.cantidad} vendida{m.cantidad > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-3">
              <h2 className="text-lg font-black border-b pb-2 text-purple-900">☀️ Top Platos del Día</h2>
              {rankingDelDia.length === 0 ? (
                <p className="text-xs text-gray-500 font-bold">Sin datos en este rango.</p>
              ) : (
                <div className="space-y-2">
                  {rankingDelDia.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
                      <span className="font-bold text-sm" style={styleTextoNegro}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•'} {m.nombre}
                      </span>
                      <span className="font-black text-sm bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded">
                        {m.cantidad} vendida{m.cantidad > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA 2: GUARNICIONES Y SALSAS */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-3">
              <h2 className="text-lg font-black border-b pb-2 text-emerald-900">🥗 Guarniciones Más Pedidas</h2>
              {rankingGuarniciones.length === 0 ? (
                <p className="text-xs text-gray-500 font-bold">Sin datos de guarniciones.</p>
              ) : (
                <div className="space-y-2">
                  {rankingGuarniciones.map((g, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
                      <span className="font-bold text-sm" style={styleTextoNegro}>{g.nombre}</span>
                      <span className="font-black text-sm bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded">
                        {g.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-3">
              <h2 className="text-lg font-black border-b pb-2 text-red-900">🍝 Salsas Más Pedidas</h2>
              {rankingSalsas.length === 0 ? (
                <p className="text-xs text-gray-500 font-bold">Sin datos de salsas.</p>
              ) : (
                <div className="space-y-2">
                  {rankingSalsas.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
                      <span className="font-bold text-sm" style={styleTextoNegro}>{s.nombre}</span>
                      <span className="font-black text-sm bg-red-100 text-red-900 px-2.5 py-0.5 rounded">
                        {s.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}