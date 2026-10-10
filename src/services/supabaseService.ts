import { supabase } from '../lib/supabase';
import type { Hogar } from '../state/SesionProvider';
import type { Producto, ItemFaltante } from '../data/mock';
import type { Unidad, Categoria, Ubicacion } from '../data/catalogo';

export const isSupabaseConfigured = (): boolean => true;

/**
 * Resuelve el ID del hogar en Supabase por su código.
 */
export async function resolverHogarId(codigo: string): Promise<string | null> {
  const norm = codigo.trim().toUpperCase();
  const { data, error } = await supabase
    .from('hogares')
    .select('id')
    .or(`codigo.eq.${norm},codigo_invitacion.eq.${norm}`)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Garantiza que el cliente tenga un auth.uid() anónimo válido y estable.
 */
export async function garantizarSesionAnonima(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: sesionData } = await supabase.auth.getSession();
    if (sesionData.session?.user?.id) {
      return sesionData.session.user.id;
    }

    const { data: signData, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('Advertencia en signInAnonymously:', error.message);
      return null;
    }
    return signData.user?.id ?? null;
  } catch (err) {
    console.warn('Error al garantizar sesión anónima:', err);
    return null;
  }
}

/**
 * RPC crear_hogar_con_auth: Crea el hogar y asigna al usuario como 'admin'.
 */
export async function dbCrearHogar(
  nombre: string,
  nombreMostrado: string,
  codigo?: string
): Promise<Hogar & { id: string; rol: 'admin' | 'miembro' }> {
  await garantizarSesionAnonima();

  const { data, error } = await supabase.rpc('crear_hogar_con_auth', {
    p_nombre: nombre.trim(),
    p_nombre_mostrado: nombreMostrado.trim() || 'Admin',
    p_codigo: codigo?.trim() || null,
  });

  if (error || !data) {
    throw new Error(error?.message || 'Error al crear el hogar en Supabase');
  }

  return {
    id: data.id,
    codigo: data.codigo_invitacion,
    nombre: data.nombre,
    clave: '',
    rol: data.rol,
    integrantes: [data.nombre_mostrado],
  };
}

/**
 * RPC unirse_hogar_con_auth: Valida el código en servidor y asigna al usuario como 'miembro'.
 */
export async function dbUnirseHogar(
  codigo: string,
  nombreMostrado: string
): Promise<Hogar & { id: string; rol: 'admin' | 'miembro' }> {
  await garantizarSesionAnonima();

  const { data, error } = await supabase.rpc('unirse_hogar_con_auth', {
    p_codigo: codigo.trim().toUpperCase(),
    p_nombre_mostrado: nombreMostrado.trim() || 'Miembro',
  });

  if (error || !data) {
    throw new Error(error?.message || 'Error al unirse al hogar');
  }

  // Obtener la lista completa de integrantes
  const hogarInfo = await dbObtenerMiHogar();

  return {
    id: data.id,
    codigo: data.codigo_invitacion,
    nombre: data.nombre,
    clave: '',
    rol: data.rol,
    integrantes: hogarInfo?.integrantes ?? [data.nombre_mostrado],
  };
}

/**
 * RPC obtener_mi_hogar: Obtiene los datos del hogar activo del auth.uid().
 */
export async function dbObtenerMiHogar(): Promise<(Hogar & { id: string; rol: 'admin' | 'miembro' }) | null> {
  const uid = await garantizarSesionAnonima();
  if (!uid) return null;

  const { data, error } = await supabase.rpc('obtener_mi_hogar');
  if (error || !data) return null;

  return {
    id: data.id,
    codigo: data.codigo_invitacion,
    nombre: data.nombre,
    clave: '',
    rol: data.rol,
    integrantes: Array.isArray(data.integrantes) ? data.integrantes : [],
  };
}

/**
 * Consulta la despensa filtrada automáticamente por las políticas RLS.
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
  await supabase
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
}

export async function dbEliminarProducto(id: string): Promise<void> {
  await supabase.from('productos').delete().eq('id', id);
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
  await supabase.from('faltantes').delete().eq('id', id);
}

export async function dbEliminarFaltantes(ids: string[]): Promise<void> {
  await supabase.from('faltantes').delete().in('id', ids);
}
