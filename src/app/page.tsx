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
  orden?: number;
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

interface Empresa {
  id: string;
  nombre: string;
}

interface ItemPedido {
  menu?: Menu;
  bebida?: Bebida;
  guarnicion?: Guarnicion;
  salsa?: Salsa;
  ingredientesEnsalada?: string[];
  agregadoMenuTexto?: string;
  agregadoGuarnicionTexto?: string;
  precioAgregados?: number;
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
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<string>("");
  const [menuDesplegado, setMenuDesplegado] = useState<boolean>(true);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [busquedaTextoMenu, setBusquedaTextoMenu] = useState<string>("");

  const [precioGuarnicionExtra, setPrecioGuarnicionExtra] = useState<number>(3000);
  const [guarnicionExtraElegida, setGuarnicionExtraElegida] = useState<Guarnicion | null>(null);

  const [items, setItems] = useState<ItemPedido[]>([]);
  const [tipoEntrega, setTipoEntrega] = useState<"RETIRO" | "ENVIO" | "BAR">("RETIRO");

  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "TRANSFERENCIA" | "TARJETA">("EFECTIVO");
  const [pagoConfirmado, setPagoConfirmado] = useState<boolean>(false);
  const [recargoTarjetaPorc, setRecargoTarjetaPorc] = useState<number>(10);

  // FECHA DEL PEDIDO (Por defecto HOY, extensible a días anteriores)
  const [fechaPedido, setFechaPedido] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaEnvio | null>(null);
  const [direccion, setDireccion] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [horario, setHorario] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [menuSeleccionado, setMenuSeleccionado] = useState<Menu | null>(null);
  const [bebidaSeleccionada, setBebidaSeleccionada] = useState<Bebida | null>(null);
  const [guarnicionSeleccionada, setGuarnicionSeleccionada] = useState<Guarnicion | null>(null);
  const [salsaSeleccionada, setSalsaSeleccionada] = useState<Salsa | null>(null);
  const [ingredientesElegidos, setIngredientesElegidos] = useState<string[]>([]);

  const [agregadoMenuTexto, setAgregadoMenuTexto] = useState("");
  const [agregadoGuarnicionTexto, setAgregadoGuarnicionTexto] = useState("");
  const [precioAgregadosExtra, setPrecioAgregadosExtra] = useState<number>(0);
  const [cantidadBebida, setCantidadBebida] = useState<number>(1);

  const [cantidadHuevos, setCantidadHuevos] = useState<number>(0);
  const [cantidad, setCantidad] = useState(1);

  const [precioHuevoFrito, setPrecioHuevoFrito] = useState<number>(500);
const [precioHuevoDuro, setPrecioHuevoDuro] = useState<number>(500);
  const [cantidadHuevosDuros, setCantidadHuevosDuros] = useState<number>(0);

  const searchParams = useSearchParams();
  const idEditarURL = searchParams.get("editar");
  const [pedidoEditandoId, setPedidoEditandoId] = useState<string | null>(null);
  const [turnoOriginalEditando, setTurnoOriginalEditando] = useState<string | null>(null);
  const [itemsOriginalesEditar, setItemsOriginalesEditar] = useState<any[]>([]);

  function obtenerTurnoActual(): "MAÑANA" | "NOCHE" {
    const horaActual = new Date().getHours();
    return horaActual >= 6 && horaActual < 16 ? "MAÑANA" : "NOCHE";
  }

