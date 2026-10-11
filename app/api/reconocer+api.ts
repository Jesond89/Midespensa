import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { EsquemaEscaneo } from '../../src/services/esquemaEscaneo';
import { autenticar } from '../../src/server/auth';

// POST /api/reconocer — recibe una foto de las compras o de la alacena y
// devuelve la lista de productos que se ven, para que el usuario la revise
// antes de guardarla. Corre en el servidor: la clave de Anthropic
// (ANTHROPIC_API_KEY, en .env) nunca llega al teléfono.

const MODELO = 'claude-opus-5-5';
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
type TipoImagen = (typeof TIPOS)[number];
const MAX_BYTES = 8 * 1024 * 1024;

const INSTRUCCIONES = `Eres el asistente de una app mexicana para llevar el inventario de la casa.
El usuario te manda una foto de sus compras recién traídas del súper o de su alacena/refrigerador abierto.

Registra cada producto distinto que se vea:
- Agrupa los productos idénticos y pon cuántos hay en "cantidad" (3 latas iguales = cantidad 3, unidad "lata").
- Usa nombres comunes en español de México; agrega marca y presentación cuando se lean en la etiqueta.
- Elige la unidad que mejor describa cómo se cuenta: piezas sueltas, paquetes, latas, frascos, manojos (cilantro, epazote), docena de huevo; usa kg, g, L o ml solo cuando sea un solo envase y su contenido se lea.
- En "ubicacion" pon dónde se guarda normalmente (lácteos y carnes al refrigerador, fruta al frutero, granos y latas a la alacena, congelados al congelador).
- "dias_caducidad" es una estimación de cuánto dura sin abrir a partir de hoy; null para lo que no caduca. Si se lee una fecha de caducidad en el empaque, úsala.
- Marca "confianza" baja si el producto está tapado, borroso o no estás seguro de qué es; no inventes productos que no se ven.
- Ignora lo que no es despensa (bolsas, muebles, personas, electrodomésticos) y todo lo que no sea comida o bebida (limpieza, detergentes, higiene personal, papel): la app solo registra comida.
Si la foto no sirve o no hay productos, regresa la lista vacía y explica en "aviso" cómo tomarla mejor.`;

function error(codigo: string, status: number) {
  return Response.json({ error: codigo }, { status });
}

export async function POST(request: Request) {
  // Solo hogares con sesión (JWT de acceso vigente) pueden usar el escaneo.
  try {
    if (!autenticar(request)) return error('no-autorizado', 401);
  } catch {
    return error('sin-configurar', 503);
  }
  if (!process.env.ANTHROPIC_API_KEY) return error('sin-clave', 503);

  let imagen: unknown;
  let tipo: unknown;
  try {
    ({ imagen, tipo } = await request.json());
  } catch {
    return error('solicitud-invalida', 400);
  }
  if (typeof imagen !== 'string' || !imagen || !TIPOS.includes(tipo as TipoImagen)) return error('solicitud-invalida', 400);
  if (imagen.length * 0.75 > MAX_BYTES) return error('imagen-grande', 413);

  const client = new Anthropic();
  try {
    const respuesta = await client.beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      // Si el modelo declina por un falso positivo, el servidor reintenta con el respaldo recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(EsquemaEscaneo) },
      system: INSTRUCCIONES,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: tipo as TipoImagen, data: imagen } },
            { type: 'text', text: 'Registra los productos de esta foto.' },
          ],
        },
      ],
    });

    if (respuesta.stop_reason === 'refusal') return error('rechazo', 422);
    if (!respuesta.parsed_output) return error('sin-resultado', 502);
    return Response.json(respuesta.parsed_output);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return error('clave-invalida', 503);
    if (e instanceof Anthropic.RateLimitError) return error('ocupado', 429);
    if (e instanceof Anthropic.BadRequestError) return error('imagen-invalida', 400);
    if (e instanceof Anthropic.APIConnectionError) return error('sin-conexion', 502);
    if (e instanceof Anthropic.APIError) return error('servicio', 502);
    throw e;
  }
}
