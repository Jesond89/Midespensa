import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ResultadoEscaneo } from './esquemaEscaneo';
import { fetchAutenticado } from './auth';

// Escaneo de compras desde la app: recorta y reduce la foto (a 1024 px por lado
// y a lo más 4:3, para que Gemini cobre los menos tokens posibles por imagen sin
// que dejen de leerse las etiquetas; así también se envía rápido) y la manda a la
// ruta de servidor /api/reconocer, que es la única que conoce la clave.

const LADO_MAX = 1024;
// Con los dos lados <= 384 px Gemini cobra 258 tokens fijos: ahí no hay mosaicos que ahorrar.
const LADO_MIN_MOSAICOS = 384;

export class ErrorEscaneo extends Error {}

const MENSAJES: Record<string, string> = {
  'sin-clave': 'El escaneo todavía no está configurado en el servidor. Mientras, agrégalos a mano.',
  'clave-invalida': 'La clave del escaneo no es válida. Mientras, agrégalos a mano.',
  'limite': 'Llegaste al límite de escaneos por ahora. Intenta más tarde o agrégalos a mano.',
  'demasiados-productos': 'Se vieron demasiados productos en una sola foto. Toma dos fotos con menos cosas.',
  'peticion-invalida': 'El escaneo no esta configurado correctamente. Avisa a quien administra la app.',
  'servicio': 'El servicio de escaneo falló. Intenta de nuevo en un momento.',
  'ocupado': 'El escaneo está ocupado. Espera unos segundos y vuelve a intentar.',
  'imagen-grande': 'La foto es demasiado pesada. Intenta con otra.',
  'imagen-invalida': 'No se pudo leer la foto. Intenta con otra.',
  'rechazo': 'No se pudo analizar esta foto. Intenta con otra o agrégalos a mano.',
  'sin-conexion': 'No hay conexión con el servicio de escaneo. Revisa tu internet.',
  'no-autorizado': 'Tu sesión venció. Vuelve a iniciar sesión para escanear.',
  'sin-configurar': 'El servidor todavía no está configurado. Mientras, agrégalos a mano.',
};
const GENERICO = 'No se pudo analizar la foto. Intenta de nuevo o agrégalos a mano.';

/**
 * Caja centrada que deja la foto en 4 mosaicos, lo más barato que cobra Gemini
 * arriba de 384 px. Gemini la parte en mosaicos de `floor(lado menor / 1.5)` px y
 * cobra 258 tokens por cada uno de los `ceil(ancho/u) * ceil(alto/u)`; como la
 * unidad se mide contra la propia imagen, el costo sale de la PROPORCIÓN y no de
 * la resolución:
 *   1:1 y 4:3 (o 3:4)  ->  2x2 = 4 mosaicos = 1032 tokens (ya es el mínimo)
 *   3:2 y 16:9         ->  3x2 = 6 mosaicos = 1548 tokens -> recortar ahorra 2 (516 tokens, -33%)
 *   2:1 (panorámica)   ->  4x2 = 8 mosaicos = 2064 tokens -> recortar ahorra 4 (1032 tokens, -50%)
 * Devuelve null cuando la foto ya cabe en 4 mosaicos (4:3, 1:1, 3:4...): ahí no se
 * recorta nada y se manda completa.
 */
function cajaCentrada(ancho: number, alto: number) {
  if (Math.max(ancho, alto) <= LADO_MIN_MOSAICOS) return null;
  const horizontal = ancho >= alto;
  const largo = horizontal ? ancho : alto;
  const corto = horizontal ? alto : ancho;
  // Dos mosaicos de largo es el límite de los 4; si ya cabe, se deja tal cual.
  if (largo <= 2 * Math.floor(corto / 1.5)) return null;
  // Caja 4:3 exacta: el lado corto baja al múltiplo de 3 más cercano (pierde 0-2 px)
  // para que el largo salga entero y el reescalado de abajo no deforme la foto.
  const cortoCaja = corto - (corto % 3);
  const largoCaja = (cortoCaja / 3) * 4;
  const anchoCaja = horizontal ? largoCaja : cortoCaja;
  const altoCaja = horizontal ? cortoCaja : largoCaja;
  return {
    horizontal,
    largoCaja,
    rect: {
      originX: Math.floor((ancho - anchoCaja) / 2),
      originY: Math.floor((alto - altoCaja) / 2),
      width: anchoCaja,
      height: altoCaja,
    },
  };
}

/** Recorta la foto a 4:3 como máximo, la reduce y la convierte a JPEG en base64. */
export async function prepararFoto(uri: string, ancho: number, alto: number) {
  const contexto = ImageManipulator.manipulate(uri);
  const caja = cajaCentrada(ancho, alto);
  if (caja) {
    contexto.crop(caja.rect);
    // Ya quedó en 4:3 exacto, así que se pueden fijar los dos lados sin deformarla.
    if (caja.largoCaja > LADO_MAX) {
      const ladoCorto = (LADO_MAX / 4) * 3;
      contexto.resize(caja.horizontal ? { width: LADO_MAX, height: ladoCorto } : { width: ladoCorto, height: LADO_MAX });
    }
  } else if (Math.max(ancho, alto) > LADO_MAX) {
    // Sin recorte la proporción ya es 4:3 o más cuadrada, y al bajar el lado largo
    // a 1024 el corto queda en 768 o más, o sea que sigue costando 4 mosaicos.
    contexto.resize(ancho >= alto ? { width: LADO_MAX, height: null } : { width: null, height: LADO_MAX });
  }
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  if (!resultado.base64) throw new ErrorEscaneo('No se pudo preparar la foto.');
  return { uri: resultado.uri, base64: resultado.base64 };
}

/** Pide al servidor los productos que se ven en la foto. */
export async function reconocerProductos(base64: string): Promise<ResultadoEscaneo> {
  let respuesta: Response;
  try {
    respuesta = await fetchAutenticado('/api/reconocer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
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
