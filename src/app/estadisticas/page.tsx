'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface DetallePedido {
  cantidad: number;
  menu_id?: string | null;
  bebida_id?: string | null;
  guarnicion_id?: string | null;
  menus: { nombre: string; es_fijo: boolean } | null;
  guarniciones: { nombre: string } | null;
  bebidas: { nombre: string } | null;
}

interface Pedido {
  id: string;
  created_at: string;
  turno?: 'MAÑANA' | 'NOCHE';
  detalle_pedidos: DetallePedido[];
}

export default function EstadisticasPage() {
  const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [fechaInicio, setFechaInicio] = useState(hoyArg);
  const [fechaFin, setFechaFin] = useState(hoyArg);
  const [filtroTurno, setFiltroTurno] = useState<'TODOS' | 'MAÑANA' | 'NOCHE'>('TODOS');
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin, filtroTurno]);

  async function cargarDatos() {
    setCargando(true);

    const fFin = new Date(`${fechaFin}T00:00:00`);
    fFin.setDate(fFin.getDate() + 1);
    const fechaFinSiguiente = fFin.toISOString().split('T')[0];

    let query = supabase
      .from('pedidos')
      .select(`
        id,
        created_at,
        turno,
        detalle_pedidos (
          cantidad,
          menu_id,
          bebida_id,
          guarnicion_id,
          menus!left ( nombre, es_fijo ),
          guarniciones!left ( nombre ),
          bebidas!left ( nombre )
        )
      `)
      .gte('created_at', `${fechaInicio}T03:00:00`)
      .lte('created_at', `${fechaFinSiguiente}T02:59:59`);

    if (filtroTurno !== 'TODOS') {
      query = query.eq('turno', filtroTurno);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPedidos(data as unknown as Pedido[]);
    }
    setCargando(false);
  }

  // CÁLCULO DE RANKINGS INDEPENDIENTES
  const rankingMenusMap: Record<string, { cantidad: number; es_fijo: boolean }> = {};
  const rankingGuarnicionesMap: Record<string, number> = {};
  const rankingBebidasMap: Record<string, number> = {};

  pedidos.forEach((p) => {
    p.detalle_pedidos?.forEach((d) => {
      // 1. Menús
      if (d.menus && d.menus.nombre) {
        const nombre = d.menus.nombre;
        const esFijo = d.menus.es_fijo ?? true;
        if (!rankingMenusMap[nombre]) {
          rankingMenusMap[nombre] = { cantidad: 0, es_fijo: esFijo };
        }
        rankingMenusMap[nombre].cantidad += d.cantidad || 1;
      }

      // 2. Guarniciones y Extras
      if (d.guarniciones && d.guarniciones.nombre) {
        const nombreGuarni = d.guarniciones.nombre;
        rankingGuarnicionesMap[nombreGuarni] = (rankingGuarnicionesMap[nombreGuarni] || 0) + (d.cantidad || 1);
      }

      // 3. Bebidas (100% independiente)
      if (d.bebidas && d.bebidas.nombre) {
        const nombreBebida = d.bebidas.nombre;
        rankingBebidasMap[nombreBebida] = (rankingBebidasMap[nombreBebida] || 0) + (d.cantidad || 1);
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

  const rankingBebidas = Object.entries(rankingBebidasMap)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
          🏆 Ranking de Platos, Extras y Bebidas
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

      {/* FILTROS DE FECHA Y TURNO */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
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

          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Turno:</label>
            <div className="flex gap-1">
              {(['TODOS', 'MAÑANA', 'NOCHE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTurno(t)}
                  className={`text-xs px-3 py-2 rounded font-black border-2 ${
                    filtroTurno === t
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                  }`}
                >
                  {t === 'TODOS' ? 'Día' : t === 'MAÑANA' ? '☀️ Mañana' : '🌙 Noche'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setFechaInicio(hoyArg);
            setFechaFin(hoyArg);
            setFiltroTurno('TODOS');
          }}
          className="bg-blue-600 text-white font-extrabold text-xs px-3 py-2 rounded hover:bg-blue-700"
        >
          Hoy
        </button>
      </div>

      {/* TABLERO DE RANKINGS */}
      {cargando ? (
        <p className="text-center py-8 font-bold text-gray-500">Calculando estadísticas...</p>
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

          {/* COLUMNA 2: BEBIDAS Y EXTRAS */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-3">
              <h2 className="text-lg font-black border-b pb-2 text-cyan-900">🥤 Bebidas Más Vendidas</h2>
              {rankingBebidas.length === 0 ? (
                <p className="text-xs text-gray-500 font-bold">Sin datos de bebidas.</p>
              ) : (
                <div className="space-y-2">
                  {rankingBebidas.map((b, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
                      <span className="font-bold text-sm" style={styleTextoNegro}>{b.nombre}</span>
                      <span className="font-black text-sm bg-cyan-100 text-cyan-900 px-2.5 py-0.5 rounded">
                        {b.cantidad} u.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-3">
              <h2 className="text-lg font-black border-b pb-2 text-purple-900">🥗 Guarniciones y Extras</h2>
              {rankingGuarniciones.length === 0 ? (
                <p className="text-xs text-gray-500 font-bold">Sin datos de guarniciones/extras.</p>
              ) : (
                <div className="space-y-2">
                  {rankingGuarniciones.map((g, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200">
                      <span className="font-bold text-sm" style={styleTextoNegro}>{g.nombre}</span>
                      <span className="font-black text-sm bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded">
                        {g.cantidad} u.
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