import { z } from 'zod';
import { EsquemaEscaneo } from '../../src/services/esquemaEscaneo';
import { autenticar } from '../../src/server/auth';
import { consumirUsoIa } from '../../src/server/limite';
import { CATEGORIAS, UBICACIONES, UNIDADES } from '../../src/data/catalogo';

// POST /api/reconocer — recibe una foto de las compras o de la alacena y
// devuelve la lista de productos que se ven, para que el usuario la revise
// antes de guardarla. Corre SOLO en el servidor: la clave de Gemini
// (GEMINI_API_KEY) se lee de process.env, no lleva prefijo EXPO_PUBLIC_,
// nunca se envía al teléfono ni se escribe en logs ni en respuestas.

// gemini-2.5-flash-lite fue retirado para cuentas nuevas (404). Si Google
// vuelve a cambiar el catalogo, basta con poner GEMINI_MODEL en el entorno.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// Interactions API: es donde Google documenta hoy la salida estructurada.
// generateContent sigue soportado pero su responseJsonSchema ya no funciona
// con los modelos 3.x (devolvia 400 INVALID_ARGUMENT sin detalle).
const URL_API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const TIPOS = ['image/jpeg'] as const; // la app siempre manda JPEG reducido
type TipoImagen = (typeof TIPOS)[number];
// Un JPEG de 1024 px a calidad 0.6 pesa ~200-400 KB; 900 KB deja margen y corta abusos.
const MAX_BYTES = 900 * 1024;
const MAX_SALIDA_TOKENS = 8192;

// Acceso: solo hogares con sesión iniciada (JWT de acceso vigente, emitido por
// /api/auth/*). El token prueba a qué hogar pertenece quien escanea, así que
// aquí no hace falta preguntarle a Supabase quién es. Además hay un límite
// diario por hogar, que ahora cuenta Postgres (src/server/limite.ts): el Map
// en memoria que lo llevaba antes volvía a cero en cada despliegue de Railway,
// o sea que cada despliegue le regalaba otro cupo completo a cada hogar.

const INSTRUCCIONES = `Inventario de despensa (México). Foto de compras, alacena o refri. Lista cada producto distinto de comida o bebida visible; ignora todo lo demás.
- Agrupa idénticos: "cantidad" = cuántos, "unidad" = cómo se cuenta (pieza, paquete, lata, frasco, manojo, docena); kg/g/L/ml solo si es un envase y se lee el contenido.
- Nombre común en español de México; añade marca y presentación si se leen.
- "ubicacion": dónde se guarda normalmente.
Usa EXACTAMENTE estos valores, tal cual, con sus acentos y mayúsculas:
unidad: ${UNIDADES.join(' | ')}
categoria: ${CATEGORIAS.map((c) => c.nombre).join(' | ')}
ubicacion: ${UBICACIONES.map((u) => u.nombre).join(' | ')}
confianza: alta | media | baja
- "dias_caducidad": estimado sin abrir desde hoy, null si no caduca; si se lee fecha en el empaque, úsala.
- "confianza" baja si está tapado o dudoso; no inventes productos.
Si la foto no sirve, lista vacía y en "aviso" cómo tomarla mejor.`;

// Esquema JSON que Gemini debe respetar (se genera desde el mismo zod que valida la respuesta).
const { $schema: _omitido, ...ESQUEMA_BRUTO } = z.toJSONSchema(EsquemaEscaneo) as Record<string, unknown>;

// Gemini rechaza el esquema con "constraint that has too many states for
// serving" y senala los limites de longitud de arreglos anidados. Se quita
// maxItems del esquema que viaja; zod lo sigue aplicando al validar.
const ESQUEMA_JSON = JSON.parse(
  JSON.stringify(ESQUEMA_BRUTO, (llave, valor) => (llave === 'maxItems' || llave === 'minItems' ? undefined : valor))
) as Record<string, unknown>;

