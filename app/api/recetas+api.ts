import { z } from 'zod';
import { EsquemaRecetas, MAX_PASOS, MAX_RECETAS, MAX_USA, type RecetaGenerada } from '../../src/services/esquemaRecetas';
import { autenticar } from '../../src/server/auth';
import { admin } from '../../src/server/supabaseAdmin';
import { ErrorConfiguracion } from '../../src/server/jwt';
import { diasHasta } from '../../src/utils/fechas';

// RF-08 / HU-04. POST /api/recetas — sugiere recetas con lo que YA hay en la
// despensa del hogar, priorizando lo que está por caducar. Corre SOLO en el
// servidor: la clave de Gemini (GEMINI_API_KEY) se lee de process.env, no
// lleva prefijo EXPO_PUBLIC_, nunca se envía al teléfono ni se escribe en
// logs ni en respuestas.
//
// El cuerpo de la petición se ignora a propósito: el inventario se lee de
// Supabase con la clave secreta filtrando por el hogar_id del JWT, así que un
// hogar no puede pedir recetas con los productos de otro ni inflar la lista.

// Mismos valores que /api/reconocer: generateContent con responseJsonSchema ya
// no funciona con los modelos 3.x (400 INVALID_ARGUMENT sin detalle), la salida
// estructurada vive hoy en la Interactions API.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const URL_API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
// Tres recetas con pasos cortos caben de sobra; el tope solo evita una salida fuga.
const MAX_SALIDA_TOKENS = 4096;
// Más de esto no cabe en el prompt sin encarecerlo, y nadie cocina con 80 cosas.
const MAX_PRODUCTOS = 80;

// Límite diario por hogar, como los 10 escaneos de /api/reconocer. Aquí son 8:
// la petición es solo texto (sin imagen), así que cuesta bastante menos que un
// escaneo, pero la despensa casi no cambia entre un toque y el siguiente, así
// que arriba de ~8 generaciones al día ya solo son toques repetidos del botón.
// Alcanza para las tres comidas del día y dos o tres reintentos.
const LIMITE_POR_DIA = 8;
const usos = new Map<string, { n: number; reinicia: number }>();

function dentroDelLimite(codigo: string) {
  const ahora = Date.now();
  const u = usos.get(codigo);
  if (!u || u.reinicia < ahora) {
    usos.set(codigo, { n: 1, reinicia: ahora + 24 * 60 * 60 * 1000 });
    return true;
  }
  u.n += 1;
  return u.n <= LIMITE_POR_DIA;
}

const INSTRUCCIONES = `Cocina casera mexicana. Te doy el inventario de una despensa y me das ${MAX_RECETAS} recetas distintas que se puedan preparar HOY con eso.
- Prioriza los productos marcados "URGENTE" y "pronto": la idea es que no se echen a perder.
- Cada receta debe usar al menos dos productos de la lista; entre las ${MAX_RECETAS} procura cubrir lo que caduca antes.
- "usa": los productos de la lista que ocupa, copiando el nombre TAL CUAL aparece en la lista (máximo ${MAX_USA}). No inventes productos ni pongas ahí sal, aceite o condimentos que no estén en la lista.
- "pasos": máximo ${MAX_PASOS}, una frase corta cada uno, en orden, en imperativo y en español de México. Incluye tiempos y cantidades cuando importen.
- "titulo": nombre normal del platillo, sin adornos ni emojis.
- Recetas realistas de casa: nada de ingredientes que no estén en la lista salvo agua, sal y pimienta.
Si la despensa no alcanza para ${MAX_RECETAS} recetas, da las que sí y explica en "aviso" qué falta; si no alcanza para ninguna, deja la lista vacía y dilo en "aviso". No uses productos caducados: ya vienen filtrados de la lista.`;

// Esquema JSON que Gemini debe respetar (sale del mismo zod que valida la respuesta).
const { $schema: _omitido, ...ESQUEMA_BRUTO } = z.toJSONSchema(EsquemaRecetas) as Record<string, unknown>;

// Gemini rechaza el esquema con "constraint that has too many states for
// serving" cuando lleva límites de longitud. Se quitan del esquema que viaja
// (los de arreglos porque ya nos costó un 400 en /api/reconocer, y los de
// cadenas por precaución: son el mismo tipo de restricción y no hay forma de
// probarlos aquí). Zod los sigue aplicando al validar, y normalizar() recorta
// antes para que nunca lleguen fuera de tope.
const SIN_LIMITES = ['maxItems', 'minItems', 'maxLength', 'minLength'];
const ESQUEMA_JSON = JSON.parse(
  JSON.stringify(ESQUEMA_BRUTO, (llave, valor) => (SIN_LIMITES.includes(llave) ? undefined : valor))
) as Record<string, unknown>;

type FilaProducto = { nombre: string; cantidad: number | string | null; unidad: string | null; fecha_caducidad: string | null };

