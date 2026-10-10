import type { NombreIcono as Icono } from '../components/ui/Icono';

// Catálogo fijo de opciones para registrar cualquier cosa de la casa:
// comida, limpieza o higiene. Cada opción trae su ícono para las listas.

export const CATEGORIAS = [
  { nombre: 'Frutas', icono: 'manzana' },
  { nombre: 'Verduras', icono: 'hoja' },
  { nombre: 'Lácteos y huevo', icono: 'huevo' },
  { nombre: 'Carnes y pescado', icono: 'pez' },
  { nombre: 'Panadería', icono: 'pan' },
  { nombre: 'Granos y cereales', icono: 'saco' },
  { nombre: 'Abarrotes', icono: 'caja' },
  { nombre: 'Bebidas', icono: 'taza' },
  { nombre: 'Congelados', icono: 'copo' },
  { nombre: 'Limpieza', icono: 'chispas' },
  { nombre: 'Higiene personal', icono: 'jabon' },
  { nombre: 'Otros', icono: 'etiqueta' },
] as const satisfies readonly { nombre: string; icono: Icono }[];

export const UBICACIONES = [
  { nombre: 'Refrigerador', icono: 'refri' },
  { nombre: 'Congelador', icono: 'copo' },
  { nombre: 'Alacena', icono: 'alacena' },
  { nombre: 'Frutero', icono: 'frutero' },
  { nombre: 'Lavandería', icono: 'lavadora' },
  { nombre: 'Baño', icono: 'gota' },
] as const satisfies readonly { nombre: string; icono: Icono }[];

export const UNIDADES = ['pieza', 'kg', 'g', 'L', 'ml', 'paquete', 'docena', 'lata', 'rollo'] as const;

export type Categoria = (typeof CATEGORIAS)[number]['nombre'];
export type Ubicacion = (typeof UBICACIONES)[number]['nombre'];
export type Unidad = (typeof UNIDADES)[number];

export const iconoCategoria = (c: Categoria): Icono =>
  CATEGORIAS.find((x) => x.nombre === c)?.icono ?? 'etiqueta';

export const iconoUbicacion = (u: Ubicacion): Icono =>
  UBICACIONES.find((x) => x.nombre === u)?.icono ?? 'caja';
