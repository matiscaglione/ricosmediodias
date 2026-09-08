'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface DetallePedido {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  ingredientes_ensalada?: string;
  agregado_menu?: string;
  agregado_guarnicion?: string;
  menus?: { nombre: string };
  guarniciones?: { nombre: string };
  bebidas?: { nombre: string };
}

interface Pedido {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_entrega: 'RETIRO' | 'ENVIO' | 'BAR';
  costo_envio: number;
  monto_platos: number;
  monto_total: number;
  horario_solicitado: string;
  observaciones: string;
  estado: string;
  created_at: string;
  turno?: 'MAÑANA' | 'NOCHE';
  metodo_pago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  pago_confirmado?: boolean;
  detalle_pedidos?: DetallePedido[];
}

export default function HistorialPedidosPage() {
  function obtenerTurnoActual(): 'MAÑANA' | 'NOCHE' {
    const horaActual = new Date().getHours();
    return horaActual >= 6 && horaActual < 16 ? 'MAÑANA' : 'NOCHE';
  }

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENVIO' | 'RETIRO' | 'BAR'>('TODOS');
  const [filtroTurno, setFiltroTurno] = useState<'TODOS' | 'MAÑANA' | 'NOCHE'>(obtenerTurnoActual());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarPedidosDelDia();

    const canal = supabase
      .channel('cambios-pedidos-historial')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          cargarPedidosDelDia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [filtroTurno]);

  async function cargarPedidosDelDia() {
    setCargando(true);
    
    const ahora = new Date();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);

    let query = supabase
      .from('pedidos')
      .select(`
        *,
        detalle_pedidos (
          id,
          cantidad,
          precio_unitario,
          subtotal,
          ingredientes_ensalada,
          agregado_menu,
          agregado_guarnicion,
          menus!left ( nombre ),
          guarniciones!left ( nombre ),
          bebidas!left ( nombre )
        )
      `)
      .gte('created_at', inicioDia.toISOString())
      .lte('created_at', finDia.toISOString());

    if (filtroTurno !== 'TODOS') {
      query = query.eq('turno', filtroTurno);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar pedidos:', error.message);
      alert('Error al cargar los pedidos: ' + error.message);
    } else if (data) {
      setPedidos(data as Pedido[]);
    }
    setCargando(false);
  }

  async function toggleEstadoPago(id: string, estadoActual: boolean) {
    const nuevoEstado = !estadoActual;
    const { error } = await supabase
      .from('pedidos')
      .update({ pago_confirmado: nuevoEstado })
      .eq('id', id);

    if (!error) {
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, pago_confirmado: nuevoEstado } : p))
      );
    }
  }

  async function cambiarMetodoPago(id: string, nuevoMetodo: Pedido['metodo_pago']) {
    const { error } = await supabase
      .from('pedidos')
      .update({ metodo_pago: nuevoMetodo })
      .eq('id', id);

    if (!error) {
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, metodo_pago: nuevoMetodo } : p))
      );
    }
  }

  const formatearMoneda = (monto: number) => '$ ' + monto.toLocaleString('es-AR');

  function exportarAExcel() {
    if (pedidosFiltrados.length === 0) {
      alert('No hay pedidos para exportar.');
      return;
    }

    const encabezados = [
      'Hora', 'Turno', 'Cliente', 'Telefono', 'Tipo Entrega',
      'Metodo Pago', 'Estado Pago', 'Detalle Platos', 'Costo Envio',
      'Monto Platos', 'Total', 'Observaciones'
    ];

    const filas = pedidosFiltrados.map((p) => {
      const hora = new Date(p.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      
      const detalleStr = (p.detalle_pedidos || [])
        .map((i) => {
          let str = `${i.cantidad}x ${i.menus?.nombre || i.guarniciones?.nombre || i.bebidas?.nombre || 'Plato'}`;
          if (i.agregado_menu) str += ` (${i.agregado_menu})`;
          if (i.menus?.nombre && i.guarniciones?.nombre) str += ` (+ ${i.guarniciones.nombre})`;
          if (i.agregado_guarnicion) str += ` [Guarnición: ${i.agregado_guarnicion}]`;
          if (i.ingredientes_ensalada) str += ` [Ensalada: ${i.ingredientes_ensalada}]`;
          return str;
        })
        .join('; ');

      const obsLimpia = (p.observaciones || '').replace(/"/g, '""');
      const clienteLimpio = (p.cliente_nombre || '').replace(/"/g, '""');

      return [
        `"${hora}"`,
        `"${p.turno || 'MAÑANA'}"`,
        `"${clienteLimpio}"`,
        `"${p.cliente_telefono || ''}"`,
        `"${p.tipo_entrega}"`,
        `"${p.metodo_pago || 'EFECTIVO'}"`,
        `"${p.pago_confirmado ? 'PAGADO' : 'PENDIENTE'}"`,
        `"${detalleStr}"`,
        p.costo_envio,
        p.monto_platos,
        p.monto_total,
        `"${obsLimpia}"`
      ].join(',');
    });

    const contenidoCSV = '\uFEFF' + [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_ricosmediodias_${fechaHoy}_${filtroTurno}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function reimprimirTicket(pedido: Pedido) {
    const ventanaImpresion = window.open('', '_blank', 'width=350,height=600');
    if (!ventanaImpresion) return;

    const fechaHora = new Date(pedido.created_at).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const nombreClienteLimpio = (pedido.cliente_nombre || '').replace(/[^a-zA-Z0-9]/g, '');
    const idCorto = pedido.id.slice(0, 6);

    const itemsHtml = (pedido.detalle_pedidos || [])
      .map((i) => {
        if (i.bebidas) {
          return `
            <div style="margin-bottom: 6px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
              <div style="font-size: 16px; font-weight: 900;">🥤 ${i.cantidad}x ${i.bebidas.nombre}</div>
              <div style="text-align: right; font-size: 14px; font-weight: bold; margin-top: 2px;">${formatearMoneda(i.subtotal)}</div>
            </div>`;
        }

        if (!i.menus && i.guarniciones) {
          return `
            <div style="margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
              <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000;">
                👉 EXTRA: ${i.guarniciones.nombre}
              </div>
              ${i.agregado_guarnicion ? `<div style="font-size: 14px; font-weight: 900; margin-left: 10px;">📝 (${i.agregado_guarnicion})</div>` : ''}
              ${i.ingredientes_ensalada ? `<div style="font-size: 14px; font-weight: 900; margin-left: 10px; margin-top: 2px;">🥗 (${i.ingredientes_ensalada})</div>` : ''}
              <div style="text-align: right; font-size: 14px; font-weight: bold; margin-top: 2px;">${formatearMoneda(i.subtotal)}</div>
            </div>`;
        }

        return `
          <div style="margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
            <div style="font-size: 18px; font-weight: 900; text-transform: uppercase;">
              ${i.cantidad}x ${i.menus?.nombre || 'PLATO'} ${i.agregado_menu ? `(${i.agregado_menu})` : ''}
            </div>
            ${i.guarniciones ? `<div style="font-size: 16px; font-weight: 900; margin-left: 10px;">👉 GUARNICIÓN: ${i.guarniciones.nombre} ${i.agregado_guarnicion ? `(${i.agregado_guarnicion})` : ''}</div>` : ''}
            ${i.ingredientes_ensalada ? `<div style="font-size: 15px; font-weight: 900; margin-left: 10px; margin-top: 2px;">🥗 (${i.ingredientes_ensalada})</div>` : ''}
            <div style="text-align: right; font-size: 14px; font-weight: bold; margin-top: 2px;">${formatearMoneda(i.subtotal)}</div>
          </div>`;
      })
      .join('');

    const matchDireccion = pedido.observaciones && pedido.observaciones.includes('Dirección:')
      ? pedido.observaciones.split('|').find((s) => s.toLowerCase().includes('dirección'))?.replace(/dirección:/i, '').trim()
      : '';

    let cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
      ${pedido.tipo_entrega === 'ENVIO' ? `🛵 ENVÍO: ${matchDireccion}` : pedido.tipo_entrega === 'RETIRO' ? '🚶 RETIRA EN LOCAL' : '🍽️ COMER EN BAR'}
    </div>`;

    let etiquetaPago = `<div style="font-size: 15px; font-weight: 900; text-align: center; border: 2px dashed #000; padding: 4px; margin: 6px 0;">
      💳 PAGO: ${pedido.metodo_pago || 'EFECTIVO'} ${pedido.pago_confirmado ? '(PAGADO)' : '(PENDIENTE DE COBRO)'}
    </div>`;

    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Ticket_#${idCorto}_${nombreClienteLimpio}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 270px; padding: 8px; margin: 0 auto; font-size: 13px; color: #000; }
            .center { text-align: center; }
            .line { border-bottom: 2px solid #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1 style="margin:0; font-size: 22px; font-weight: 900;">RicosMediodias</h1>
            <p style="margin:2px 0; font-size: 10px;">${fechaHora} (REIMPRESIÓN)</p>
          </div>
          <div class="line"></div>
          ${cabeceraEntrega}
          ${etiquetaPago}
          <div style="font-size: 14px; margin-bottom: 4px;">
            <strong>Cliente:</strong> ${pedido.cliente_nombre} ${pedido.cliente_telefono ? `(${pedido.cliente_telefono})` : ''}
          </div>
          ${pedido.observaciones ? `<div style="font-size: 13px; font-weight: bold; background-color: #eee; padding: 2px 4px; margin-top: 4px;">Obs: ${pedido.observaciones}</div>` : ''}
          <div class="line"></div>
          <div style="margin: 8px 0;">${itemsHtml}</div>
          <div class="line"></div>
          <div style="display: flex; justify-between; align-items: flex-end; margin-top: 8px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase;">Hora:</div>
              <div style="font-size: 16px; font-weight: 900;">${pedido.horario_solicitado ? `🕒 ${pedido.horario_solicitado} hs` : 'Lo antes posible'}</div>
            </div>
            <div style="text-align: right;">
              ${pedido.costo_envio > 0 ? `<div style="font-size: 11px;">Envío: ${formatearMoneda(pedido.costo_envio)}</div>` : ''}
              <div style="font-size: 11px; text-transform: uppercase;">Total:</div>
              <div style="font-size: 20px; font-weight: 900;">${formatearMoneda(pedido.monto_total)}</div>
            </div>
          </div>
          <div class="line" style="margin-top: 10px;"></div>
          <p class="center" style="margin: 6px 0 0 0; font-size: 11px; font-weight: bold;">¡Gracias por tu compra!</p>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroTipo === 'TODOS') return true;
    return p.tipo_entrega === filtroTipo;
  });

  const totalRecaudado = pedidosFiltrados.reduce((acc, p) => acc + p.monto_total, 0);

  const totalPlatosVendidos = pedidosFiltrados.reduce((acc, pedido) => {
    const platosEnPedido = (pedido.detalle_pedidos || []).reduce((subAcc, item) => {
      return item.menus ? subAcc + item.cantidad : subAcc;
    }, 0);
    return acc + platosEnPedido;
  }, 0);

  const styleTextoNegro = { color: '#000000' };

  async function eliminarPedido(pedido: Pedido) {
    const confirmar = window.confirm(
      `¿Estás seguro de que querés eliminar el pedido de "${pedido.cliente_nombre}"?\n\nEsto devolverá el stock de los platos y lo descontará del cierre de caja.`
    );

    if (!confirmar) return;

    try {
      setCargando(true);
      const hoy = new Date().toISOString().split("T")[0];

      if (pedido.detalle_pedidos && pedido.detalle_pedidos.length > 0) {
        for (const det of pedido.detalle_pedidos) {
          const menuId = (det as any).menu_id || (det.menus as any)?.id;

          if (menuId) {
            const { data: stockData } = await supabase
              .from("stock_diario")
              .select("cantidad_disponible")
              .eq("fecha", hoy)
              .eq("menu_id", menuId)
              .single();

            if (stockData) {
              await supabase
                .from("stock_diario")
                .update({
                  cantidad_disponible: stockData.cantidad_disponible + det.cantidad,
                })
                .eq("fecha", hoy)
                .eq("menu_id", menuId);
            }
          }
        }
      }

      const { error: errDetalle } = await supabase
        .from("detalle_pedidos")
        .delete()
        .eq("pedido_id", pedido.id);

      if (errDetalle) throw errDetalle;

      const { error: errPedido } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedido.id);

      if (errPedido) throw errPedido;

      alert("Pedido eliminado correctamente y stock actualizado.");
      await cargarPedidosDelDia();
    } catch (error: any) {
      console.error("Error al eliminar el pedido:", error);
      alert("Error al eliminar el pedido: " + (error.message || error));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen">
      {/* ENCABEZADO */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>Pedidos del Día</h1>
          <p className="text-sm font-bold text-gray-700">Historial y reimpresión de tickets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportarAExcel}
            className="bg-green-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-green-800 transition-colors shadow"
          >
            📊 Descargar Excel (CSV)
          </button>
          <Link href="/" className="bg-blue-600 text-white text-sm px-3 py-2 rounded font-extrabold hover:bg-blue-700">
            ➕ Tomar Pedido
          </Link>
          <Link href="/cadetes" className="bg-blue-600 text-white text-sm px-3 py-2 rounded font-bold hover:bg-blue-700">
            🛵 Cadetes
          </Link>
          <Link href="/admin" className="bg-black text-white text-sm px-3 py-2 rounded font-bold hover:bg-gray-800">
            ⚙️ Admin
          </Link>
        </div>
      </header>

      {/* FILTROS Y RESUMEN SEPARADO */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-start sm:items-center">
          <div className="flex flex-wrap gap-1">
            {(['TODOS', 'ENVIO', 'RETIRO', 'BAR'] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-1.5 rounded text-xs font-extrabold border-2 transition-colors ${
                  filtroTipo === tipo
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-100'
                }`}
                style={filtroTipo !== tipo ? styleTextoNegro : {}}
              >
                {tipo === 'TODOS' ? '📋 Todos' : tipo === 'ENVIO' ? '🛵 Envíos' : tipo === 'RETIRO' ? '🚶 Retiros' : '🍽️ Bar'}
              </button>
            ))}
          </div>

          <div className="flex gap-1 border-t sm:border-t-0 sm:border-l border-gray-300 pt-2 sm:pt-0 sm:pl-3">
            {(['TODOS', 'MAÑANA', 'NOCHE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTurno(t)}
                className={`px-3 py-1.5 rounded text-xs font-black border-2 ${
                  filtroTurno === t
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                }`}
              >
                {t === 'TODOS' ? 'Día' : t === 'MAÑANA' ? '☀️ Mañana' : '🌙 Noche'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-center min-w-[110px]">
            <span className="text-[11px] font-bold text-gray-600 block uppercase">Tickets</span>
            <span className="text-lg font-black text-black">{pedidosFiltrados.length}</span>
          </div>

          <div className="bg-blue-50 p-2.5 rounded border border-blue-200 text-center min-w-[120px]">
            <span className="text-[11px] font-black text-blue-800 block uppercase">Total Pedidos</span>
            <span className="text-lg font-black text-blue-900">{totalPlatosVendidos}</span>
          </div>

          <div className="bg-green-50 p-2.5 rounded border border-green-200 text-center min-w-[140px]">
            <span className="text-[11px] font-black text-green-800 block uppercase">Total Recaudado</span>
            <span className="text-lg font-black text-green-900">{formatearMoneda(totalRecaudado)}</span>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-12 font-extrabold text-gray-600">Cargando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg border border-gray-300 font-bold text-gray-600">
          No hay pedidos registrados para el filtro seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pedidosFiltrados.map((pedido) => {
            const direccionDetalle = pedido.observaciones && pedido.observaciones.includes('Dirección:')
              ? pedido.observaciones.split('|').find((s) => s.toLowerCase().includes('dirección'))?.replace(/dirección:/i, '').trim()
              : null;

            const platosEnPedido = (pedido.detalle_pedidos || []).reduce((acc, item) => {
              return item.menus ? acc + item.cantidad : acc;
            }, 0);

            return (
              <div key={pedido.id} className="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-300 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-3">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-2.5 py-1 rounded font-black border inline-block ${
                          pedido.tipo_entrega === 'ENVIO' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                          pedido.tipo_entrega === 'RETIRO' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                          'bg-green-100 text-green-900 border-green-300'
                        }`}>
                          {pedido.tipo_entrega === 'ENVIO' ? 'ENVÍO' : pedido.tipo_entrega === 'RETIRO' ? 'RETIRO' : 'BAR'}
                        </span>

                        <span className="text-xs px-2 py-0.5 rounded font-black bg-purple-50 text-purple-900 border border-purple-200">
                          {pedido.turno === 'NOCHE' ? '🌙 NOCHE' : '☀️ MAÑANA'}
                        </span>

                        <span className="text-xs px-2 py-0.5 rounded font-black bg-blue-50 text-blue-900 border border-blue-300">
                          🍽️ {platosEnPedido} {platosEnPedido === 1 ? 'plato' : 'platos'}
                        </span>
                      </div>

                      {pedido.tipo_entrega === 'ENVIO' && direccionDetalle && (
                        <p className="text-xs font-black text-purple-950 mt-1">
                          📍 {direccionDetalle}
                        </p>
                      )}

                      <h2 className="text-lg font-black mt-1" style={styleTextoNegro}>
                        {pedido.tipo_entrega === 'BAR'
                          ? `Bar${pedido.cliente_nombre && pedido.cliente_nombre !== 'Cliente Bar' ? ` - ${pedido.cliente_nombre}` : ''}`
                          : pedido.tipo_entrega === 'RETIRO'
                          ? `Retiro${pedido.cliente_nombre && pedido.cliente_nombre !== 'Retira Mostrador' ? ` - ${pedido.cliente_nombre}` : ''}`
                          : pedido.cliente_nombre || 'Cliente Envío'}
                      </h2>

                      {pedido.cliente_telefono && (
                        <p className="text-xs font-bold text-gray-700 mt-0.5">📞 {pedido.cliente_telefono}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-500 block">
                        {new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                      </span>
                      {pedido.horario_solicitado && (
                        <span className="text-xs font-extrabold text-blue-700 block bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1">
                          🕒 {pedido.horario_solicitado} hs
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <select
                        value={pedido.metodo_pago || 'EFECTIVO'}
                        onChange={(e) => cambiarMetodoPago(pedido.id, e.target.value as any)}
                        className="text-xs font-black bg-white border border-amber-400 p-1 rounded text-black"
                      >
                        <option value="EFECTIVO">💵 Efectivo</option>
                        <option value="TRANSFERENCIA">📱 Transferencia</option>
                        <option value="TARJETA">💳 Tarjeta</option>
                      </select>

                      <button
                        onClick={() => toggleEstadoPago(pedido.id, !!pedido.pago_confirmado)}
                        className={`text-xs font-black px-2.5 py-1 rounded shadow-sm transition-all ${
                          pedido.pago_confirmado
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {pedido.pago_confirmado ? '✓ PAGADO' : '⏳ NO PAGÓ'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                    {pedido.detalle_pedidos?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <span className="font-extrabold" style={styleTextoNegro}>
                            {item.cantidad}x {item.menus?.nombre || item.bebidas?.nombre || (item.guarniciones ? `👉 Extra: ${item.guarniciones.nombre}` : '🍳 Huevo Frito / Adicional')}
                            {item.agregado_menu && <span className="text-blue-900 font-bold ml-1">({item.agregado_menu})</span>}
                          </span>
                          {item.menus && item.guarniciones?.nombre && (
                            <span className="text-xs font-bold text-gray-600 block pl-3">
                              + {item.guarniciones.nombre} {item.agregado_guarnicion && <span className="text-amber-900 font-bold">({item.agregado_guarnicion})</span>}
                            </span>
                          )}
                          {!item.menus && item.guarniciones && item.agregado_guarnicion && (
                            <span className="text-xs font-bold text-amber-900 block pl-3">
                              📝 ({item.agregado_guarnicion})
                            </span>
                          )}
                          {item.ingredientes_ensalada && (
                            <span className="text-xs font-bold text-emerald-800 block pl-3">
                              🥗 ({item.ingredientes_ensalada})
                            </span>
                          )}
                        </div>
                        <span className="font-extrabold ml-2" style={styleTextoNegro}>
                          {formatearMoneda(item.subtotal)}
                        </span>
                      </div>
                    ))}
                    {pedido.observaciones && (
                      <div className="text-xs font-bold text-gray-800 pt-2 border-t border-gray-200 mt-2">
                        <strong>Obs:</strong> {pedido.observaciones}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3 flex flex-wrap justify-between items-center gap-2 mt-2">
                  <div>
                    <span className="text-xs font-bold text-gray-500 block">Total:</span>
                    <span className="text-lg font-black" style={styleTextoNegro}>{formatearMoneda(pedido.monto_total)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => eliminarPedido(pedido)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold py-2 px-2.5 rounded flex items-center gap-1 shadow transition-colors"
                      title="Eliminar pedido y restaurar stock"
                    >
                      🗑️ Eliminar
                    </button>
                    <Link
                      href={`/?editar=${pedido.id}`}
                      className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold py-2 px-2.5 rounded flex items-center gap-1 shadow transition-colors"
                    >
                      ✏️ Editar
                    </Link>
                    <button
                      onClick={() => reimprimirTicket(pedido)}
                      className="bg-gray-900 hover:bg-black text-white text-xs font-extrabold py-2 px-3 rounded flex items-center gap-1.5 shadow transition-colors"
                    >
                      🖨️ Reimprimir Ticket
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}