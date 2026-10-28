import { z } from 'zod';
import { autenticar } from '../../src/server/auth';
import { admin } from '../../src/server/supabaseAdmin';
import { ErrorConfiguracion } from '../../src/server/jwt';
import { CATEGORIAS, UBICACIONES, UNIDADES } from '../../src/data/catalogo';

// POST /api/datos — unica puerta a la despensa. El cliente ya no habla con
// Supabase: manda su JWT de acceso y el servidor saca de ahi el hogar_id.
// Asi un hogar no puede leer ni tocar los datos de otro aunque lo intente,
// porque el id nunca viene del cuerpo de la peticion.

const categorias = CATEGORIAS.map((c) => c.nombre) as [string, ...string[]];
const ubicaciones = UBICACIONES.map((u) => u.nombre) as [string, ...string[]];

const Fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Producto = z.object({
  nombre: z.string().trim().min(1).max(120),
  categoria: z.enum(categorias),
  ubicacion: z.enum(ubicaciones),
  cantidad: z.number().finite().min(0).max(100000),
  unidad: z.enum(UNIDADES),
  fechaCompra: Fecha,
  fechaCaducidad: Fecha.nullable().optional(),
  notas: z.string().max(500).optional(),
});
const Faltante = z.object({
  nombre: z.string().trim().min(1).max(120),
  cantidad: z.number().finite().min(0).max(100000),
  unidad: z.enum(UNIDADES),
  categoria: z.enum(categorias).nullish(),
  ubicacion: z.enum(ubicaciones).nullish(),
});
const Id = z.string().min(1).max(64);

const Peticion = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('hogar') }),
  z.object({ accion: z.literal('cargar') }),
  z.object({ accion: z.literal('agregarProducto'), producto: Producto }),
  z.object({ accion: z.literal('actualizarProducto'), id: Id, producto: Producto }),
  z.object({ accion: z.literal('eliminarProducto'), id: Id }),
  z.object({ accion: z.literal('agregarFaltante'), faltante: Faltante }),
  z.object({ accion: z.literal('eliminarFaltantes'), ids: z.array(Id).min(1).max(200) }),
]);

const error = (codigo: string, status: number) => Response.json({ error: codigo }, { status });

const filaProducto = (hogarId: string, p: z.infer<typeof Producto>) => ({
  hogar_id: hogarId,
  nombre: p.nombre,
  categoria: p.categoria,
  ubicacion: p.ubicacion,
  cantidad: p.cantidad,
  unidad: p.unidad,
  fecha_compra: p.fechaCompra,
  fecha_caducidad: p.fechaCaducidad ?? null,
  notas: p.notas ?? '',
});

export async function POST(request: Request) {
  let hogarId: string;
  try {
    const sesion = autenticar(request);
    if (!sesion) return error('no-autorizado', 401);
    hogarId = sesion.sub;
  } catch {
    return error('sin-configurar', 503);
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return error('solicitud-invalida', 400);
  }
  const p = Peticion.safeParse(cuerpo);
  if (!p.success) return error('solicitud-invalida', 400);
  const datos = p.data;

  try {
    const db = admin();

    switch (datos.accion) {
      case 'hogar':
        return Response.json({ id: hogarId });

      case 'cargar': {
        const [prod, falt] = await Promise.all([
          db.from('productos')
            .select('id, nombre, categoria, ubicacion, cantidad, unidad, fecha_compra, fecha_caducidad, notas')
            .eq('hogar_id', hogarId)
            .order('creado_en', { ascending: false }),
          db.from('faltantes')
            .select('id, nombre, cantidad, unidad, categoria, ubicacion')
            .eq('hogar_id', hogarId)
            .order('agregado_en', { ascending: false }),
        ]);
        if (prod.error || falt.error) return error('sin-conexion', 502);
        return Response.json({ productos: prod.data ?? [], faltantes: falt.data ?? [] });
      }

      case 'agregarProducto': {
        const { data, error: e } = await db
          .from('productos')
          .insert(filaProducto(hogarId, datos.producto))
          .select('id')
          .single();
        if (e || !data) return error('sin-conexion', 502);
        return Response.json({ id: (data as { id: string }).id });
      }

      case 'actualizarProducto': {
        const { hogar_id: _omitido, ...campos } = filaProducto(hogarId, datos.producto);
        // El .eq de hogar_id impide editar el producto de otro hogar.
        const { error: e } = await db
          .from('productos')
          .update({ ...campos, actualizado_en: new Date().toISOString() })
          .eq('id', datos.id)
          .eq('hogar_id', hogarId);
        if (e) return error('sin-conexion', 502);
        return Response.json({ ok: true });
      }

      case 'eliminarProducto': {
        const { error: e } = await db
          .from('productos')
          .delete()
          .eq('id', datos.id)
          .eq('hogar_id', hogarId);
        if (e) return error('sin-conexion', 502);
        return Response.json({ ok: true });
      }

      case 'agregarFaltante': {
        const f = datos.faltante;
        const { data, error: e } = await db
          .from('faltantes')
          .insert({
            hogar_id: hogarId,
            nombre: f.nombre,
            cantidad: f.cantidad,
            unidad: f.unidad,
            categoria: f.categoria ?? null,
            ubicacion: f.ubicacion ?? null,
          })
          .select('id')
          .single();
        if (e || !data) return error('sin-conexion', 502);
        return Response.json({ id: (data as { id: string }).id });
      }

      case 'eliminarFaltantes': {
        const { error: e } = await db
          .from('faltantes')
          .delete()
          .in('id', datos.ids)
          .eq('hogar_id', hogarId);
        if (e) return error('sin-conexion', 502);
        return Response.json({ ok: true });
      }
    }
  } catch (e) {
    if (e instanceof ErrorConfiguracion) {
      console.error(e.message);
      return error('sin-configurar', 503);
    }
    console.error('datos:', e);
    return error('sin-conexion', 502);
  }
}
