"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

interface Empresa {
  id: string;
  nombre: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  activa: boolean;
}

interface PedidoEmpresa {
  id: string;
  created_at: string;
  cliente_nombre: string;
  tipo_entrega: string;
  monto_total: number;
  metodo_pago: string;
  pago_confirmado: boolean;
  observaciones?: string;
  empresa_id: string;
}

export default function EmpresasCtaCtePage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [pedidos, setPedidos] = useState<PedidoEmpresa[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  // Filtros de fecha y estado
  const [fechaDesde, setFechaDesde] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [fechaHasta, setFechaHasta] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<
    "TODOS" | "PENDIENTES" | "PAGADOS"
  >("PENDIENTES");

  // Empresa seleccionada/desplegada
  const [empresaDesplegadaId, setEmpresaDesplegadaId] = useState<string | null>(
    null
  );

  useEffect(() => {
    cargarDatos();
  }, [fechaDesde, fechaHasta]);

  async function cargarDatos() {
    setCargando(true);

    // 1. Cargar Empresas
    const { data: empData, error: errEmp } = await supabase
      .from("empresas")
      .select("*")
      .order("nombre", { ascending: true });

    if (errEmp) {
      console.error("Error al cargar empresas:", errEmp);
    } else if (empData) {
      setEmpresas(empData);
      if (empData.length > 0 && !empresaDesplegadaId) {
        setEmpresaDesplegadaId(empData[0].id);
      }
    }

    // 2. Cargar Pedidos asignados a Empresas en la fecha
    const inicioIso = `${fechaDesde}T00:00:00`;
    const finIso = `${fechaHasta}T23:59:59`;

    const { data: pedData, error: errPed } = await supabase
      .from("pedidos")
      .select(
        "id, created_at, cliente_nombre, tipo_entrega, monto_total, metodo_pago, pago_confirmado, observaciones, empresa_id"
      )
      .not("empresa_id", "is", null)
      .gte("created_at", inicioIso)
      .lte("created_at", finIso)
      .order("created_at", { ascending: false });

    if (errPed) {
      console.error("Error al cargar pedidos de empresas:", errPed);
    } else if (pedData) {
      setPedidos(pedData);
    }

    setCargando(false);
  }

  async function cambiarEstadoPagoPedido(
    pedidoId: string,
    nuevoEstado: boolean
  ) {
    const { error } = await supabase
      .from("pedidos")
      .update({ pago_confirmado: nuevoEstado })
      .eq("id", pedidoId);

    if (error) {
      alert("Error al actualizar el pago: " + error.message);
    } else {
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId ? { ...p, pago_confirmado: nuevoEstado } : p
        )
      );
    }
  }

  async function saldarTodosPedidosEmpresa(empresaId: string) {
    const confirmacion = confirm(
      "¿Estás seguro de marcar TODOS los pedidos pendientes de esta empresa como PAGADOS en este período?"
    );
    if (!confirmacion) return;

    const idsAActualizar = pedidos
      .filter((p) => p.empresa_id === empresaId && !p.pago_confirmado)
      .map((p) => p.id);

    if (idsAActualizar.length === 0) {
      alert("No hay pedidos pendientes para abonar.");
      return;
    }

    const { error } = await supabase
      .from("pedidos")
      .update({ pago_confirmado: true })
      .in("id", idsAActualizar);

    if (error) {
      alert("Error al liquidar pedidos: " + error.message);
    } else {
      alert("¡Todos los pedidos pendientes han sido marcados como PAGADOS!");
      cargarDatos();
    }
  }

  function formatearMoneda(monto: number) {
    return "$ " + (monto || 0).toLocaleString("es-AR");
  }

  function formatearFechaHora(fechaStr: string) {
    const d = new Date(fechaStr);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function imprimirResumenCuenta(empresa: Empresa) {
    const pedidosEmpresa = pedidos.filter((p) => p.empresa_id === empresa.id);
    const totalCobrado = pedidosEmpresa
      .filter((p) => p.pago_confirmado)
      .reduce((acc, p) => acc + p.monto_total, 0);
    const totalPendiente = pedidosEmpresa
      .filter((p) => !p.pago_confirmado)
      .reduce((acc, p) => acc + p.monto_total, 0);

    const ventana = window.open("", "_blank", "width=600,height=800");
    if (!ventana) return;

    const filasHtml = pedidosEmpresa
      .map(
        (p) => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #ccc; font-size: 12px;">${formatearFechaHora(p.created_at)}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ccc; font-size: 12px;">${p.cliente_nombre || "-"}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ccc; font-size: 12px;">${p.metodo_pago}</td>
        <td style="padding: 6px; border-bottom: 1px solid #ccc; font-size: 12px; font-weight: bold;">
          ${p.pago_confirmado ? '<span style="color: green;">PAGADO</span>' : '<span style="color: red;">PENDIENTE</span>'}
        </td>
        <td style="padding: 6px; border-bottom: 1px solid #ccc; font-size: 12px; text-align: right; font-weight: bold;">${formatearMoneda(p.monto_total)}</td>
      </tr>
    `
      )
      .join("");

    ventana.document.write(`
      <html>
        <head>
          <title>Resumen_CtaCte_${empresa.nombre}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 14px; color: #555; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; background-color: #f2f2f2; padding: 8px; font-size: 12px; border-bottom: 2px solid #000; }
            .resumen { background-color: #f9f9f9; padding: 12px; border: 1px solid #ddd; margin-top: 20px; border-radius: 6px; }
          </style>
        </head>
        <body>
          <h1>🏢 RESUMEN DE CUENTA CORRIENTE</h1>
          <h2>Empresa: <strong>${empresa.nombre}</strong> ${empresa.cuit ? `(CUIT: ${empresa.cuit})` : ""}</h2>
          <p style="font-size: 12px;"><strong>Período:</strong> ${fechaDesde} al ${fechaHasta}</p>

          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente / Ref.</th>
                <th>Pago</th>
                <th>Estado</th>
                <th style="text-align: right;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml || '<tr><td colspan="5" style="text-align: center; padding: 15px;">Sin pedidos en este período</td></tr>'}
            </tbody>
          </table>

          <div class="resumen">
            <div style="display: flex; justify-between; margin-bottom: 6px; font-size: 14px;">
              <span>Total Pagado:</span> <strong>${formatearMoneda(totalCobrado)}</strong>
            </div>
            <div style="display: flex; justify-between; margin-bottom: 6px; font-size: 14px; color: #b91c1c;">
              <span>Total Pendiente de Cobro:</span> <strong>${formatearMoneda(totalPendiente)}</strong>
            </div>
            <hr />
            <div style="display: flex; justify-between; font-size: 16px; font-weight: bold;">
              <span>TOTAL GENERAL PERÍODO:</span> <span>${formatearMoneda(totalCobrado + totalPendiente)}</span>
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    ventana.document.close();
  }

  // Totales globales
  const totalGeneralPendiente = pedidos
    .filter((p) => !p.pago_confirmado)
    .reduce((acc, p) => acc + p.monto_total, 0);

  const totalGeneralCobrado = pedidos
    .filter((p) => p.pago_confirmado)
    .reduce((acc, p) => acc + p.monto_total, 0);

  const styleTextoNegro = { color: "#000000" };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen">
      {/* CABECERA */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
            🏢 Cuentas Corrientes - Empresas
          </h1>
          <p className="text-xs text-gray-700 font-bold">
            Gestión de saldos, consumos corporativos y cobros
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="bg-blue-600 text-white text-xs px-3 py-2 rounded font-bold hover:bg-blue-700"
          >
            ➕ Toma de Pedidos
          </Link>
          <Link
            href="/pedidos"
            className="bg-purple-700 text-white text-xs px-3 py-2 rounded font-bold hover:bg-purple-800"
          >
            📋 Pedidos
          </Link>
          <Link
            href="/admin"
            className="bg-black text-white text-xs px-3 py-2 rounded font-bold hover:bg-gray-800"
          >
            ⚙️ Admin
          </Link>
        </div>
      </header>

      {/* FILTROS Y RESUMEN GENERAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* FILTRO PERÍODO */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 space-y-3">
          <h2 className="text-xs font-black uppercase text-gray-700">
            📅 Período de Consumo
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-700">
                Desde:
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border border-gray-400 p-1.5 rounded text-xs font-bold text-black bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700">
                Hasta:
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border border-gray-400 p-1.5 rounded text-xs font-bold text-black bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Ver Pedidos:
            </label>
            <div className="flex gap-1">
              {(["PENDIENTES", "PAGADOS", "TODOS"] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstadoPago(est)}
                  className={`flex-1 py-1 text-[11px] font-black rounded border ${
                    filtroEstadoPago === est
                      ? "bg-indigo-700 text-white border-indigo-800"
                      : "bg-gray-100 text-gray-800 border-gray-300"
                  }`}
                >
                  {est === "PENDIENTES"
                    ? "⏳ Pendientes"
                    : est === "PAGADOS"
                      ? "✓ Pagados"
                      : "Todos"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* METRICAS TOTALES */}
        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200 flex flex-col justify-between">
          <span className="text-xs font-black text-red-900 uppercase">
            ⚠️ Pendiente de Cobro Total
          </span>
          <div className="text-3xl font-black text-red-700 my-2">
            {formatearMoneda(totalGeneralPendiente)}
          </div>
          <span className="text-[11px] font-bold text-red-800">
            Suma de deudas de todas las empresas en el período
          </span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-lg shadow-sm border border-emerald-200 flex flex-col justify-between">
          <span className="text-xs font-black text-emerald-900 uppercase">
            ✅ Total Cobrado en Período
          </span>
          <div className="text-3xl font-black text-emerald-700 my-2">
            {formatearMoneda(totalGeneralCobrado)}
          </div>
          <div className="flex justify-between text-xs font-bold text-emerald-900 border-t border-emerald-200 pt-1">
            <span>Gran Total Consumido:</span>
            <span>{formatearMoneda(totalGeneralPendiente + totalGeneralCobrado)}</span>
          </div>
        </div>
      </div>

      {/* LISTADO DE EMPRESAS Y DETALLE DE CUENTAS */}
      {cargando ? (
        <div className="text-center py-12 font-bold text-gray-600 bg-white rounded-lg border border-gray-300">
          Cargando cuentas corrientes...
        </div>
      ) : empresas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-300 space-y-2">
          <p className="font-extrabold text-gray-800">
            No hay empresas registradas en la base de datos.
          </p>
          <Link
            href="/admin"
            className="inline-block bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded hover:bg-indigo-800"
          >
            ⚙️ Ir a Admin para Agregar Empresas
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {empresas.map((emp) => {
            const pedidosEmp = pedidos.filter((p) => {
              if (p.empresa_id !== emp.id) return false;
              if (filtroEstadoPago === "PENDIENTES") return !p.pago_confirmado;
              if (filtroEstadoPago === "PAGADOS") return p.pago_confirmado;
              return true;
            });

            const subtotalPendiente = pedidos
              .filter((p) => p.empresa_id === emp.id && !p.pago_confirmado)
              .reduce((acc, p) => acc + p.monto_total, 0);

            const subtotalCobrado = pedidos
              .filter((p) => p.empresa_id === emp.id && p.pago_confirmado)
              .reduce((acc, p) => acc + p.monto_total, 0);

            const estaDesplegada = empresaDesplegadaId === emp.id;

            return (
              <div
                key={emp.id}
                className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden"
              >
                {/* CABECERA DE LA EMPRESA */}
                <div
                  onClick={() =>
                    setEmpresaDesplegadaId(estaDesplegada ? null : emp.id)
                  }
                  className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <h3
                        className="text-lg font-black flex items-center gap-2"
                        style={styleTextoNegro}
                      >
                        {emp.nombre}
                        {!emp.activa && (
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                            Inactiva
                          </span>
                        )}
                      </h3>
                      <div className="text-xs text-gray-600 font-bold flex gap-3">
                        {emp.cuit && <span>CUIT: {emp.cuit}</span>}
                        {emp.telefono && <span>Tel: {emp.telefono}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-gray-200">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 font-bold">
                        Saldo Deuda
                      </div>
                      <div
                        className={`text-lg font-black ${
                          subtotalPendiente > 0
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatearMoneda(subtotalPendiente)}
                      </div>
                    </div>

                    <span className="text-gray-400 font-bold text-sm">
                      {estaDesplegada ? "▲ Ocultar" : "▼ Ver Detalle"}
                    </span>
                  </div>
                </div>

                {/* CUERPO DESPLEGABLE CON DETALLES DE PEDIDOS */}
                {estaDesplegada && (
                  <div className="p-4 border-t border-gray-200 space-y-4 bg-white">
                    {/* BARRA DE ACCIONES DE LA EMPRESA */}
                    <div className="flex flex-wrap justify-between items-center gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                      <div className="text-xs font-bold text-indigo-950 flex gap-4">
                        <span>
                          Pendiente:{" "}
                          <strong className="text-red-600">
                            {formatearMoneda(subtotalPendiente)}
                          </strong>
                        </span>
                        <span>
                          Pagado:{" "}
                          <strong className="text-emerald-700">
                            {formatearMoneda(subtotalCobrado)}
                          </strong>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => imprimirResumenCuenta(emp)}
                          className="bg-gray-800 hover:bg-black text-white text-xs font-extrabold px-3 py-1.5 rounded"
                        >
                          🖨️ Imprimir Resumen Cta. Cte.
                        </button>
                        {subtotalPendiente > 0 && (
                          <button
                            type="button"
                            onClick={() => saldarTodosPedidosEmpresa(emp.id)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3 py-1.5 rounded"
                          >
                            ✓ Saldar Toda la Deuda
                          </button>
                        )}
                      </div>
                    </div>

                    {/* TABLA / LISTADO DE PEDIDOS DE LA EMPRESA */}
                    {pedidosEmp.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 font-bold py-6">
                        No hay pedidos registrados para esta empresa en el rango de fechas seleccionado.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b-2 border-gray-300 bg-gray-100 text-gray-800 uppercase font-black">
                              <th className="p-2">Fecha / Hora</th>
                              <th className="p-2">Cliente / Ref.</th>
                              <th className="p-2">Tipo</th>
                              <th className="p-2">Medio Pago</th>
                              <th className="p-2 text-right">Monto</th>
                              <th className="p-2 text-center">Estado Pago</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 font-bold">
                            {pedidosEmp.map((p) => (
                              <tr
                                key={p.id}
                                className={
                                  !p.pago_confirmado ? "bg-red-50/40" : ""
                                }
                              >
                                <td className="p-2 text-gray-700">
                                  {formatearFechaHora(p.created_at)}
                                </td>
                                <td className="p-2 text-black">
                                  {p.cliente_nombre || "-"}
                                </td>
                                <td className="p-2 text-gray-700">
                                  {p.tipo_entrega === "ENVIO"
                                    ? "🛵 Envío"
                                    : p.tipo_entrega === "RETIRO"
                                      ? "🚶 Retiro"
                                      : "🍽️ Bar"}
                                </td>
                                <td className="p-2 text-gray-700">
                                  {p.metodo_pago}
                                </td>
                                <td className="p-2 text-right font-black text-black">
                                  {formatearMoneda(p.monto_total)}
                                </td>
                                <td className="p-2 text-center">
                                  {p.pago_confirmado ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-300">
                                      PAGADO
                                    </span>
                                  ) : (
                                    <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded border border-red-300">
                                      PENDIENTE
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cambiarEstadoPagoPedido(
                                        p.id,
                                        !p.pago_confirmado
                                      )
                                    }
                                    className={`px-2 py-1 text-[11px] font-black rounded ${
                                      p.pago_confirmado
                                        ? "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                                    }`}
                                  >
                                    {p.pago_confirmado
                                      ? "Marcar Pendiente"
                                      : "✓ Cobrar"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}