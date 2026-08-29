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

export default function AdminPage() {
  const CLAVE_CORRECTA = 'Matias$4925107';
  const [claveIngresada, setClaveIngresada] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [errorClave, setErrorClave] = useState(false);

  const [menus, setMenus] = useState<Menu[]>([]);
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [guarniciones, setGuarniciones] = useState<Guarnicion[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [salsas, setSalsas] = useState<Salsa[]>([]);
  const [zonas, setZonas] = useState<ZonaEnvio[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  // Buscador y Filtro para Menús
  const [busquedaMenu, setBusquedaMenu] = useState('');
  const [filtroMenuTipo, setFiltroMenuTipo] = useState<'TODOS' | 'FIJO' | 'DIA' | 'SALSA' | 'GUARNICION'>('TODOS');

  // Estado para Edición de Menú y Bebida
  const [menuEditando, setMenuEditando] = useState<Menu | null>(null);
  const [bebidaEditando, setBebidaEditando] = useState<Bebida | null>(null);

  // Form Nuevo Menú
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
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

  useEffect(() => {
    if (autenticado) {
      cargarDatos();
    }
  }, [autenticado]);

  function verificarClave(e: React.FormEvent) {
    e.preventDefault();
    if (claveIngresada === CLAVE_CORRECTA) {
      setAutenticado(true);
      setErrorClave(false);
    } else {
      setErrorClave(true);
      setClaveIngresada('');
    }
  }

  async function cargarDatos() {
    const { data: menusData } = await supabase.from('menus').select('*').order('created_at', { ascending: true });
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
        es_fijo: nuevoEsFijo, 
        lleva_guarnicion: nuevoLlevaGuarnicion, 
        requiere_salsa: nuevoRequiereSalsa,
        activo: true 
      },
    ]);

    if (!error) {
      setNuevoNombre('');
      setNuevoPrecio('');
      setNuevoLlevaGuarnicion(false);
      setNuevoRequiereSalsa(false);
      cargarDatos();
    }
  }

  async function guardarEdicionMenu() {
    if (!menuEditando) return;

    const { error } = await supabase
      .from('menus')
      .update({
        nombre: menuEditando.nombre,
        precio: menuEditando.precio,
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
        alert('No se pudo eliminar la zona porque tiene pedidos asociados. Podes desactivarla.');
      } else {
        cargarDatos();
      }
    }
  }

  const styleTextoNegro = { color: '#000000' };

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-md border-2 border-gray-300 max-w-md w-full text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-2xl font-black mb-2" style={styleTextoNegro}>Acceso Administrador</h1>
          <p className="text-xs text-gray-600 font-bold mb-6">Ingresá la contraseña para gestionar la app.</p>

          <form onSubmit={verificarClave} className="space-y-4">
            <input
              type="password"
              style={styleTextoNegro}
              value={claveIngresada}
              onChange={(e) => setClaveIngresada(e.target.value)}
              placeholder="Ingresar Clave"
              className="w-full border-2 border-gray-400 p-3 rounded-lg text-center font-black text-lg focus:outline-none"
              autoFocus
            />

            {errorClave && (
              <p className="text-xs text-red-600 font-extrabold bg-red-50 p-2 rounded border border-red-200">
                ⚠️ Clave incorrecta.
              </p>
            )}

            <button type="submit" className="w-full bg-black text-white font-extrabold py-3 rounded-lg hover:bg-gray-800 transition-colors">
              Ingresar
            </button>
          </form>

          <div className="mt-6 border-t pt-4">
            <Link href="/" className="text-xs font-bold text-gray-600 hover:text-black">
              ⬅ Volver a Toma de Pedidos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans bg-gray-100 min-h-screen space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black" style={styleTextoNegro}>Panel de Administración</h1>
        <div className="flex gap-2">
          <button onClick={() => setAutenticado(false)} className="bg-gray-300 text-gray-800 text-sm px-3 py-2 rounded font-bold hover:bg-gray-400">
            🔒 Salir
          </button>
          <Link href="/" className="bg-black text-white text-sm px-4 py-2 rounded font-bold hover:bg-gray-800">
            ⬅ Toma de Pedidos
          </Link>
        </div>
      </div>

      {/* SECCIÓN 1: MENÚS Y STOCK */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300 space-y-6">
        <h2 className="text-xl font-bold" style={styleTextoNegro}>1. Gestión de Menús y Stock Hoy</h2>
        
        <form onSubmit={agregarMenu} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                    <div>
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
                        <h3 className="font-black text-lg" style={styleTextoNegro}>{m.nombre}</h3>
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
    </div>
  );
}