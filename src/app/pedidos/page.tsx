'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface DetallePedido {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  menus?: { nombre: string };
  guarniciones?: { nombre: string };
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
  detalle_pedidos?: DetallePedido[];
}

export default function HistorialPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ENVIO' | 'RETIRO' | 'BAR'>('TODOS');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarPedidosDelDia();
  }, []);

  async function cargarPedidosDelDia() {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        detalle_pedidos (
          id,
          cantidad,
          precio_unitario,
          subtotal,
          menus ( nombre ),
          guarniciones ( nombre )
        )
      `)
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar pedidos:', error);
    } else if (data) {
      setPedidos(data as Pedido[]);
    }
    setCargando(false);
  }

  const formatearMoneda = (monto: number) => '$ ' + monto.toLocaleString('es-AR');

  // FUNCIONALIDAD PARA EXPORTAR A EXCEL (CSV)
  function exportarAExcel() {
    if (pedidosFiltrados.length === 0) {
      alert('No hay pedidos para exportar.');
      return;
    }

    // Encabezados del archivo
    const encabezados = ['Hora', 'Cliente', 'Telefono', 'Tipo Entrega', 'Detalle Platos', 'Costo Envio', 'Monto Platos', 'Total', 'Observaciones'];

    // Convertir cada pedido en una fila de texto
    const filas = pedidosFiltrados.map((p) => {
      const hora = new Date(p.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      
      // Armar string con los ítems del pedido (ej: "2x Milanesa (+ Puré); 1x Tarta")
      const detalleStr = (p.detalle_pedidos || [])
        .map((i) => `${i.cantidad}x ${i.menus?.nombre || 'Plato'}${i.guarniciones?.nombre ? ` (+ ${i.guarniciones.nombre})` : ''}`)
        .join('; ');

      // Limpiar comillas dobles para evitar fallos de formato en CSV
      const obsLimpia = (p.observaciones || '').replace(/"/g, '""');
      const clienteLimpio = (p.cliente_nombre || '').replace(/"/g, '""');

      return [
        `"${hora}"`,
        `"${clienteLimpio}"`,
        `"${p.cliente_telefono || ''}"`,
        `"${p.tipo_entrega}"`,
        `"${detalleStr}"`,
        p.costo_envio,
        p.monto_platos,
        p.monto_total,
        `"${obsLimpia}"`
      ].join(',');
    });

    // Agregar BOM para UTF-8 (permite que Excel abra acentos y carácteres especiales correctamente)
    const contenidoCSV = '\uFEFF' + [encabezados.join(','), ...filas].join('\n');

    // Descargar el archivo
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_ricosmediodias_${fechaHoy}.csv`);
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

    const itemsHtml = (pedido.detalle_pedidos || [])
      .map(
        (i) => `
        <div style="margin-bottom: 6px;">
          <div style="font-size: 15px; font-weight: bold;">
            ${i.cantidad}x ${i.menus?.nombre || 'Plato'}
          </div>
          ${i.guarniciones?.nombre ? `<div style="font-size: 13px; font-weight: bold; margin-left: 12px;">+ ${i.guarniciones.nombre}</div>` : ''}
          <div style="text-align: right; font-size: 13px; font-weight: bold;">${formatearMoneda(i.subtotal)}</div>
        </div>`
      )
      .join('');

    let cabeceraEntrega = '';
    if (pedido.tipo_entrega === 'ENVIO') {
      cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
        🛵 ENVÍO
      </div>`;
    } else if (pedido.tipo_entrega === 'RETIRO') {
      cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
        🚶 RETIRA EN LOCAL
      </div>`;
    } else {
      cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
        🍽️ COMER EN BAR
      </div>`;
    }

    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Ticket - RicosMediodias</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 270px; 
              padding: 8px; 
              margin: 0 auto; 
              font-size: 13px; 
              color: #000;
            }
            .center { text-align: center; }
            .line { border-bottom: 2px solid #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1 style="margin:0; font-size: 22px; font-weight: 900; letter-spacing: -1px;">RicosMediodias</h1>
            <p style="margin:2px 0; font-size: 10px;">${fechaHora} (REIMPRESIÓN)</p>
          </div>
          
          <div class="line"></div>

          ${cabeceraEntrega}
          
          <div style="font-size: 14px; margin-bottom: 4px;">
            <strong>Cliente:</strong> ${pedido.cliente_nombre} ${pedido.cliente_telefono ? `(${pedido.cliente_telefono})` : ''}
          </div>

          ${pedido.observaciones ? `<div style="font-size: 13px; font-weight: bold; background-color: #eee; padding: 2px 4px; margin-top: 4px;">Obs: ${pedido.observaciones}</div>` : ''}

          <div class="line"></div>

          <div style="margin: 8px 0;">
            ${itemsHtml}
          </div>

          <div class="line"></div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px;">
            <div>
              ${pedido.horario_solicitado ? `
                <div style="font-size: 11px; text-transform: uppercase;">Hora Entrega:</div>
                <div style="font-size: 18px; font-weight: 900;">🕒 ${pedido.horario_solicitado} hs</div>
              ` : `
                <div style="font-size: 11px; text-transform: uppercase;">Hora:</div>
                <div style="font-size: 14px; font-weight: bold;">Lo antes posible</div>
              `}
            </div>

            <div style="text-align: right;">
              ${pedido.costo_envio > 0 ? `<div style="font-size: 11px;">Envío: ${formatearMoneda(pedido.costo_envio)}</div>` : ''}
              <div style="font-size: 11px; text-transform: uppercase;">Total a pagar:</div>
              <div style="font-size: 20px; font-weight: 900;">${formatearMoneda(pedido.monto_total)}</div>
            </div>
          </div>

          <div class="line" style="margin-top: 10px;"></div>
          <p class="center" style="margin: 6px 0 0 0; font-size: 11px; font-weight: bold;">¡Gracias por tu compra!</p>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
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
  const styleTextoNegro = { color: '#000000' };

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
          <Link href="/admin" className="bg-black text-white text-sm px-3 py-2 rounded font-bold hover:bg-gray-800">
            ⚙️ Admin
          </Link>
        </div>
      </header>

      {/* FILTROS Y RESUMEN */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {(['TODOS', 'ENVIO', 'RETIRO', 'BAR'] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-4 py-2 rounded text-xs font-extrabold border-2 transition-colors ${
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

        <div className="text-right w-full md:w-auto bg-gray-50 p-3 rounded border border-gray-200">
          <span className="text-xs font-bold text-gray-600 block">Total Recaudado ({pedidosFiltrados.length} pedidos):</span>
          <span className="text-xl font-black" style={styleTextoNegro}>{formatearMoneda(totalRecaudado)}</span>
        </div>
      </div>

      {/* LISTADO DE PEDIDOS */}
      {cargando ? (
        <div className="text-center py-12 font-extrabold text-gray-600">Cargando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg border border-gray-300 font-bold text-gray-600">
          No hay pedidos registrados para el filtro seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pedidosFiltrados.map((pedido) => (
            <div key={pedido.id} className="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-300 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-3">
                  <div>
                    <span className={`text-xs px-2.5 py-1 rounded font-black border ${
                      pedido.tipo_entrega === 'ENVIO' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                      pedido.tipo_entrega === 'RETIRO' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                      'bg-green-100 text-green-900 border-green-300'
                    }`}>
                      {pedido.tipo_entrega === 'ENVIO' ? '🛵 ENVÍO' : pedido.tipo_entrega === 'RETIRO' ? '🚶 RETIRO' : '🍽️ BAR'}
                    </span>
                    <h2 className="text-lg font-black mt-2" style={styleTextoNegro}>
                      {pedido.cliente_nombre}
                    </h2>
                    {pedido.cliente_telefono && (
                      <p className="text-xs font-bold text-gray-700">📞 {pedido.cliente_telefono}</p>
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

                {/* DETALLE DE ITEMS */}
                <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                  {pedido.detalle_pedidos?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="font-extrabold" style={styleTextoNegro}>
                        {item.cantidad}x {item.menus?.nombre || 'Plato'}
                        {item.guarniciones?.nombre && (
                          <span className="text-xs font-bold text-gray-600 block pl-3">
                            + {item.guarniciones.nombre}
                          </span>
                        )}
                      </span>
                      <span className="font-extrabold" style={styleTextoNegro}>
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
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center mt-2">
                <div>
                  <span className="text-xs font-bold text-gray-500 block">Total:</span>
                  <span className="text-lg font-black" style={styleTextoNegro}>{formatearMoneda(pedido.monto_total)}</span>
                </div>

                <button
                  onClick={() => reimprimirTicket(pedido)}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-extrabold py-2 px-3 rounded flex items-center gap-1.5 shadow transition-colors"
                >
                  🖨️ Reimprimir Ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}