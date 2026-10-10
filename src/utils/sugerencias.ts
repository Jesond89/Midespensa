import type { Categoria, Ubicacion, Unidad } from '../data/catalogo';

// Captura rápida a mano: "2 kg de arroz" o "leche" se convierten en un
// producto con categoría, lugar y caducidad sugeridos según el nombre.
// Son solo sugerencias; el usuario las revisa antes de guardar.

type Sugerencia = { categoria: Categoria; ubicacion: Ubicacion; dias: number | null };

// El orden importa: lo más específico primero ("frijoles refritos" antes que "frijol").
const REGLAS: [RegExp, Sugerencia][] = [
  [/helado|congelad|nugget|papas? a la francesa/, { categoria: 'Congelados', ubicacion: 'Congelador', dias: 90 }],
  [/leche|yogur|queso|crema|mantequilla|margarina/, { categoria: 'Lácteos y huevo', ubicacion: 'Refrigerador', dias: 10 }],
  [/huevo/, { categoria: 'Lácteos y huevo', ubicacion: 'Refrigerador', dias: 21 }],
  [/jam[oó]n|salchicha|chorizo|tocino|salami/, { categoria: 'Carnes y pescado', ubicacion: 'Refrigerador', dias: 7 }],
  [/pollo|pechuga|carne|\bres\b|cerdo|bistec|molida|pescado|filete|camar[oó]n/, { categoria: 'Carnes y pescado', ubicacion: 'Refrigerador', dias: 3 }],
  [/at[uú]n|sardina|frijoles? (refritos|en lata)|chiles? en|lata/, { categoria: 'Abarrotes', ubicacion: 'Alacena', dias: 365 }],
  [/tortilla/, { categoria: 'Panadería', ubicacion: 'Refrigerador', dias: 7 }],
  [/pan|bolillo|galleta|tostada/, { categoria: 'Panadería', ubicacion: 'Alacena', dias: 7 }],
  [/arroz|frijol|lenteja|garbanzo|pasta|espagueti|sopa|avena|cereal|harina|ma[ií]z/, { categoria: 'Granos y cereales', ubicacion: 'Alacena', dias: 365 }],
  [/aceite|az[uú]car|sal\b|caf[eé]|consom|mayonesa|salsa|cátsup|catsup|mostaza|vinagre|miel|chocolate|especia/, { categoria: 'Abarrotes', ubicacion: 'Alacena', dias: 365 }],
  [/refresco|\bagua\b|jugo|cerveza|vino|bebida|t[eé] /, { categoria: 'Bebidas', ubicacion: 'Alacena', dias: 180 }],
  [/manzana|pl[aá]tano|naranja|lim[oó]n|aguacate|mango|pera|uva|fresa|papaya|sand[ií]a|mel[oó]n|pi[nñ]a|fruta/, { categoria: 'Frutas', ubicacion: 'Frutero', dias: 6 }],
  [/jitomate|tomate|cebolla|ajo|papa|zanahoria|lechuga|espinaca|chile|calabaza|pepino|br[oó]coli|verdura|cilantro|nopal/, { categoria: 'Verduras', ubicacion: 'Refrigerador', dias: 7 }],
];

export function sugerirPorNombre(nombre: string): Sugerencia | null {
  const n = nombre.toLowerCase();
  return REGLAS.find(([patron]) => patron.test(n))?.[1] ?? null;
}

const UNIDADES_ESCRITAS: [RegExp, Unidad][] = [
  [/^(kg|kilos?|kilogramos?)$/, 'kg'],
  [/^(g|gr|gramos?)$/, 'g'],
  [/^(l|lt|litros?)$/, 'L'],
  [/^(ml|mililitros?)$/, 'ml'],
  [/^(paquetes?|paq|bolsas?|cajas?)$/, 'paquete'],
  [/^(docenas?)$/, 'docena'],
  [/^(latas?)$/, 'lata'],
  [/^(frascos?)$/, 'frasco'],
  [/^(manojos?)$/, 'manojo'],
  [/^(piezas?|pzas?|pz)$/, 'pieza'],
];

/** "2 kg de arroz" → { nombre: "Arroz", cantidad: 2, unidad: "kg" }. */
export function interpretarEntrada(texto: string): { nombre: string; cantidad: number; unidad: Unidad } {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  const m = limpio.match(/^(\d+(?:[.,]\d+)?)\s*([a-záéíóú]+)?\s+(?:de\s+)?(.+)$/i);
  let cantidad = 1;
  let unidad: Unidad = 'pieza';
  let nombre = limpio;
  if (m) {
    cantidad = Number(m[1].replace(',', '.')) || 1;
    const unidadEscrita = m[2]?.toLowerCase();
    const encontrada = unidadEscrita ? UNIDADES_ESCRITAS.find(([p]) => p.test(unidadEscrita))?.[1] : undefined;
    if (encontrada) {
      unidad = encontrada;
      nombre = m[3];
    } else {
      // "3 manzanas": no había unidad, la palabra es parte del nombre.
      nombre = [m[2], m[3]].filter(Boolean).join(' ');
    }
  }
  return { nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), cantidad, unidad };
}
