import { createHash, randomBytes } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { ErrorConfiguracion, firmarAcceso, verificarAcceso, type ClaimsAcceso } from './jwt';

// Lógica compartida por las rutas /api/auth/*. Las contraseñas nunca se
// comparan aquí: viajan por HTTPS a funciones de Postgres que las verifican
// con bcrypt. Este servidor solo emite el JWT de acceso (15 min) y el
// refresh token opaco (30 días, rotativo), del que la base guarda el SHA-256.

export type HogarSesion = { id: string; nombre: string; codigo: string; integrantes: string[] };
type RespuestaRpc =
  | { ok: true; hogar: HogarSesion }
  | { ok: false; error: string; reintentar_en?: number };

const ESTADOS: Record<string, number> = {
  'solicitud-invalida': 400,
  nombre: 400,
  'clave-debil': 400,
  clave: 401,
  invalido: 401,
  reutilizado: 401,
  concurrente: 409,
  codigo: 404,
  bloqueado: 429,
  'demasiados-intentos': 429,
  'sin-conexion': 502,
  'sin-configurar': 503,
};

const SIN_CACHE = { 'Cache-Control': 'no-store' };

export function error(codigo: string, extra?: Record<string, unknown>) {
  return Response.json({ error: codigo, ...extra }, { status: ESTADOS[codigo] ?? 400, headers: SIN_CACHE });
}

export function nuevoRefresh() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefresh(token) };
}

export const hashRefresh = (token: string) => createHash('sha256').update(token).digest('hex');

/** Llama a una función de auth en Postgres y convierte la respuesta. */
export async function rpc(nombre: string, params: Record<string, unknown>): Promise<RespuestaRpc> {
  const { data, error: e } = await supabase.rpc(nombre, params);
  if (e?.code === 'PGRST202') {
    throw new ErrorConfiguracion(`Falta la función ${nombre}: ejecuta supabase/migrations/001_seguridad_auth.sql en el SQL Editor de Supabase.`);
  }
  if (e || !data || typeof data !== 'object') {
    console.warn(`rpc ${nombre}:`, e?.message);
    throw new Error('sin-conexion');
  }
  return data as RespuestaRpc;
}

/** Respuesta con el par de tokens recién emitido. */
export function sesionEmitida(hogar: HogarSesion, refreshToken: string, extra?: Record<string, unknown>) {
  const acceso = firmarAcceso(hogar.id, hogar.codigo);
  return Response.json(
    {
      hogar: { ...hogar, integrantes: Array.isArray(hogar.integrantes) ? hogar.integrantes : [] },
      accessToken: acceso.token,
      expiraEnSeg: acceso.expiraEnSeg,
      refreshToken,
      ...extra,
    },
    { headers: SIN_CACHE }
  );
}

/** Envuelve una ruta para responder bien a errores de configuración o de red. */
export function manejar(ruta: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await ruta(request);
    } catch (e) {
      if (e instanceof ErrorConfiguracion) {
        console.error(e.message);
        return error('sin-configurar');
      }
      if (e instanceof Error && e.message === 'sin-conexion') return error('sin-conexion');
      console.error('auth:', e);
      return error('sin-conexion');
    }
  };
}

export async function leerJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo = await request.json();
    return cuerpo && typeof cuerpo === 'object' ? cuerpo : null;
  } catch {
    return null;
  }
}

export const texto = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : null);

// Límite por IP para las rutas que verifican contraseñas (además del bloqueo
// por hogar que lleva la base). En memoria: suficiente para un solo servidor.
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 10;
const intentos = new Map<string, { inicio: number; cuenta: number }>();

export function excedeLimite(request: Request, ruta: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const clave = `${ruta}:${ip}`;
  const ahora = Date.now();
  const actual = intentos.get(clave);
  if (!actual || ahora - actual.inicio > VENTANA_MS) {
    intentos.set(clave, { inicio: ahora, cuenta: 1 });
    if (intentos.size > 5000) {
      for (const [k, v] of intentos) if (ahora - v.inicio > VENTANA_MS) intentos.delete(k);
    }
    return false;
  }
  actual.cuenta += 1;
  return actual.cuenta > MAX_POR_VENTANA;
}

/** Valida el encabezado Authorization: Bearer <jwt>. */
export function autenticar(request: Request): ClaimsAcceso | null {
  const encabezado = request.headers.get('authorization') ?? '';
  const [tipo, token] = encabezado.split(' ');
  if (tipo !== 'Bearer' || !token) return null;
  return verificarAcceso(token);
}
