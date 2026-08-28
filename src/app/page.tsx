'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

interface Menu {
  id: string;
  nombre: string;
  precio: number;
  lleva_guarnicion: boolean;
}

interface Guarnicion {
  id: string;
  nombre: string;
  precio_extra: number;
  requiere_ingredientes: boolean;
}

interface Ingrediente {
  id: string;
  nombre: string;
}

interface ZonaEnvio {
  id: string;
  nombre_zona: string;
  precio: number;
}

interface ItemPedido {
  menu: Menu;
  guarnicion?: Guarnicion;
  ingredientesEnsalada?: string[];
  cantidad: number;
  subtotal: number;
}

export default function TomaPedidosPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [guarniciones, setGuarniciones] = useState<Guarnicion[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [zonasEnvio, setZonasEnvio] = useState<ZonaEnvio[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const [items, setItems] = useState<ItemPedido[]>([]);
  const [tipoEntrega, setTipoEntrega] = useState<'RETIRO' | 'ENVIO' | 'BAR'>('RETIRO');
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaEnvio | null>(null);
  const [direccion, setDireccion] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [horario, setHorario] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [menuSeleccionado, setMenuSeleccionado] = useState<Menu | null>(null);
  const [guarnicionSeleccionada, setGuarnicionSeleccionada] = useState<Guarnicion | null>(null);
  const [ingredientesElegidos, setIngredientesElegidos] = useState<string[]>([]);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    cargarDatosDelDia();
  }, []);

  async function cargarDatosDelDia() {
    const hoy = new Date().toISOString().split('T')[0];

    const { data: stockData } = await supabase
      .from('stock_diario')
      .select('menu_id, cantidad_disponible')
      .eq('fecha', hoy)
      .gt('cantidad_disponible', 0);

    const mapa: Record<string, number> = {};
    const idsConStock: string[] = [];

    if (stockData) {
      stockData.forEach((s) => {
        mapa[s.menu_id] = s.cantidad_disponible;
        idsConStock.push(s.menu_id);
      });
    }
    setStockMap(mapa);

    if (idsConStock.length > 0) {
      const { data: menusData } = await supabase
        .from('menus')
        .select('*')
        .in('id', idsConStock)
        .eq('activo', true);
      if (menusData) setMenus(menusData);
    } else {
      setMenus([]);
    }

    const { data: guarniData } = await supabase.from('guarniciones').select('*').eq('activa', true);
    if (guarniData) setGuarniciones(guarniData);

    const { data: ingData } = await supabase.from('ingredientes_ensalada').select('*').eq('activo', true);
    if (ingData) setIngredientes(ingData);

    const { data: zonasData } = await supabase.from('zonas_envio').select('*').eq('activa', true);
    if (zonasData) {
      setZonasEnvio(zonasData);
      if (zonasData.length > 0) setZonaSeleccionada(zonasData[0]);
    }
  }

  function toggleIngrediente(nombreIng: string) {
    if (ingredientesElegidos.includes(nombreIng)) {
      setIngredientesElegidos(ingredientesElegidos.filter((i) => i !== nombreIng));
    } else {
      setIngredientesElegidos([...ingredientesElegidos, nombreIng]);
    }
  }

  function agregarItem() {
    if (!menuSeleccionado) return;

    const stockDisponible = stockMap[menuSeleccionado.id] || 0;
    const cantidadYaEnCarrito = items
      .filter((item) => item.menu.id === menuSeleccionado.id)
      .reduce((acc, item) => acc + item.cantidad, 0);

    if (cantidad + cantidadYaEnCarrito > stockDisponible) {
      alert(`¡Stock insuficiente! Quedan ${stockDisponible - cantidadYaEnCarrito} de ${menuSeleccionado.nombre}`);
      return;
    }

    const precioGuarnicion = (menuSeleccionado.lleva_guarnicion && guarnicionSeleccionada) ? guarnicionSeleccionada.precio_extra : 0;
    const subtotal = (menuSeleccionado.precio + precioGuarnicion) * cantidad;

    setItems([
      ...items,
      {
        menu: menuSeleccionado,
        guarnicion: (menuSeleccionado.lleva_guarnicion && guarnicionSeleccionada) ? guarnicionSeleccionada : undefined,
        ingredientesEnsalada: guarnicionSeleccionada?.requiere_ingredientes ? ingredientesElegidos : undefined,
        cantidad,
        subtotal
      }
    ]);

    setMenuSeleccionado(null);
    setGuarnicionSeleccionada(null);
    setIngredientesElegidos([]);
    setCantidad(1);
  }

  function eliminarItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const montoPlatos = items.reduce((acc, item) => acc + item.subtotal, 0);
  const costoEnvio = tipoEntrega === 'ENVIO' && zonaSeleccionada ? zonaSeleccionada.precio : 0;
  const montoTotal = montoPlatos + costoEnvio;

  const formatearMoneda = (monto: number) => '$ ' + monto.toLocaleString('es-AR');

  function imprimirTicket(idPedido: string) {
    const ventanaImpresion = window.open('', '_blank', 'width=350,height=600');
    if (!ventanaImpresion) return;

    const fechaHora = new Date().toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Crear un nombre único con el cliente e ID para que no se llamen igual las descargas
    const nombreClienteLimpio = clienteNombre.replace(/[^a-zA-Z0-9]/g, '');
    const idCorto = idPedido.slice(0, 6);
    const tituloDocumento = `Ticket_#${idCorto}_${nombreClienteLimpio}`;

    const itemsHtml = items
      .map(
        (i) => `
        <div style="margin-bottom: 6px;">
          <div style="font-size: 15px; font-weight: bold;">
            ${i.cantidad}x ${i.menu.nombre}
          </div>
          ${i.guarnicion ? `<div style="font-size: 14px; font-weight: bold; margin-left: 12px;">+ ${i.guarnicion.nombre}</div>` : ''}
          ${i.ingredientesEnsalada && i.ingredientesEnsalada.length > 0 ? `<div style="font-size: 14px; color: #000 ; margin-left: 16px;">(${i.ingredientesEnsalada.join(', ')})</div>` : ''}
          <div style="text-align: right; font-size: 13px; font-weight: bold;">${formatearMoneda(i.subtotal)}</div>
        </div>`
      )
      .join('');

    let cabeceraEntrega = '';
    if (tipoEntrega === 'ENVIO') {
      cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
        🛵 ENVÍO: ${direccion}
      </div>`;
    } else if (tipoEntrega === 'RETIRO') {
      cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
        🚶 RETIRA
      </div>`;
    } else {
      cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
        🍽️ BAR
      </div>`;
    }

    ventanaImpresion.document.write(`
      <html>
        <head>
          <!-- 1. CAMBIO DE NOMBRE DEL ARCHIVO: Usa el título dinámico -->
          <title>${tituloDocumento}</title>
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
            <p style="margin:2px 0; font-size: 10px;">${fechaHora}</p>
          </div>
          
          <div class="line"></div>

          ${cabeceraEntrega}
          
          <div style="font-size: 14px; margin-bottom: 4px;">
            <strong>Cliente:</strong> ${clienteNombre} ${clienteTelefono ? `(${clienteTelefono})` : ''}
          </div>

          ${observaciones ? `<div style="font-size: 13px; font-weight: bold; background-color: #eee; padding: 2px 4px; margin-top: 4px;">Obs: ${observaciones}</div>` : ''}

          <div class="line"></div>

          <div style="margin: 8px 0;">
            ${itemsHtml}
          </div>

          <div class="line"></div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px;">
            <div>
              ${horario ? `
                <div style="font-size: 11px; text-transform: uppercase;">Hora Entrega:</div>
                <div style="font-size: 18px; font-weight: 900;">🕒 ${horario} hs</div>
              ` : `
                <div style="font-size: 11px; text-transform: uppercase;">Hora:</div>
                <div style="font-size: 14px; font-weight: bold;">--</div>
              `}
            </div>

            <div style="text-align: right;">
              ${costoEnvio > 0 ? `<div style="font-size: 11px;">Envío: ${formatearMoneda(costoEnvio)}</div>` : ''}
              <div style="font-size: 11px; text-transform: uppercase;">Total a pagar:</div>
              <div style="font-size: 20px; font-weight: 900;">${formatearMoneda(montoTotal)}</div>
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

  async function confirmarPedido() {
    if (items.length === 0) return alert('Agregá al menos un menú al pedido');
    if (!clienteNombre) return alert('Ingresá el nombre del cliente');
    if (tipoEntrega === 'ENVIO' && !direccion) return alert('Ingresá la dirección para el envío');

    const hoy = new Date().toISOString().split('T')[0];
    const obsCompleta = tipoEntrega === 'ENVIO' 
      ? `Dirección: ${direccion}. ${observaciones}` 
      : observaciones;

    const { data: pedidoGuardado, error: errPedido } = await supabase
      .from('pedidos')
      .insert([
        {
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          tipo_entrega: tipoEntrega,
          zona_envio_id: zonaSeleccionada?.id || null,
          costo_envio: costoEnvio,
          monto_platos: montoPlatos,
          monto_total: montoTotal,
          horario_solicitado: horario,
          observaciones: obsCompleta,
          estado: 'PENDIENTE',
        },
      ])
      .select()
      .single();

    if (errPedido || !pedidoGuardado) {
      alert('Error al guardar el pedido: ' + errPedido?.message);
      return;
    }

    for (const item of items) {
      // Si la guarnición llevaba ensalada con ingredientes, agregar en observaciones del renglón o guardar
      const { data: detGuardado } = await supabase.from('detalle_pedidos').insert([
        {
          pedido_id: pedidoGuardado.id,
          menu_id: item.menu.id,
          guarnicion_id: item.guarnicion?.id || null,
          cantidad: item.cantidad,
          precio_unitario: item.menu.precio,
          subtotal: item.subtotal,
        },
      ]);

      const stockActual = stockMap[item.menu.id] || 0;
      const nuevoStock = Math.max(0, stockActual - item.cantidad);

      await supabase
        .from('stock_diario')
        .update({ cantidad_disponible: nuevoStock })
        .eq('fecha', hoy)
        .eq('menu_id', item.menu.id);
    }

    imprimirTicket(pedidoGuardado.id);

    setItems([]);
    setClienteNombre('');
    setClienteTelefono('');
    setDireccion('');
    setHorario('');
    setObservaciones('');
    cargarDatosDelDia();
  }

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>Toma de Pedidos</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/pedidos" className="bg-purple-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-purple-800">
            📋 Pedidos
          </Link>
          <Link href="/reportes" className="bg-green-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-green-800">
            📈 Reportes / Cierre
          </Link>
          <Link href="/admin" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
            ⚙️ Admin
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300">
            <h2 className="text-lg font-bold mb-4" style={styleTextoNegro}>1. Seleccionar Menú del Día</h2>
            {menus.length === 0 ? (
              <p className="text-red-600 text-sm font-bold">No hay menús con stock cargado para hoy. Cargá el stock en Administración.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {menus.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMenuSeleccionado(m);
                      setGuarnicionSeleccionada(null);
                      setIngredientesElegidos([]);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      menuSeleccionado?.id === m.id
                        ? 'border-blue-600 bg-blue-100 font-extrabold shadow-sm'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <div className="font-extrabold text-base" style={styleTextoNegro}>{m.nombre}</div>
                    <div className="text-sm font-bold mt-1" style={styleTextoNegro}>{formatearMoneda(m.precio)}</div>
                    <div className="text-xs text-blue-700 font-bold mt-1">
                      Stock: {stockMap[m.id] ?? 0} disp.
                    </div>
                  </button>
                ))}
              </div>
            )}

            {menuSeleccionado && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 space-y-3">
                <h3 className="font-bold text-sm" style={styleTextoNegro}>Opciones para: {menuSeleccionado.nombre}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>
                      {menuSeleccionado.lleva_guarnicion ? 'Guarnición (Opcional)' : 'Guarnición (No Aplica)'}
                    </label>
                    <select
                      disabled={!menuSeleccionado.lleva_guarnicion}
                      style={styleTextoNegro}
                      onChange={(e) => {
                        const g = guarniciones.find((guar) => guar.id === e.target.value) || null;
                        setGuarnicionSeleccionada(g);
                        setIngredientesElegidos([]);
                      }}
                      className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none disabled:bg-gray-200 disabled:opacity-60"
                    >
                      <option value="">
                        {menuSeleccionado.lleva_guarnicion ? 'Sin Guarnición' : 'Este plato no lleva guarnición'}
                      </option>
                      {menuSeleccionado.lleva_guarnicion && guarniciones.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nombre} {g.precio_extra > 0 ? `(+${formatearMoneda(g.precio_extra)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      style={styleTextoNegro}
                      value={cantidad}
                      onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                      className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* SI LA GUARNICIÓN REQUIERE ELEGIR INGREDIENTES */}
                {guarnicionSeleccionada?.requiere_ingredientes && (
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg space-y-2">
                    <label className="block text-xs font-black text-emerald-900">
                      🥗 Seleccionar Ingredientes para la Ensalada:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ingredientes.map((ing) => {
                        const seleccionada = ingredientesElegidos.includes(ing.nombre);
                        return (
                          <button
                            type="button"
                            key={ing.id}
                            onClick={() => toggleIngrediente(ing.nombre)}
                            className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                              seleccionada
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            {seleccionada ? '✓ ' : '+ '}{ing.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={agregarItem}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold py-2 rounded text-sm transition-colors"
                >
                  + Agregar al Pedido
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 space-y-4">
            <h2 className="text-lg font-bold" style={styleTextoNegro}>2. Tipo de Entrega y Cliente</h2>

            <div className="flex gap-2">
              {(['RETIRO', 'ENVIO', 'BAR'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoEntrega(tipo)}
                  className={`flex-1 py-2 rounded text-sm font-extrabold border-2 ${
                    tipoEntrega === tipo
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-gray-300 hover:bg-gray-100'
                  }`}
                  style={tipoEntrega !== tipo ? styleTextoNegro : {}}
                >
                  {tipo === 'RETIRO' ? '🚶 Retiro' : tipo === 'ENVIO' ? '🛵 Envío' : '🍽️ Bar'}
                </button>
              ))}
            </div>

            {tipoEntrega === 'ENVIO' && (
              <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Dirección de Envío*</label>
                  <input
                    type="text"
                    style={styleTextoNegro}
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Av. San Martín 1234, Dpto 2"
                    className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Zona de Envío</label>
                  <div className="flex flex-wrap gap-2">
                    {zonasEnvio.map((z) => (
                      <button
                        type="button"
                        key={z.id}
                        onClick={() => setZonaSeleccionada(z)}
                        className={`px-3 py-1.5 rounded text-xs font-extrabold border-2 transition-colors ${
                          zonaSeleccionada?.id === z.id
                            ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                            : 'bg-white border-gray-400 hover:bg-gray-100'
                        }`}
                        style={zonaSeleccionada?.id !== z.id ? styleTextoNegro : {}}
                      >
                        {z.nombre_zona} (+{formatearMoneda(z.precio)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre Cliente*</label>
                <input
                  type="text"
                  style={styleTextoNegro}
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Teléfono</label>
                <input
                  type="text"
                  style={styleTextoNegro}
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej: 341 123456"
                  className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Horario Opcional</label>
                <input
                  type="text"
                  style={styleTextoNegro}
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  placeholder="Ej: 13:30 hs"
                  className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Observaciones</label>
              <input
                type="text"
                style={styleTextoNegro}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Sin cebolla, paga con transferencia"
                className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-4" style={styleTextoNegro}>Resumen del Pedido</h2>

            {items.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8 font-bold">El pedido está vacío</p>
            ) : (
              <div className="space-y-3 mb-6">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-300 pb-2">
                    <div>
                      <div className="font-extrabold" style={styleTextoNegro}>
                        {item.cantidad}x {item.menu.nombre}
                      </div>
                      {item.guarnicion && (
                        <div className="text-xs font-bold text-gray-700">
                          + {item.guarnicion.nombre}
                          {item.ingredientesEnsalada && item.ingredientesEnsalada.length > 0 && (
                            <span className="block text-xs font-normal text-emerald-800">
                              ({item.ingredientesEnsalada.join(', ')})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold" style={styleTextoNegro}>{formatearMoneda(item.subtotal)}</span>
                      <button onClick={() => eliminarItem(idx)} className="text-red-600 font-extrabold text-xs p-1">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t-2 border-gray-300 pt-4 space-y-2">
            <div className="flex justify-between text-sm font-bold" style={styleTextoNegro}>
              <span>Subtotal Platos:</span>
              <span>{formatearMoneda(montoPlatos)}</span>
            </div>
            {tipoEntrega === 'ENVIO' && zonaSeleccionada && (
              <div className="flex justify-between text-sm font-bold" style={styleTextoNegro}>
                <span>Envío ({zonaSeleccionada.nombre_zona}):</span>
                <span>{formatearMoneda(costoEnvio)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-black border-t-2 border-gray-300 pt-2" style={styleTextoNegro}>
              <span>Total:</span>
              <span>{formatearMoneda(montoTotal)}</span>
            </div>

            <button
              onClick={confirmarPedido}
              disabled={items.length === 0}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-extrabold py-3 rounded-lg shadow transition-colors"
            >
              Confirmar e Imprimir Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}