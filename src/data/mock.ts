// Datos de prueba para la v0.1 navegable (Fase 2). No hay backend todavía:
// esto se reemplaza por las llamadas reales al API en el siguiente sprint.

export type Ubicacion = 'Refrigerador' | 'Alacena' | 'Congelador';

export type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  ubicacion: Ubicacion;
  cantidad: number;
  unidad: string;
  diasParaCaducar: number | null; // null = sin fecha definida
};

export type ItemFaltante = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
};

export const productosIniciales: Producto[] = [
  { id: 'p1', nombre: 'Leche entera', categoria: 'Lácteos', ubicacion: 'Refrigerador', cantidad: 1, unidad: 'L', diasParaCaducar: 2 },
  { id: 'p2', nombre: 'Huevo', categoria: 'Lácteos', ubicacion: 'Refrigerador', cantidad: 0.5, unidad: 'docena', diasParaCaducar: 6 },
  { id: 'p3', nombre: 'Jamón de pavo', categoria: 'Embutidos', ubicacion: 'Refrigerador', cantidad: 0.25, unidad: 'kg', diasParaCaducar: 1 },
  { id: 'p4', nombre: 'Arroz', categoria: 'Granos', ubicacion: 'Alacena', cantidad: 1, unidad: 'kg', diasParaCaducar: 180 },
  { id: 'p5', nombre: 'Frijol negro', categoria: 'Granos', ubicacion: 'Alacena', cantidad: 0.5, unidad: 'kg', diasParaCaducar: 200 },
  { id: 'p6', nombre: 'Aceite vegetal', categoria: 'Abarrotes', ubicacion: 'Alacena', cantidad: 1, unidad: 'L', diasParaCaducar: 90 },
  { id: 'p7', nombre: 'Pechuga de pollo', categoria: 'Carnes', ubicacion: 'Congelador', cantidad: 1, unidad: 'kg', diasParaCaducar: 45 },
  { id: 'p8', nombre: 'Verduras mixtas', categoria: 'Verduras', ubicacion: 'Congelador', cantidad: 0.5, unidad: 'kg', diasParaCaducar: 60 },
];

export const faltantesIniciales: ItemFaltante[] = [
  { id: 'f1', nombre: 'Tortillas', cantidad: 1, unidad: 'kg' },
  { id: 'f2', nombre: 'Mantequilla', cantidad: 1, unidad: 'pieza' },
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
    titulo: 'Omelette de jamón',
    usa: ['Huevo', 'Jamón de pavo'],
    pasos: ['Bate el huevo con sal.', 'Agrega el jamón picado.', 'Cocina en sartén 3 min por lado.'],
  },
];
