import { autenticar } from '../../src/server/auth';

// RUTA TEMPORAL DE DIAGNOSTICO. Borrar cuando se resuelva lo de /api/recetas.
//
// /api/recetas lleva varios intentos agotando el tiempo contra Gemini, y ya se
// descartaron el tamaño de la peticion, el response_format, la forma de input
// y el tope de salida. Falta saber algo basico: ¿este servidor tarda con
// CUALQUIER llamada a Gemini, o solo con la de recetas?
//
// Hace dos llamadas con poco presupuesto y reporta cuanto tardo cada una:
//   A = prompt trivial, salida minima  -> mide la latencia de base
//   B = el prompt real de recetas      -> mide la generacion completa
//
// NO consume el limite diario: es diagnostico, no uso.

const MODELO = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const URL_API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const PRESUPUESTO_MS = 12000;

type Resultado = { ok: boolean; ms: number; status?: number; detalle?: string };

async function probar(nombre: string, cuerpo: Record<string, unknown>, clave: string): Promise<Resultado> {
  const t0 = Date.now();
  try {
    const r = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      signal: AbortSignal.timeout(PRESUPUESTO_MS),
      body: JSON.stringify(cuerpo),
    });
    const ms = Date.now() - t0;
    const texto = await r.text().catch(() => '');
    console.log(`[diag] ${nombre}: HTTP ${r.status} en ${ms} ms`, r.ok ? texto.slice(0, 200) : texto.slice(0, 400));
    return { ok: r.ok, ms, status: r.status, detalle: texto.slice(0, 200) };
  } catch (e) {
    const ms = Date.now() - t0;
    const detalle = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error(`[diag] ${nombre}: FALLO en ${ms} ms -`, detalle);
    return { ok: false, ms, detalle };
  }
}

export async function POST(request: Request) {
  try {
    if (!autenticar(request)) return Response.json({ error: 'no-autorizado' }, { status: 401 });
  } catch {
    return Response.json({ error: 'sin-configurar' }, { status: 503 });
  }
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return Response.json({ error: 'sin-clave' }, { status: 503 });

  // A: lo mas chico posible. Si esto tarda, el problema no es el prompt.
  const a = await probar('A-trivial', {
    model: MODELO,
    input: 'Responde unicamente con la palabra: ok',
    generation_config: { max_output_tokens: 32, thinking_level: 'minimal' },
  }, clave);

  // B: igual que A pero pidiendo generar de verdad, sin inventario para que la
  // unica variable sea cuanto tiene que escribir.
  const b = await probar('B-generacion', {
    model: MODELO,
    input: 'Dame 3 recetas mexicanas sencillas en JSON con titulo, usa (lista) y pasos (lista de 5).',
    generation_config: { max_output_tokens: 4096, thinking_level: 'minimal' },
  }, clave);

  // C: igual que B pero SIN thinking_level, por si ese campo es el que cuelga.
  const c = await probar('C-sin-thinking', {
    model: MODELO,
    input: 'Dame 3 recetas mexicanas sencillas en JSON con titulo, usa (lista) y pasos (lista de 5).',
    generation_config: { max_output_tokens: 4096 },
  }, clave);

  return Response.json({ a, b, c, modelo: MODELO });
}
