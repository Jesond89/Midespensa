import { z } from 'zod';

// RF-08 / HU-04. Forma de las recetas que sugiere Gemini con lo que hay en la
// despensa. La ruta de servidor (app/api/recetas+api.ts) usa este zod para
// pedir la salida estructurada y para validar lo que llega; la app solo importa
// los tipos (import type), así que zod no entra al paquete del teléfono.
// Los .describe() viajan en CADA petición dentro del esquema, así que se
// mantienen cortos: el detalle va una sola vez en INSTRUCCIONES de la ruta.
// El esquema es a propósito laxo (solo topes, sin mínimos): la ruta limpia y
// recorta la respuesta antes de validar, y así un título vacío no tira las tres
// recetas; lo que quede inservible se descarta después, receta por receta.

/** Cuántas recetas se piden por generación (y el máximo que se acepta). */
export const MAX_RECETAS = 3;
/** Topes de cada receta: acotan los tokens de salida y lo que cabe en pantalla. */
export const MAX_USA = 12;
export const MAX_PASOS = 8;

// Las columnas de public.recetas son: id, hogar_id, titulo TEXT, usa JSONB,
// pasos JSONB. Gemini solo escribe titulo/usa/pasos; id lo pone la base y
// hogar_id sale del JWT, nunca del modelo ni del cliente.
export const EsquemaReceta = z.object({
  titulo: z.string().max(80).describe('Nombre del platillo en es-MX. Ej: "Arroz con pollo y verduras"'),
  usa: z
    .array(z.string().max(80))
    .max(MAX_USA)
    .describe('Productos de la despensa que ocupa, con el nombre tal cual aparece en la lista.'),
  pasos: z
    .array(z.string().max(300))
    .max(MAX_PASOS)
    .describe('Preparación en orden, una frase por paso.'),
});

export const EsquemaRecetas = z.object({
  recetas: z.array(EsquemaReceta).max(MAX_RECETAS),
  aviso: z.string().nullable().describe('Por qué salieron menos recetas de las pedidas; null si no hubo problema.'),
});

/** Lo que devuelve el modelo, sin id todavía. */
export type RecetaGenerada = z.infer<typeof EsquemaReceta>;
/** Fila de public.recetas como la ve la app (hogar_id se queda en el servidor). */
export type Receta = RecetaGenerada & { id: string };
/** Respuesta de POST /api/recetas. */
export type RespuestaRecetas = { recetas: Receta[]; aviso: string | null };
