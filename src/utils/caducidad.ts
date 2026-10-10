import { ui } from '../theme/tokens';
import { diasHasta } from './fechas';
import type { Producto } from '../data/mock';

// RF-05 / HU-03: caducado < 0 días, urgente 0–2, por vencer 3–5, fresco > 5.

export type NivelCaducidad = 'caducado' | 'urgente' | 'porVencer' | 'fresco' | 'sinFecha';

export const DIAS_POR_CADUCAR = 5;

export function nivelDe(p: Pick<Producto, 'fechaCaducidad'>): NivelCaducidad {
  if (!p.fechaCaducidad) return 'sinFecha';
  const dias = diasHasta(p.fechaCaducidad);
  if (dias < 0) return 'caducado';
  if (dias <= 2) return 'urgente';
  if (dias <= DIAS_POR_CADUCAR) return 'porVencer';
  return 'fresco';
}

export function estadoCaducidad(p: Pick<Producto, 'fechaCaducidad'>) {
  const nivel = nivelDe(p);
  if (!p.fechaCaducidad) return { nivel, tono: ui.sinFecha, texto: 'Sin caducidad' };
  const dias = diasHasta(p.fechaCaducidad);
  const tono = nivel === 'fresco' ? ui.fresco : nivel === 'porVencer' ? ui.porVencer : ui.urgente;
  const texto = dias < -1 ? `Caducó hace ${-dias} días`
    : dias === -1 ? 'Caducó ayer'
    : dias === 0 ? 'Caduca hoy'
    : dias === 1 ? 'Caduca mañana'
    : `Caduca en ${dias} días`;
  return { nivel, tono, texto };
}

export const estaCaducado = (p: Producto) => nivelDe(p) === 'caducado';
export const estaPorCaducar = (p: Producto) => ['urgente', 'porVencer'].includes(nivelDe(p));

/** Orden útil para listas: primero lo que caduca antes; sin fecha al final. */
export function ordenarPorCaducidad(a: Producto, b: Producto) {
  if (!a.fechaCaducidad) return b.fechaCaducidad ? 1 : a.nombre.localeCompare(b.nombre);
  if (!b.fechaCaducidad) return -1;
  return a.fechaCaducidad.localeCompare(b.fechaCaducidad);
}
