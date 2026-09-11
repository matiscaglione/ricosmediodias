'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

interface Menu {
  id: string;
  nombre: string;
  precio: number;
  es_fijo: boolean;
  lleva_guarnicion: boolean;
  requiere_salsa: boolean;
  activo: boolean;
  orden?: number;
}

interface Bebida {
  id: string;
  nombre: string;
  precio: number;
  activa: boolean;
}

interface Guarnicion {
  id: string;
  nombre: string;
  precio_extra: number;
  requiere_ingredientes: boolean;
  activa: boolean;
}

interface Ingrediente {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Salsa {
  id: string;
  nombre: string;
  activa: boolean;
}

interface ZonaEnvio {
  id: string;
  nombre_zona: string;
  precio: number;
  activa: boolean;
}

interface Empresa {
  id: string;
  nombre: string;
  cuit?: string;
  telefono?: string;
  activa: boolean;
}

interface Empleado {
  id: string;
  nombre: string;
  puesto?: string;
  activo: boolean;
}

export default function AdminPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [guarniciones, setGuarniciones] = useState<Guarnicion[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [salsas, setSalsas] = useState<Salsa[]>([]);
  const [zonas, setZonas] = useState<ZonaEnvio[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [precioHuevoFrito, setPrecioHuevoFrito] = useState('500');
  const [precioHuevoDuro, setPrecioHuevoDuro] = useState('500');
  const [precioGuarnicionExtra, setPrecioGuarnicionExtra] = useState<number>(3000);
  const [recargoTarjetaPorc, setRecargoTarjetaPorc] = useState<number>(10);

  // Buscador y Filtro para Menús
  const [busquedaMenu, setBusquedaMenu] = useState('');
  const [filtroMenuTipo, setFiltroMenuTipo] = useState<'TODOS' | 'FIJO' | 'DIA' | 'SALSA' | 'GUARNICION'>('TODOS');

  // Estados para Edición
  const [menuEditando, setMenuEditando] = useState<Menu | null>(null);
  const [bebidaEditando, setBebidaEditando] = useState<Bebida | null>(null);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(null);

  // Form Nuevo Menú
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoOrden, setNuevoOrden] = useState('1');
  const [nuevoEsFijo, setNuevoEsFijo] = useState(true);
  const [nuevoLlevaGuarnicion, setNuevoLlevaGuarnicion] = useState(false);
  const [nuevoRequiereSalsa, setNuevoRequiereSalsa] = useState(false);

  // Forms secundarios
  const [nuevaBebidaNombre, setNuevaBebidaNombre] = useState('');
  const [nuevaBebidaPrecio, setNuevaBebidaPrecio] = useState('');
  const [nuevaGuarniNombre, setNuevaGuarniNombre] = useState('');
  const [nuevaGuarniPrecio, setNuevaGuarniPrecio] = useState('0');
  const [nuevaGuarniRequiereIng, setNuevaGuarniRequiereIng] = useState(false);
  const [nuevoIngredienteNombre, setNuevoIngredienteNombre] = useState('');
  const [nuevaSalsaNombre, setNuevaSalsaNombre] = useState('');
  const [nuevaZonaNombre, setNuevaZonaNombre] = useState('');
  const [nuevaZonaPrecio, setNuevaZonaPrecio] = useState('');

  // Form Nueva Empresa y Empleado
  const [nuevaEmpresaNombre, setNuevaEmpresaNombre] = useState('');
  const [nuevaEmpresaCuit, setNuevaEmpresaCuit] = useState('');
  const [nuevaEmpresaTelefono, setNuevaEmpresaTelefono] = useState('');

  const [nuevoEmpleadoNombre, setNuevoEmpleadoNombre] = useState('');
  const [nuevoEmpleadoPuesto, setNuevoEmpleadoPuesto] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: menusData } = await supabase
      .from('menus')
      .select('*')
      .order('orden', { ascending: true });
    if (menusData) setMenus(menusData);

    const { data: bebidasData } = await supabase.from('bebidas').select('*').order('created_at', { ascending: true });
    if (bebidasData) setBebidas(bebidasData);

    const { data: guarniData } = await supabase.from('guarniciones').select('*').order('created_at', { ascending: true });
    if (guarniData) setGuarniciones(guarniData);

    const { data: ingData } = await supabase.from('ingredientes_ensalada').select('*').order('created_at', { ascending: true });
    if (ingData) setIngredientes(ingData);

    const { data: salsasData } = await supabase.from('salsas').select('*').order('created_at', { ascending: true });
    if (salsasData) setSalsas(salsasData);

    const { data: zonasData } = await supabase.from('zonas_envio').select('*').order('created_at', { ascending: true });
    if (zonasData) setZonas(zonasData);

    const { data: empData, error: errEmp } = await supabase.from('empresas').select('*').order('nombre', { ascending: true });
    if (errEmp) console.error("Error cargando empresas:", errEmp);
    if (empData) setEmpresas(empData);

    const { data: emplData, error: errEmpl } = await supabase.from('empleados').select('*').order('nombre', { ascending: true });
    if (errEmpl) console.error("Error cargando empleados:", errEmpl);
    if (emplData) setEmpleados(emplData);

    const { data: confData } = await supabase
  .from('configuracion')
  .select('precio_huevo_frito, precio_huevo_duro, precio_guarnicion_extra, recargo_tarjeta_porc')
  .eq('id', 'general')
  .single();

if (confData) {
  if (confData.precio_huevo_frito) setPrecioHuevoFrito(String(confData.precio_huevo_frito));
  if (confData.precio_huevo_duro) setPrecioHuevoDuro(String(confData.precio_huevo_duro));
      if (confData.precio_guarnicion_extra) setPrecioGuarnicionExtra(Number(confData.precio_guarnicion_extra));
      if (confData.recargo_tarjeta_porc !== undefined && confData.recargo_tarjeta_porc !== null) {
        setRecargoTarjetaPorc(Number(confData.recargo_tarjeta_porc));
      }
    }

