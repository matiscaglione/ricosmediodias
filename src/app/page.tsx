"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Menu {
  id: string;
  nombre: string;
  precio: number;
  lleva_guarnicion: boolean;
  requiere_salsa: boolean;
}

interface Bebida {
  id: string;
  nombre: string;
  precio: number;
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

interface Salsa {
  id: string;
  nombre: string;
}

interface ZonaEnvio {
  id: string;
  nombre_zona: string;
  precio: number;
}

interface ItemPedido {
  menu?: Menu;
  bebida?: Bebida;
  guarnicion?: Guarnicion;
  salsa?: Salsa;
  ingredientesEnsalada?: string[];
  cantidadHuevos: number;
  cantidad: number;
  subtotal: number;
}

function ContenidoTomaPedidos() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [guarniciones, setGuarniciones] = useState<Guarnicion[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [salsas, setSalsas] = useState<Salsa[]>([]);
  const [zonasEnvio, setZonasEnvio] = useState<ZonaEnvio[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const [items, setItems] = useState<ItemPedido[]>([]);
  const [tipoEntrega, setTipoEntrega] = useState<"RETIRO" | "ENVIO" | "BAR">(
    "RETIRO",
  );
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaEnvio | null>(
    null,
  );
  const [direccion, setDireccion] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [horario, setHorario] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Selección
  const [menuSeleccionado, setMenuSeleccionado] = useState<Menu | null>(null);
  const [bebidaSeleccionada, setBebidaSeleccionada] = useState<Bebida | null>(
    null,
  );
  const [guarnicionSeleccionada, setGuarnicionSeleccionada] =
    useState<Guarnicion | null>(null);
  const [salsaSeleccionada, setSalsaSeleccionada] = useState<Salsa | null>(
    null,
  );
  const [ingredientesElegidos, setIngredientesElegidos] = useState<string[]>(
    [],
  );
  const [cantidadHuevos, setCantidadHuevos] = useState<number>(0);
  const [cantidad, setCantidad] = useState(1);

  const [precioHuevo, setPrecioHuevo] = useState<number>(500);

  const searchParams = useSearchParams();
  const idEditarURL = searchParams.get("editar");
  const [pedidoEditandoId, setPedidoEditandoId] = useState<string | null>(null);
  const [itemsOriginalesEditar, setItemsOriginalesEditar] = useState<any[]>([]);

  useEffect(() => {
    async function inicializar() {
      await cargarDatosDelDia();

      if (idEditarURL) {
        // Cargar los datos del pedido a modificar
        const { data: pedidoData } = await supabase
          .from("pedidos")
          .select(`
            *,
            detalle_pedidos (
              id,
              menu_id,
              guarnicion_id,
              cantidad,
              precio_unitario,
              subtotal,
              menus (*),
              guarniciones (*)
            )
          `)
          .eq("id", idEditarURL)
          .single();

        if (pedidoData) {
          setPedidoEditandoId(pedidoData.id);
          setClienteNombre(pedidoData.cliente_nombre || "");
          setClienteTelefono(pedidoData.cliente_telefono || "");
          setTipoEntrega(pedidoData.tipo_entrega || "ENVIO");
          setHorario(pedidoData.horario_solicitado || "");

          // 1. Extraer la cantidad de huevos fritos del texto de observaciones
          const textoObs = pedidoData.observaciones || "";
          let huevosDetectados = 0;
          
          const matchHuevos = textoObs.match(/(\d+)\s*Huevo/i);
          if (matchHuevos) {
            huevosDetectados = parseInt(matchHuevos[1], 10);
          }

          // 2. Limpiar las observaciones dejando solo notas del cliente (sin el texto de huevos)
          const obsLimpia = textoObs
            .split("|")
            .map((s: string) => s.trim())
            .filter((s: string) => !s.toLowerCase().includes("huevo"))
            .join(" | ");

          setObservaciones(obsLimpia);

          // 3. Reconstruir los ítems asignando la cantidad de huevos al primer plato
          const itemsCargados = (pedidoData.detalle_pedidos || []).map((det: any, index: number) => ({
            menu: det.menus || undefined,
            guarnicion: det.guarniciones || undefined,
            cantidad: det.cantidad,
            // Si detectamos huevos en las observaciones, se los asignamos al primer plato para que los puedas editar/quitar
            cantidadHuevos: index === 0 ? huevosDetectados : 0,
            subtotal: det.subtotal
          }));

          setItems(itemsCargados);
          setItemsOriginalesEditar(itemsCargados);
        }
      }
    }

    inicializar();
  }, [idEditarURL]);

  async function cargarDatosDelDia() {
    const hoy = new Date().toISOString().split("T")[0];

    const { data: stockData } = await supabase
      .from("stock_diario")
      .select("menu_id, cantidad_disponible")
      .eq("fecha", hoy)
      .gt("cantidad_disponible", 0);

    const mapa: Record<string, number> = {};
    const idsConStock: string[] = [];

    if (stockData) {
      stockData.forEach((s) => {
        mapa[s.menu_id] = s.cantidad_disponible;
        idsConStock.push(s.menu_id);
      });
    }
    setStockMap(mapa);

    const { data: confData } = await supabase
      .from("configuracion")
      .select("precio_huevo_frito")
      .eq("id", "general")
      .single();

    if (confData && confData.precio_huevo_frito) {
      setPrecioHuevo(Number(confData.precio_huevo_frito));
    }

    if (idsConStock.length > 0) {
      const { data: menusData } = await supabase
        .from("menus")
        .select("*")
        .in("id", idsConStock)
        .eq("activo", true);
      if (menusData) setMenus(menusData);
    } else {
      setMenus([]);
    }

    const { data: bebidasData } = await supabase
      .from("bebidas")
      .select("*")
      .eq("activa", true);
    if (bebidasData) setBebidas(bebidasData);

    const { data: guarniData } = await supabase
      .from("guarniciones")
      .select("*")
      .eq("activa", true);
    if (guarniData) setGuarniciones(guarniData);

    const { data: ingData } = await supabase
      .from("ingredientes_ensalada")
      .select("*")
      .eq("activo", true);
    if (ingData) setIngredientes(ingData);

    const { data: salsasData } = await supabase
      .from("salsas")
      .select("*")
      .eq("activa", true);
    if (salsasData) setSalsas(salsasData);

    const { data: zonasData } = await supabase
      .from("zonas_envio")
      .select("*")
      .eq("activa", true);
    if (zonasData) {
      setZonasEnvio(zonasData);
      if (zonasData.length > 0) setZonaSeleccionada(zonasData[0]);
    }
  }

  function toggleIngrediente(nombreIng: string) {
    if (ingredientesElegidos.includes(nombreIng)) {
      setIngredientesElegidos(
        ingredientesElegidos.filter((i) => i !== nombreIng),
      );
    } else {
      setIngredientesElegidos([...ingredientesElegidos, nombreIng]);
    }
  }

  function agregarItemMenu() {
    if (!menuSeleccionado) return;

    if (menuSeleccionado.requiere_salsa && !salsaSeleccionada) {
      alert(
        'Por favor elegí una salsa para este plato (o selecciona "Sin Salsa")',
      );
      return;
    }

    const stockDisponible = stockMap[menuSeleccionado.id] || 0;
    const cantidadYaEnCarrito = items
      .filter((item) => item.menu?.id === menuSeleccionado.id)
      .reduce((acc, item) => acc + item.cantidad, 0);

    if (cantidad + cantidadYaEnCarrito > stockDisponible) {
      alert(
        `¡Stock insuficiente! Quedan ${stockDisponible - cantidadYaEnCarrito} de ${menuSeleccionado.nombre}`,
      );
      return;
    }

    const precioGuarnicion =
      menuSeleccionado.lleva_guarnicion && guarnicionSeleccionada
        ? guarnicionSeleccionada.precio_extra
        : 0;

    const costoHuevosTotal = cantidadHuevos * precioHuevo;
    const subtotal = ((menuSeleccionado.precio + precioGuarnicion) * cantidad) + costoHuevosTotal;

    setItems([
      ...items,
      {
        menu: menuSeleccionado,
        guarnicion:
          menuSeleccionado.lleva_guarnicion && guarnicionSeleccionada
            ? guarnicionSeleccionada
            : undefined,
        salsa:
          menuSeleccionado.requiere_salsa && salsaSeleccionada
            ? salsaSeleccionada
            : undefined,
        ingredientesEnsalada: guarnicionSeleccionada?.requiere_ingredientes
          ? ingredientesElegidos
          : undefined,
        cantidadHuevos,
        cantidad,
        subtotal,
      },
    ]);

    setMenuSeleccionado(null);
    setGuarnicionSeleccionada(null);
    setSalsaSeleccionada(null);
    setIngredientesElegidos([]);
    setCantidadHuevos(0);
    setCantidad(1);
  }

  function agregarBebidaAlPedido() {
    if (!bebidaSeleccionada) return;

    setItems([
      ...items,
      {
        bebida: bebidaSeleccionada,
        cantidadHuevos: 0,
        cantidad: 1,
        subtotal: bebidaSeleccionada.precio,
      },
    ]);

    setBebidaSeleccionada(null);
  }

  function eliminarItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const montoPlatos = items.reduce((acc, item) => acc + item.subtotal, 0);
  const costoEnvio =
    tipoEntrega === "ENVIO" && zonaSeleccionada ? zonaSeleccionada.precio : 0;
  const montoTotal = montoPlatos + costoEnvio;

  const formatearMoneda = (monto: number) =>
    "$ " + monto.toLocaleString("es-AR");

  function imprimirSoloBebidas() {
    const bebidasEnCarrito = items.filter((i) => i.bebida);
    if (bebidasEnCarrito.length === 0) {
      alert("No hay bebidas seleccionadas en el pedido.");
      return;
    }

    const ventana = window.open("", "_blank", "width=300,height=500");
    if (!ventana) return;

    const htmlBebidas = bebidasEnCarrito
      .map(
        (i) =>
          `<div style="font-size: 16px; font-weight: 900; margin-bottom: 4px;">🥤 ${i.cantidad}x ${i.bebida?.nombre}</div>`,
      )
      .join("");

    ventana.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 220px; padding: 8px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin: 0; font-size: 18px;">🥤 SOLO BEBIDAS</h2>
            <p style="margin: 2px 0; font-size: 11px;">Cliente: ${clienteNombre || "Bar/Mostrador"}</p>
            <hr />
          </div>
          ${htmlBebidas}
          <hr />
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    ventana.document.close();
  }

  function imprimirTicket(idPedido: string) {
    const ventanaImpresion = window.open("", "_blank", "width=350,height=600");
    if (!ventanaImpresion) return;

    const fechaHora = new Date().toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const nombreClienteLimpio = clienteNombre.replace(/[^a-zA-Z0-9]/g, "");
    const idCorto = idPedido.slice(0, 6);

    const itemsHtml = items
      .map((i) => {
        if (i.bebida) {
          return `
            <div style="margin-bottom: 6px;">
              <div style="font-size: 16px; font-weight: 900;">🥤 ${i.cantidad}x ${i.bebida.nombre}</div>
              <div style="text-align: right; font-size: 13px; font-weight: bold;">${formatearMoneda(i.subtotal)}</div>
            </div>`;
        }

        return `
        <div style="margin-bottom: 8px; border-bottom: 1px dashed #000; pb: 4px;">
          <div style="font-size: 18px; font-weight: 900; text-transform: uppercase;">
            ${i.cantidad}x ${i.menu?.nombre}
          </div>
          ${i.salsa ? `<div style="font-size: 16px; font-weight: 900; margin-left: 10px;">🍝 SALSA: ${i.salsa.nombre}</div>` : ""}
          ${i.guarnicion ? `<div style="font-size: 16px; font-weight: 900; margin-left: 10px;">👉 GUARNICIÓN: ${i.guarnicion.nombre}</div>` : ""}
          ${
            i.ingredientesEnsalada && i.ingredientesEnsalada.length > 0
              ? `<div style="font-size: 15px; font-weight: 900; margin-left: 16px; margin-top: 2px;">(${i.ingredientesEnsalada.join(", ")})</div>`
              : ""
          }
          ${
            i.cantidadHuevos > 0
              ? `<div style="font-size: 16px; font-weight: 900; margin-left: 10px; margin-top: 2px;">🍳 (${i.cantidadHuevos === 1 ? "1 HUEVO FRITO" : `${i.cantidadHuevos} HUEVOS FRITOS`})</div>`
              : ""
          }
          <div style="text-align: right; font-size: 14px; font-weight: bold; margin-top: 2px;">${formatearMoneda(i.subtotal)}</div>
        </div>`;
      })
      .join("");

    let cabeceraEntrega = `<div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 4px; text-align: center; margin-bottom: 6px;">
      ${tipoEntrega === "ENVIO" ? `🛵 ENVÍO: ${direccion}` : tipoEntrega === "RETIRO" ? "🚶 RETIRA EN LOCAL" : "🍽️ COMER EN BAR"}
    </div>`;

    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Ticket_#${idCorto}_${nombreClienteLimpio}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 270px; padding: 8px; margin: 0 auto; font-size: 13px; color: #000; }
            .center { text-align: center; }
            .line { border-bottom: 2px solid #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1 style="margin:0; font-size: 22px; font-weight: 900;">RicosMediodias</h1>
            <p style="margin:2px 0; font-size: 10px;">${fechaHora}</p>
          </div>
          <div class="line"></div>
          ${cabeceraEntrega}
          <div style="font-size: 14px; margin-bottom: 4px;">
            <strong>Cliente:</strong> ${clienteNombre} ${clienteTelefono ? `(${clienteTelefono})` : ""}
          </div>
          ${observaciones ? `<div style="font-size: 13px; font-weight: bold; background-color: #eee; padding: 2px 4px;">Obs: ${observaciones}</div>` : ""}
          <div class="line"></div>
          <div style="margin: 8px 0;">${itemsHtml}</div>
          <div class="line"></div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase;">Hora:</div>
              <div style="font-size: 16px; font-weight: 900;">${horario ? `🕒 ${horario} hs` : "Lo antes posible"}</div>
            </div>
            <div style="text-align: right;">
              ${costoEnvio > 0 ? `<div style="font-size: 11px;">Envío: ${formatearMoneda(costoEnvio)}</div>` : ""}
              <div style="font-size: 11px; text-transform: uppercase;">Total:</div>
              <div style="font-size: 20px; font-weight: 900;">${formatearMoneda(montoTotal)}</div>
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

  async function confirmarPedido() {
    if (items.length === 0)
      return alert("Agregá al menos un menú o bebida al pedido");
    if (tipoEntrega === "ENVIO" && !direccion)
      return alert("Ingresá la dirección para el envío");

    const nombreFinal =
      clienteNombre.trim() !== ""
        ? clienteNombre
        : tipoEntrega === "BAR"
          ? "Cliente Bar"
          : tipoEntrega === "RETIRO"
            ? "Retira Mostrador"
            : "Cliente Envío";

    const hoy = new Date().toISOString().split("T")[0];

    // Detalle de huevos fritos agregado automáticamente a observaciones
    const detalleHuevos = items
      .filter((i) => i.cantidadHuevos > 0)
      .map((i) => `${i.cantidadHuevos} Huevo Frito`)
      .join(", ");

    const obsFinal = [observaciones, detalleHuevos].filter(Boolean).join(" | ");

    let pedidoIdGuardado = pedidoEditandoId;

    if (pedidoEditandoId) {
      // --- MODO EDICIÓN ---
      for (const itemViejo of itemsOriginalesEditar) {
        if (itemViejo.menu) {
          const { data: stockActualData } = await supabase
            .from("stock_diario")
            .select("cantidad_disponible")
            .eq("fecha", hoy)
            .eq("menu_id", itemViejo.menu.id)
            .single();

          if (stockActualData) {
            await supabase
              .from("stock_diario")
              .update({ cantidad_disponible: stockActualData.cantidad_disponible + itemViejo.cantidad })
              .eq("fecha", hoy)
              .eq("menu_id", itemViejo.menu.id);
          }
        }
      }

      await supabase.from("detalle_pedidos").delete().eq("pedido_id", pedidoEditandoId);

      const { error: errUpdate } = await supabase
        .from("pedidos")
        .update({
          cliente_nombre: nombreFinal,
          cliente_telefono: clienteTelefono,
          tipo_entrega: tipoEntrega,
          zona_envio_id: zonaSeleccionada?.id || null,
          costo_envio: costoEnvio,
          monto_platos: montoPlatos,
          monto_total: montoTotal,
          horario_solicitado: horario,
          observaciones: obsFinal,
        })
        .eq("id", pedidoEditandoId);

      if (errUpdate) {
        alert("Error al actualizar el pedido: " + errUpdate.message);
        return;
      }
    } else {
      // --- MODO CREACIÓN NUEVA ---
      const { data: pedidoGuardado, error: errPedido } = await supabase
        .from("pedidos")
        .insert([
          {
            cliente_nombre: nombreFinal,
            cliente_telefono: clienteTelefono,
            tipo_entrega: tipoEntrega,
            zona_envio_id: zonaSeleccionada?.id || null,
            costo_envio: costoEnvio,
            monto_platos: montoPlatos,
            monto_total: montoTotal,
            horario_solicitado: horario,
            observaciones: obsFinal,
            estado: "PENDIENTE",
          },
        ])
        .select()
        .single();

      if (errPedido || !pedidoGuardado) {
        alert("Error al guardar el pedido: " + errPedido?.message);
        return;
      }
      pedidoIdGuardado = pedidoGuardado.id;
    }

    // Insertar los detalles asegurando que menu_id nunca sea null
    for (const item of items) {
      if (item.menu) {
        const { error: errDetalle } = await supabase.from("detalle_pedidos").insert([
          {
            pedido_id: pedidoIdGuardado,
            menu_id: item.menu.id,
            guarnicion_id: item.guarnicion?.id || null,
            cantidad: item.cantidad,
            precio_unitario: item.menu.precio,
            subtotal: item.subtotal,
          },
        ]);

        if (errDetalle) {
          console.error("Error al guardar detalle:", errDetalle);
        }

        // Actualizar stock
        const { data: stockActualData } = await supabase
          .from("stock_diario")
          .select("cantidad_disponible")
          .eq("fecha", hoy)
          .eq("menu_id", item.menu.id)
          .single();

        const stockActual = stockActualData?.cantidad_disponible || 0;
        const nuevoStock = Math.max(0, stockActual - item.cantidad);

        await supabase
          .from("stock_diario")
          .update({ cantidad_disponible: nuevoStock })
          .eq("fecha", hoy)
          .eq("menu_id", item.menu.id);
      }
    }

    imprimirTicket(pedidoIdGuardado!);

    setItems([]);
    setItemsOriginalesEditar([]);
    setPedidoEditandoId(null);
    setClienteNombre("");
    setClienteTelefono("");
    setDireccion("");
    setHorario("");
    setObservaciones("");
    cargarDatosDelDia();
  }

  const styleTextoNegro = { color: "#000000" };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
          Toma de Pedidos
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pedidos"
            className="bg-purple-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-purple-800"
          >
            📋 Pedidos
          </Link>
          <Link
            href="/cadetes"
            className="bg-blue-600 text-white text-sm px-3 py-2 rounded font-bold hover:bg-blue-700"
          >
            🛵 Cadetes
          </Link>
          <Link
            href="/reportes"
            className="bg-green-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-green-800"
          >
            📈 Cierre
          </Link>
          <Link
            href="/estadisticas"
            className="bg-amber-600 text-white text-sm px-3 py-2 rounded font-bold hover:bg-amber-700"
          >
            🏆 Ranking
          </Link>
          <Link
            href="/admin"
            className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800"
          >
            ⚙️ Admin
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* SECCIÓN 1: TIPO DE ENTREGA Y CLIENTE */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 space-y-4">
            <h2 className="text-lg font-bold" style={styleTextoNegro}>
              1. Tipo de Entrega y Cliente
            </h2>

            <div className="flex gap-2">
              {(["RETIRO", "ENVIO", "BAR"] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoEntrega(tipo)}
                  className={`flex-1 py-2 rounded text-sm font-extrabold border-2 ${
                    tipoEntrega === tipo
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-gray-300"
                  }`}
                  style={tipoEntrega !== tipo ? styleTextoNegro : {}}
                >
                  {tipo === "RETIRO"
                    ? "🚶 Retiro"
                    : tipo === "ENVIO"
                      ? "🛵 Envío"
                      : "🍽️ Bar"}
                </button>
              ))}
            </div>

            {tipoEntrega === "ENVIO" && (
              <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                <div>
                  <label
                    className="block text-xs font-bold mb-1"
                    style={styleTextoNegro}
                  >
                    Dirección de Envío*
                  </label>
                  <input
                    type="text"
                    style={styleTextoNegro}
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Av. San Martín 1234"
                    className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-bold mb-1"
                    style={styleTextoNegro}
                  >
                    Zona de Envío
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {zonasEnvio.map((z) => (
                      <button
                        type="button"
                        key={z.id}
                        onClick={() => setZonaSeleccionada(z)}
                        className={`px-3 py-1.5 rounded text-xs font-extrabold border-2 ${
                          zonaSeleccionada?.id === z.id
                            ? "bg-blue-700 text-white"
                            : "bg-white"
                        }`}
                        style={
                          zonaSeleccionada?.id !== z.id ? styleTextoNegro : {}
                        }
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
                <label
                  className="block text-xs font-bold mb-1"
                  style={styleTextoNegro}
                >
                  Nombre Cliente (Opcional)
                </label>
                <input
                  type="text"
                  style={styleTextoNegro}
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-bold mb-1"
                  style={styleTextoNegro}
                >
                  Teléfono
                </label>
                <input
                  type="text"
                  style={styleTextoNegro}
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej: 341 123456"
                  className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-bold mb-1"
                  style={styleTextoNegro}
                >
                  Horario Opcional
                </label>
                <input
                  type="text"
                  style={styleTextoNegro}
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  placeholder="Ej: 13:30 hs"
                  className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold mb-1"
                style={styleTextoNegro}
              >
                Observaciones
              </label>
              <input
                type="text"
                style={styleTextoNegro}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Sin cebolla, paga con transferencia"
                className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
              />
            </div>
          </div>

          {/* SECCIÓN 2: MENÚS DEL DÍA */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300">
            <h2 className="text-lg font-bold mb-4" style={styleTextoNegro}>
              2. Seleccionar Menú del Día
            </h2>
            {menus.length === 0 ? (
              <p className="text-red-600 text-sm font-bold">
                No hay menús con stock cargado para hoy.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {menus.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMenuSeleccionado(m);
                      setGuarnicionSeleccionada(null);
                      setSalsaSeleccionada(null);
                      setIngredientesElegidos([]);
                      setCantidadHuevos(0);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      menuSeleccionado?.id === m.id
                        ? "border-blue-600 bg-blue-100 font-extrabold shadow-sm"
                        : "border-gray-300 hover:border-gray-400 bg-white"
                    }`}
                  >
                    <div
                      className="font-extrabold text-base"
                      style={styleTextoNegro}
                    >
                      {m.nombre}
                    </div>
                    <div
                      className="text-sm font-bold mt-1"
                      style={styleTextoNegro}
                    >
                      {formatearMoneda(m.precio)}
                    </div>
                    <div className="text-xs text-blue-700 font-bold mt-1">
                      Stock: {stockMap[m.id] ?? 0} disp.
                    </div>
                  </button>
                ))}
              </div>
            )}

            {menuSeleccionado && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 space-y-3">
                <h3 className="font-bold text-sm" style={styleTextoNegro}>
                  Opciones para: {menuSeleccionado.nombre}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {menuSeleccionado.requiere_salsa && (
                    <div className="sm:col-span-2 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                      <label className="block text-xs font-black text-red-900 mb-1">
                        🍝 Seleccionar Salsa (Obligatorio)*:
                      </label>
                      <select
                        style={styleTextoNegro}
                        value={salsaSeleccionada?.id || ""}
                        onChange={(e) =>
                          setSalsaSeleccionada(
                            salsas.find((s) => s.id === e.target.value) || null,
                          )
                        }
                        className="w-full border-2 border-red-400 p-2 rounded text-sm bg-white font-extrabold"
                      >
                        <option value="">-- Elegir Salsa --</option>
                        {salsas.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label
                      className="block text-xs font-bold mb-1"
                      style={styleTextoNegro}
                    >
                      {menuSeleccionado.lleva_guarnicion
                        ? "Guarnición (Opcional)"
                        : "Guarnición (No Aplica)"}
                    </label>
                    <select
                      disabled={!menuSeleccionado.lleva_guarnicion}
                      style={styleTextoNegro}
                      onChange={(e) => {
                        const g =
                          guarniciones.find(
                            (guar) => guar.id === e.target.value,
                          ) || null;
                        setGuarnicionSeleccionada(g);
                        setIngredientesElegidos([]);
                      }}
                      className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold disabled:bg-gray-200"
                    >
                      <option value="">
                        {menuSeleccionado.lleva_guarnicion
                          ? "Sin Guarnición"
                          : "No lleva guarnición"}
                      </option>
                      {menuSeleccionado.lleva_guarnicion &&
                        guarniciones.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nombre}{" "}
                            {g.precio_extra > 0
                              ? `(+${formatearMoneda(g.precio_extra)})`
                              : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold mb-1"
                      style={styleTextoNegro}
                    >
                      Cantidad Platos
                    </label>
                    <input
                      type="number"
                      min="1"
                      style={styleTextoNegro}
                      value={cantidad === 0 ? "" : cantidad}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setCantidad(0);
                        } else {
                          const parsed = parseInt(val, 10);
                          setCantidad(isNaN(parsed) ? 1 : Math.max(1, parsed));
                        }
                      }}
                      onBlur={() => {
                        if (cantidad === 0) setCantidad(1);
                      }}
                      className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
                    />
                  </div>
                </div>

                {guarnicionSeleccionada?.requiere_ingredientes && (
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg space-y-2">
                    <label className="block text-xs font-black text-emerald-900">
                      🥗 Ingredientes para Ensalada:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ingredientes.map((ing) => {
                        const seleccionada = ingredientesElegidos.includes(
                          ing.nombre,
                        );
                        return (
                          <button
                            type="button"
                            key={ing.id}
                            onClick={() => toggleIngrediente(ing.nombre)}
                            className={`px-3 py-1 rounded text-xs font-bold border ${
                              seleccionada
                                ? "bg-emerald-700 text-white"
                                : "bg-white text-gray-800"
                            }`}
                          >
                            {seleccionada ? "✓ " : "+ "}
                            {ing.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SELECTOR COMPACTO DE HUEVOS FRITOS */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                  <span className="text-xs font-bold text-gray-800">
                    🍳 Huevos fritos extra:
                  </span>
                  <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                    <button
                      type="button"
                      onClick={() =>
                        setCantidadHuevos(Math.max(0, cantidadHuevos - 1))
                      }
                      className="text-xs font-black text-gray-800 px-1.5 py-0.5 rounded bg-white border border-gray-400 hover:bg-gray-200"
                    >
                      -
                    </button>
                    <span
                      className="text-xs font-black text-gray-800 min-w-[16px] text-center"
                      style={styleTextoNegro}
                    >
                      {cantidadHuevos}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCantidadHuevos(cantidadHuevos + 1)}
                      className="text-xs font-black text-gray-800 px-1.5 py-0.5 rounded bg-white border border-gray-400 hover:bg-gray-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={agregarItemMenu}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold py-2.5 rounded text-sm"
                >
                  + Agregar Plato al Pedido
                </button>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: SELECCIÓN DE BEBIDAS */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 space-y-3">
            <h2 className="text-lg font-bold" style={styleTextoNegro}>
              3. Agregar Bebida / Adicional
            </h2>
            <div className="flex gap-2">
              <select
                style={styleTextoNegro}
                value={bebidaSeleccionada?.id || ""}
                onChange={(e) =>
                  setBebidaSeleccionada(
                    bebidas.find((b) => b.id === e.target.value) || null,
                  )
                }
                className="flex-1 border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
              >
                <option value="">-- Seleccionar Bebida --</option>
                {bebidas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} - ${b.precio}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={agregarBebidaAlPedido}
                className="bg-blue-600 text-white font-extrabold px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO - RESUMEN DEL PEDIDO */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-4" style={styleTextoNegro}>
              Resumen del Pedido
            </h2>

            {items.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8 font-bold">
                El pedido está vacío
              </p>
            ) : (
              <div className="space-y-3 mb-6">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm border-b border-gray-300 pb-2"
                  >
                    <div>
                      {item.bebida ? (
                        <div className="font-extrabold text-blue-900">
                          🥤 {item.cantidad}x {item.bebida.nombre}
                        </div>
                      ) : (
                        <>
                          <div
                            className="font-extrabold"
                            style={styleTextoNegro}
                          >
                            {item.cantidad}x {item.menu?.nombre}
                          </div>
                          {item.salsa && (
                            <div className="text-xs font-black text-red-800">
                              🍝 {item.salsa.nombre}
                            </div>
                          )}
                          {item.guarnicion && (
                            <div className="text-xs font-bold text-gray-700">
                              + {item.guarnicion.nombre}
                              {item.ingredientesEnsalada &&
                                item.ingredientesEnsalada.length > 0 && (
                                  <span className="block text-xs font-normal text-emerald-800">
                                    ({item.ingredientesEnsalada.join(", ")})
                                  </span>
                                )}
                            </div>
                          )}
                          {item.cantidadHuevos > 0 && (
  <div className="flex items-center gap-2 mt-1 text-xs font-black text-amber-800">
    <span>🍳 ({item.cantidadHuevos === 1 ? '1 Huevo Frito' : `${item.cantidadHuevos} Huevos Fritos`})</span>
    <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
      <button
        type="button"
        onClick={() => {
          const nuevosItems = [...items];
          const nuevaCant = Math.max(0, nuevosItems[idx].cantidadHuevos - 1);
          nuevosItems[idx].cantidadHuevos = nuevaCant;
          nuevosItems[idx].subtotal -= precioHuevo;
          setItems(nuevosItems);
        }}
        className="px-1 bg-white border border-amber-400 rounded hover:bg-amber-100 text-amber-900 font-bold"
      >
        -
      </button>
      <span>{item.cantidadHuevos}</span>
      <button
        type="button"
        onClick={() => {
          const nuevosItems = [...items];
          nuevosItems[idx].cantidadHuevos += 1;
          nuevosItems[idx].subtotal += precioHuevo;
          setItems(nuevosItems);
        }}
        className="px-1 bg-white border border-amber-400 rounded hover:bg-amber-100 text-amber-900 font-bold"
      >
        +
      </button>
    </div>
  </div>
)))}
              </div>
            )}
          </div>

          <div className="border-t-2 border-gray-300 pt-4 space-y-2">
            <div
              className="flex justify-between text-sm font-bold"
              style={styleTextoNegro}
            >
              <span>Subtotal:</span>
              <span>{formatearMoneda(montoPlatos)}</span>
            </div>
            {tipoEntrega === "ENVIO" && zonaSeleccionada && (
              <div
                className="flex justify-between text-sm font-bold"
                style={styleTextoNegro}
              >
                <span>Envío ({zonaSeleccionada.nombre_zona}):</span>
                <span>{formatearMoneda(costoEnvio)}</span>
              </div>
            )}
            <div
              className="flex justify-between text-xl font-black border-t-2 border-gray-300 pt-2"
              style={styleTextoNegro}
            >
              <span>Total:</span>
              <span>{formatearMoneda(montoTotal)}</span>
            </div>

            {/* AVISO DE EDICIÓN */}
            {pedidoEditandoId && (
              <div className="bg-amber-100 border-2 border-amber-400 p-3 rounded-lg mt-3 flex justify-between items-center text-amber-900 font-bold text-xs">
                <span>✏️ Modificando Pedido Existente</span>
                <button
                  onClick={() => {
                    setPedidoEditandoId(null);
                    setItems([]);
                    setItemsOriginalesEditar([]);
                    window.history.replaceState({}, '', '/');
                  }}
                  className="bg-amber-800 text-white px-2 py-1 rounded text-xs hover:bg-amber-900"
                >
                  Cancelar Edición
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={imprimirSoloBebidas}
                type="button"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-extrabold text-xs py-3 px-3 rounded-lg border border-gray-400"
              >
                🥤 Ticket Solo Bebida
              </button>
              <button
                onClick={confirmarPedido}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold py-3 px-4 rounded-lg shadow-md transition-colors text-base"
              >
                {pedidoEditandoId ? "💾 Actualizar Pedido" : "Confirmar Pedido"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TomaPedidosPage() {
  return (
    <Suspense fallback={<div className="text-center p-8 font-bold">Cargando toma de pedidos...</div>}>
      <ContenidoTomaPedidos />
    </Suspense>
  );
}