import { supabase } from '../lib/supabase';
import type { Hogar } from '../state/SesionProvider';
import type { Producto, ItemFaltante } from '../data/mock';
import type { Unidad, Categoria, Ubicacion } from '../data/catalogo';

export const isSupabaseConfigured = (): boolean => true;

/**
 * Resuelve el ID del hogar en Supabase por su código de invitación.
 */
export async function resolverHogarId(codigo: string): Promise<string | null> {
  const norm = codigo.trim().toUpperCase();
  const { data, error } = await supabase
    .from('hogares')
    .select('id')
    .eq('codigo_invitacion', norm)
    .maybeSingle();

  if (error) {
    console.warn('resolverHogarId error:', error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * NO requiere auth. Obtiene el hogar por código guardado localmente.
 */
export async function dbObtenerMiHogar(): Promise<Hogar | null> {
  // Sin auth, no podemos saber qué hogar es "del usuario"
  // Esta función retorna null; el provider usa el codigo guardado en AsyncStorage
  return null;
}

/**
 * Carga la despensa del hogar filtrada por hogar_id.
 */
export async function dbCargarDespensa(hogarId: string): Promise<{ productos: Producto[]; faltantes: ItemFaltante[] }> {
  const [resProd, resFalt] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, categoria, ubicacion, cantidad, unidad, fecha_compra, fecha_caducidad, notas')
      .eq('hogar_id', hogarId)
      .order('creado_en', { ascending: false }),
    supabase
      .from('faltantes')
      .select('id, nombre, cantidad, unidad, categoria, ubicacion')
      .eq('hogar_id', hogarId)
      .order('agregado_en', { ascending: false }),
  ]);

  if (resProd.error) console.warn('dbCargarDespensa productos error:', resProd.error.message);
  if (resFalt.error) console.warn('dbCargarDespensa faltantes error:', resFalt.error.message);

  const productos: Producto[] = (resProd.data || []).map((row) => ({
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

  const faltantes: ItemFaltante[] = (resFalt.data || []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    cantidad: Number(row.cantidad),
    unidad: row.unidad as Unidad,
    categoria: row.categoria ? (row.categoria as Categoria) : undefined,
    ubicacion: row.ubicacion ? (row.ubicacion as Ubicacion) : undefined,
  }));

  return { productos, faltantes };
}

export async function dbAgregarProducto(hogarId: string, p: Omit<Producto, 'id'>): Promise<string> {
  const { data, error } = await supabase
    .from('productos')
    .insert({
      hogar_id: hogarId,
      nombre: p.nombre,
      categoria: p.categoria,
      ubicacion: p.ubicacion,
      cantidad: p.cantidad,
      unidad: p.unidad,
      fecha_compra: p.fechaCompra,
      fecha_caducidad: p.fechaCaducidad,
      notas: p.notas,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Error al guardar el producto');
  }

  return data.id;
}

export async function dbActualizarProducto(id: string, p: Omit<Producto, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('productos')
    .update({
      nombre: p.nombre,
      categoria: p.categoria,
      ubicacion: p.ubicacion,
      cantidad: p.cantidad,
      unidad: p.unidad,
      fecha_compra: p.fechaCompra,
      fecha_caducidad: p.fechaCaducidad,
      notas: p.notas,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) console.warn('dbActualizarProducto error:', error.message);
}

export async function dbEliminarProducto(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) console.warn('dbEliminarProducto error:', error.message);
}

export async function dbAgregarFaltante(hogarId: string, f: Omit<ItemFaltante, 'id'>): Promise<string> {
  const { data, error } = await supabase
    .from('faltantes')
    .insert({
      hogar_id: hogarId,
      nombre: f.nombre,
      cantidad: f.cantidad,
      unidad: f.unidad,
      categoria: f.categoria || null,
      ubicacion: f.ubicacion || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Error al guardar faltante');
  }

  return data.id;
}

export async function dbEliminarFaltante(id: string): Promise<void> {
  const { error } = await supabase.from('faltantes').delete().eq('id', id);
  if (error) console.warn('dbEliminarFaltante error:', error.message);
}

export async function dbEliminarFaltantes(ids: string[]): Promise<void> {
  const { error } = await supabase.from('faltantes').delete().in('id', ids);
  if (error) console.warn('dbEliminarFaltantes error:', error.message);
}
