import { ErrorConfiguracion } from './jwt';
import { admin } from './supabaseAdmin';

// Límite diario de las rutas que gastan cuota de Gemini (/api/reconocer y
// /api/recetas). El conteo vive en Postgres (tabla usos_ia y función
// ia_consumir_uso, migración 004), no en memoria del proceso: Railway levanta
// un proceso nuevo en cada despliegue y el Map que se usaba antes nacía vacío,
// así que el día que se desplegó seis veces cada hogar recibió seis veces su
// cupo. Corre SOLO en el servidor: importa supabaseAdmin, que usa la clave
// secreta, así que nunca debe importarse desde pantallas ni providers.

export type TipoUsoIa = 'escaneo' | 'recetas';

/**
 * Cupo por hogar y por día de cada ruta. El número vive aquí y viaja a
 * Postgres en cada llamada, así se ajusta sin otra migración.
 */
export const LIMITES_IA: Record<TipoUsoIa, number> = {
  // Cada escaneo manda una foto, que es lo más caro que se le pide a Gemini.
  escaneo: 10,
  // Solo texto, así que cuesta bastante menos que un escaneo; pero la despensa
  // casi no cambia entre un toque y el siguiente, así que arriba de ~8
  // generaciones al día ya solo son toques repetidos del botón. Alcanza para
  // las tres comidas y dos o tres reintentos.
  recetas: 8,
};

/** Motivo para no dejar pasar la petición, con el status que le toca. */
export type BloqueoLimite = { codigo: 'limite' | 'sin-conexion' | 'sin-configurar'; status: number };

type RespuestaUso = { permitido?: unknown; usos?: unknown };

/**
 * Cuenta un uso de IA del hogar y dice si sigue dentro de su cupo del día.
 * Devuelve null cuando se puede continuar; si no, el bloqueo que hay que
 * responder. Conviene llamarla lo más tarde posible dentro de la ruta (después
 * de validar la petición y antes de hablar con Gemini) para que una petición
 * que iba a fallar de todos modos no le gaste un uso al hogar.
 *
 * El incremento lo hace Postgres en un solo enunciado, así que dos peticiones
 * simultáneas del mismo hogar se serializan en la fila del día y no hay forma
 * de que las dos se queden con el último uso.
 *
 * Si la base no contesta se RECHAZA la petición ('sin-conexion'). Dejarla pasar
 * convertiría una caída de Supabase en gasto sin tope de la cuota de Gemini,
 * que es una sola para todos los hogares y no se recupera; un escaneo
 * rechazado, en cambio, se vuelve a intentar en un minuto.
 */
export async function consumirUsoIa(hogarId: string, tipo: TipoUsoIa): Promise<BloqueoLimite | null> {
  const limite = LIMITES_IA[tipo];

  let datos: unknown;
  try {
    const { data, error } = await admin().rpc('ia_consumir_uso', {
      p_hogar_id: hogarId,
      p_tipo: tipo,
      p_limite: limite,
    });
    if (error?.code === 'PGRST202') {
      console.error(
        '[limite] falta la función ia_consumir_uso: ejecuta supabase/migrations/004_limite_ia_persistente.sql en el SQL Editor de Supabase.'
      );
      return { codigo: 'sin-configurar', status: 503 };
    }
    if (error) throw new Error(error.message);
    datos = data;
  } catch (e) {
    if (e instanceof ErrorConfiguracion) {
      console.error(`[limite] ${e.message}`);
      return { codigo: 'sin-configurar', status: 503 };
    }
    // Sin contador no hay límite: se corta en vez de arriesgar la cuota.
    console.error(`[limite] no se pudo contar el uso de ${tipo}:`, e instanceof Error ? e.message : e);
    return { codigo: 'sin-conexion', status: 502 };
  }

  if (!datos || typeof datos !== 'object') {
    console.error(`[limite] respuesta inesperada al contar el uso de ${tipo}:`, JSON.stringify(datos ?? null).slice(0, 200));
    return { codigo: 'sin-conexion', status: 502 };
  }

  const { permitido, usos } = datos as RespuestaUso;
  if (permitido === true) return null;
  console.warn(`[limite] hogar ${hogarId} llegó al tope de ${tipo} (${usos}/${limite}) por hoy`);
  return { codigo: 'limite', status: 429 };
}
