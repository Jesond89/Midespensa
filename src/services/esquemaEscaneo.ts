import { z } from 'zod';
import { CATEGORIAS, UBICACIONES, UNIDADES, Categoria, Ubicacion } from '../data/catalogo';

// Forma de la respuesta del escaneo de compras. La ruta de servidor la usa
// para pedirle a Claude una salida estructurada; la app solo importa el
// tipo (import type), así que zod no entra al paquete del teléfono.
// Los .describe() viajan en CADA petición dentro de responseJsonSchema, así que
// se mantienen telegráficos: el detalle (cómo contar, qué unidad usar, cómo
// estimar la caducidad) ya va una sola vez en INSTRUCCIONES de la ruta.

const categorias = CATEGORIAS.map((c) => c.nombre) as [Categoria, ...Categoria[]];
const ubicaciones = UBICACIONES.map((u) => u.nombre) as [Ubicacion, ...Ubicacion[]];

export const EsquemaEscaneo = z.object({
  productos: z.array(
    z.object({
      nombre: z.string().describe('es-MX con marca y presentación. Ej: "Leche Lala entera 1 L"'),
      cantidad: z.number().describe('Unidades iguales vistas.'),
      unidad: z.enum(UNIDADES),
      categoria: z.enum(categorias),
      ubicacion: z.enum(ubicaciones).describe('Dónde guardarlo en casa.'),
      dias_caducidad: z.number().int().nullable().describe('Días que dura sin abrir; null si no caduca.'),
      confianza: z.enum(['alta', 'media', 'baja']),
    }),
  ).max(40),
  aviso: z.string().nullable().describe('Problema de la foto; null si está bien.'),
});

export type ResultadoEscaneo = z.infer<typeof EsquemaEscaneo>;
export type ProductoEscaneado = ResultadoEscaneo['productos'][number];
