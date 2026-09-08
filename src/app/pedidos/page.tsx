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

const hoyFechaStr = new Date().toLocaleDateString('es-CA');
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENVIO' | 'RETIRO' | 'BAR'>('TODOS');
  const [filtroTurno, setFiltroTurno] = useState<'TODOS' | 'MAÑANA' | 'NOCHE'>(obtenerTurnoActual());
  
  // FILTRO POR RANGO DE FECHAS (Por defecto HOY)
  const [fechaDesde, setFechaDesde] = useState<string>(hoyFechaStr);
  const [fechaHasta, setFechaHasta] = useState<string>(hoyFechaStr);

  const [busquedaTexto, setBusquedaTexto] = useState<string>('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarPedidos();

    const canal = supabase
      .channel('cambios-pedidos-historial')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          cargarPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [filtroTurno, fechaDesde, fechaHasta]);

  async function cargarPedidos() {
    setCargando(true);
    
    // Filtro estricto por día calendario exacto (medianoche a medianoche local)
    const inicioStr = `${fechaDesde}T00:00:00`;
    const finStr = `${fechaHasta}T23:59:59`;

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
      .gte('created_at', inicioStr)
      .lte('created_at', finStr);

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
  // CAMBIAR TURNO RÁPIDO HACIENDO CLIC EN LA ETIQUETA
  async function toggleTurnoPedido(id: string, turnoActual?: 'MAÑANA' | 'NOCHE') {
    const nuevoTurno = turnoActual === 'NOCHE' ? 'MAÑANA' : 'NOCHE';
    const { error } = await supabase
      .from('pedidos')
      .update({ turno: nuevoTurno })
      .eq('id', id);

    if (error) {
      alert("Error al cambiar el turno: " + error.message);
    } else {
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, turno: nuevoTurno } : p))
      );
    }
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

  const formatearMoneda = (monto: number) => '$ ' + (monto || 0).toLocaleString('es-AR');

  function exportarAExcel() {
    if (pedidosFiltrados.length === 0) {
      alert('No hay pedidos para exportar.');
      return;
    }

    const encabezados = [
      'Fecha/Hora', 'Turno', 'Cliente', 'Telefono', 'Tipo Entrega',
      'Metodo Pago', 'Estado Pago', 'Detalle Platos', 'Costo Envio',
      'Monto Platos', 'Total', 'Observaciones'
    ];

    const filas = pedidosFiltrados.map((p) => {
      const fechaHora = new Date(p.created_at).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      
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
        `"${fechaHora}"`,
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
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_ricosmediodias_${fechaDesde}_al_${fechaHasta}.csv`);
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

  // Lógica de Filtrado Completa
  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroTipo !== 'TODOS' && p.tipo_entrega !== filtroTipo) {
      return false;
    }

    if (!busquedaTexto.trim()) return true;

    const query = busquedaTexto.toLowerCase().trim();

    const nombreMatch = (p.cliente_nombre || '').toLowerCase().includes(query);
    const telefonoMatch = (p.cliente_telefono || '').toLowerCase().includes(query);
    const obsMatch = (p.observaciones || '').toLowerCase().includes(query);

    const itemsMatch = (p.detalle_pedidos || []).some((item) => {
      const menuNom = (item.menus?.nombre || '').toLowerCase();
      const guarNom = (item.guarniciones?.nombre || '').toLowerCase();
      const bebNom = (item.bebidas?.nombre || '').toLowerCase();
      const agrMenu = (item.agregado_menu || '').toLowerCase();
      const agrGuar = (item.agregado_guarnicion || '').toLowerCase();
      const ensalada = (item.ingredientes_ensalada || '').toLowerCase();

      return (
        menuNom.includes(query) ||
        guarNom.includes(query) ||
        bebNom.includes(query) ||
        agrMenu.includes(query) ||
        agrGuar.includes(query) ||
        ensalada.includes(query)
      );
    });

    return nombreMatch || telefonoMatch || obsMatch || itemsMatch;
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
      `¿Estás seguro de que querés eliminar el pedido de "${pedido.cliente_nombre}"?\n\nEsto devolverá el stock de los platos y lo descontará de los informes.`
    );

    if (!confirmar) return;

    try {
      setCargando(true);
      const fechaPedidoLocal = pedido.created_at.split("T")[0];

      if (pedido.detalle_pedidos && pedido.detalle_pedidos.length > 0) {
        for (const det of pedido.detalle_pedidos) {
          const menuId = (det as any).menu_id || (det.menus as any)?.id;

          if (menuId) {
            const { data: stockData } = await supabase
              .from("stock_diario")
              .select("cantidad_disponible")
              .eq("fecha", fechaPedidoLocal)
              .eq("menu_id", menuId)
              .single();

            if (stockData) {
              await supabase
                .from("stock_diario")
                .update({
                  cantidad_disponible: stockData.cantidad_disponible + det.cantidad,
                })
                .eq("fecha", fechaPedidoLocal)
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
      await cargarPedidos();
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
          <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>Historial de Pedidos</h1>
          <p className="text-sm font-bold text-gray-700">Consulta, reimpresión de tickets y control de turnos</p>
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

      {/* FILTROS, FECHAS Y BUSCADOR */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 mb-6 flex flex-col gap-4">
        
        {/* SELECTOR DE RANGO DE FECHAS */}
        <div className="flex flex-wrap items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
          <span className="text-xs font-black text-purple-950 uppercase">📅 Rango de Fechas:</span>
          <div className="flex items-center gap-1">
            <label className="text-xs font-bold text-gray-700">Desde:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="text-xs font-black p-1 bg-white border border-purple-300 rounded text-black"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs font-bold text-gray-700">Hasta:</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="text-xs font-black p-1 bg-white border border-purple-300 rounded text-black"
            />
          </div>
          {(fechaDesde !== hoyFechaStr || fechaHasta !== hoyFechaStr) && (
            <button
              onClick={() => {
                setFechaDesde(hoyFechaStr);
                setFechaHasta(hoyFechaStr);
              }}
              className="text-xs font-extrabold bg-purple-200 hover:bg-purple-300 text-purple-900 px-2 py-1 rounded ml-auto"
            >
              🔄 Volver a Hoy
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          
          {/* BUSCADOR DE TEXTO EN TIEMPO REAL */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="🔍 Buscar por dirección, cliente, teléfono, plato o nota..."
                className="w-full border-2 border-gray-400 p-2.5 pl-3 pr-8 rounded-lg text-sm font-bold text-black bg-gray-50 focus:bg-white focus:border-blue-600 outline-none"
              />
              {busquedaTexto && (
                <button
                  type="button"
                  onClick={() => setBusquedaTexto('')}
                  className="absolute right-2.5 top-2.5 text-gray-500 font-extrabold hover:text-black text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* CONTADORES Y TOTALES */}
          <div className="flex flex-wrap gap-3 justify-end">
            <div className="bg-gray-50 p-2 rounded border border-gray-200 text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-gray-600 block uppercase">Tickets</span>
              <span className="text-base font-black text-black">{pedidosFiltrados.length}</span>
            </div>

            <div className="bg-blue-50 p-2 rounded border border-blue-200 text-center min-w-[100px]">
              <span className="text-[10px] font-black text-blue-800 block uppercase">Total Pedidos</span>
              <span className="text-base font-black text-blue-900">{totalPlatosVendidos}</span>
            </div>

            <div className="bg-green-50 p-2 rounded border border-green-200 text-center min-w-[120px]">
              <span className="text-[10px] font-black text-green-800 block uppercase">Recaudado</span>
              <span className="text-base font-black text-green-900">{formatearMoneda(totalRecaudado)}</span>
            </div>
          </div>
        </div>

        {/* BOTONES DE FILTRO DE ENTREGA Y TURNO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-200">
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

          <div className="flex gap-1">
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
                {t === 'TODOS' ? 'Día Completo' : t === 'MAÑANA' ? '☀️ Mañana' : '🌙 Noche'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LISTADO DE PEDIDOS */}
      {cargando ? (
        <div className="text-center py-12 font-extrabold text-gray-600">Cargando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg border border-gray-300 font-bold text-gray-600">
          {busquedaTexto ? `No se encontraron pedidos con "${busquedaTexto}"` : 'No hay pedidos registrados para el rango de fechas seleccionado.'}
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
                  <div className="border-b border-gray-200 pb-3 mb-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-2.5 py-1 rounded font-black border inline-block ${
                          pedido.tipo_entrega === 'ENVIO' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                          pedido.tipo_entrega === 'RETIRO' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                          'bg-green-100 text-green-900 border-green-300'
                        }`}>
                          {pedido.tipo_entrega === 'ENVIO' ? 'ENVÍO' : pedido.tipo_entrega === 'RETIRO' ? 'RETIRO' : 'BAR'}
                        </span>

                        {/* BOTÓN INTERACTIVO PARA CAMBIAR TURNO AL HACER CLIC */}
                        <button
                          onClick={() => toggleTurnoPedido(pedido.id, pedido.turno)}
                          title="Hacé clic para cambiar de turno (Mañana / Noche)"
                          className="text-xs px-2 py-0.5 rounded font-black bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 cursor-pointer transition-colors"
                        >
                          {pedido.turno === 'NOCHE' ? '🌙 NOCHE 🔄' : '☀️ MAÑANA 🔄'}
                        </button>

                        <span className="text-xs px-2 py-0.5 rounded font-black bg-blue-50 text-blue-900 border border-blue-300">
                          🍽️ {platosEnPedido} {platosEnPedido === 1 ? 'plato' : 'platos'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-500 block">
                          {new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} {new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                        </span>
                        {pedido.horario_solicitado && (
                          <span className="text-xs font-extrabold text-blue-700 block bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-0.5">
                            🕒 {pedido.horario_solicitado} hs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CAJA DESTACADA DE DIRECCIÓN EN CASO DE ENVÍO */}
                    {pedido.tipo_entrega === 'ENVIO' && direccionDetalle && (
                      <div className="p-2.5 bg-purple-100 border-2 border-purple-400 rounded-lg mb-2">
                        <span className="text-[10px] font-black uppercase text-purple-900 block">
                          📍 Dirección de Envío:
                        </span>
                        <span className="text-base font-black text-black block leading-tight">
                          {direccionDetalle}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-1">
                      <h2 className="text-base font-black text-gray-900">
                        👤 {pedido.tipo_entrega === 'BAR'
                          ? `Bar${pedido.cliente_nombre && pedido.cliente_nombre !== 'Cliente Bar' ? ` - ${pedido.cliente_nombre}` : ''}`
                          : pedido.tipo_entrega === 'RETIRO'
                          ? `Retiro${pedido.cliente_nombre && pedido.cliente_nombre !== 'Retira Mostrador' ? ` - ${pedido.cliente_nombre}` : ''}`
                          : pedido.cliente_nombre || 'Cliente Envío'}
                      </h2>

                      {pedido.cliente_telefono && (
                        <p className="text-xs font-bold text-gray-700">📞 {pedido.cliente_telefono}</p>
                      )}
                    </div>
                  </div>

                  {/* CAJA DE MÉTODO Y ESTADO DE PAGO */}
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

                  {/* DETALLE DE ITEMS */}
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

                {/* PIE DE TARJETA Y REIMPRESIÓN */}
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