const sinAcentos = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Una línea por producto, con los días que le quedan en palabras. */
function describir(p: FilaProducto) {
  const cantidad = Number(p.cantidad);
  const cuanto = Number.isFinite(cantidad) && cantidad > 0 ? `${cantidad} ${p.unidad ?? 'pieza'}` : (p.unidad ?? 'pieza');
  if (!p.fecha_caducidad) return `- ${p.nombre} (${cuanto}, sin fecha de caducidad)`;
  const dias = diasHasta(p.fecha_caducidad);
  const plazo =
    dias <= 0 ? 'URGENTE: caduca hoy'
    : dias === 1 ? 'URGENTE: caduca mañana'
    : dias <= 5 ? `pronto: caduca en ${dias} días`
    : `caduca en ${dias} días`;
  return `- ${p.nombre} (${cuanto}, ${plazo})`;
}

/**
 * Red de seguridad antes de validar: recorta la lista a los topes, limpia
 * textos vacíos y deja los nombres de "usa" como están escritos en el
 * inventario cuando solo cambian acentos o mayúsculas (así la pantalla los
 * muestra igual que en la despensa).
 */
function normalizar(json: unknown, nombres: string[]) {
  if (!json || typeof json !== 'object') return json;
  const datos = json as { recetas?: unknown; aviso?: unknown };
  if (!Array.isArray(datos.recetas)) return json;
  const porNombre = new Map(nombres.map((n) => [sinAcentos(n), n]));
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  datos.recetas = datos.recetas.slice(0, MAX_RECETAS).map((r) => {
    if (!r || typeof r !== 'object') return r;
    const receta = r as Record<string, unknown>;
    const usa = Array.isArray(receta.usa) ? receta.usa : [];
    const pasos = Array.isArray(receta.pasos) ? receta.pasos : [];
    return {
      ...receta,
      titulo: texto(receta.titulo).slice(0, 80),
      usa: usa
        .map((u) => texto(u))
        .filter(Boolean)
        .map((u) => porNombre.get(sinAcentos(u)) ?? u.slice(0, 80))
        .slice(0, MAX_USA),
      pasos: pasos.map((p) => texto(p).slice(0, 300)).filter(Boolean).slice(0, MAX_PASOS),
    };
  });
  if (typeof datos.aviso !== 'string' || !datos.aviso.trim()) datos.aviso = null;
  return datos;
}

const error = (codigo: string, status: number) => Response.json({ error: codigo }, { status });

const idLocal = () => `r_${Math.random().toString(36).slice(2, 14)}`;

/**
 * Guarda las sugerencias en public.recetas con el hogar_id del token y
 * devuelve las filas con su id. La tabla se usa como "últimas sugerencias",
 * no como historial: cada generación reemplaza la anterior del hogar, porque
 * no hay pantalla para administrarlas y si no crecería sin tope. Si la base
 * falla, no se cae la función: se devuelven las recetas con ids locales.
 */
