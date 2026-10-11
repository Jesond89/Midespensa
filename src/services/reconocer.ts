import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ResultadoEscaneo } from './esquemaEscaneo';
import { fetchAutenticado } from './auth';

// Escaneo de compras desde la app: reduce la foto (el modelo no gana nada
// con más de ~1568 px por lado y así se envía rápido) y la manda a la ruta
// de servidor /api/reconocer, que es la única que conoce la clave.

const LADO_MAX = 1568;

export class ErrorEscaneo extends Error {}

const MENSAJES: Record<string, string> = {
  'sin-clave': 'El escaneo todavía no está configurado en el servidor. Mientras, agrégalos a mano.',
  'clave-invalida': 'La clave del escaneo no es válida. Mientras, agrégalos a mano.',
  'ocupado': 'El escaneo está ocupado. Espera unos segundos y vuelve a intentar.',
  'imagen-grande': 'La foto es demasiado pesada. Intenta con otra.',
  'imagen-invalida': 'No se pudo leer la foto. Intenta con otra.',
  'rechazo': 'No se pudo analizar esta foto. Intenta con otra o agrégalos a mano.',
  'sin-conexion': 'No hay conexión con el servicio de escaneo. Revisa tu internet.',
  'no-autorizado': 'Tu sesión venció. Vuelve a iniciar sesión para escanear.',
  'sin-configurar': 'El servidor todavía no está configurado. Mientras, agrégalos a mano.',
};
const GENERICO = 'No se pudo analizar la foto. Intenta de nuevo o agrégalos a mano.';

/** Reduce la foto y la convierte a JPEG en base64. */
export async function prepararFoto(uri: string, ancho: number, alto: number) {
  const contexto = ImageManipulator.manipulate(uri);
  if (Math.max(ancho, alto) > LADO_MAX) {
    contexto.resize(ancho >= alto ? { width: LADO_MAX, height: null } : { width: null, height: LADO_MAX });
  }
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!resultado.base64) throw new ErrorEscaneo('No se pudo preparar la foto.');
  return { uri: resultado.uri, base64: resultado.base64 };
}

/** Pide al servidor los productos que se ven en la foto. */
export async function reconocerProductos(base64: string): Promise<ResultadoEscaneo> {
  let respuesta: Response;
  try {
    respuesta = await fetchAutenticado('/api/reconocer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagen: base64, tipo: 'image/jpeg' }),
    });
  } catch {
    throw new ErrorEscaneo(MENSAJES['sin-conexion']);
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !datos || !Array.isArray(datos.productos)) {
    throw new ErrorEscaneo(MENSAJES[datos?.error] ?? GENERICO);
  }
  return datos as ResultadoEscaneo;
}
