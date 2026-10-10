// Tipos del inventario y datos de prueba. No hay backend todavía: el hogar
// de demostración (DESP-7F3K) arranca con estos productos; los hogares
// nuevos arrancan vacíos. Las fechas son relativas a hoy para que siempre
// haya productos frescos, por caducar y caducados.

import type { Categoria, Ubicacion, Unidad } from './catalogo';
import { hoyISO, sumarDias } from '../utils/fechas';

export type Producto = {
  id: string;
  nombre: string;
  categoria: Categoria;
  ubicacion: Ubicacion;
  cantidad: number;
  unidad: Unidad;
  fechaCompra: string;            // AAAA-MM-DD
  fechaCaducidad: string | null;  // null = no caduca / sin fecha
  notas: string;
};

export type ItemFaltante = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  // Si vino de un producto agotado, al comprarlo regresa a su lugar.
  categoria?: Categoria;
  ubicacion?: Ubicacion;
};

export function productosDemo(): Producto[] {
  const hoy = hoyISO();
  const d = (n: number) => sumarDias(hoy, n);
  const p = (
    id: string, nombre: string, categoria: Categoria, ubicacion: Ubicacion,
    cantidad: number, unidad: Unidad, compra: number, caduca: number | null, notas = '',
  ): Producto => ({
    id, nombre, categoria, ubicacion, cantidad, unidad,
    fechaCompra: d(compra), fechaCaducidad: caduca === null ? null : d(caduca), notas,
  });

  return [
    p('p1', 'Leche entera', 'Lácteos y huevo', 'Refrigerador', 1, 'L', -3, 2),
    p('p2', 'Huevo', 'Lácteos y huevo', 'Refrigerador', 1, 'docena', -4, 12),
    p('p3', 'Jamón de pavo', 'Carnes y pescado', 'Refrigerador', 250, 'g', -7, -1),
    p('p4', 'Plátano', 'Frutas', 'Frutero', 6, 'pieza', -2, 3),
    p('p5', 'Aguacate', 'Frutas', 'Frutero', 3, 'pieza', -1, 4, 'Dos todavía están duros.'),
    p('p6', 'Jitomate', 'Verduras', 'Refrigerador', 1, 'kg', -2, 6),
    p('p7', 'Espinaca', 'Verduras', 'Refrigerador', 1, 'paquete', -5, 0),
    p('p8', 'Pan de caja', 'Panadería', 'Alacena', 1, 'paquete', -4, 1),
    p('p9', 'Arroz', 'Granos y cereales', 'Alacena', 1, 'kg', -20, 180),
    p('p10', 'Frijol negro', 'Granos y cereales', 'Alacena', 500, 'g', -20, 200),
    p('p11', 'Aceite vegetal', 'Abarrotes', 'Alacena', 1, 'L', -30, 90),
    p('p12', 'Pechuga de pollo', 'Carnes y pescado', 'Congelador', 1, 'kg', -6, 45),
    p('p13', 'Verduras mixtas', 'Congelados', 'Congelador', 500, 'g', -10, 60),
    p('p14', 'Detergente líquido', 'Limpieza', 'Lavandería', 1, 'L', -12, null),
    p('p15', 'Papel higiénico', 'Higiene personal', 'Baño', 12, 'rollo', -8, null),
  ];
}

export const faltantesDemo: ItemFaltante[] = [
  { id: 'f1', nombre: 'Tortillas', cantidad: 1, unidad: 'kg', categoria: 'Panadería', ubicacion: 'Refrigerador' },
  { id: 'f2', nombre: 'Mantequilla', cantidad: 1, unidad: 'pieza', categoria: 'Lácteos y huevo', ubicacion: 'Refrigerador' },
];

export const hogarMock = {
  nombre: 'Casa Pineda',
  codigo: 'DESP-7F3K',
  integrantes: ['Olav', 'Mamá', 'Toño'],
};

export const recetasMock = [
  {
    id: 'r1',
    titulo: 'Arroz con pollo y verduras',
    usa: ['Arroz', 'Pechuga de pollo', 'Verduras mixtas'],
    pasos: ['Sofríe la pechuga en cubos.', 'Agrega el arroz y las verduras.', 'Cubre con agua y cocina 18 min a fuego bajo.'],
  },
  {
    id: 'r2',
    titulo: 'Sándwich de espinaca y huevo',
    usa: ['Pan de caja', 'Espinaca', 'Huevo'],
    pasos: ['Saltea la espinaca 1 min.', 'Revuelve los huevos con la espinaca.', 'Sirve sobre el pan tostado.'],
  },
];
