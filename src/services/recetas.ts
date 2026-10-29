import type { RespuestaRecetas } from './esquemaRecetas';
import { fetchAutenticado } from './auth';

// RF-08 / HU-04. Cliente de la ruta de servidor /api/recetas, que es la única
// que conoce la clave de Gemini. No se le manda nada: el servidor lee el
// inventario del hogar que viene firmado en el JWT.

export class ErrorRecetas extends Error {}

const MENSAJES: Record<string, string> = {
  'sin-clave': 'Las sugerencias todavía no están configuradas en el servidor.',
  'clave-invalida': 'La clave de las sugerencias no es válida. Avisa a quien administra la app.',
  'limite': 'Llegaste al límite de sugerencias por hoy. Intenta más tarde.',
  'despensa-vacia': 'Necesito al menos dos productos vigentes en tu despensa para sugerirte algo. Registra lo que tengas y vuelve.',
  'peticion-invalida': 'Las sugerencias no están configuradas correctamente. Avisa a quien administra la app.',
  'servicio': 'El servicio de sugerencias falló. Intenta de nuevo en un momento.',
  'ocupado': 'El servicio está ocupado. Espera unos segundos y vuelve a intentar.',
  'rechazo': 'No se pudieron armar recetas con esto. Intenta de nuevo en un momento.',
  'sin-resultado': 'No se pudieron armar recetas con esto. Intenta de nuevo en un momento.',
  'sin-conexion': 'No hay conexión con el servicio de sugerencias. Revisa tu internet.',
  'no-autorizado': 'Tu sesión venció. Vuelve a iniciar sesión para pedir recetas.',
  'sin-configurar': 'El servidor todavía no está configurado para sugerir recetas.',
  'tardo-demasiado': 'Las sugerencias tardaron demasiado. Intenta de nuevo; si sigue igual, registra menos productos a la vez.',
};

const GENERICO = 'No se pudieron sugerir recetas. Intenta de nuevo en un momento.';

/** Pide al servidor recetas hechas con el inventario del hogar. */
export async function sugerirRecetas(): Promise<RespuestaRecetas> {
  let respuesta: Response;
  try {
    respuesta = await fetchAutenticado('/api/recetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    throw new ErrorRecetas(MENSAJES['sin-conexion']);
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !datos || !Array.isArray(datos.recetas)) {
    throw new ErrorRecetas(MENSAJES[datos?.error] ?? GENERICO);
  }
  return datos as RespuestaRecetas;
}
