import type { Unidad } from '../data/catalogo';

// "6 piezas", "1 pieza", "500 g", "1.5 kg". Las abreviaturas (kg, g, L, ml)
// no cambian; las palabras se ponen en plural cuando la cantidad no es 1.

const PLURALES: Partial<Record<Unidad, string>> = {
  pieza: 'piezas', paquete: 'paquetes', docena: 'docenas', lata: 'latas', rollo: 'rollos',
};

export function cantidadTexto(cantidad: number, unidad: Unidad) {
  const numero = Number.isInteger(cantidad) ? String(cantidad) : String(Math.round(cantidad * 100) / 100);
  const palabra = cantidad === 1 ? unidad : (PLURALES[unidad] ?? unidad);
  return `${numero} ${palabra}`;
}
