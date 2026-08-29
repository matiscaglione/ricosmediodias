'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface DetallePedido {
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  menus: { nombre: string } | null;
  guarniciones: { nombre: string } | null;
}

interface Pedido {
  id: string;
  created_at: string;
  cliente_nombre: string;
  tipo_entrega: string;
  monto_total: number;
  estado: string;
  observaciones: string;
  detalle_pedidos: DetallePedido[];
}

export default function ReportesPage() {
  const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [fechaInicio, setFechaInicio] = useState(hoyArg);
  const [fechaFin, setFechaFin] = useState(hoyArg);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarReporte();
  }, [fechaInicio, fechaFin]);

  async function cargarReporte() {
    setCargando(true);

    const fFin = new Date(`${fechaFin}T00:00:00`);
    fFin.setDate(fFin.getDate() + 1);
    const fechaFinSiguiente = fFin.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        detalle_pedidos (
          cantidad,
          precio_unitario,
          subtotal,
          menus ( nombre ),
          guarniciones ( nombre )
        )
      `)
      .gte('created_at', `${fechaInicio}T03:00:00`)
      .lte('created_at', `${fechaFinSiguiente}T02:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar reporte:', error);
    } else if (data) {
      setPedidos(data as Pedido[]);
    }
    setCargando(false);
  }

  const totalRecaudado = pedidos.reduce((acc, p) => acc + p.monto_total, 0);
  const totalPedidos = pedidos.length;

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
          📈 Reportes y Cierre de Caja
        </h1>
        <Link href="/" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
          ⬅ Toma de Pedidos
        </Link>
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

      {/* TARJETAS RESUMEN DE VENTAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-300 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase">Total Recaudado</p>
          <p className="text-2xl font-black text-green-700">${totalRecaudado.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase">Pedidos Totales</p>
          <p className="text-2xl font-black" style={styleTextoNegro}>{totalPedidos}</p>
        </div>
      </div>

      {/* LISTA DE PEDIDOS REALIZADOS */}
      <div className="bg-white p-5 rounded-lg border border-gray-300 space-y-4">
        <h2 className="text-lg font-black border-b pb-2" style={styleTextoNegro}>
          📋 Detalle de Pedidos del Período
        </h2>

        {cargando ? (
          <p className="text-center py-6 text-sm font-bold text-gray-500">Cargando reporte...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-center py-6 text-sm font-bold text-gray-500">No hay pedidos registrados en este rango de fechas.</p>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const hora = new Date(p.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={p.id} className="p-3 border border-gray-300 rounded-lg bg-gray-50 space-y-2">
                  <div className="flex flex-wrap justify-between items-center text-sm">
                    <div className="font-extrabold" style={styleTextoNegro}>
                      👤 {p.cliente_nombre} <span className="text-xs text-gray-600 font-normal">({hora} hs)</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold bg-gray-200 px-2 py-0.5 rounded" style={styleTextoNegro}>
                        {p.tipo_entrega}
                      </span>
                      <span className="font-black text-base text-green-700">
                        ${p.monto_total.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 pl-2 border-l-2 border-gray-400">
                    {p.detalle_pedidos?.map((d, idx) => (
                      <div key={idx} className="font-bold text-gray-800">
                        • {d.cantidad}x {d.menus?.nombre || 'Plato'} {d.guarniciones ? `(+ ${d.guarniciones.nombre})` : ''}
                      </div>
                    ))}
                    {p.observaciones && (
                      <div className="text-gray-600 italic">Obs: {p.observaciones}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}