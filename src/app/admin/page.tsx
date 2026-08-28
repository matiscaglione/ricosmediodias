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
  const [guarniciones, setGuarniciones] = useState<Guarnicion[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [salsas, setSalsas] = useState<Salsa[]>([]);
  const [zonas, setZonas] = useState<ZonaEnvio[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  // Form Menú
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoEsFijo, setNuevoEsFijo] = useState(true);
  const [nuevoLlevaGuarnicion, setNuevoLlevaGuarnicion] = useState(false);
  const [nuevoRequiereSalsa, setNuevoRequiereSalsa] = useState(false);

  // Forms secundarios
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

  // --- MENÚS ---
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

  // --- GUARNICIONES ---
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

  // --- INGREDIENTES ENSALADA ---
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

  // --- SALSAS ---
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

  // --- ZONAS ---
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
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>1. Gestión de Menús y Stock Hoy</h2>
        
        <form onSubmit={agregarMenu} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1" style={styleTextoNegro}>Nombre del plato</label>
            <input
              type="text"
              style={styleTextoNegro}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Canelones de Verdura / Ñoquis"
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
            + Agregar
          </button>
        </form>

        <table className="w-full text-left border-collapse border border-gray-300">
          <thead>
            <tr className="border-b bg-gray-200 text-xs">
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Nombre</th>
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Opciones</th>
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Precio</th>
              <th className="p-3 font-extrabold" style={styleTextoNegro}>Stock Hoy</th>
              <th className="p-3 text-center font-extrabold" style={styleTextoNegro}>Estado</th>
              <th className="p-3 text-center font-extrabold" style={styleTextoNegro}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((m) => (
              <tr key={m.id} className="border-b text-sm hover:bg-gray-50">
                <td className="p-3 font-extrabold" style={styleTextoNegro}>{m.nombre}</td>
                <td className="p-3 space-x-1">
                  {m.lleva_guarnicion && <span className="text-xs bg-green-100 text-green-900 px-2 py-0.5 rounded font-extrabold">Guarnición</span>}
                  {m.requiere_salsa && <span className="text-xs bg-red-100 text-red-900 px-2 py-0.5 rounded font-extrabold">🍝 Salsa</span>}
                </td>
                <td className="p-3 font-extrabold" style={styleTextoNegro}>${m.precio.toLocaleString('es-AR')}</td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    style={styleTextoNegro}
                    value={stockMap[m.id] ?? ''}
                    onChange={(e) => guardarStock(m.id, parseInt(e.target.value) || 0)}
                    placeholder="Cant."
                    className="w-20 border-2 border-gray-400 p-1 rounded text-center font-bold"
                  />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => toggleActivoMenu(m.id, m.activo)} className={`text-xs px-2 py-1 rounded font-bold ${m.activo ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-800'}`}>
                    {m.activo ? 'Activo' : 'Oculto'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => eliminarMenu(m.id)} className="text-red-600 hover:text-red-800 text-xs font-bold">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN NUEVA: SALSAS DISPONIBLES */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>2. Gestión de Salsas (Pastas/Crepes)</h2>

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

      {/* SECCIÓN 5: ZONAS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
        <h2 className="text-xl font-bold mb-4" style={styleTextoNegro}>5. Zonas de Envío</h2>
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