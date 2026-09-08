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
  turno?: 'MAÑANA' | 'NOCHE';
  estado_cadete?: 'EN_VIAJE' | 'RENDIDO' | null;
  numero_vuelta?: number | null;
  metodo_pago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  pago_confirmado?: boolean;
}

interface VueltaRendida {
  numeroVuelta: number;
  montoTotalRendido: number;
  totalEfectivo: number;
  totalOtrosPagos: number;
  costoEnviosTotal: number;
  cantidadPedidos: number;
  hora: string;
}

export default function CadetesPage() {
  const hoyArg = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const [pedidos, setPedidos] = useState<PedidoEnvio[]>([]);
  const [filtroTurno, setFiltroTurno] = useState<'TODOS' | 'MAÑANA' | 'NOCHE'>('TODOS');
  const [cargando, setCargando] = useState(false);

  // Nombres sincronizados con Supabase
  const [nombreCadete1, setNombreCadete1] = useState('Cadete 1');
  const [nombreCadete2, setNombreCadete2] = useState('Cadete 2');
  const [editandoCadete1, setEditandoCadete1] = useState(false);
  const [editandoCadete2, setEditandoCadete2] = useState(false);

  // Historial de Vueltas dinámico desde Supabase
  const [vueltasCadete1, setVueltasCadete1] = useState<VueltaRendida[]>([]);
  const [vueltasCadete2, setVueltasCadete2] = useState<VueltaRendida[]>([]);

  useEffect(() => {
    cargarConfiguracionYEnvios();

    // Escuchar cambios en tiempo real
    const canal = supabase
      .channel('cambios-pedidos-cadetes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          cargarEnvios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [hoyArg, filtroTurno, nombreCadete1, nombreCadete2]);

  async function cargarConfiguracionYEnvios() {
    setCargando(true);
    const { data: confData } = await supabase
      .from('configuracion')
      .select('nombre_cadete_1, nombre_cadete_2')
      .eq('id', 'general')
      .single();

    let c1 = 'Cadete 1';
    let c2 = 'Cadete 2';
    if (confData) {
      if (confData.nombre_cadete_1) {
        c1 = confData.nombre_cadete_1;
        setNombreCadete1(c1);
      }
      if (confData.nombre_cadete_2) {
        c2 = confData.nombre_cadete_2;
        setNombreCadete2(c2);
      }
    }

    await cargarEnvios(c1, c2);
  }

  async function cargarEnvios(c1 = nombreCadete1, c2 = nombreCadete2) {
    let query = supabase
      .from('pedidos')
      .select('*')
      .eq('tipo_entrega', 'ENVIO')
      .gte('created_at', `${hoyArg}T03:00:00`);

    if (filtroTurno !== 'TODOS') {
      query = query.eq('turno', filtroTurno);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setPedidos(data as PedidoEnvio[]);
      construirVueltasRendidas(data as PedidoEnvio[], c1, c2);
    }
    setCargando(false);
  }

  function construirVueltasRendidas(todosLosPedidos: PedidoEnvio[], c1: string, c2: string) {
    const procesarVueltas = (nombreCadete: string) => {
      const rendidos = todosLosPedidos.filter(
        (p) => (p.cadete === nombreCadete || p.cadete === `Cadete ${nombreCadete === c1 ? '1' : '2'}`) && 
               p.estado_cadete === 'RENDIDO' && 
               p.numero_vuelta != null
      );

      const vueltasAgrupadas: Record<number, PedidoEnvio[]> = {};
      rendidos.forEach((p) => {
        const v = p.numero_vuelta!;
        if (!vueltasAgrupadas[v]) vueltasAgrupadas[v] = [];
        vueltasAgrupadas[v].push(p);
      });

      const historial: VueltaRendida[] = [];

      for (const [vueltaStr, pedidosVuelta] of Object.entries(vueltasAgrupadas)) {
        const numeroVuelta = parseInt(vueltaStr);
        const totalCobrado = pedidosVuelta.reduce((acc, p) => acc + p.monto_total, 0);
        const totalEfectivo = pedidosVuelta
          .filter((p) => (p.metodo_pago || 'EFECTIVO') === 'EFECTIVO')
          .reduce((acc, p) => acc + p.monto_total, 0);
        const totalOtros = totalCobrado - totalEfectivo;
        const costoEnviosTotal = pedidosVuelta.reduce((acc, p) => acc + (p.costo_envio || 0), 0);

        const horaReconstruida = new Date(pedidosVuelta[0].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        historial.push({
          numeroVuelta,
          montoTotalRendido: totalCobrado,
          totalEfectivo,
          totalOtrosPagos: totalOtros,
          costoEnviosTotal,
          cantidadPedidos: pedidosVuelta.length,
          hora: horaReconstruida
        });
      }

      return historial.sort((a, b) => a.numeroVuelta - b.numeroVuelta);
    };

    setVueltasCadete1(procesarVueltas(c1));
    setVueltasCadete2(procesarVueltas(c2));
  }

  async function guardarNombre1(nuevoNombre: string) {
    setNombreCadete1(nuevoNombre);
    setEditandoCadete1(false);
    await supabase
      .from('configuracion')
      .upsert({ id: 'general', nombre_cadete_1: nuevoNombre }, { onConflict: 'id' });
    cargarEnvios(nuevoNombre, nombreCadete2);
  }

  async function guardarNombre2(nuevoNombre: string) {
    setNombreCadete2(nuevoNombre);
    setEditandoCadete2(false);
    await supabase
      .from('configuracion')
      .upsert({ id: 'general', nombre_cadete_2: nuevoNombre }, { onConflict: 'id' });
    cargarEnvios(nombreCadete1, nuevoNombre);
  }

  async function asignarCadete(idPedido: string, nombreCadete: string | null) {
    const { error } = await supabase
      .from('pedidos')
      .update({ 
        cadete: nombreCadete,
        estado_cadete: nombreCadete ? 'EN_VIAJE' : null,
        numero_vuelta: null
      })
      .eq('id', idPedido);

    if (!error) {
      setPedidos((prev) =>
        prev.map((p) => (p.id === idPedido ? { ...p, cadete: nombreCadete, estado_cadete: nombreCadete ? 'EN_VIAJE' : null, numero_vuelta: null } : p))
      );
    } else {
      alert('Error al asignar cadete: ' + error.message);
    }
  }

  function obtenerDireccion(obs: string) {
    if (!obs) return 'Sin dirección especificada';
    const match = obs.split('|').find((s) => s.toLowerCase().includes('dirección:'));
    if (match) {
      return match.replace(/dirección:/i, '').trim();
    }
    return obs;
  }

  async function rendirVueltaCadete(numeroCadete: 1 | 2) {
    const nombreCadete = numeroCadete === 1 ? nombreCadete1 : nombreCadete2;
    const enviosActuales = pedidos.filter(
      (p) => (p.cadete === nombreCadete || p.cadete === `Cadete ${numeroCadete}`) && p.estado_cadete !== 'RENDIDO'
    );

    if (enviosActuales.length === 0) {
      alert('No hay pedidos asignados en este momento para rendir.');
      return;
    }

    const totalCobrado = enviosActuales.reduce((acc, p) => acc + p.monto_total, 0);
    const historialPrevio = numeroCadete === 1 ? vueltasCadete1 : vueltasCadete2;
    const numeroNuevaVuelta = historialPrevio.length + 1;

    const confirmar = confirm(
      `¿Confirmar la Rendición de la Vuelta #${numeroNuevaVuelta} para ${nombreCadete}?\n\n` +
      `📦 Pedidos: ${enviosActuales.length} | 💵 Total: $${totalCobrado.toLocaleString('es-AR')}`
    );

    if (!confirmar) return;

    const idsRendidos = enviosActuales.map((p) => p.id);
    const { error } = await supabase
      .from('pedidos')
      .update({
        estado_cadete: 'RENDIDO',
        numero_vuelta: numeroNuevaVuelta
      })
      .in('id', idsRendidos);

    if (error) {
      alert('Error al guardar la rendición en la base de datos: ' + error.message);
      return;
    }

    // Actualizamos localmente tras el éxito en Supabase
    cargarEnvios();
  }

  async function reabrirVuelta(numeroCadete: 1 | 2, numeroVuelta: number) {
    const nombreCadete = numeroCadete === 1 ? nombreCadete1 : nombreCadete2;
    
    const hayEnViaje = pedidos.some(
      (p) => (p.cadete === nombreCadete || p.cadete === `Cadete ${numeroCadete}`) && p.estado_cadete === 'EN_VIAJE'
    );

    if (hayEnViaje) {
      alert('Para corregir una vuelta anterior, primero debés rendir o liberar los pedidos que están actualmente "En Viaje".');
      return;
    }

    const confirmar = confirm(`¿Querés reabrir la Vuelta #${numeroVuelta} de ${nombreCadete} para modificar sus pedidos o agregar más?`);
    if (!confirmar) return;

    const pedidosDeVuelta = pedidos.filter(
      (p) => (p.cadete === nombreCadete || p.cadete === `Cadete ${numeroCadete}`) && p.numero_vuelta === numeroVuelta
    );

    const idsReabrir = pedidosDeVuelta.map((p) => p.id);

    if (idsReabrir.length > 0) {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado_cadete: 'EN_VIAJE', numero_vuelta: null })
        .in('id', idsReabrir);

      if (error) {
        alert('Error al reabrir la vuelta: ' + error.message);
        return;
      }
    }

    cargarEnvios();
  }

  const enviosSinAsignar = pedidos.filter((p) => !p.cadete);
  const enviosCadete1 = pedidos.filter(
    (p) => (p.cadete === nombreCadete1 || p.cadete === 'Cadete 1') && p.estado_cadete === 'EN_VIAJE'
  );
  const enviosCadete2 = pedidos.filter(
    (p) => (p.cadete === nombreCadete2 || p.cadete === 'Cadete 2') && p.estado_cadete === 'EN_VIAJE'
  );

  const totalEnviosVuelta1 = enviosCadete1.reduce((acc, p) => acc + (p.costo_envio || 0), 0);
  const totalRendirVuelta1 = enviosCadete1.reduce((acc, p) => acc + p.monto_total, 0);

  const totalEnviosVuelta2 = enviosCadete2.reduce((acc, p) => acc + (p.costo_envio || 0), 0);
  const totalRendirVuelta2 = enviosCadete2.reduce((acc, p) => acc + p.monto_total, 0);

  const acumuladoEnvios1 = vueltasCadete1.reduce((acc, v) => acc + v.costoEnviosTotal, 0);
  const acumuladoRendido1 = vueltasCadete1.reduce((acc, v) => acc + v.montoTotalRendido, 0);

  const acumuladoEnvios2 = vueltasCadete2.reduce((acc, v) => acc + v.costoEnviosTotal, 0);
  const acumuladoRendido2 = vueltasCadete2.reduce((acc, v) => acc + v.montoTotalRendido, 0);

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
            🛵 Control de Cadetes y Vueltas
          </h1>
          <p className="text-sm font-bold text-gray-700">Asignación y rendición por turnos</p>
        </div>
        <Link href="/" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
          ⬅ Inicio
        </Link>
      </header>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 flex justify-between items-center">
        <span className="text-xs font-bold" style={styleTextoNegro}>Filtrar Turno:</span>
        <div className="flex gap-1">
          {(['TODOS', 'MAÑANA', 'NOCHE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTurno(t)}
              className={`text-xs px-3 py-1.5 rounded font-black border-2 ${
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

      <div className="bg-white p-5 rounded-lg border-2 border-red-400 shadow-sm space-y-3">
        <div className="flex justify-between items-center border-b border-gray-300 pb-2">
          <h2 className="text-lg font-black text-red-700">
            📦 Envíos Pendientes de Salida ({enviosSinAsignar.length})
          </h2>
          <button onClick={() => cargarEnvios()} className="text-xs bg-gray-200 hover:bg-gray-300 font-extrabold px-3 py-1.5 rounded text-gray-800">
            🔄 Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="text-xs text-gray-800 font-bold py-2">Cargando envíos...</p>
        ) : enviosSinAsignar.length === 0 ? (
          <p className="text-xs text-gray-700 font-bold py-2">No hay envíos pendientes de asignar.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enviosSinAsignar.map((p) => {
              const direccionTxt = obtenerDireccion(p.observaciones);
              return (
                <div key={p.id} className="p-3 border-2 border-red-200 rounded-lg bg-red-50 flex justify-between items-center gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">📍</span>
                      <p className="font-black text-sm text-red-950 uppercase">
                        {direccionTxt}
                      </p>
                    </div>
                    <p className="font-bold text-xs text-gray-800">
                      👤 {p.cliente_nombre || 'Cliente Envío'} {p.cliente_telefono ? `(${p.cliente_telefono})` : ''}
                    </p>
                    {p.observaciones && !p.observaciones.toLowerCase().includes('dirección:') && (
                      <p className="text-xs text-gray-700 font-bold italic">
                        Obs: {p.observaciones}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="text-xs font-black text-green-800">
                        Total: ${p.monto_total.toLocaleString('es-AR')} (Envío: ${p.costo_envio})
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-300">
                        💳 {p.metodo_pago || 'EFECTIVO'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-[110px]">
                    <button
                      onClick={() => asignarCadete(p.id, nombreCadete1)}
                      className="bg-blue-700 text-white text-xs font-black px-3 py-2 rounded hover:bg-blue-800 shadow text-center"
                    >
                      + {nombreCadete1}
                    </button>
                    <button
                      onClick={() => asignarCadete(p.id, nombreCadete2)}
                      className="bg-purple-700 text-white text-xs font-black px-3 py-2 rounded hover:bg-purple-800 shadow text-center"
                    >
                      + {nombreCadete2}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CADETE 1 */}
        <div className="bg-white p-5 rounded-lg border-2 border-blue-300 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-gray-300 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏍️</span>
              {editandoCadete1 ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={nombreCadete1}
                    onChange={(e) => setNombreCadete1(e.target.value)}
                    className="border-2 border-blue-500 px-2 py-1 rounded text-sm font-bold text-black bg-white"
                  />
                  <button onClick={() => guardarNombre1(nombreCadete1)} className="bg-green-700 text-white text-xs px-2.5 py-1 rounded font-black">
                    ✓
                  </button>
                </div>
              ) : (
                <h2 className="text-xl font-black text-blue-900 cursor-pointer flex items-center gap-1" onClick={() => setEditandoCadete1(true)}>
                  {nombreCadete1} <span className="text-xs text-gray-600 font-bold">✏️ Editar</span>
                </h2>
              )}
            </div>

            <button
              onClick={() => rendirVueltaCadete(1)}
              disabled={enviosCadete1.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-600 text-white font-black text-xs px-3 py-2 rounded shadow"
            >
              ✅ Rendir Vuelta
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide">
                📍 En Viaje ({enviosCadete1.length} pedidos)
              </h3>
              <div className="text-right text-xs font-bold text-gray-800">
                Pagar Envío: <span className="text-blue-900 font-black">${totalEnviosVuelta1}</span> | Cobrar Caja: <span className="text-green-800 font-black">${totalRendirVuelta1}</span>
              </div>
            </div>

            {enviosCadete1.length === 0 ? (
              <p className="text-xs text-gray-600 font-bold italic py-2 bg-blue-50 p-2 rounded">
                Sin envíos en este viaje.
              </p>
            ) : (
              enviosCadete1.map((p) => {
                const direccionTxt = obtenerDireccion(p.observaciones);
                return (
                  <div key={p.id} className="p-2.5 border-2 border-blue-200 rounded bg-blue-50 flex justify-between items-center gap-2">
                    <div>
                      <p className="font-extrabold text-xs text-blue-950 uppercase">
                        📍 {direccionTxt}
                      </p>
                      <p className="text-xs font-bold text-gray-800">
                        👤 {p.cliente_nombre || 'Cliente Envío'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-gray-800">
                          ${p.monto_total} (Envío: ${p.costo_envio})
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 border border-amber-300">
                          {p.metodo_pago || 'EFECTIVO'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => asignarCadete(p.id, nombreCadete2)}
                        className="text-xs bg-white text-purple-900 border-2 border-purple-400 font-extrabold px-2 py-1 rounded hover:bg-purple-50"
                      >
                        ➡️ Pasar a {nombreCadete2}
                      </button>
                      <button onClick={() => asignarCadete(p.id, null)} className="text-xs text-red-700 font-black px-2 py-1 hover:bg-red-100 rounded">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-gray-300 space-y-2">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide">
              📋 Vueltas Rendidas en el Día ({vueltasCadete1.length})
            </h3>
            {vueltasCadete1.length === 0 ? (
              <p className="text-xs text-gray-600 font-bold italic">Aún no rindió vueltas hoy.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {vueltasCadete1.map((v) => (
                  <div key={v.numeroVuelta} className="text-xs p-2.5 bg-gray-50 rounded-lg border-2 border-gray-300 font-bold text-black space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-black text-blue-900">Vuelta #{v.numeroVuelta} ({v.hora} hs) - {v.cantidadPedidos} pedidos</span>
                      <button
                        onClick={() => reabrirVuelta(1, v.numeroVuelta)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow"
                      >
                        🔓 Corregir
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-700">
                      <div>Total General: <span className="font-black text-black">${v.montoTotalRendido.toLocaleString('es-AR')}</span></div>
                      <div>Efectivo: <span className="font-black text-green-800">${v.totalEfectivo.toLocaleString('es-AR')}</span></div>
                      <div>Transf/Card: <span className="font-black text-purple-800">${v.totalOtrosPagos.toLocaleString('es-AR')}</span></div>
                      <div>Envíos Cadete: <span className="font-black text-blue-900">${v.costoEnviosTotal.toLocaleString('es-AR')}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-100 p-3 rounded-lg border border-blue-300 space-y-1 mt-2">
              <div className="text-xs font-black text-blue-950 uppercase">
                📊 Cierre Acumulado ({nombreCadete1})
              </div>
              <div className="flex justify-between text-xs font-bold text-black">
                <span>Total Dinero Recaudado:</span>
                <span className="font-black text-black">${acumuladoRendido1.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-black">
                <span>Pagar por Envíos a Cadete:</span>
                <span className="font-black text-blue-900">${acumuladoEnvios1.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-blue-300 pt-1 text-black">
                <span>Queda en Caja (Neto):</span>
                <span className="text-green-800">${(acumuladoRendido1 - acumuladoEnvios1).toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CADETE 2 */}
        <div className="bg-white p-5 rounded-lg border-2 border-purple-300 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-gray-300 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏍️</span>
              {editandoCadete2 ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={nombreCadete2}
                    onChange={(e) => setNombreCadete2(e.target.value)}
                    className="border-2 border-purple-500 px-2 py-1 rounded text-sm font-bold text-black bg-white"
                  />
                  <button onClick={() => guardarNombre2(nombreCadete2)} className="bg-green-700 text-white text-xs px-2.5 py-1 rounded font-black">
                    ✓
                  </button>
                </div>
              ) : (
                <h2 className="text-xl font-black text-purple-900 cursor-pointer flex items-center gap-1" onClick={() => setEditandoCadete2(true)}>
                  {nombreCadete2} <span className="text-xs text-gray-600 font-bold">✏️ Editar</span>
                </h2>
              )}
            </div>

            <button
              onClick={() => rendirVueltaCadete(2)}
              disabled={enviosCadete2.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-600 text-white font-black text-xs px-3 py-2 rounded shadow"
            >
              ✅ Rendir Vuelta
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide">
                📍 En Viaje ({enviosCadete2.length} pedidos)
              </h3>
              <div className="text-right text-xs font-bold text-gray-800">
                Pagar Envío: <span className="text-purple-900 font-black">${totalEnviosVuelta2}</span> | Cobrar Caja: <span className="text-green-800 font-black">${totalRendirVuelta2}</span>
              </div>
            </div>

            {enviosCadete2.length === 0 ? (
              <p className="text-xs text-gray-600 font-bold italic py-2 bg-purple-50 p-2 rounded">
                Sin envíos en este viaje.
              </p>
            ) : (
              enviosCadete2.map((p) => {
                const direccionTxt = obtenerDireccion(p.observaciones);
                return (
                  <div key={p.id} className="p-2.5 border-2 border-purple-200 rounded bg-purple-50 flex justify-between items-center gap-2">
                    <div>
                      <p className="font-extrabold text-xs text-purple-950 uppercase">
                        📍 {direccionTxt}
                      </p>
                      <p className="text-xs font-bold text-gray-800">
                        👤 {p.cliente_nombre || 'Cliente Envío'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-gray-800">
                          ${p.monto_total} (Envío: ${p.costo_envio})
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 border border-amber-300">
                          {p.metodo_pago || 'EFECTIVO'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => asignarCadete(p.id, nombreCadete1)}
                        className="text-xs bg-white text-blue-900 border-2 border-blue-400 font-extrabold px-2 py-1 rounded hover:bg-blue-50"
                      >
                        ⬅️ Pasar a {nombreCadete1}
                      </button>
                      <button onClick={() => asignarCadete(p.id, null)} className="text-xs text-red-700 font-black px-2 py-1 hover:bg-red-100 rounded">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-gray-300 space-y-2">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide">
              📋 Vueltas Rendidas en el Día ({vueltasCadete2.length})
            </h3>
            {vueltasCadete2.length === 0 ? (
              <p className="text-xs text-gray-600 font-bold italic">Aún no rindió vueltas hoy.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {vueltasCadete2.map((v) => (
                  <div key={v.numeroVuelta} className="text-xs p-2.5 bg-gray-50 rounded-lg border-2 border-gray-300 font-bold text-black space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-black text-purple-900">Vuelta #{v.numeroVuelta} ({v.hora} hs) - {v.cantidadPedidos} pedidos</span>
                      <button
                        onClick={() => reabrirVuelta(2, v.numeroVuelta)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow"
                      >
                        🔓 Corregir
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-700">
                      <div>Total General: <span className="font-black text-black">${v.montoTotalRendido.toLocaleString('es-AR')}</span></div>
                      <div>Efectivo: <span className="font-black text-green-800">${v.totalEfectivo.toLocaleString('es-AR')}</span></div>
                      <div>Transf/Card: <span className="font-black text-purple-800">${v.totalOtrosPagos.toLocaleString('es-AR')}</span></div>
                      <div>Envíos Cadete: <span className="font-black text-purple-900">${v.costoEnviosTotal.toLocaleString('es-AR')}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-purple-100 p-3 rounded-lg border border-purple-300 space-y-1 mt-2">
              <div className="text-xs font-black text-purple-950 uppercase">
                📊 Cierre Acumulado ({nombreCadete2})
              </div>
              <div className="flex justify-between text-xs font-bold text-black">
                <span>Total Dinero Recaudado:</span>
                <span className="font-black text-black">${acumuladoRendido2.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-black">
                <span>Pagar por Envíos a Cadete:</span>
                <span className="font-black text-purple-900">${acumuladoEnvios2.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-purple-300 pt-1 text-black">
                <span>Queda en Caja (Neto):</span>
                <span className="text-green-800">${(acumuladoRendido2 - acumuladoEnvios2).toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}