async function guardar(hogarId: string, recetas: RecetaGenerada[]) {
  if (!recetas.length) return [];
  try {
    const db = admin();
    // El .eq de hogar_id es lo que impide borrar las recetas de otro hogar.
    const borrado = await db.from('recetas').delete().eq('hogar_id', hogarId);
    if (borrado.error) throw borrado.error;
    const { data, error: e } = await db
      .from('recetas')
      .insert(recetas.map((r) => ({ hogar_id: hogarId, titulo: r.titulo, usa: r.usa, pasos: r.pasos })))
      .select('id');
    if (e || !data || data.length !== recetas.length) throw e ?? new Error('insert incompleto');
    return recetas.map((r, i) => ({ ...r, id: (data[i] as { id: string }).id }));
  } catch (e) {
    // Se registra y se sigue: la sugerencia ya está hecha y pagada.
    console.error('[recetas] no se pudieron guardar:', e instanceof Error ? e.message : e);
    return recetas.map((r) => ({ ...r, id: idLocal() }));
  }
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

  // El inventario se lee ANTES de contar el uso: una despensa vacía no debe
  // gastarle al hogar una de sus generaciones del día.
  let filas: FilaProducto[];
  try {
    const { data, error: e } = await admin()
      .from('productos')
      .select('nombre, cantidad, unidad, fecha_caducidad')
      .eq('hogar_id', hogarId)
      .limit(500);
    if (e) {
      console.error('[recetas] no se pudo leer el inventario:', e.message);
      return error('sin-conexion', 502);
    }
    filas = (data ?? []) as FilaProducto[];
  } catch (e) {
    if (e instanceof ErrorConfiguracion) {
      console.error(e.message);
      return error('sin-configurar', 503);
    }
    console.error('[recetas] inventario:', e);
    return error('sin-conexion', 502);
  }

  // Lo caducado no se cocina, así que ni se le menciona al modelo. Primero lo
  // que caduca antes (sin fecha al final) y se corta en MAX_PRODUCTOS.
  const utiles = filas
    .filter((p) => typeof p.nombre === 'string' && p.nombre.trim())
    .filter((p) => !p.fecha_caducidad || diasHasta(p.fecha_caducidad) >= 0)
    .sort((a, b) => {
      if (!a.fecha_caducidad) return b.fecha_caducidad ? 1 : a.nombre.localeCompare(b.nombre);
      if (!b.fecha_caducidad) return -1;
      return a.fecha_caducidad.localeCompare(b.fecha_caducidad);
    })
    .slice(0, MAX_PRODUCTOS);

  // Con uno o dos productos no sale una receta decente: se avisa sin gastar la cuota.
  if (utiles.length < 2) return error('despensa-vacia', 422);

  if (!dentroDelLimite(hogarId)) return error('limite', 429);

  const nombres = utiles.map((p) => p.nombre.trim());
  const inventario = utiles.map(describir).join('\n');

  // Las instrucciones van como texto del input en vez de system_instruction:
  // ese campo vive dentro de agent_config y en el cuerpo da INVALID_ARGUMENT.
  const cuerpoBase = {
    model: MODELO,
    input: [
      { type: 'text', text: `${INSTRUCCIONES}\n\nInventario de la despensa:\n${inventario}\n\nDame las ${MAX_RECETAS} recetas.` },
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

  // Primero con esquema. Si lo rechaza (un 400 por el esquema), se reintenta
  // sin él: el prompt ya pide JSON y zod valida igual al final.
  let respuesta: Response;
  let conEsquema = true;
  try {
    respuesta = await llamar(true);
    if (respuesta.status === 400) {
      const detalle = await respuesta.text().catch(() => '');
      console.warn('[recetas] 400 con response_format, reintentando sin esquema:', detalle.slice(0, 400));
      conEsquema = false;
      respuesta = await llamar(false);
    }
  } catch (e) {
    console.error('[recetas] no se pudo contactar a Gemini:', e);
    return error('sin-conexion', 502);
  }

  if (!respuesta.ok) {
    // El cuerpo del error nunca trae la clave (va en el header), así que es
    // seguro registrarlo y es lo único que explica un 400.
    const cuerpo = await respuesta.text().catch(() => '');
    console.error(`[recetas] Gemini HTTP ${respuesta.status} modelo=${MODELO} esquema=${conEsquema}:`, cuerpo.slice(0, 800));
    if (respuesta.status === 429) return error('ocupado', 429);
    if (respuesta.status === 401 || respuesta.status === 403) return error('clave-invalida', 503);
    if (respuesta.status === 400) {
      return /API[ _]?key/i.test(cuerpo) ? error('clave-invalida', 503) : error('peticion-invalida', 502);
    }
    return error('servicio', 502);
  }

  const datos = await respuesta.json().catch(() => null);

  // La respuesta es una lista de pasos; el texto está en el paso model_output.
  type Parte = { type?: string; text?: string };
  type Paso = { type?: string; content?: Parte[] };
  const pasos: Paso[] = Array.isArray(datos?.steps) ? datos.steps : [];
  const salida = pasos.filter((p) => p.type === 'model_output').pop();
  const texto = salida?.content?.find((c) => c.type === 'text' && typeof c.text === 'string')?.text;

  if (typeof texto !== 'string' || !texto.trim()) {
    const tipos = pasos.map((p) => p.type).join(',');
    console.error('[recetas] sin texto en la respuesta. pasos=', tipos, 'crudo=', JSON.stringify(datos ?? {}).slice(0, 500));
    // Si el modelo se negó, suele no haber model_output.
    return error(pasos.length ? 'rechazo' : 'sin-resultado', pasos.length ? 422 : 502);
  }

  // A veces envuelve el JSON en ```json ... ``` aunque se pida application/json.
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();

  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    console.error('[recetas] JSON invalido. esquema=', conEsquema, 'inicio=', limpio.slice(0, 200), 'fin=', limpio.slice(-120));
    return error('sin-resultado', 502);
  }

  const validado = EsquemaRecetas.safeParse(normalizar(json, nombres));
  if (!validado.success) {
    console.error('[recetas] no cumple el esquema:', JSON.stringify(validado.error.issues).slice(0, 400), '| crudo:', limpio.slice(0, 300));
    return error('sin-resultado', 502);
  }

  // Se tiran las recetas sin pasos o sin productos: no sirven en pantalla.
  const recetas = validado.data.recetas.filter((r) => r.titulo && r.usa.length && r.pasos.length);
  if (!recetas.length) {
    console.warn('[recetas] el modelo no devolvió recetas utilizables. aviso=', validado.data.aviso);
    return Response.json({ recetas: [], aviso: validado.data.aviso });
  }

  return Response.json({ recetas: await guardar(hogarId, recetas), aviso: validado.data.aviso });
}