    const hoy = new Date().toISOString().split('T')[0];
    const { data: stockData } = await supabase.from('stock_diario').select('menu_id, cantidad_disponible').eq('fecha', hoy);
    
    if (stockData) {
      const mapa: Record<string, number> = {};
      stockData.forEach((s) => {
        mapa[s.menu_id] = s.cantidad_disponible;
      });
      setStockMap(mapa);
    }
  }

  // --- SECCIÓN 1: MENÚS Y STOCK ---
  async function agregarMenu(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre || !nuevoPrecio) return;

    const { error } = await supabase.from('menus').insert([
      { 
        nombre: nuevoNombre, 
        precio: parseFloat(nuevoPrecio), 
        orden: parseInt(nuevoOrden) || 1,
        es_fijo: nuevoEsFijo, 
        lleva_guarnicion: nuevoLlevaGuarnicion, 
        requiere_salsa: nuevoRequiereSalsa,
        activo: true 
      },
    ]);

    if (!error) {
      setNuevoNombre('');
      setNuevoPrecio('');
      setNuevoOrden('1');
      setNuevoLlevaGuarnicion(false);
      setNuevoRequiereSalsa(false);
      cargarDatos();
    } else {
      alert("Error agregando menú: " + error.message);
    }
  }

  async function guardarEdicionMenu() {
    if (!menuEditando) return;

    const { error } = await supabase
      .from('menus')
      .update({
        nombre: menuEditando.nombre,
        precio: menuEditando.precio,
        orden: menuEditando.orden ?? 1,
        es_fijo: menuEditando.es_fijo,
        lleva_guarnicion: menuEditando.lleva_guarnicion,
        requiere_salsa: menuEditando.requiere_salsa
      })
      .eq('id', menuEditando.id);

    if (!error) {
      setMenuEditando(null);
      cargarDatos();
    } else {
      alert('Error al guardar edición: ' + error.message);
    }
  }

  async function toggleActivoMenu(id: string, estadoActual: boolean) {
    await supabase.from('menus').update({ activo: !estadoActual }).eq('id', id);
    cargarDatos();
  }

  async function eliminarMenu(id: string) {
    if (confirm('¿Seguro que querés eliminar este menú?')) {
      await supabase.from('menus').delete().eq('id', id);
      cargarDatos();
    }
  }

  async function guardarStock(menuId: string, cantidad: number) {
    const hoy = new Date().toISOString().split('T')[0];
    await supabase.from('stock_diario').upsert(
      { fecha: hoy, menu_id: menuId, cantidad_inicial: cantidad, cantidad_disponible: cantidad },
      { onConflict: 'fecha,menu_id' }
    );
    setStockMap((prev) => ({ ...prev, [menuId]: cantidad }));
  }

  const menusFiltrados = menus.filter((m) => {
    const coincideNombre = m.nombre.toLowerCase().includes(busquedaMenu.toLowerCase());
    if (!coincideNombre) return false;

    if (filtroMenuTipo === 'FIJO') return m.es_fijo;
    if (filtroMenuTipo === 'DIA') return !m.es_fijo;
    if (filtroMenuTipo === 'SALSA') return m.requiere_salsa;
    if (filtroMenuTipo === 'GUARNICION') return m.lleva_guarnicion;

    return true;
  });

  // --- SECCIÓN 2: BEBIDAS ---
  async function agregarBebida(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaBebidaNombre || !nuevaBebidaPrecio) return;
    await supabase.from('bebidas').insert([{ nombre: nuevaBebidaNombre, precio: parseFloat(nuevaBebidaPrecio), activa: true }]);
    setNuevaBebidaNombre('');
    setNuevaBebidaPrecio('');
    cargarDatos();
  }

  async function guardarEdicionBebida() {
    if (!bebidaEditando) return;
    await supabase.from('bebidas').update({ nombre: bebidaEditando.nombre, precio: bebidaEditando.precio }).eq('id', bebidaEditando.id);
    setBebidaEditando(null);
    cargarDatos();
  }

  async function toggleActivaBebida(id: string, estadoActual: boolean) {
    await supabase.from('bebidas').update({ activa: !estadoActual }).eq('id', id);
    cargarDatos();
  }

  async function eliminarBebida(id: string) {
    if (confirm('¿Seguro que querés eliminar esta bebida?')) {
      await supabase.from('bebidas').delete().eq('id', id);
      cargarDatos();
    }
  }

  // --- SECCIÓN 3: GUARNICIONES ---
  async function agregarGuarnicion(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaGuarniNombre) return;
    await supabase.from('guarniciones').insert([
      { nombre: nuevaGuarniNombre, precio_extra: parseFloat(nuevaGuarniPrecio) || 0, requiere_ingredientes: nuevaGuarniRequiereIng, activa: true },
    ]);
    setNuevaGuarniNombre('');
    setNuevaGuarniPrecio('0');
    setNuevaGuarniRequiereIng(false);
    cargarDatos();
  }

  async function toggleActivaGuarnicion(id: string, estadoActual: boolean) {
    await supabase.from('guarniciones').update({ activa: !estadoActual }).eq('id', id);
    cargarDatos();
  }

  async function eliminarGuarnicion(id: string) {
    if (confirm('¿Seguro que querés eliminar esta guarnición?')) {
      await supabase.from('guarniciones').delete().eq('id', id);
      cargarDatos();
    }
  }

  // --- SECCIÓN 4: INGREDIENTES ENSALADA ---
  async function agregarIngrediente(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoIngredienteNombre) return;
    await supabase.from('ingredientes_ensalada').insert([{ nombre: nuevoIngredienteNombre, activo: true }]);
    setNuevoIngredienteNombre('');
    cargarDatos();
  }

  async function toggleActivoIngrediente(id: string, estadoActual: boolean) {
    await supabase.from('ingredientes_ensalada').update({ activo: !estadoActual }).eq('id', id);
    cargarDatos();
  }

  async function eliminarIngrediente(id: string) {
    if (confirm('¿Seguro que querés eliminar este ingrediente?')) {
      await supabase.from('ingredientes_ensalada').delete().eq('id', id);
      cargarDatos();
    }
  }

  // --- SECCIÓN 5: SALSAS ---
  async function agregarSalsa(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaSalsaNombre) return;
    await supabase.from('salsas').insert([{ nombre: nuevaSalsaNombre, activa: true }]);
    setNuevaSalsaNombre('');
    cargarDatos();
  }

  async function toggleActivaSalsa(id: string, estadoActual: boolean) {
    await supabase.from('salsas').update({ activa: !estadoActual }).eq('id', id);
    cargarDatos();
  }

  async function eliminarSalsa(id: string) {
    if (confirm('¿Seguro que querés eliminar esta salsa?')) {
      await supabase.from('salsas').delete().eq('id', id);
      cargarDatos();
    }
  }

  // --- SECCIÓN 6: ZONAS DE ENVÍO ---
  async function agregarZona(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaZonaNombre || !nuevaZonaPrecio) return;
    await supabase.from('zonas_envio').insert([{ nombre_zona: nuevaZonaNombre, precio: parseFloat(nuevaZonaPrecio), activa: true }]);
    setNuevaZonaNombre('');
    setNuevaZonaPrecio('');
    cargarDatos();
  }

  async function toggleActivaZona(id: string, estadoActual: boolean) {
    await supabase.from('zonas_envio').update({ activa: !estadoActual }).eq('id', id);
    cargarDatos();
  }

  async function eliminarZona(id: string) {
    if (confirm('¿Seguro que querés eliminar esta zona?')) {
      const { error } = await supabase.from('zonas_envio').delete().eq('id', id);
      if (error) {
        alert('No se pudo eliminar la zona porque tiene pedidos asociados. Podés desactivarla.');
      } else {
        cargarDatos();
      }
    }
  }

  // --- SECCIÓN 7: EMPRESAS ---
  async function agregarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaEmpresaNombre.trim()) {
      alert("Por favor ingresá el nombre de la empresa");
      return;
    }

    const { error } = await supabase.from('empresas').insert([
      { 
        nombre: nuevaEmpresaNombre.trim(), 
        cuit: nuevaEmpresaCuit.trim() || null, 
        telefono: nuevaEmpresaTelefono.trim() || null, 
        activa: true 
      },
    ]);

    if (error) {
      alert("Error al guardar empresa: " + error.message);
    } else {
      setNuevaEmpresaNombre('');
      setNuevaEmpresaCuit('');
      setNuevaEmpresaTelefono('');
      cargarDatos();
    }
  }

  async function guardarEdicionEmpresa() {
    if (!empresaEditando || !empresaEditando.nombre.trim()) return;

    const { error } = await supabase
      .from('empresas')
      .update({
        nombre: empresaEditando.nombre.trim(),
        cuit: empresaEditando.cuit?.trim() || null,
        telefono: empresaEditando.telefono?.trim() || null,
      })
      .eq('id', empresaEditando.id);

    if (error) {
      alert("Error actualizando empresa: " + error.message);
    } else {
      setEmpresaEditando(null);
      cargarDatos();
    }
  }

  async function toggleActivaEmpresa(id: string, estadoActual: boolean) {
    const { error } = await supabase.from('empresas').update({ activa: !estadoActual }).eq('id', id);
    if (error) alert("Error cambiando estado de empresa: " + error.message);
    cargarDatos();
  }

  async function eliminarEmpresa(id: string) {
    if (confirm('¿Seguro que querés eliminar esta empresa?')) {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) {
        alert('No se pudo eliminar la empresa porque tiene pedidos registrados. Podés desactivarla.');
      } else {
        cargarDatos();
      }
    }
  }

  // --- SECCIÓN 8: EMPLEADOS ---
  async function agregarEmpleado(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoEmpleadoNombre.trim()) {
      alert("Por favor ingresá el nombre del empleado");
      return;
    }

    const { error } = await supabase.from('empleados').insert([
      { 
        nombre: nuevoEmpleadoNombre.trim(), 
        puesto: nuevoEmpleadoPuesto.trim() || null, 
        activo: true 
      },
    ]);

    if (error) {
      alert("Error al guardar empleado: " + error.message);
    } else {
      setNuevoEmpleadoNombre('');
      setNuevoEmpleadoPuesto('');
      cargarDatos();
    }
  }

  async function guardarEdicionEmpleado() {
    if (!empleadoEditando || !empleadoEditando.nombre.trim()) return;

    const { error } = await supabase
      .from('empleados')
      .update({
        nombre: empleadoEditando.nombre.trim(),
        puesto: empleadoEditando.puesto?.trim() || null,
      })
      .eq('id', empleadoEditando.id);

    if (error) {
      alert("Error actualizando empleado: " + error.message);
    } else {
      setEmpleadoEditando(null);
      cargarDatos();
    }
  }

  async function toggleActivoEmpleado(id: string, estadoActual: boolean) {
    const { error } = await supabase.from('empleados').update({ activo: !estadoActual }).eq('id', id);
    if (error) alert("Error cambiando estado del empleado: " + error.message);
    cargarDatos();
  }

  async function eliminarEmpleado(id: string) {
    if (confirm('¿Seguro que querés eliminar este empleado?')) {
      const { error } = await supabase.from('empleados').delete().eq('id', id);
      if (error) alert("Error eliminando empleado: " + error.message);
      cargarDatos();
    }
  }

  // Guardar precios adicionales
  async function guardarPrecioHuevo(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(precioHuevoFrito) || 0;
    const { error } = await supabase
      .from('configuracion')
      .upsert({ id: 'general', precio_huevo_frito: valor }, { onConflict: 'id' });

    if (!error) {
      alert('Precio de huevo frito actualizado correctamente');
      cargarDatos();
    } else {
      alert('Error al guardar precio: ' + error.message);
    }
  }

  async function guardarPrecioHuevoDuro(e: React.FormEvent) {
  e.preventDefault();
  const valor = parseFloat(precioHuevoDuro) || 0;
  const { error } = await supabase
    .from('configuracion')
    .upsert({ id: 'general', precio_huevo_duro: valor }, { onConflict: 'id' });

  if (!error) {
    alert('Precio de huevo duro actualizado correctamente');
    cargarDatos();
  } else {
    alert('Error al guardar precio: ' + error.message);
  }
}

  async function guardarPrecioGuarnicionExtra(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(String(precioGuarnicionExtra)) || 0;
    const { error } = await supabase
      .from('configuracion')
      .upsert({ id: 'general', precio_guarnicion_extra: valor }, { onConflict: 'id' });

    if (!error) {
      alert('Precio de guarnición extra actualizado correctamente');
      cargarDatos();
    } else {
      alert('Error al guardar precio: ' + error.message);
    }
  }

  // Guardar recargo por tarjeta
  async function guardarRecargoTarjeta(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(String(recargoTarjetaPorc)) || 0;
    const { error } = await supabase
      .from('configuracion')
      .upsert({ id: 'general', recargo_tarjeta_porc: valor }, { onConflict: 'id' });

    if (!error) {
      alert('Recargo de tarjeta por defecto actualizado correctamente');
      cargarDatos();
    } else {
      alert('Error al guardar recargo: ' + error.message);
    }
  }

  const styleTextoNegro = { color: '#000000' };

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans bg-gray-100 min-h-screen space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black" style={styleTextoNegro}>Panel de Administración</h1>
        <div className="flex gap-2">
          <Link href="/empresas" className="bg-indigo-700 text-white text-sm px-3 py-2 rounded font-bold hover:bg-indigo-800">
            🏢 Cta. Cte. Empresas
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('clave_acceso_ricos');
              window.location.reload();
            }}
            className="bg-red-600 text-white text-sm px-3 py-2 rounded font-bold hover:bg-red-700 transition-colors"
            title="Cerrar sesión en este dispositivo"
          >
            🔒 Cerrar Sesión
          </button>
          <Link href="/" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
            ⬅ Toma de Pedidos
          </Link>
        </div>
      </div>

      {/* SECCIÓN 1: MENÚS Y STOCK */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300 space-y-6">
        <h2 className="text-xl font-bold" style={styleTextoNegro}>1. Gestión de Menús y Stock Hoy</h2>
        
        <form onSubmit={agregarMenu} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre del plato</label>
            <input
              type="text"
              style={styleTextoNegro}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Milanesa / Canelones"
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Precio ($)</label>
            <input
              type="number"
              step="0.01"
              style={styleTextoNegro}
              value={nuevoPrecio}
              onChange={(e) => setNuevoPrecio(e.target.value)}
              placeholder="Ej: 6000"
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Orden</label>
            <input
              type="number"
              style={styleTextoNegro}
              value={nuevoOrden}
              onChange={(e) => setNuevoOrden(e.target.value)}
              placeholder="1"
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none text-center"
            />
          </div>
          <div className="space-y-1 pb-1">
            <div className="flex items-center gap-1.5">
              <input type="checkbox" id="esFijo" checked={nuevoEsFijo} onChange={(e) => setNuevoEsFijo(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="esFijo" className="text-xs font-bold" style={styleTextoNegro}>Plato Fijo</label>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="checkbox" id="llevaGuarnicion" checked={nuevoLlevaGuarnicion} onChange={(e) => setNuevoLlevaGuarnicion(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="llevaGuarnicion" className="text-xs font-bold" style={styleTextoNegro}>Lleva Guarnición</label>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="checkbox" id="reqSalsa" checked={nuevoRequiereSalsa} onChange={(e) => setNuevoRequiereSalsa(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="reqSalsa" className="text-xs font-bold text-red-700">Lleva Salsa</label>
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white text-sm font-extrabold py-2 px-3 rounded hover:bg-blue-700">
            + Agregar Menú
          </button>
        </form>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-100 p-3 rounded-lg border border-gray-300">
          <input
            type="text"
            value={busquedaMenu}
            onChange={(e) => setBusquedaMenu(e.target.value)}
            placeholder="🔍 Buscar plato..."
            className="w-full md:w-64 border-2 border-gray-400 p-2 rounded text-sm font-bold bg-white"
            style={styleTextoNegro}
          />

          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {(['TODOS', 'FIJO', 'DIA', 'SALSA', 'GUARNICION'] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroMenuTipo(tipo)}
                className={`px-3 py-1.5 rounded text-xs font-extrabold border transition-colors ${
                  filtroMenuTipo === tipo
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {tipo === 'TODOS' ? 'Todos' : tipo === 'FIJO' ? '📌 Fijos' : tipo === 'DIA' ? '☀️ Del Día' : tipo === 'SALSA' ? '🍝 C/ Salsa' : '🥗 C/ Guarnición'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {menusFiltrados.map((m) => {
            const esEditando = menuEditando?.id === m.id;

            return (
              <div key={m.id} className={`p-4 rounded-lg border-2 transition-all ${m.activo ? 'bg-white border-gray-300 shadow-sm' : 'bg-gray-100 border-gray-300 opacity-60'}`}>
                {esEditando ? (
                  <div className="space-y-3 bg-blue-50 p-3 rounded border border-blue-300">
                    <h3 className="text-xs font-black text-blue-900 uppercase">Editando plato</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre</label>
                        <input
                          type="text"
                          style={styleTextoNegro}
                          value={menuEditando.nombre}
                          onChange={(e) => setMenuEditando({ ...menuEditando, nombre: e.target.value })}
                          className="w-full border-2 border-gray-400 p-1.5 rounded text-sm font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Orden</label>
                        <input
                          type="number"
                          style={styleTextoNegro}
                          value={menuEditando.orden ?? 1}
                          onChange={(e) => setMenuEditando({ ...menuEditando, orden: parseInt(e.target.value) || 1 })}
                          className="w-full border-2 border-gray-400 p-1.5 rounded text-sm font-bold bg-white text-center"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Precio ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        style={styleTextoNegro}
                        value={menuEditando.precio}
                        onChange={(e) => setMenuEditando({ ...menuEditando, precio: parseFloat(e.target.value) || 0 })}
                        className="w-full border-2 border-gray-400 p-1.5 rounded text-sm font-bold bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <label className="flex items-center gap-1 text-xs font-bold" style={styleTextoNegro}>
                        <input
                          type="checkbox"
                          checked={menuEditando.es_fijo}
                          onChange={(e) => setMenuEditando({ ...menuEditando, es_fijo: e.target.checked })}
                        /> Plato Fijo
                      </label>
                      <label className="flex items-center gap-1 text-xs font-bold" style={styleTextoNegro}>
                        <input
                          type="checkbox"
                          checked={menuEditando.lleva_guarnicion}
                          onChange={(e) => setMenuEditando({ ...menuEditando, lleva_guarnicion: e.target.checked })}
                        /> Lleva Guarnición
                      </label>
                      <label className="flex items-center gap-1 text-xs font-bold text-red-700">
                        <input
                          type="checkbox"
                          checked={menuEditando.requiere_salsa}
                          onChange={(e) => setMenuEditando({ ...menuEditando, requiere_salsa: e.target.checked })}
                        /> Lleva Salsa
                      </label>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button onClick={guardarEdicionMenu} className="flex-1 bg-green-600 text-white font-extrabold text-xs py-2 rounded hover:bg-green-700">
                        💾 Guardar Cambios
                      </button>
                      <button onClick={() => setMenuEditando(null)} className="bg-gray-400 text-white font-bold text-xs px-3 rounded hover:bg-gray-500">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-xs font-black text-gray-500 block">
                            Posición: #{m.orden ?? '-'}
                          </span>
                          <h3 className="font-black text-lg" style={styleTextoNegro}>{m.nombre}</h3>
                        </div>
                        <span className="font-black text-base text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          ${m.precio.toLocaleString('es-AR')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-extrabold border ${m.es_fijo ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-purple-100 text-purple-900 border-purple-300'}`}>
                          {m.es_fijo ? '📌 Plato Fijo' : '☀️ Del Día'}
                        </span>
                        {m.lleva_guarnicion && (
                          <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded font-extrabold">
                            🥗 C/ Guarnición
                          </span>
                        )}
                        {m.requiere_salsa && (
                          <span className="text-xs bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded font-extrabold">
                            🍝 C/ Salsa
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-600">Stock Hoy:</span>
                        <input
                          type="number"
                          min="0"
                          style={styleTextoNegro}
                          value={stockMap[m.id] ?? ''}
                          onChange={(e) => guardarStock(m.id, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-16 border-2 border-gray-400 p-1 rounded text-center font-extrabold text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setMenuEditando(m)}
                          className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1.5 rounded hover:bg-blue-700 transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => toggleActivoMenu(m.id, m.activo)}
                          className={`text-xs px-2 py-1.5 rounded font-bold ${m.activo ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-amber-200 text-amber-900'}`}
                        >
                          {m.activo ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button onClick={() => eliminarMenu(m.id)} className="text-red-600 hover:text-red-800 text-xs font-bold px-1.5 py-1">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2: BEBIDAS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300 space-y-4">
        <h2 className="text-xl font-bold" style={styleTextoNegro}>2. Gestión de Bebidas / Adicionales</h2>
        <form onSubmit={agregarBebida} className="flex gap-3 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex-1">
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre de Bebida</label>
            <input
              type="text"
              style={styleTextoNegro}
              value={nuevaBebidaNombre}
              onChange={(e) => setNuevaBebidaNombre(e.target.value)}
              placeholder="Ej: Coca Cola 500ml / Agua con Gas"
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Precio ($)</label>
            <input
              type="number"
              style={styleTextoNegro}
              value={nuevaBebidaPrecio}
              onChange={(e) => setNuevaBebidaPrecio(e.target.value)}
              placeholder="1500"
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-blue-700">
            + Agregar Bebida
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bebidas.map((b) => (
            <div key={b.id} className="flex justify-between items-center p-3 border border-gray-300 rounded bg-gray-50">
              {bebidaEditando?.id === b.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    style={styleTextoNegro}
                    value={bebidaEditando.nombre}
                    onChange={(e) => setBebidaEditando({ ...bebidaEditando, nombre: e.target.value })}
                    className="border p-1 text-sm font-bold w-1/2"
                  />
                  <input
                    type="number"
                    style={styleTextoNegro}
                    value={bebidaEditando.precio}
                    onChange={(e) => setBebidaEditando({ ...bebidaEditando, precio: parseFloat(e.target.value) || 0 })}
                    className="border p-1 text-sm font-bold w-1/4"
                  />
                  <button onClick={guardarEdicionBebida} className="bg-green-600 text-white text-xs font-bold px-2 rounded">💾</button>
                  <button onClick={() => setBebidaEditando(null)} className="bg-gray-400 text-white text-xs font-bold px-2 rounded">✕</button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-extrabold text-sm block" style={styleTextoNegro}>{b.nombre}</span>
                    <span className="font-black text-xs text-green-700">${b.precio.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setBebidaEditando(b)} className="text-xs bg-blue-100 text-blue-900 font-bold px-2 py-1 rounded">✏️ Editar</button>
                    <button onClick={() => toggleActivaBebida(b.id, b.activa)} className={`text-xs font-bold px-2 py-1 rounded ${b.activa ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-700'}`}>
                      {b.activa ? 'Activa' : 'Oculta'}
                    </button>
                    <button onClick={() => eliminarBebida(b.id)} className="text-xs text-red-600 font-bold px-1">✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 3: GUARNICIONES */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>3. Gestión de Guarniciones</h2>
        <form onSubmit={agregarGuarnicion} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre Guarnición</label>
            <input type="text" style={styleTextoNegro} value={nuevaGuarniNombre} onChange={(e) => setNuevaGuarniNombre(e.target.value)} placeholder="Ej: Ensalada a Elección" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Precio Extra ($)</label>
            <input type="number" step="0.01" style={styleTextoNegro} value={nuevaGuarniPrecio} onChange={(e) => setNuevaGuarniPrecio(e.target.value)} className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <div className="flex items-center gap-1.5 pb-2">
            <input type="checkbox" id="reqIng" checked={nuevaGuarniRequiereIng} onChange={(e) => setNuevaGuarniRequiereIng(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="reqIng" className="text-xs font-bold" style={styleTextoNegro}>Armar con ingredientes (Ensalada)</label>
          </div>
          <button type="submit" className="bg-purple-600 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-purple-700">+ Agregar Guarnición</button>
        </form>

        <table className="w-full text-left border-collapse border border-gray-300">
          <thead>
            <tr className="border-b bg-gray-200 text-xs">
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Guarnición</th>
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Tipo</th>
              <th className="p-3 text-center font-extrabold" style={styleTextoNegro}>Estado</th>
              <th className="p-3 text-center font-extrabold" style={styleTextoNegro}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {guarniciones.map((g) => (
              <tr key={g.id} className="border-b text-sm hover:bg-gray-50">
                <td className="p-3 font-extrabold" style={styleTextoNegro}>{g.nombre}</td>
                <td className="p-3">{g.requiere_ingredientes ? <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-extrabold">🥗 Elige Ingredientes</span> : <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded font-bold">Simple</span>}</td>
                <td className="p-3 text-center">
                  <button onClick={() => toggleActivaGuarnicion(g.id, g.activa)} className={`text-xs px-2 py-1 rounded font-bold ${g.activa ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-800'}`}>
                    {g.activa ? 'Activa' : 'Desactivada'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => eliminarGuarnicion(g.id)} className="text-red-600 hover:text-red-800 text-xs font-bold">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 4: INGREDIENTES ENSALADA */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>4. Opciones / Ingredientes de Ensaladas</h2>
        <form onSubmit={agregarIngrediente} className="flex gap-3 items-end mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex-1">
            <input type="text" style={styleTextoNegro} value={nuevoIngredienteNombre} onChange={(e) => setNuevoIngredienteNombre(e.target.value)} placeholder="Ej: Lechuga, Tomate..." className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <button type="submit" className="bg-emerald-600 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-emerald-700">+ Agregar Ingrediente</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {ingredientes.map((ing) => (
            <div key={ing.id} className="flex items-center gap-2 bg-gray-100 border border-gray-300 p-2 rounded">
              <span className="text-sm font-extrabold" style={styleTextoNegro}>{ing.nombre}</span>
              <button onClick={() => toggleActivoIngrediente(ing.id, ing.activo)} className={`text-xs px-2 py-0.5 rounded font-bold ${ing.activo ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-700'}`}>{ing.activo ? 'Disponible' : 'Sin stock'}</button>
              <button onClick={() => eliminarIngrediente(ing.id)} className="text-red-600 font-bold text-xs ml-1">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 5: SALSAS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>5. Gestión de Salsas (Pastas/Crepes)</h2>

        <form onSubmit={agregarSalsa} className="flex gap-3 items-end mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex-1">
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre de la Salsa</label>
            <input
              type="text"
              style={styleTextoNegro}
              value={nuevaSalsaNombre}
              onChange={(e) => setNuevaSalsaNombre(e.target.value)}
              placeholder="Ej: Salsa Bolognesa, Salsa Mixta, Sin Salsa..."
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold focus:outline-none"
            />
          </div>
          <button type="submit" className="bg-red-600 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-red-700">
            + Agregar Salsa
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {salsas.map((s) => (
            <div key={s.id} className="flex items-center gap-2 bg-gray-100 border border-gray-300 p-2 rounded">
              <span className="text-sm font-extrabold" style={styleTextoNegro}>{s.nombre}</span>
              <button
                onClick={() => toggleActivaSalsa(s.id, s.activa)}
                className={`text-xs px-2 py-0.5 rounded font-bold ${s.activa ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-700'}`}
              >
                {s.activa ? 'Disponible' : 'Oculta'}
              </button>
              <button onClick={() => eliminarSalsa(s.id)} className="text-red-600 font-bold text-xs ml-1">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 6: ZONAS DE ENVÍO */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>6. Zonas de Envío</h2>
        <form onSubmit={agregarZona} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div><input type="text" style={styleTextoNegro} value={nuevaZonaNombre} onChange={(e) => setNuevaZonaNombre(e.target.value)} placeholder="Ej: Villa Gobernador Gálvez" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" /></div>
          <div><input type="number" step="0.01" style={styleTextoNegro} value={nuevaZonaPrecio} onChange={(e) => setNuevaZonaPrecio(e.target.value)} placeholder="Ej: 1500" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" /></div>
          <button type="submit" className="bg-green-600 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-green-700">+ Agregar Zona</button>
        </form>
        <table className="w-full text-left border-collapse border border-gray-300">
          <thead>
            <tr className="border-b bg-gray-200 text-xs">
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Zona</th>
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Costo</th>
              <th className="p-3 text-center font-extrabold" style={styleTextoNegro}>Estado</th>
              <th className="p-3 text-center font-extrabold" style={styleTextoNegro}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.id} className="border-b text-sm hover:bg-gray-50">
                <td className="p-3 font-extrabold" style={styleTextoNegro}>{z.nombre_zona}</td>
                <td className="p-3 font-extrabold" style={styleTextoNegro}>${z.precio.toLocaleString('es-AR')}</td>
                <td className="p-3 text-center"><button onClick={() => toggleActivaZona(z.id, z.activa)} className={`text-xs px-2 py-1 rounded font-bold ${z.activa ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-800'}`}>{z.activa ? 'Activa' : 'Desactivada'}</button></td>
                <td className="p-3 text-center"><button onClick={() => eliminarZona(z.id)} className="text-red-600 hover:text-red-800 text-xs font-bold">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 7: EMPRESAS / CLIENTES CORPORATIVOS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>7. Empresas / Clientes Corporativos</h2>
        <form onSubmit={agregarEmpresa} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre Empresa *</label>
            <input type="text" style={styleTextoNegro} value={nuevaEmpresaNombre} onChange={(e) => setNuevaEmpresaNombre(e.target.value)} placeholder="Ej: Tech Corp" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>CUIT (Opcional)</label>
            <input type="text" style={styleTextoNegro} value={nuevaEmpresaCuit} onChange={(e) => setNuevaEmpresaCuit(e.target.value)} placeholder="30-12345678-9" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Teléfono (Opcional)</label>
            <input type="text" style={styleTextoNegro} value={nuevaEmpresaTelefono} onChange={(e) => setNuevaEmpresaTelefono(e.target.value)} placeholder="341 000000" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <button type="submit" className="bg-indigo-700 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-indigo-800">+ Agregar Empresa</button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {empresas.map((emp) => {
            const esEditando = empresaEditando?.id === emp.id;

            return (
              <div key={emp.id} className="p-3 border border-indigo-200 bg-indigo-50 rounded-lg">
                {esEditando ? (
                  <div className="space-y-2 bg-white p-3 rounded border border-indigo-300">
                    <h4 className="text-xs font-black text-indigo-900 uppercase">Editando Empresa</h4>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700">Nombre *</label>
                      <input
                        type="text"
                        value={empresaEditando.nombre}
                        onChange={(e) => setEmpresaEditando({ ...empresaEditando, nombre: e.target.value })}
                        className="w-full border border-gray-400 p-1 rounded text-xs font-bold text-black"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700">CUIT</label>
                        <input
                          type="text"
                          value={empresaEditando.cuit || ''}
                          onChange={(e) => setEmpresaEditando({ ...empresaEditando, cuit: e.target.value })}
                          className="w-full border border-gray-400 p-1 rounded text-xs font-bold text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700">Teléfono</label>
                        <input
                          type="text"
                          value={empresaEditando.telefono || ''}
                          onChange={(e) => setEmpresaEditando({ ...empresaEditando, telefono: e.target.value })}
                          className="w-full border border-gray-400 p-1 rounded text-xs font-bold text-black"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={guardarEdicionEmpresa} className="flex-1 bg-emerald-700 text-white font-extrabold text-xs py-1.5 rounded hover:bg-emerald-800">
                        💾 Guardar
                      </button>
                      <button onClick={() => setEmpresaEditando(null)} className="bg-gray-400 text-white font-bold text-xs px-3 rounded hover:bg-gray-500">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-black block" style={styleTextoNegro}>{emp.nombre}</span>
                      <div className="text-xs font-bold text-gray-600 flex gap-2">
                        {emp.cuit && <span>CUIT: {emp.cuit}</span>}
                        {emp.telefono && <span>Tel: {emp.telefono}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEmpresaEditando(emp)} className="text-xs bg-blue-100 text-blue-900 font-bold px-2 py-1 rounded hover:bg-blue-200">
                        ✏️ Editar
                      </button>
                      <button onClick={() => toggleActivaEmpresa(emp.id, emp.activa)} className={`text-xs px-2 py-1 rounded font-bold ${emp.activa ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-700'}`}>
                        {emp.activa ? 'Activa' : 'Inactiva'}
                      </button>
                      <button onClick={() => eliminarEmpresa(emp.id)} className="text-red-600 font-bold text-xs px-1">✕</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 8: EMPLEADOS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>8. Gestión de Empleados (Rendición de Gastos)</h2>
        <form onSubmit={agregarEmpleado} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre Empleado *</label>
            <input type="text" style={styleTextoNegro} value={nuevoEmpleadoNombre} onChange={(e) => setNuevoEmpleadoNombre(e.target.value)} placeholder="Ej: Juan Pérez" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Puesto / Rol (Opcional)</label>
            <input type="text" style={styleTextoNegro} value={nuevoEmpleadoPuesto} onChange={(e) => setNuevoEmpleadoPuesto(e.target.value)} placeholder="Ej: Cocina, Ayudante" className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold" />
          </div>
          <button type="submit" className="bg-amber-700 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-amber-800">+ Agregar Empleado</button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {empleados.map((emp) => {
            const esEditando = empleadoEditando?.id === emp.id;

            return (
              <div key={emp.id} className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                {esEditando ? (
                  <div className="space-y-2 bg-white p-3 rounded border border-amber-300">
                    <h4 className="text-xs font-black text-amber-900 uppercase">Editando Empleado</h4>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700">Nombre *</label>
                      <input
                        type="text"
                        value={empleadoEditando.nombre}
                        onChange={(e) => setEmpleadoEditando({ ...empleadoEditando, nombre: e.target.value })}
                        className="w-full border border-gray-400 p-1 rounded text-xs font-bold text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700">Puesto / Rol</label>
                      <input
                        type="text"
                        value={empleadoEditando.puesto || ''}
                        onChange={(e) => setEmpleadoEditando({ ...empleadoEditando, puesto: e.target.value })}
                        className="w-full border border-gray-400 p-1 rounded text-xs font-bold text-black"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={guardarEdicionEmpleado} className="flex-1 bg-emerald-700 text-white font-extrabold text-xs py-1.5 rounded hover:bg-emerald-800">
                        💾 Guardar
                      </button>
                      <button onClick={() => setEmpleadoEditando(null)} className="bg-gray-400 text-white font-bold text-xs px-3 rounded hover:bg-gray-500">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-black block" style={styleTextoNegro}>{emp.nombre}</span>
                      {emp.puesto && <span className="text-xs font-bold text-gray-600">{emp.puesto}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEmpleadoEditando(emp)} className="text-xs bg-blue-100 text-blue-900 font-bold px-2 py-1 rounded hover:bg-blue-200">
                        ✏️ Editar
                      </button>
                      <button onClick={() => toggleActivoEmpleado(emp.id, emp.activo)} className={`text-xs px-2 py-1 rounded font-bold ${emp.activo ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-700'}`}>
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </button>
                      <button onClick={() => eliminarEmpleado(emp.id)} className="text-red-600 font-bold text-xs px-1">✕</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN ADICIONALES: HUEVO FRITO */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>🍳 Precio de Adicional Huevo Frito</h2>
        <form onSubmit={guardarPrecioHuevo} className="flex gap-3 items-end bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="flex-1">
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Precio por unidad ($)</label>
            <input
              type="number"
              step="0.01"
              style={styleTextoNegro}
              value={precioHuevoFrito}
              onChange={(e) => setPrecioHuevoFrito(e.target.value)}
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
            />
          </div>
          <button type="submit" className="bg-amber-600 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-amber-700">
            💾 Guardar Precio
          </button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
  <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>🍳 Precio de Adicional Huevo Duro</h2>
  <form onSubmit={guardarPrecioHuevoDuro} className="flex gap-3 items-end bg-amber-50 p-4 rounded-lg border border-amber-200">
    <div className="flex-1">
      <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Precio por unidad ($)</label>
      <input
        type="number"
        step="0.01"
        style={styleTextoNegro}
        value={precioHuevoDuro}
        onChange={(e) => setPrecioHuevoDuro(e.target.value)}
        className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
      />
    </div>
    <button type="submit" className="bg-amber-600 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-amber-700">
      💾 Guardar Precio
    </button>
  </form>
</div>

      {/* SECCIÓN ADICIONALES: GUARNICIÓN EXTRA */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>🥗 Precio de Guarnición Extra / Adicional</h2>
        <form onSubmit={guardarPrecioGuarnicionExtra} className="flex gap-3 items-end bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex-1">
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Precio Guarnición Extra ($)</label>
            <input
              type="number"
              step="0.01"
              style={styleTextoNegro}
              value={precioGuarnicionExtra}
              onChange={(e) => setPrecioGuarnicionExtra(Number(e.target.value))}
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
            />
          </div>
          <button type="submit" className="bg-purple-700 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-purple-800">
            💾 Guardar Precio
          </button>
        </form>
      </div>

      {/* SECCIÓN CONFIGURACIÓN: RECARGO TARJETA */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>💳 Recargo por Tarjeta (Por Defecto)</h2>
        <form onSubmit={guardarRecargoTarjeta} className="flex gap-3 items-end bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex-1">
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Porcentaje de Recargo (%)</label>
            <input
              type="number"
              step="0.01"
              style={styleTextoNegro}
              value={recargoTarjetaPorc}
              onChange={(e) => setRecargoTarjetaPorc(Number(e.target.value))}
              className="w-full border-2 border-gray-400 p-2 rounded text-sm bg-white font-bold"
            />
          </div>
          <button type="submit" className="bg-blue-700 text-white text-sm font-extrabold py-2 px-4 rounded hover:bg-blue-800">
            💾 Guardar Recargo
          </button>
        </form>
      </div>

    </div>
  );
}