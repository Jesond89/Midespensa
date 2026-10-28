import { fetchAutenticado } from './auth';
import type { Hogar } from '../state/SesionProvider';
import type { Producto, ItemFaltante } from '../data/mock';
import type { Unidad, Categoria, Ubicacion } from '../data/catalogo';

// La app YA NO habla directo con Supabase: todo pasa por /api/datos, que
// valida el JWT y saca el hogar_id del token. Por eso ninguna funcion de
// aqui manda el hogar_id: aunque lo mandara, el servidor lo ignora.
// El parametro hogarId se conserva solo para no cambiar las llamadas
// existentes en HogarProvider.

export const isSupabaseConfigured = (): boolean => true;

type FilaProducto = {
  id: string; nombre: string; categoria: string; ubicacion: string;
  cantidad: number | string; unidad: string;
  fecha_compra: string; fecha_caducidad: string | null; notas: string | null;
};
type FilaFaltante = {
  id: string; nombre: string; cantidad: number | string; unidad: string;
  categoria: string | null; ubicacion: string | null;
};

async function pedir<T>(cuerpo: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetchAutenticado('/api/datos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    if (!r.ok) {
      console.warn('api/datos', cuerpo.accion, r.status);
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    console.warn('api/datos sin conexion:', e);
    return null;
  }
}

/** Id del hogar de la sesion actual (lo resuelve el servidor desde el token). */
export async function resolverHogarId(_codigo?: string): Promise<string | null> {
  const r = await pedir<{ id: string }>({ accion: 'hogar' });
  return r?.id ?? null;
}

/** El hogar llega con la sesion (SesionProvider); aqui no hace falta pedirlo. */
export async function dbObtenerMiHogar(): Promise<Hogar | null> {
  return null;
}

/** Carga la despensa del hogar de la sesion. */
export async function dbCargarDespensa(_hogarId?: string): Promise<{ productos: Producto[]; faltantes: ItemFaltante[] }> {
  const r = await pedir<{ productos: FilaProducto[]; faltantes: FilaFaltante[] }>({ accion: 'cargar' });
  if (!r) return { productos: [], faltantes: [] };

  const productos: Producto[] = (r.productos || []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria as Categoria,
    ubicacion: row.ubicacion as Ubicacion,
    cantidad: Number(row.cantidad),
    unidad: row.unidad as Unidad,
    fechaCompra: row.fecha_compra,
    fechaCaducidad: row.fecha_caducidad,
    notas: row.notas || '',
  }));

  const faltantes: ItemFaltante[] = (r.faltantes || []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    cantidad: Number(row.cantidad),
    unidad: row.unidad as Unidad,
    categoria: row.categoria ? (row.categoria as Categoria) : undefined,
    ubicacion: row.ubicacion ? (row.ubicacion as Ubicacion) : undefined,
  }));

  return { productos, faltantes };
}

export async function dbAgregarProducto(_hogarId: string, p: Omit<Producto, 'id'>): Promise<string> {
  const r = await pedir<{ id: string }>({ accion: 'agregarProducto', producto: p });
  if (!r?.id) throw new Error('Error al guardar el producto');
  return r.id;
}

export async function dbActualizarProducto(id: string, p: Omit<Producto, 'id'>): Promise<void> {
  await pedir({ accion: 'actualizarProducto', id, producto: p });
}

export async function dbEliminarProducto(id: string): Promise<void> {
  await pedir({ accion: 'eliminarProducto', id });
}

export async function dbAgregarFaltante(_hogarId: string, f: Omit<ItemFaltante, 'id'>): Promise<string> {
  const r = await pedir<{ id: string }>({ accion: 'agregarFaltante', faltante: f });
  if (!r?.id) throw new Error('Error al guardar faltante');
  return r.id;
}

export async function dbEliminarFaltante(id: string): Promise<void> {
  await pedir({ accion: 'eliminarFaltantes', ids: [id] });
}

export async function dbEliminarFaltantes(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await pedir({ accion: 'eliminarFaltantes', ids });
}
