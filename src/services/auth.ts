import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Cliente de las rutas /api/auth/*.
// - JWT de acceso (15 min): solo en memoria; se renueva solo antes de vencer.
// - Refresh token (30 días, rotativo): en el llavero del teléfono
//   (SecureStore) o en localStorage en web. Cada uso devuelve uno nuevo.
// La contraseña nunca se guarda en el dispositivo.

export type HogarRemoto = { id: string; nombre: string; codigo: string; integrantes: string[] };
export type ResultadoAuth =
  | { ok: true; hogar: HogarRemoto; rol?: 'admin' | 'miembro' }
  | { ok: false; error: string; reintentarEn?: number };
type EstadoRefresco = { estado: 'ok'; hogar: HogarRemoto } | { estado: 'invalida' } | { estado: 'sin-conexion' };

const CLAVE_REFRESH = 'midespensa.refresh';
const MARGEN_MS = 60_000; // se renueva un minuto antes de que venza

let acceso: { token: string; venceEn: number } | null = null;
let refrescando: Promise<EstadoRefresco> | null = null;
const alPerder = new Set<() => void>();

const web = Platform.OS === 'web';

async function leerRefresh(): Promise<string | null> {
  try {
    return web ? await AsyncStorage.getItem(CLAVE_REFRESH) : await SecureStore.getItemAsync(CLAVE_REFRESH);
  } catch {
    return null;
  }
}

async function guardarRefresh(token: string | null) {
  try {
    if (web) {
      if (token) await AsyncStorage.setItem(CLAVE_REFRESH, token);
      else await AsyncStorage.removeItem(CLAVE_REFRESH);
    } else if (token) {
      await SecureStore.setItemAsync(CLAVE_REFRESH, token);
    } else {
      await SecureStore.deleteItemAsync(CLAVE_REFRESH);
    }
  } catch {
    // Sin almacenamiento: la sesión dura mientras la app esté abierta.
  }
}

type Tokens = { hogar: HogarRemoto; accessToken: string; expiraEnSeg: number; refreshToken: string; rol?: 'admin' | 'miembro' };

async function aceptarTokens(datos: Tokens) {
  acceso = { token: datos.accessToken, venceEn: Date.now() + datos.expiraEnSeg * 1000 - MARGEN_MS };
  await guardarRefresh(datos.refreshToken);
}

async function postJson(ruta: string, cuerpo: unknown) {
  const respuesta = await fetch(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => null);
  return { respuesta, datos };
}

async function autenticarCon(ruta: string, cuerpo: unknown): Promise<ResultadoAuth> {
  try {
    const { respuesta, datos } = await postJson(ruta, cuerpo);
    if (!respuesta.ok || !datos?.accessToken) {
      return { ok: false, error: datos?.error ?? 'sin-conexion', reintentarEn: datos?.reintentarEn };
    }
    await aceptarTokens(datos);
    return { ok: true, hogar: datos.hogar, rol: datos.rol };
  } catch {
    return { ok: false, error: 'sin-conexion' };
  }
}

export const apiCrearHogar = (nombre: string, clave: string) =>
  autenticarCon('/api/auth/crear-hogar', { nombre, clave });

export const apiIniciarSesion = (codigo: string, clave: string, integrante?: string) =>
  autenticarCon('/api/auth/iniciar-sesion', { codigo, clave, integrante: integrante ?? null });

async function refrescarUnaVez(token: string, reintento = false): Promise<EstadoRefresco> {
  let r: Awaited<ReturnType<typeof postJson>>;
  try {
    r = await postJson('/api/auth/refrescar', { refreshToken: token });
  } catch {
    return { estado: 'sin-conexion' };
  }
  if (r.respuesta.ok && r.datos?.accessToken) {
    await aceptarTokens(r.datos);
    return { estado: 'ok', hogar: r.datos.hogar };
  }
  if (r.respuesta.status === 409 && !reintento) {
    // Otra pestaña acaba de rotar el token: se usa el que dejó guardado.
    await new Promise((listo) => setTimeout(listo, 400));
    const otro = await leerRefresh();
    if (otro && otro !== token) return refrescarUnaVez(otro, true);
    return { estado: 'sin-conexion' };
  }
  if (r.respuesta.status === 401) {
    acceso = null;
    await guardarRefresh(null);
    alPerder.forEach((cb) => cb());
    return { estado: 'invalida' };
  }
  return { estado: 'sin-conexion' };
}

/** Pide un JWT nuevo con el refresh token. Una sola petición a la vez. */
export function refrescarSesion(): Promise<EstadoRefresco> {
  if (!refrescando) {
    refrescando = (async () => {
      const token = await leerRefresh();
      if (!token) return { estado: 'invalida' } as const;
      return refrescarUnaVez(token);
    })().finally(() => {
      refrescando = null;
    });
  }
  return refrescando;
}

export async function hayRefreshGuardado() {
  return (await leerRefresh()) !== null;
}

export async function cerrarSesionRemota() {
  const token = await leerRefresh();
  acceso = null;
  await guardarRefresh(null);
  if (token) await postJson('/api/auth/cerrar-sesion', { refreshToken: token }).catch(() => {});
}

/** Se llama cuando la sesión se revoca o vence (para volver a la bienvenida). */
export function alPerderSesion(cb: () => void) {
  alPerder.add(cb);
  return () => {
    alPerder.delete(cb);
  };
}

/** fetch con Authorization: Bearer <jwt>; renueva el token si hace falta. */
export async function fetchAutenticado(url: string, init: RequestInit = {}): Promise<Response> {
  if (!acceso || Date.now() >= acceso.venceEn) await refrescarSesion();
  const conToken = () =>
    fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), ...(acceso ? { Authorization: `Bearer ${acceso.token}` } : {}) },
    });
  const respuesta = await conToken();
  if (respuesta.status !== 401) return respuesta;
  const r = await refrescarSesion();
  return r.estado === 'ok' ? conToken() : respuesta;
}
