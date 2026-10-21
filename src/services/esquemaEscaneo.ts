import { z } from 'zod';
import { CATEGORIAS, UBICACIONES, UNIDADES, Categoria, Ubicacion } from '../data/catalogo';

// Forma de la respuesta del escaneo de compras. La ruta de servidor la usa
// para pedirle a Claude una salida estructurada; la app solo importa el
// tipo (import type), así que zod no entra al paquete del teléfono.

const categorias = CATEGORIAS.map((c) => c.nombre) as [Categoria, ...Categoria[]];
const ubicaciones = UBICACIONES.map((u) => u.nombre) as [Ubicacion, ...Ubicacion[]];

export const EsquemaEscaneo = z.object({
  productos: z.array(
    z.object({
      nombre: z.string().describe('Nombre corto en español de México, con marca y presentación si se leen. Ej.: "Leche Lala entera 1 L".'),
      cantidad: z.number().describe('Cuántas unidades iguales se ven.'),
      unidad: z.enum(UNIDADES),
      categoria: z.enum(categorias),
      ubicacion: z.enum(ubicaciones).describe('Dónde conviene guardarlo en casa.'),
      dias_caducidad: z.number().int().nullable().describe('Días aproximados que dura sin abrir desde hoy; null si prácticamente no caduca (sal, azúcar, vinagre).'),
      confianza: z.enum(['alta', 'media', 'baja']),
    }),
  ).max(40),
  aviso: z.string().nullable().describe('Algo que el usuario deba saber de la foto (borrosa, oscura, sin productos); null si todo bien.'),
});

export type ResultadoEscaneo = z.infer<typeof EsquemaEscaneo>;
export type ProductoEscaneado = ResultadoEscaneo['productos'][number];