// Red de seguridad: si el esquema no llega a aplicarse, el modelo escribe
// variantes ("piezas", "abarrotes", "Lacteos"). Se acercan al valor valido
// mas parecido comparando sin acentos ni mayusculas, y en singular.
const sinAcentos = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const singular = (v: string) => v.replace(/e?s$/, '');

function acercar<T extends string>(valor: unknown, validos: readonly T[], porDefecto: T): T {
  if (typeof valor !== 'string') return porDefecto;
  const exacto = validos.find((v) => v === valor);
  if (exacto) return exacto;
  const objetivo = sinAcentos(valor);
  const laxo = validos.find((v) => sinAcentos(v) === objetivo);
  if (laxo) return laxo;
  const raiz = singular(objetivo);
  const porRaiz = validos.find((v) => singular(sinAcentos(v)) === raiz);
  return porRaiz ?? porDefecto;
}

const NOMBRES_CATEGORIA = CATEGORIAS.map((c) => c.nombre);
const NOMBRES_UBICACION = UBICACIONES.map((u) => u.nombre);

/** Normaliza los campos de catalogo antes de validar con zod. */
function normalizar(json: unknown) {
  if (!json || typeof json !== 'object') return json;
  const datos = json as { productos?: unknown };
  if (!Array.isArray(datos.productos)) return json;
  let ajustados = 0;
  datos.productos = datos.productos.map((p) => {
    if (!p || typeof p !== 'object') return p;
    const prod = p as Record<string, unknown>;
    const antes = `${prod.unidad}|${prod.categoria}|${prod.ubicacion}|${prod.confianza}`;
    const limpio = {
      ...prod,
      unidad: acercar(prod.unidad, UNIDADES, 'pieza'),
      categoria: acercar(prod.categoria, NOMBRES_CATEGORIA, 'Otros'),
      ubicacion: acercar(prod.ubicacion, NOMBRES_UBICACION, 'Alacena'),
      confianza: acercar(prod.confianza, ['alta', 'media', 'baja'] as const, 'media'),
    };
    if (`${limpio.unidad}|${limpio.categoria}|${limpio.ubicacion}|${limpio.confianza}` !== antes) ajustados += 1;
    return limpio;
  });
  if (ajustados) console.warn(`[reconocer] ${ajustados} producto(s) con valores fuera de catalogo, ajustados`);
  return datos;
}

function error(codigo: string, status: number) {
  return Response.json({ error: codigo }, { status });
}

