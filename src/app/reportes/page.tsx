'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface Pedido {
  id: string;
  cliente_nombre: string;
  tipo_entrega: 'RETIRO' | 'ENVIO' | 'BAR';
  costo_envio: number;
  monto_platos: number;
  monto_total: number;
  created_at: string;
  detalle_pedidos?: {
    cantidad: number;
    menus?: { nombre: string };
    guarniciones?: { nombre: string };
  }[];
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

    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        detalle_pedidos (
          cantidad,
          menus ( nombre ),
          guarniciones ( nombre )
        )
      `)
      .gte('created_at', `${fechaInicio}T00:00:00`)
      .lte('created_at', `${fechaFin}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar reporte:', error);
    } else if (data) {
      setPedidos(data as Pedido[]);
    }
    setCargando(false);
  }

  const formatearMoneda = (monto: number) => '$ ' + monto.toLocaleString('es-AR');

  const totalRecaudado = pedidos.reduce((acc, p) => acc + p.monto_total, 0);
  const totalPlatosMonto = pedidos.reduce((acc, p) => acc + p.monto_platos, 0);
  const totalEnviosMonto = pedidos.reduce((acc, p) => acc + p.costo_envio, 0);

  const totalEnviosCant = pedidos.filter((p) => p.tipo_entrega === 'ENVIO').length;
  const totalRetirosCant = pedidos.filter((p) => p.tipo_entrega === 'RETIRO').length;
  const totalBarCant = pedidos.filter((p) => p.tipo_entrega === 'BAR').length;

  // Conteo de platos principales y guarniciones
  const resumenPlatos: Record<string, number> = {};
  const resumenGuarniciones: Record<string, number> = {};

  pedidos.forEach((p) => {
    p.detalle_pedidos?.forEach((d) => {
      const nombrePlato = d.menus?.nombre || 'Otro';
      resumenPlatos[nombrePlato] = (resumenPlatos[nombrePlato] || 0) + d.cantidad;

      if (d.guarniciones?.nombre) {
        const nombreGuarni = d.guarniciones.nombre;
        resumenGuarniciones[nombreGuarni] = (resumenGuarniciones[nombreGuarni] || 0) + d.cantidad;
      }
    });
  });

  function exportarReporteCSV() {
    if (pedidos.length === 0) return alert('No hay datos para exportar en este rango.');

    const encabezados = ['Fecha', 'Hora', 'Cliente', 'Tipo Entrega', 'Total Platos', 'Costo Envio', 'Total Pedido'];
    const filas = pedidos.map((p) => {
      const f = new Date(p.created_at);
      const fechaStr = f.toLocaleDateString('es-AR');
      const horaStr = f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      return [
        `"${fechaStr}"`,
        `"${horaStr}"`,
        `"${(p.cliente_nombre || '').replace(/"/g, '""')}"`,
        `"${p.tipo_entrega}"`,
        p.monto_platos,
        p.costo_envio,
        p.monto_total
      ].join(',');
    });

    const contenidoCSV = '\uFEFF' + [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_ricosmediodias_${fechaInicio}_al_${fechaFin}.csv`;
    link.click();
  }

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>Cierre de Caja y Reportes</h1>
          <p className="text-sm font-bold text-gray-700">Resumen de ventas e historial financiero</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="bg-blue-600 text-white text-sm px-3 py-2 rounded font-extrabold hover:bg-blue-700">
            ➕ Tomar Pedido
          </Link>
          <Link href="/pedidos" className="bg-purple-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-purple-800">
            📋 Pedidos
          </Link>
          <Link href="/admin" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
            ⚙️ Admin
          </Link>
        </div>
      </header>

      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 mb-6 flex flex-col md:flex-row items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Fecha Desde</label>
            <input
              type="date"
              style={styleTextoNegro}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border-2 border-gray-400 p-2 rounded text-sm font-bold bg-white w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Fecha Hasta</label>
            <input
              type="date"
              style={styleTextoNegro}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border-2 border-gray-400 p-2 rounded text-sm font-bold bg-white w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
              setFechaInicio(hoyArg);
              setFechaFin(hoyArg);
            }}
            className="bg-gray-200 text-gray-900 border-2 border-gray-400 text-xs px-3 py-2 rounded font-bold hover:bg-gray-300"
          >
            Hoy
          </button>
          <button
            onClick={exportarReporteCSV}
            className="bg-green-700 text-white text-xs px-4 py-2 rounded font-extrabold hover:bg-green-800 shadow"
          >
            📊 Exportar Rango a Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-300">
          <span className="text-xs font-bold text-gray-600 block">Total Recaudado</span>
          <span className="text-2xl font-black text-green-700">{formatearMoneda(totalRecaudado)}</span>
          <span className="text-xs text-gray-500 block mt-1 font-bold">{pedidos.length} pedidos en total</span>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-300">
          <span className="text-xs font-bold text-gray-600 block">Ventas de Platos</span>
          <span className="text-xl font-black" style={styleTextoNegro}>{formatearMoneda(totalPlatosMonto)}</span>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-300">
          <span className="text-xs font-bold text-gray-600 block">Total en Envíos</span>
          <span className="text-xl font-black" style={styleTextoNegro}>{formatearMoneda(totalEnviosMonto)}</span>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-300">
          <span className="text-xs font-bold text-gray-600 block">Desglose Entregas</span>
          <div className="text-xs font-bold mt-1 space-y-0.5" style={styleTextoNegro}>
            <div>🛵 Envíos: <strong>{totalEnviosCant}</strong></div>
            <div>🚶 Retiros: <strong>{totalRetirosCant}</strong></div>
            <div>🍽️ Bar: <strong>{totalBarCant}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PLATOS VENDIDOS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-300">
          <h2 className="text-lg font-black mb-4" style={styleTextoNegro}>
            🍲 Platos Principales Vendidos
          </h2>

          {Object.keys(resumenPlatos).length === 0 ? (
            <p className="text-gray-500 text-sm font-bold text-center py-4">Sin datos de platos.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(resumenPlatos).map(([plato, cantidad]) => (
                <div key={plato} className="p-2.5 bg-gray-50 rounded border border-gray-300 flex justify-between items-center">
                  <span className="font-bold text-sm" style={styleTextoNegro}>{plato}</span>
                  <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
                    {cantidad} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GUARNICIONES VENDIDAS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-300">
          <h2 className="text-lg font-black mb-4" style={styleTextoNegro}>
            🥗 Guarniciones Vendidas
          </h2>

          {Object.keys(resumenGuarniciones).length === 0 ? (
            <p className="text-gray-500 text-sm font-bold text-center py-4">Sin datos de guarniciones.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(resumenGuarniciones).map(([guarni, cantidad]) => (
                <div key={guarni} className="p-2.5 bg-gray-50 rounded border border-gray-300 flex justify-between items-center">
                  <span className="font-bold text-sm" style={styleTextoNegro}>{guarni}</span>
                  <span className="bg-purple-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
                    {cantidad} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}