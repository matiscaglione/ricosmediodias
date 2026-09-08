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
  turno?: 'MAÑANA' | 'NOCHE';
  metodo_pago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  pago_confirmado?: boolean;
  detalle_pedidos?: {
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    menu_id?: string | null;
    bebida_id?: string | null;
    guarnicion_id?: string | null;
    menus?: { nombre: string } | null;
    guarniciones?: { nombre: string } | null;
    bebidas?: { nombre: string } | null;
  }[];
}

export default function ReportesPage() {
  function obtenerTurnoActual(): 'MAÑANA' | 'NOCHE' {
    const horaActual = new Date().getHours();
    return horaActual >= 6 && horaActual < 16 ? 'MAÑANA' : 'NOCHE';
  }

  const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [fechaInicio, setFechaInicio] = useState(hoyArg);
  const [fechaFin, setFechaFin] = useState(hoyArg);
  const [filtroTurno, setFiltroTurno] = useState<'TODOS' | 'MAÑANA' | 'NOCHE'>(obtenerTurnoActual());
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarReporte();
  }, [fechaInicio, fechaFin, filtroTurno]);

  async function cargarReporte() {
    setCargando(true);

    const fFin = new Date(`${fechaFin}T00:00:00`);
    fFin.setDate(fFin.getDate() + 1);
    const fechaFinSiguiente = fFin.toISOString().split('T')[0];

    let query = supabase
      .from('pedidos')
      .select(`
        *,
        detalle_pedidos (
          cantidad,
          precio_unitario,
          subtotal,
          menu_id,
          bebida_id,
          guarnicion_id,
          menus!left ( nombre ),
          guarniciones!left ( nombre ),
          bebidas!left ( nombre )
        )
      `)
      .gte('created_at', `${fechaInicio}T03:00:00`)
      .lte('created_at', `${fechaFinSiguiente}T02:59:59`);

    if (filtroTurno !== 'TODOS') {
      query = query.eq('turno', filtroTurno);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar reporte:', error);
    } else if (data) {
      setPedidos(data as Pedido[]);
    }
    setCargando(false);
  }

  const formatearMoneda = (monto: number) => '$ ' + monto.toLocaleString('es-AR');

  const totalRecaudado = pedidos.reduce((acc, p) => acc + p.monto_total, 0);
  const totalEnviosMonto = pedidos.reduce((acc, p) => acc + p.costo_envio, 0);

  // DESGLOSE POR MÉTODO DE PAGO
  const totalEfectivo = pedidos
    .filter((p) => (p.metodo_pago || 'EFECTIVO') === 'EFECTIVO')
    .reduce((acc, p) => acc + p.monto_total, 0);

  const totalTransferencia = pedidos
    .filter((p) => p.metodo_pago === 'TRANSFERENCIA')
    .reduce((acc, p) => acc + p.monto_total, 0);

  const totalTarjeta = pedidos
    .filter((p) => p.metodo_pago === 'TARJETA')
    .reduce((acc, p) => acc + p.monto_total, 0);

  // DESGLOSE POR ESTADO DE PAGO
  const totalCobrado = pedidos
    .filter((p) => p.pago_confirmado)
    .reduce((acc, p) => acc + p.monto_total, 0);

  const totalPendiente = pedidos
    .filter((p) => !p.pago_confirmado)
    .reduce((acc, p) => acc + p.monto_total, 0);

  // CONTEO Y MONTO DE PLATOS PRINCIPALES
  const totalPlatosCant = pedidos.reduce((acc, p) => {
    const cant = (p.detalle_pedidos || []).reduce((subAcc, d) => {
      return d.menu_id ? subAcc + d.cantidad : subAcc;
    }, 0);
    return acc + cant;
  }, 0);

  // CONTEO Y MONTO EXCLUSIVO DE BEBIDAS
  let totalBebidasMonto = 0;
  const totalBebidasCant = pedidos.reduce((acc, p) => {
    const cant = (p.detalle_pedidos || []).reduce((subAcc, d) => {
      if (d.bebida_id || d.bebidas) {
        totalBebidasMonto += d.subtotal || (d.precio_unitario * d.cantidad);
        return subAcc + d.cantidad;
      }
      return subAcc;
    }, 0);
    return acc + cant;
  }, 0);

  // CONTEO Y MONTO EXCLUSIVO DE EXTRAS SUELTOS
  let totalExtrasMonto = 0;
  const totalExtrasCant = pedidos.reduce((acc, p) => {
    const cant = (p.detalle_pedidos || []).reduce((subAcc, d) => {
      if (!d.menu_id && d.guarnicion_id) {
        totalExtrasMonto += d.subtotal || (d.precio_unitario * d.cantidad);
        return subAcc + d.cantidad;
      }
      return subAcc;
    }, 0);
    return acc + cant;
  }, 0);

  const totalEnviosCant = pedidos.filter((p) => p.tipo_entrega === 'ENVIO').length;
  const totalRetirosCant = pedidos.filter((p) => p.tipo_entrega === 'RETIRO').length;
  const totalBarCant = pedidos.filter((p) => p.tipo_entrega === 'BAR').length;

  const resumenPlatos: Record<string, number> = {};
  const resumenGuarniciones: Record<string, number> = {};
  const resumenBebidas: Record<string, number> = {};

  pedidos.forEach((p) => {
    p.detalle_pedidos?.forEach((d) => {
      if (d.menus?.nombre) {
        const nombrePlato = d.menus.nombre;
        resumenPlatos[nombrePlato] = (resumenPlatos[nombrePlato] || 0) + d.cantidad;
      }

      if (d.guarniciones?.nombre) {
        const nombreGuarni = d.guarniciones.nombre;
        resumenGuarniciones[nombreGuarni] = (resumenGuarniciones[nombreGuarni] || 0) + d.cantidad;
      }

      if (d.bebidas?.nombre) {
        const nombreBebida = d.bebidas.nombre;
        resumenBebidas[nombreBebida] = (resumenBebidas[nombreBebida] || 0) + d.cantidad;
      }
    });
  });

  function exportarReporteCSV() {
    if (pedidos.length === 0) return alert('No hay datos para exportar en este rango.');

    const encabezados = [
      'Fecha',
      'Hora',
      'Turno',
      'Cliente',
      'Tipo Entrega',
      'Metodo Pago',
      'Estado Pago',
      'Total Platos ($)',
      'Costo Envio ($)',
      'Total Pedido ($)'
    ];

    const filas = pedidos.map((p) => {
      const f = new Date(p.created_at);
      const fechaStr = f.toLocaleDateString('es-AR');
      const horaStr = f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      return [
        `"${fechaStr}"`,
        `"${horaStr}"`,
        `"${p.turno || 'MAÑANA'}"`,
        `"${(p.cliente_nombre || '').replace(/"/g, '""')}"`,
        `"${p.tipo_entrega}"`,
        `"${p.metodo_pago || 'EFECTIVO'}"`,
        `"${p.pago_confirmado ? 'PAGADO' : 'PENDIENTE'}"`,
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
    link.download = `reporte_ricosmediodias_${fechaInicio}_al_${fechaFin}_${filtroTurno}.csv`;
    link.click();
  }

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
          <Link href="/estadisticas" className="bg-amber-600 text-white text-sm px-3 py-2 rounded font-bold hover:bg-amber-700">
            🏆 Ranking
          </Link>
          <Link href="/admin" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
            ⚙️ Admin
          </Link>
        </div>
      </header>

      {/* FILTROS DE FECHA Y TURNO */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 flex flex-col md:flex-row items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
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
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Filtrar por Turno</label>
            <div className="flex gap-1">
              {(['TODOS', 'MAÑANA', 'NOCHE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTurno(t)}
                  className={`flex-1 text-xs py-2 rounded font-black border-2 ${
                    filtroTurno === t
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                  }`}
                >
                  {t === 'TODOS' ? 'Día' : t === 'MAÑANA' ? '☀️ Mañana' : '🌙 Noche'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
              setFechaInicio(hoyArg);
              setFechaFin(hoyArg);
              setFiltroTurno(obtenerTurnoActual());
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

      {/* CIERRE DE CAJA POR MÉTODO DE PAGO */}
      <div className="bg-white p-5 rounded-lg border-2 border-amber-300 shadow-sm space-y-3">
        <h2 className="text-lg font-black text-amber-950">💵 Cierre por Método de Pago</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-xs font-bold text-gray-700 block">💵 Efectivo (Caja)</span>
            <span className="text-xl font-black text-amber-950">{formatearMoneda(totalEfectivo)}</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs font-bold text-blue-900 block">📱 Transferencias</span>
            <span className="text-xl font-black text-blue-950">{formatearMoneda(totalTransferencia)}</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-xs font-bold text-purple-900 block">💳 Tarjetas</span>
            <span className="text-xl font-black text-purple-950">{formatearMoneda(totalTarjeta)}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center pt-2 border-t border-amber-200 text-xs font-bold text-gray-800 gap-2">
          <span>
            ✓ Cobrado: <strong className="text-green-800">{formatearMoneda(totalCobrado)}</strong>
          </span>
          <span>
            ⏳ Pendiente: <strong className="text-red-700">{formatearMoneda(totalPendiente)}</strong>
          </span>
        </div>
      </div>

      {/* MÉTRICAS GENERALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-gray-300 col-span-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-bold text-gray-600 block">Total Recaudado</span>
          <span className="text-2xl font-black text-green-700">{formatearMoneda(totalRecaudado)}</span>
          <span className="text-xs text-gray-500 block mt-1 font-bold">{pedidos.length} tickets</span>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-blue-300 bg-blue-50">
          <span className="text-xs font-black text-blue-900 block uppercase">Total Platos / Menús</span>
          <span className="text-2xl font-black text-blue-950">{totalPlatosCant} u.</span>
          <span className="text-xs text-blue-800 block mt-1 font-bold">Platos principales</span>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-cyan-300 bg-cyan-50">
          <span className="text-xs font-black text-cyan-900 block uppercase">🥤 Total Bebidas</span>
          <span className="text-2xl font-black text-cyan-950">{totalBebidasCant} u.</span>
          <span className="text-xs text-cyan-800 block mt-1 font-bold">{formatearMoneda(totalBebidasMonto)}</span>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-purple-300 bg-purple-50">
          <span className="text-xs font-black text-purple-900 block uppercase">🍳 Total Extras</span>
          <span className="text-2xl font-black text-purple-950">{totalExtrasCant} u.</span>
          <span className="text-xs text-purple-800 block mt-1 font-bold">{formatearMoneda(totalExtrasMonto)}</span>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-gray-300">
          <span className="text-xs font-bold text-gray-600 block">Total en Envíos ($)</span>
          <span className="text-xl font-black" style={styleTextoNegro}>{formatearMoneda(totalEnviosMonto)}</span>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-gray-300">
          <span className="text-xs font-bold text-gray-600 block">Desglose Entregas</span>
          <div className="text-xs font-bold mt-1 space-y-0.5" style={styleTextoNegro}>
            <div>🛵 Envíos: <strong>{totalEnviosCant}</strong></div>
            <div>🚶 Retiros: <strong>{totalRetirosCant}</strong></div>
            <div>🍽️ Bar: <strong>{totalBarCant}</strong></div>
          </div>
        </div>
      </div>

      {/* DESGLOSE EN TABLAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-300">
          <h2 className="text-base font-black mb-3" style={styleTextoNegro}>
            🍲 Platos Principales Vendidos
          </h2>

          {Object.keys(resumenPlatos).length === 0 ? (
            <p className="text-gray-500 text-xs font-bold text-center py-4">Sin datos de platos.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {Object.entries(resumenPlatos).map(([plato, cantidad]) => (
                <div key={plato} className="p-2 bg-gray-50 rounded border border-gray-300 flex justify-between items-center text-xs">
                  <span className="font-bold" style={styleTextoNegro}>{plato}</span>
                  <span className="bg-blue-600 text-white font-black px-2 py-0.5 rounded-full">
                    {cantidad} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-purple-300 bg-purple-50/30">
          <h2 className="text-base font-black mb-3 text-purple-950">
            🥗 Guarniciones y Extras
          </h2>

          {Object.keys(resumenGuarniciones).length === 0 ? (
            <p className="text-gray-500 text-xs font-bold text-center py-4">Sin datos de guarniciones.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {Object.entries(resumenGuarniciones).map(([guarni, cantidad]) => (
                <div key={guarni} className="p-2 bg-white rounded border border-purple-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-purple-950">{guarni}</span>
                  <span className="bg-purple-600 text-white font-black px-2 py-0.5 rounded-full">
                    {cantidad} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border-2 border-cyan-300 bg-cyan-50/30">
          <h2 className="text-base font-black mb-3 text-cyan-950">
            🥤 Bebidas Vendidas
          </h2>

          {Object.keys(resumenBebidas).length === 0 ? (
            <p className="text-gray-500 text-xs font-bold text-center py-4">Sin datos de bebidas.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {Object.entries(resumenBebidas).map(([bebida, cantidad]) => (
                <div key={bebida} className="p-2 bg-white rounded border border-cyan-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-cyan-950">{bebida}</span>
                  <span className="bg-cyan-700 text-white font-black px-2 py-0.5 rounded-full">
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