export async function POST(request: Request) {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return error('sin-clave', 503);

  let hogarId: string;
  try {
    const sesion = autenticar(request);
    if (!sesion) return error('no-autorizado', 401);
    hogarId = sesion.sub;
  } catch {
    return error('sin-configurar', 503);
  }

  // Rechaza cuerpos enormes antes de leerlos (base64 pesa ~1.37x el archivo).
  const largo = Number(request.headers.get('content-length') ?? 0);
  if (largo > MAX_BYTES * 1.4 + 1024) return error('imagen-grande', 413);

  let imagen: unknown;
  let tipo: unknown;
  try {
    ({ imagen, tipo } = await request.json());
  } catch {
    return error('solicitud-invalida', 400);
  }
  if (typeof imagen !== 'string' || !imagen || !TIPOS.includes(tipo as TipoImagen)) return error('solicitud-invalida', 400);
  if (imagen.length * 0.75 > MAX_BYTES) return error('imagen-grande', 413);

  // El uso se cuenta hasta aquí: una foto que se iba a rechazar por tamaño o
  // por formato no debe gastarle al hogar uno de sus escaneos del día.
  const bloqueo = await consumirUsoIa(hogarId, 'escaneo');
  if (bloqueo) return error(bloqueo.codigo, bloqueo.status);

  // Las instrucciones van como primer texto del input en vez de
  // system_instruction: la referencia lo documenta dentro de agent_config y no
  // en el cuerpo de la peticion, asi que esta forma evita otro INVALID_ARGUMENT.
  const cuerpoBase = {
    model: MODELO,
    input: [
      { type: 'image', mime_type: tipo, data: imagen },
      { type: 'text', text: `${INSTRUCCIONES}\n\nRegistra los productos de esta foto.` },
    ],
    generation_config: {
      max_output_tokens: MAX_SALIDA_TOKENS,
      thinking_level: 'minimal', // menos tokens de salida
    },
  };

  const llamar = (conEsquema: boolean) =>
    fetch(URL_API, {
      method: 'POST',
      // La clave va en el header, no en la URL, para que no quede en logs de proxies.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify(
        conEsquema
          ? { ...cuerpoBase, response_format: { type: 'text', mime_type: 'application/json', schema: ESQUEMA_JSON } }
          : cuerpoBase
      ),
    });

  // Primero con esquema. Si lo rechaza (un esquema grande puede dar 400), se
  // reintenta sin el: el prompt ya pide JSON y zod valida igual al final.
  let respuesta: Response;
  let conEsquema = true;
  try {
    respuesta = await llamar(true);
    if (respuesta.status === 400) {
      const detalle = await respuesta.text().catch(() => '');
      console.warn('[reconocer] 400 con response_format, reintentando sin esquema:', detalle.slice(0, 400));
      conEsquema = false;
      respuesta = await llamar(false);
    }
  } catch (e) {
    console.error('[reconocer] no se pudo contactar a Gemini:', e);
    return error('sin-conexion', 502);
  }

  if (!respuesta.ok) {
    // El cuerpo del error nunca trae la clave (va en el header), asi que es
    // seguro registrarlo y es lo unico que explica un 400.
    const cuerpo = await respuesta.text().catch(() => '');
    console.error(`[reconocer] Gemini HTTP ${respuesta.status} modelo=${MODELO} esquema=${conEsquema}:`, cuerpo.slice(0, 800));
    if (respuesta.status === 429) return error('ocupado', 429);
    if (respuesta.status === 401 || respuesta.status === 403) return error('clave-invalida', 503);
    if (respuesta.status === 400) {
      return /API[ _]?key/i.test(cuerpo) ? error('clave-invalida', 503) : error('peticion-invalida', 502);
    }
    return error('servicio', 502);
  }

  const datos = await respuesta.json().catch(() => null);

  // La respuesta es una lista de pasos; el texto esta en el paso model_output.
  type Parte = { type?: string; text?: string };
  type Paso = { type?: string; content?: Parte[] };
  const pasos: Paso[] = Array.isArray(datos?.steps) ? datos.steps : [];
  const salida = pasos.filter((p) => p.type === 'model_output').pop();
  const texto = salida?.content?.find((c) => c.type === 'text' && typeof c.text === 'string')?.text;

  if (typeof texto !== 'string' || !texto.trim()) {
    const tipos = pasos.map((p) => p.type).join(',');
    console.error('[reconocer] sin texto en la respuesta. pasos=', tipos, 'crudo=', JSON.stringify(datos ?? {}).slice(0, 500));
    // Si el modelo se nego o la foto fue bloqueada, suele no haber model_output.
    return error(pasos.length ? 'rechazo' : 'sin-resultado', pasos.length ? 422 : 502);
  }

  // A veces envuelve el JSON en ```json ... ``` aunque se pida application/json.
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();

  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    console.error('[reconocer] JSON invalido. esquema=', conEsquema, 'inicio=', limpio.slice(0, 200), 'fin=', limpio.slice(-120));
    return error('sin-resultado', 502);
  }

  const validado = EsquemaEscaneo.safeParse(normalizar(json));
  if (!validado.success) {
    console.error('[reconocer] no cumple el esquema:', JSON.stringify(validado.error.issues).slice(0, 400), '| crudo:', limpio.slice(0, 300));
    return error('sin-resultado', 502);
  }
  return Response.json(validado.data);
}