  useEffect(() => {
    async function inicializar() {
      await cargarDatosDelDia();

      if (idEditarURL) {
        const { data: pedidoData } = await supabase
          .from("pedidos")
          .select(`
            *,
            detalle_pedidos (
              id,
              menu_id,
              guarnicion_id,
              bebida_id,
              cantidad,
              precio_unitario,
              subtotal,
              ingredientes_ensalada,
              agregado_menu,
              agregado_guarnicion,
              menus (*),
              guarniciones (*),
              bebidas (*)
            )
          `)
          .eq("id", idEditarURL)
          .single();

        if (pedidoData) {
          setPedidoEditandoId(pedidoData.id);
          setTurnoOriginalEditando(pedidoData.turno || null);
          setClienteNombre(pedidoData.cliente_nombre || "");
          setClienteTelefono(pedidoData.cliente_telefono || "");
          setTipoEntrega(pedidoData.tipo_entrega || "ENVIO");
          setHorario(pedidoData.horario_solicitado || "");
          if (pedidoData.created_at) {
            setFechaPedido(pedidoData.created_at.split("T")[0]);
          }
          if (pedidoData.metodo_pago) setMetodoPago(pedidoData.metodo_pago);
          if (pedidoData.pago_confirmado !== undefined)
            setPagoConfirmado(pedidoData.pago_confirmado);
          if (pedidoData.empresa_id) setEmpresaSeleccionadaId(pedidoData.empresa_id);

          const textoObs = pedidoData.observaciones || "";

          const matchDireccion = textoObs
            .split("|")
            .find((s: string) => s.toLowerCase().includes("dirección:"));
          if (matchDireccion) {
            setDireccion(matchDireccion.replace(/dirección:/i, "").trim());
          }

          let huevosEncontrados = 0;
          const matchHuevos = textoObs.match(/(\d+)\s*Huevo/i);
          if (matchHuevos) {
            huevosEncontrados = parseInt(matchHuevos[1], 10);
          }

          const obsLimpia = textoObs
            .split("|")
            .map((s: string) => s.trim())
            .filter(
              (s: string) =>
                !s.toLowerCase().includes("huevo") &&
                !s.toLowerCase().includes("dirección:")
            )
            .join(" | ");

          setObservaciones(obsLimpia);

          const detalles = pedidoData.detalle_pedidos || [];
          const itemsCargados: ItemPedido[] = detalles
            .filter(
              (det: any) =>
                det.menus ||
                det.menu_id ||
                det.guarniciones ||
                det.bebidas ||
                det.bebida_id
            )
            .map((det: any, index: number) => {
              const cantH = index === 0 ? huevosEncontrados : 0;

              const ingsArray = det.ingredientes_ensalada
                ? det.ingredientes_ensalada
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : undefined;

              return {
                menu: det.menus || undefined,
                bebida: det.bebidas || undefined,
                guarnicion: det.guarniciones || undefined,
                cantidad: det.cantidad,
                cantidadHuevos: cantH,
                subtotal: det.subtotal,
                ingredientesEnsalada: ingsArray,
                agregadoMenuTexto: det.agregado_menu || undefined,
                agregadoGuarnicionTexto: det.agregado_guarnicion || undefined,
              };
            });

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
  .select("precio_huevo_frito, precio_huevo_duro, precio_guarnicion_extra, recargo_tarjeta_porc")
  .eq("id", "general")
  .single();

if (confData) {
  if (confData.precio_huevo_frito) setPrecioHuevoFrito(Number(confData.precio_huevo_frito));
  if (confData.precio_huevo_duro) setPrecioHuevoDuro(Number(confData.precio_huevo_duro));
      if (confData.precio_guarnicion_extra)
        setPrecioGuarnicionExtra(Number(confData.precio_guarnicion_extra));
      if (
        confData.recargo_tarjeta_porc !== undefined &&
        confData.recargo_tarjeta_porc !== null
      ) {
        setRecargoTarjetaPorc(Number(confData.recargo_tarjeta_porc));
      }
    }

    if (idsConStock.length > 0) {
      const { data: menusData } = await supabase
        .from("menus")
        .select("*")
        .in("id", idsConStock)
        .eq("activo", true)
        .order("orden", { ascending: true });

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

    const { data: empData } = await supabase
      .from("empresas")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre", { ascending: true });
    if (empData) setEmpresas(empData);
  }

  function toggleIngrediente(nombreIng: string) {
    if (ingredientesElegidos.includes(nombreIng)) {
      setIngredientesElegidos(ingredientesElegidos.filter((i) => i !== nombreIng));
    } else {
      setIngredientesElegidos([...ingredientesElegidos, nombreIng]);
    }
  }

  function agregarItemMenu() {
    if (!menuSeleccionado) return;

    if (menuSeleccionado.requiere_salsa && !salsaSeleccionada) {
      alert('Por favor elegí una salsa para este plato (o selecciona "Sin Salsa")');
      return;
    }

    const stockDisponible = stockMap[menuSeleccionado.id] || 0;
    const cantidadYaEnCarrito = items
      .filter((item) => item.menu?.id === menuSeleccionado.id)
      .reduce((acc, item) => acc + item.cantidad, 0);

    if (cantidad + cantidadYaEnCarrito > stockDisponible) {
      alert(
        `¡Stock insuficiente! Quedan ${stockDisponible - cantidadYaEnCarrito} de ${menuSeleccionado.nombre}`
      );
      return;
    }

    const precioGuarnicion =
      menuSeleccionado.lleva_guarnicion && guarnicionSeleccionada
        ? guarnicionSeleccionada.precio_extra
        : 0;

    const costoHuevosFritos = cantidadHuevos * precioHuevoFrito;
    const costoHuevosDuros = cantidadHuevosDuros * precioHuevoDuro;
    const extraAgregados = Number(precioAgregadosExtra) || 0;

    const subtotal =
      (menuSeleccionado.precio + precioGuarnicion + extraAgregados) * cantidad +
      costoHuevosFritos +
      costoHuevosDuros;

    const esEnsaladaPrincipal = menuSeleccionado.nombre
      .toLowerCase()
      .includes("ensalada");
    const llevaIngredientes =
      guarnicionSeleccionada?.requiere_ingredientes || esEnsaladaPrincipal;

    let listaIngredientes = [...ingredientesElegidos];
    if (llevaIngredientes && cantidadHuevosDuros > 0) {
      listaIngredientes.push(
        `${cantidadHuevosDuros} Huevo${cantidadHuevosDuros > 1 ? "s" : ""} Duro${cantidadHuevosDuros > 1 ? "s" : ""} Extra`
      );
    }

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
        ingredientesEnsalada:
          llevaIngredientes && listaIngredientes.length > 0
            ? listaIngredientes
            : undefined,
        agregadoMenuTexto: agregadoMenuTexto.trim()
          ? agregadoMenuTexto.trim()
          : undefined,
        agregadoGuarnicionTexto: agregadoGuarnicionTexto.trim()
          ? agregadoGuarnicionTexto.trim()
          : undefined,
        precioAgregados: extraAgregados > 0 ? extraAgregados : undefined,
        cantidadHuevos,
        cantidad,
        subtotal,
      },
    ]);

    setMenuSeleccionado(null);
    setGuarnicionSeleccionada(null);
    setSalsaSeleccionada(null);
    setIngredientesElegidos([]);
    setAgregadoMenuTexto("");
    setAgregadoGuarnicionTexto("");
    setPrecioAgregadosExtra(0);
    setCantidadHuevos(0);
    setCantidadHuevosDuros(0);
    setCantidad(1);
  }

  function agregarBebidaAlPedido() {
    if (!bebidaSeleccionada) return;

    const cantBeb = Math.max(1, cantidadBebida);
    setItems([
      ...items,
      {
        bebida: bebidaSeleccionada,
        cantidadHuevos: 0,
        cantidad: cantBeb,
        subtotal: bebidaSeleccionada.precio * cantBeb,
      },
    ]);

    setBebidaSeleccionada(null);
    setCantidadBebida(1);
  }

  function agregarGuarnicionExtraAlPedido() {
    if (!guarnicionExtraElegida) return;

    setItems([
      ...items,
      {
        guarnicion: guarnicionExtraElegida,
        ingredientesEnsalada: guarnicionExtraElegida.requiere_ingredientes
          ? ingredientesElegidos
          : undefined,
        agregadoGuarnicionTexto: agregadoGuarnicionTexto.trim()
          ? agregadoGuarnicionTexto.trim()
          : undefined,
        cantidadHuevos: 0,
        cantidad: 1,
        subtotal: precioGuarnicionExtra,
      },
    ]);

    setGuarnicionExtraElegida(null);
    setAgregadoGuarnicionTexto("");
    setIngredientesElegidos([]);
  }

  function eliminarItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const montoPlatos = items.reduce((acc, item) => acc + item.subtotal, 0);
  const costoEnvio =
    tipoEntrega === "ENVIO" && zonaSeleccionada ? zonaSeleccionada.precio : 0;

  const subtotalSinRecargo = montoPlatos + costoEnvio;
  const montoRecargoTarjeta =
    metodoPago === "TARJETA"
      ? Math.round(subtotalSinRecargo * (recargoTarjetaPorc / 100))
      : 0;
  const montoTotal = subtotalSinRecargo + montoRecargoTarjeta;

  const formatearMoneda = (monto: number) =>
    "$ " + (monto || 0).toLocaleString("es-AR");

  const menusFiltrados = menus.filter((m) =>
    m.nombre.toLowerCase().includes(busquedaTextoMenu.toLowerCase().trim())
  );

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
          `<div style="font-size: 16px; font-weight: 900; margin-bottom: 4px;">🥤 ${i.cantidad} ${i.bebida?.nombre}</div>`
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
      .map((i, index, arr) => {
        const esUltimo = index === arr.length - 1;
        const estiloBorde = esUltimo ? "margin-bottom: 8px;" : "margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 4px;";

        if (i.bebida) {
          return `
            <div style="${estiloBorde}">
              <div style="font-size: 20px; font-weight: 900; text-transform: uppercase;">🥤 ${i.cantidad} ${i.bebida.nombre}</div>
              <div style="text-align: right; font-size: 15px; font-weight: bold;">${formatearMoneda(i.subtotal)}</div>
            </div>`;
        }

        if (!i.menu && i.guarnicion) {
          const tieneIngredientes = i.ingredientesEnsalada && i.ingredientesEnsalada.length > 0;
          let textoExtra = i.guarnicion.nombre;
          if (tieneIngredientes) {
            textoExtra += ` (${i.ingredientesEnsalada!.join(", ")})`;
          }

          return `
            <div style="${estiloBorde}">
              <div style="font-size: 20px; font-weight: 900; text-transform: uppercase; color: #000;">
              ${textoExtra} ${i.agregadoGuarnicionTexto ? `(${i.agregadoGuarnicionTexto})` : ""}
              </div>
              <div style="text-align: right; font-size: 15px; font-weight: bold; margin-top: 2px;">${formatearMoneda(i.subtotal)}</div>
            </div>`;
        }

        // Armado compacto en una sola línea para el menú principal
        let textoDetalle = "";
        
        if (i.salsa) {
          textoDetalle += ` C/ ${i.salsa.nombre}`;
        }
        
        if (i.guarnicion) {
          textoDetalle += ` C/ ${i.guarnicion.nombre}`;
        }

        const tieneIngredientesMenu = i.ingredientesEnsalada && i.ingredientesEnsalada.length > 0;
        if (tieneIngredientesMenu) {
          textoDetalle += ` (${i.ingredientesEnsalada!.join(", ")})`;
        } else if (i.menu?.nombre.toLowerCase().includes("ensalada")) {
          textoDetalle += ` (ENSALADA)`;
        }

        if (i.cantidadHuevos > 0) {
          textoDetalle += ` + ${i.cantidadHuevos === 1 ? "1 HUEVO" : `${i.cantidadHuevos} HUEVOS`}`;
        }

        // Línea adicional chica para mostrar el total de los agregados extras si los tuviera
        const htmlPrecioAgregados = i.precioAgregados && i.precioAgregados > 0 
          ? `<div style="font-size: 11px; font-weight: bold; text-align: right;">Extra: +${formatearMoneda(i.precioAgregados)}</div>` 
          : "";

        return `
<div style="${estiloBorde}">
  <div style="font-size: 20px; font-weight: 900; text-transform: uppercase;">
    ${i.cantidad} ${i.menu?.nombre} ${i.agregadoMenuTexto ? `(${i.agregadoMenuTexto})` : ""} ${textoDetalle}
  </div>
  ${htmlPrecioAgregados}
  <div style="text-align: right; font-size: 15px; font-weight: bold; margin-top: 2px;">${formatearMoneda(i.subtotal)}</div>
</div>`;
      })
      .join("");

    // Cabecera de entrega con recuadro ajustado solo al texto
    let cabeceraEntrega = `<div style="text-align: center; margin-bottom: 6px;">
      <span style="font-size: 16px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; padding: 3px 8px; display: inline-block;">
        ${tipoEntrega === "ENVIO" ? `🛵 ENVÍO: ${direccion}` : tipoEntrega === "RETIRO" ? "🚶 RETIRA" : "🍽️ BAR"}
      </span>
    </div>`;

    let etiquetaPago = `<div style="font-size: 14px; margin-bottom: 4px; text-transform: uppercase;">
      <strong>PAGO:</strong> ${metodoPago}
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
          ${cabeceraEntrega}
          ${etiquetaPago}
          <div style="font-size: 14px; margin-bottom: 4px; text-transform: uppercase;">
            <strong>Cliente:</strong> ${clienteNombre} ${clienteTelefono ? `(${clienteTelefono})` : ""}
          </div>
          ${observaciones ? `<div style="font-size: 13px; font-weight: bold; background-color: #eee; padding: 2px 4px; text-transform: uppercase;">Obs: ${observaciones}</div>` : ""}
          <div class="line"></div>
          <div style="margin: 8px 0;">${itemsHtml}</div>
          <div class="line"></div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; font-weight: bold;">Hora:</div>
              <div style="font-size: 20px; font-weight: 900; text-transform: uppercase;">${horario ? `${horario} hs` : "CUANDO ESTÉ"}</div>
            </div>
            <div style="text-align: right;">
              ${costoEnvio > 0 ? `<div style="font-size: 11px;">Envío: ${formatearMoneda(costoEnvio)}</div>` : ""}
              ${montoRecargoTarjeta > 0 ? `<div style="font-size: 11px;">Recargo Tarjeta (${recargoTarjetaPorc}%): ${formatearMoneda(montoRecargoTarjeta)}</div>` : ""}
              <div style="font-size: 11px; text-transform: uppercase;">Total:</div>
              <div style="font-size: 20px; font-weight: 900;">${formatearMoneda(montoTotal)}</div>
            </div>
          </div>
          <div class="line" style="margin-top: 10px;"></div>
          <p class="center" style="margin: 6px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase;">¡Gracias por tu compra!</p>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
  }

  async function confirmarPedido() {
    if (items.length === 0)
      return alert("Agregá al menos un menú, bebida o guarnición al pedido");
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

    // MANTIENE EL TURNO ORIGINAL SI SE ESTÁ EDITANDO, DE LO CONTRARIO CALCULA EL ACTUAL
    const turnoFinal = pedidoEditandoId && turnoOriginalEditando
      ? turnoOriginalEditando
      : obtenerTurnoActual();

    // CALCULA O CONSERVA LA FECHA Y HORA DE CREACIÓN
    const ahoraIso = new Date().toISOString();
    const horaActualStr = ahoraIso.split("T")[1];
    const fechaCreacionFinal = `${fechaPedido}T${horaActualStr}`;

    const detalleDireccion =
      tipoEntrega === "ENVIO" && direccion.trim() !== ""
        ? `Dirección: ${direccion.trim()}`
        : "";
    const detalleHuevos = items
      .filter((i) => i.cantidadHuevos > 0)
      .map((i) => `${i.cantidadHuevos} Huevo Frito`)
      .join(", ");

    const obsFinal = [observaciones.trim(), detalleDireccion, detalleHuevos]
      .filter(Boolean)
      .join(" | ");

    let pedidoIdGuardado = pedidoEditandoId;

    if (pedidoEditandoId) {
      for (const itemViejo of itemsOriginalesEditar) {
        if (itemViejo.menu) {
          const { data: stockActualData } = await supabase
            .from("stock_diario")
            .select("cantidad_disponible")
            .eq("fecha", fechaPedido)
            .eq("menu_id", itemViejo.menu.id)
            .single();

          if (stockActualData) {
            await supabase
              .from("stock_diario")
              .update({
                cantidad_disponible:
                  stockActualData.cantidad_disponible + itemViejo.cantidad,
              })
              .eq("fecha", fechaPedido)
              .eq("menu_id", itemViejo.menu.id);
          }
        }
      }

      await supabase
        .from("detalle_pedidos")
        .delete()
        .eq("pedido_id", pedidoEditandoId);

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
          turno: turnoFinal,
          created_at: fechaCreacionFinal,
          metodo_pago: metodoPago,
          pago_confirmado: pagoConfirmado,
          empresa_id: empresaSeleccionadaId ? empresaSeleccionadaId : null,
        })
        .eq("id", pedidoEditandoId);

      if (errUpdate) {
        alert("Error al actualizar el pedido: " + errUpdate.message);
        return;
      }
    } else {
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
            turno: turnoFinal,
            created_at: fechaCreacionFinal,
            metodo_pago: metodoPago,
            pago_confirmado: pagoConfirmado,
            empresa_id: empresaSeleccionadaId ? empresaSeleccionadaId : null,
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

    for (const item of items) {
      if (item.menu) {
        const { error: errDetalle } = await supabase
          .from("detalle_pedidos")
          .insert([
            {
              pedido_id: pedidoIdGuardado,
              menu_id: item.menu.id,
              guarnicion_id: item.guarnicion?.id || null,
              cantidad: item.cantidad,
              precio_unitario: item.menu.precio,
              subtotal: item.subtotal,
              ingredientes_ensalada:
                item.ingredientesEnsalada && item.ingredientesEnsalada.length > 0
                  ? item.ingredientesEnsalada.join(", ")
                  : null,
              agregado_menu: item.agregadoMenuTexto || null,
              agregado_guarnicion: item.agregadoGuarnicionTexto || null,
            },
          ]);

        if (errDetalle) {
          console.error("Error al guardar detalle:", errDetalle);
        }

        const { data: stockActualData } = await supabase
          .from("stock_diario")
          .select("cantidad_disponible")
          .eq("fecha", fechaPedido)
          .eq("menu_id", item.menu.id)
          .single();

        const stockActual = stockActualData?.cantidad_disponible || 0;
        const nuevoStock = Math.max(0, stockActual - item.cantidad);

        await supabase
          .from("stock_diario")
          .update({ cantidad_disponible: nuevoStock })
          .eq("fecha", fechaPedido)
          .eq("menu_id", item.menu.id);
      } else if (item.bebida) {
        await supabase.from("detalle_pedidos").insert([
          {
            pedido_id: pedidoIdGuardado,
            bebida_id: item.bebida.id,
            menu_id: null,
            guarnicion_id: null,
            cantidad: item.cantidad,
            precio_unitario: item.bebida.precio,
            subtotal: item.subtotal,
          },
        ]);
      } else if (!item.menu && item.guarnicion) {
        await supabase.from("detalle_pedidos").insert([
          {
            pedido_id: pedidoIdGuardado,
            guarnicion_id: item.guarnicion.id,
            menu_id: null,
            bebida_id: null,
            cantidad: item.cantidad,
            precio_unitario: precioGuarnicionExtra,
            subtotal: item.subtotal,
            ingredientes_ensalada:
              item.ingredientesEnsalada && item.ingredientesEnsalada.length > 0
                ? item.ingredientesEnsalada.join(", ")
                : null,
            agregado_guarnicion: item.agregadoGuarnicionTexto || null,
          },
        ]);
      }
    }

    imprimirTicket(pedidoIdGuardado!);

    setItems([]);
    setItemsOriginalesEditar([]);
    setPedidoEditandoId(null);
    setTurnoOriginalEditando(null);
    setClienteNombre("");
    setClienteTelefono("");
    setDireccion("");
    setHorario("");
    setObservaciones("");
    setEmpresaSeleccionadaId("");
    setFechaPedido(new Date().toISOString().split("T")[0]);
    setMetodoPago("EFECTIVO");
    setPagoConfirmado(false);
    cargarDatosDelDia();
  }

  const styleTextoNegro = { color: "#000000" };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-gray-100 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={styleTextoNegro}>
            Toma de Pedidos
          </h1>
          <span className="inline-block bg-blue-100 text-blue-900 text-xs font-black px-2.5 py-0.5 rounded mt-1 border border-blue-300">
            Turno Actual:{" "}
            {obtenerTurnoActual() === "MAÑANA"
              ? "☀️ MAÑANA (07-15hs)"
              : "🌙 NOCHE (18:30-00hs)"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pedidos"
            className="bg-purple-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-purple-800"
          >
            📋 Pedidos
          </Link>
          <Link
            href="/empresas"
            className="bg-indigo-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-indigo-800"
          >
            🏢 Empresas
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
          {/* SECCIÓN 1: TIPO DE ENTREGA, FORMA DE PAGO Y CLIENTE */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold" style={styleTextoNegro}>
                1. Tipo de Entrega y Método de Pago
              </h2>
              {/* SELECTOR DE FECHA DEL PEDIDO */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded border border-gray-300">
                <span className="text-xs font-extrabold text-gray-700">
                  📅 Fecha:
                </span>
                <input
                  type="date"
                  value={fechaPedido}
                  onChange={(e) => setFechaPedido(e.target.value)}
                  className="text-xs font-black p-1 bg-white border border-gray-400 rounded text-black"
                />
              </div>
            </div>

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

            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-amber-950">
                  💳 Método de Pago:
                </label>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-950">
                  <span>Recargo Tarjeta:</span>
                  <input
                    type="number"
                    value={recargoTarjetaPorc}
                    onChange={(e) => setRecargoTarjetaPorc(Number(e.target.value))}
                    className="w-12 p-0.5 border border-amber-400 rounded text-center text-xs font-bold bg-white"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["EFECTIVO", "TRANSFERENCIA", "TARJETA"] as const).map((pago) => (
                  <button
                    key={pago}
                    type="button"
                    onClick={() => setMetodoPago(pago)}
                    className={`px-3 py-1.5 rounded text-xs font-extrabold border-2 ${
                      metodoPago === pago
                        ? "bg-amber-700 text-white border-amber-800"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    {pago === "EFECTIVO"
                      ? "💵 Efectivo"
                      : pago === "TRANSFERENCIA"
                        ? "📱 Transferencia"
                        : `💳 Tarjeta (+${recargoTarjetaPorc}%)`}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPagoConfirmado(!pagoConfirmado)}
                  className={`px-3 py-1.5 rounded text-xs font-black border-2 ml-auto ${
                    pagoConfirmado
                      ? "bg-green-600 text-white border-green-700"
                      : "bg-gray-200 text-gray-800 border-gray-400"
                  }`}
                >
                  {pagoConfirmado ? "✓ PAGO CONFIRMADO" : "⏳ PAGO PENDIENTE"}
                </button>
              </div>
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

            {/* ASOCIAR EMPRESA (CUENTA CORRIENTE) */}
            <div className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
              <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                🏢 Asociar a Empresa / Cuenta Corriente (Opcional):
              </label>
              <select
                value={empresaSeleccionadaId}
                onChange={(e) => setEmpresaSeleccionadaId(e.target.value)}
                className="w-full border-2 border-indigo-300 p-2 rounded text-xs font-bold bg-white text-black"
              >
                <option value="">-- Consumidor Final / Sin Empresa --</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    🏢 {emp.nombre}
                  </option>
                ))}
              </select>
            </div>

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
                Observaciones General
              </label>
              <input
                type="text"
                style={styleTextoNegro}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Sin cubiertos, timbre roto"
                className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
              />
            </div>
          </div>

          {/* SECCIÓN 2: MENÚS DEL DÍA */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold" style={styleTextoNegro}>
                2. Seleccionar Menú del Día
              </h2>
              {menuSeleccionado && (
                <button
                  type="button"
                  onClick={() => setMenuSeleccionado(null)}
                  className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-extrabold px-2.5 py-1 rounded"
                >
                  ▼ Ver todos los menús
                </button>
              )}
            </div>

            {/* BUSCADOR DE MENÚS */}
            {!menuSeleccionado && (
              <div className="relative mb-3">
                <input
                  type="text"
                  value={busquedaTextoMenu}
                  onChange={(e) => setBusquedaTextoMenu(e.target.value)}
                  placeholder="🔍 Buscar plato (ej: milanesa, pechuga, ensalada)..."
                  className="w-full border-2 border-gray-300 text-gray-800 p-2 pl-3 pr-8 rounded text-xs font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                />
                {busquedaTextoMenu && (
                  <button
                    type="button"
                    onClick={() => setBusquedaTextoMenu("")}
                    className="absolute right-2.5 top-2 text-gray-500 font-extrabold text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {menus.length === 0 ? (
              <p className="text-red-600 text-sm font-bold">
                No hay menús con stock cargado para hoy.
              </p>
            ) : menusFiltrados.length === 0 ? (
              <p className="text-gray-500 text-xs font-bold py-2">
                No se encontraron menús que coincidan con "{busquedaTextoMenu}".
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {menusFiltrados
                  .filter(
                    (m) => !menuSeleccionado || menuSeleccionado.id === m.id
                  )
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (menuSeleccionado?.id === m.id) {
                          setMenuSeleccionado(null);
                        } else {
                          setMenuSeleccionado(m);
                          setGuarnicionSeleccionada(null);
                          setSalsaSeleccionada(null);
                          setIngredientesElegidos([]);
                          setAgregadoMenuTexto("");
                          setAgregadoGuarnicionTexto("");
                          setPrecioAgregadosExtra(0);
                          setCantidadHuevos(0);
                          setCantidadHuevosDuros(0);
                        }
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        menuSeleccionado?.id === m.id
                          ? "border-blue-600 bg-blue-100 font-extrabold shadow-md ring-2 ring-blue-400"
                          : "border-gray-300 hover:border-gray-400 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div
                          className="font-extrabold text-base"
                          style={styleTextoNegro}
                        >
                          {m.nombre}
                        </div>
                        {menuSeleccionado?.id === m.id && (
                          <span className="text-xs bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                            Seleccionado
                          </span>
                        )}
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

                {/* MODIFICADOR 1: DEL MENÚ / CARNE */}
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <label className="block text-xs font-bold text-blue-950">
                    🥩 Detalle / Modificación del Menú (ej: c/ queso, napolitana sin salsa, jugoso):
                  </label>
                  <input
                    type="text"
                    value={agregadoMenuTexto}
                    onChange={(e) => setAgregadoMenuTexto(e.target.value)}
                    placeholder="Ej: c/ queso, sin salsa, a la napolitana"
                    className="w-full border border-blue-300 p-1.5 rounded text-xs bg-white font-bold text-black"
                  />
                </div>

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
                            salsas.find((s) => s.id === e.target.value) || null
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
                            (guar) => guar.id === e.target.value
                          ) || null;
                        setGuarnicionSeleccionada(g);
                        setIngredientesElegidos([]);
                        setCantidadHuevosDuros(0);
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
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border-2 border-gray-400 w-fit">
                      <button
                        type="button"
                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                        className="text-xs font-black text-gray-800 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        -
                      </button>
                      <span
                        className="text-sm font-black min-w-[20px] text-center"
                        style={styleTextoNegro}
                      >
                        {cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCantidad(cantidad + 1)}
                        className="text-xs font-black text-gray-800 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* MODIFICADOR 2: DE LA GUARNICIÓN */}
                {menuSeleccionado.lleva_guarnicion &&
                  guarnicionSeleccionada && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg space-y-1">
                      <label className="block text-xs font-bold text-amber-950">
                        🍟 Aclaración Guarnición (ej: en bandeja separada, sin sal):
                      </label>
                      <input
                        type="text"
                        value={agregadoGuarnicionTexto}
                        onChange={(e) =>
                          setAgregadoGuarnicionTexto(e.target.value)
                        }
                        placeholder="Ej: en bandeja separada, bien frito"
                        className="w-full border border-amber-300 p-1.5 rounded text-xs bg-white font-bold text-black"
                      />
                    </div>
                  )}

                {/* COBRO EXTRA DE AGREGADOS */}
                <div className="flex items-center justify-between p-2.5 bg-gray-100 border border-gray-300 rounded-lg">
                  <span className="text-xs font-bold text-gray-800">
                    💰 Precio Extra Cobrado por Agregados ($):
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={
                      precioAgregadosExtra === 0 ? "" : precioAgregadosExtra
                    }
                    onChange={(e) =>
                      setPrecioAgregadosExtra(Number(e.target.value))
                    }
                    placeholder="$ 0"
                    className="w-24 border border-gray-400 p-1.5 rounded text-xs bg-white font-bold text-black text-center"
                  />
                </div>

                {(guarnicionSeleccionada?.requiere_ingredientes ||
                  (menuSeleccionado &&
                    menuSeleccionado.nombre
                      .toLowerCase()
                      .includes("ensalada"))) && (
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg space-y-3">
                    <label className="block text-xs font-black text-emerald-900">
                      🥗 Ingredientes para la Ensalada:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ingredientes.map((ing) => {
                        const seleccionada = ingredientesElegidos.includes(
                          ing.nombre
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

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                      <span className="text-xs font-bold text-emerald-950">
                        🥚 Huevos duros extra (+{formatearMoneda(precioHuevoDuro)} c/u):
                      </span>
                      <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-emerald-400">
                        <button
                          type="button"
                          onClick={() =>
                            setCantidadHuevosDuros(
                              Math.max(0, cantidadHuevosDuros - 1)
                            )
                          }
                          className="text-xs font-black text-gray-800 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200"
                        >
                          -
                        </button>
                        <span
                          className="text-xs font-black min-w-[16px] text-center"
                          style={styleTextoNegro}
                        >
                          {cantidadHuevosDuros}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCantidadHuevosDuros(cantidadHuevosDuros + 1)
                          }
                          className="text-xs font-black text-gray-800 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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

          {/* SECCIÓN 3: AGREGAR GUARNICIÓN EXTRA */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 space-y-3">
            <h2 className="text-lg font-bold" style={styleTextoNegro}>
              3. Agregar Guarnición Extra (+{formatearMoneda(precioGuarnicionExtra)})
            </h2>
            <div className="flex gap-2">
              <select
                style={styleTextoNegro}
                value={guarnicionExtraElegida?.id || ""}
                onChange={(e) =>
                  setGuarnicionExtraElegida(
                    guarniciones.find((g) => g.id === e.target.value) || null
                  )
                }
                className="flex-1 border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
              >
                <option value="">-- Seleccionar Guarnición Extra --</option>
                {guarniciones.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={agregarGuarnicionExtraAlPedido}
                className="bg-purple-700 text-white font-extrabold px-4 py-2 rounded text-sm hover:bg-purple-800"
              >
                + Agregar Extra
              </button>
            </div>

            {guarnicionExtraElegida && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg mt-2">
                <input
                  type="text"
                  value={agregadoGuarnicionTexto}
                  onChange={(e) => setAgregadoGuarnicionTexto(e.target.value)}
                  placeholder="Aclaración extra (ej: en bandeja separada)"
                  className="w-full border border-amber-300 p-1.5 rounded text-xs bg-white font-bold text-black"
                />
              </div>
            )}

            {guarnicionExtraElegida?.requiere_ingredientes && (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg space-y-2 mt-2">
                <label className="block text-xs font-black text-emerald-900">
                  🥗 Ingredientes para la Ensalada Extra:
                </label>
                <div className="flex flex-wrap gap-2">
                  {ingredientes.map((ing) => {
                    const seleccionada = ingredientesElegidos.includes(ing.nombre);
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
          </div>

          {/* SECCIÓN 4: SELECCIÓN DE BEBIDAS */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-300 space-y-3">
            <h2 className="text-lg font-bold" style={styleTextoNegro}>
              4. Agregar Bebida
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <select
                style={styleTextoNegro}
                value={bebidaSeleccionada?.id || ""}
                onChange={(e) =>
                  setBebidaSeleccionada(
                    bebidas.find((b) => b.id === e.target.value) || null
                  )
                }
                className="flex-1 w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
              >
                <option value="">-- Seleccionar Bebida --</option>
                {bebidas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} - ${b.precio}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border-2 border-gray-400">
                  <button
                    type="button"
                    onClick={() =>
                      setCantidadBebida(Math.max(1, cantidadBebida - 1))
                    }
                    className="text-xs font-black text-gray-800 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span
                    className="text-xs font-black min-w-[16px] text-center"
                    style={styleTextoNegro}
                  >
                    {cantidadBebida}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCantidadBebida(cantidadBebida + 1)}
                    className="text-xs font-black text-gray-800 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={agregarBebidaAlPedido}
                  className="bg-blue-600 text-white font-extrabold px-4 py-2 rounded text-sm hover:bg-blue-700 whitespace-nowrap"
                >
                  + Agregar
                </button>
              </div>
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
                      ) : !item.menu && item.guarnicion ? (
                        <div>
                          <div className="font-extrabold text-purple-900">
                            👉 Extra: {item.guarnicion.nombre}{" "}
                            {item.agregadoGuarnicionTexto
                              ? `(${item.agregadoGuarnicionTexto})`
                              : ""}
                          </div>
                          {item.ingredientesEnsalada &&
                            item.ingredientesEnsalada.length > 0 && (
                              <span className="block text-xs font-bold text-emerald-800">
                                🥗 ({item.ingredientesEnsalada.join(", ")})
                              </span>
                            )}
                        </div>
                      ) : (
                        <>
                          <div className="font-extrabold" style={styleTextoNegro}>
                            {item.cantidad}x {item.menu?.nombre}{" "}
                            {item.agregadoMenuTexto ? (
                              <span className="text-blue-900 font-bold">
                                ({item.agregadoMenuTexto})
                              </span>
                            ) : (
                              ""
                            )}
                          </div>
                          {item.salsa && (
                            <div className="text-xs font-black text-red-800">
                              🍝 {item.salsa.nombre}
                            </div>
                          )}
                          {item.guarnicion && (
                            <div className="text-xs font-bold text-gray-700">
                              + {item.guarnicion.nombre}{" "}
                              {item.agregadoGuarnicionTexto ? (
                                <span className="text-amber-900 font-bold">
                                  ({item.agregadoGuarnicionTexto})
                                </span>
                              ) : (
                                ""
                              )}
                            </div>
                          )}
                          {item.precioAgregados && item.precioAgregados > 0 ? (
                            <div className="text-[11px] font-black text-green-800">
                              💵 Agregado Extra: +
                              {formatearMoneda(item.precioAgregados)}
                            </div>
                          ) : null}
                          {item.ingredientesEnsalada &&
                            item.ingredientesEnsalada.length > 0 && (
                              <span className="block text-xs font-bold text-emerald-800">
                                🥗 ({item.ingredientesEnsalada.join(", ")})
                              </span>
                            )}
                          {item.cantidadHuevos > 0 && (
                            <div className="flex items-center gap-2 mt-1 text-xs font-black text-amber-800">
                              <span>
                                🍳 (
                                {item.cantidadHuevos === 1
                                  ? "1 Huevo Frito"
                                  : `${item.cantidadHuevos} Huevos Fritos`}
                                )
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold" style={styleTextoNegro}>
                        {formatearMoneda(item.subtotal)}
                      </span>
                      <button
                        onClick={() => eliminarItem(idx)}
                        className="text-red-600 font-extrabold text-xs p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t-2 border-gray-300 pt-4 space-y-2">
            <div
              className="flex justify-between text-sm font-bold"
              style={styleTextoNegro}
            >
              <span>Subtotal Platos:</span>
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

            {metodoPago === "TARJETA" && (
              <div className="flex justify-between text-sm font-bold text-amber-900">
                <span>Recargo Tarjeta ({recargoTarjetaPorc}%):</span>
                <span>{formatearMoneda(montoRecargoTarjeta)}</span>
              </div>
            )}

            <div
              className="flex justify-between text-xl font-black border-t-2 border-gray-300 pt-2"
              style={styleTextoNegro}
            >
              <span>Total:</span>
              <span>{formatearMoneda(montoTotal)}</span>
            </div>

            {pedidoEditandoId && (
              <div className="bg-amber-100 border-2 border-amber-400 p-3 rounded-lg mt-3 flex justify-between items-center text-amber-900 font-bold text-xs">
                <span>✏️ Modificando Pedido Existente</span>
                <Link
                  href="/"
                  onClick={() => {
                    setPedidoEditandoId(null);
                    setTurnoOriginalEditando(null);
                    setItems([]);
                    setItemsOriginalesEditar([]);
                  }}
                  className="bg-amber-800 text-white px-2 py-1 rounded text-xs hover:bg-amber-900 inline-block"
                >
                  Cancelar Edición
                </Link>
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
    <Suspense
      fallback={
        <div className="text-center p-8 font-bold">
          Cargando toma de pedidos...
        </div>
      }
    >
      <ContenidoTomaPedidos />
    </Suspense>
  );
}