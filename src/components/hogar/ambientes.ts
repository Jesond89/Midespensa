import type React from 'react';
import type { Ubicacion } from '../../data/catalogo';
import type { Producto } from '../../data/mock';
import { estadoCaducidad, estaCaducado, estaPorCaducar, nivelDe, ordenarPorCaducidad } from '../../utils/caducidad';
import type { TemaId } from '../../chat/temas';
import type { NombreIcono } from '../ui/Icono';
import type { PropsEscena } from './lienzo';
import { EscenaAlacena, EscenaCasa, EscenaCocina, EscenaRefri } from './escenas';

// Recorrido del inicio: Freddy empieza afuera de la casa y, deslizando a la
// izquierda, visita cada lugar donde se guardan cosas. El orden de esta
// lista es el orden del recorrido.

export type Ambiente = {
  id: string;
  nombre: string;
  icono: NombreIcono;
  /** Ubicaciones cuyos productos se muestran; null = todas (la casa). */
  ubicaciones: Ubicacion[] | null;
  frase: string;
  /** Lo que dice Freddy cuando en ese lugar todo está bien. */
  animo: string;
  tema: TemaId;
  Escena: (p: PropsEscena) => React.ReactElement;
};

export const AMBIENTES: Ambiente[] = [
  { id: 'casa', nombre: 'Mi casa', icono: 'casa', ubicaciones: null, frase: 'Desliza y recórrela', animo: '¡Hola! Todo en orden en casa.', tema: 'general', Escena: EscenaCasa },
  { id: 'refri', nombre: 'Refrigerador', icono: 'refri', ubicaciones: ['Refrigerador', 'Congelador'], frase: 'Fresco y bien frío', animo: 'Todo fresquito por aquí. ¡Nada que tirar!', tema: 'despensa', Escena: EscenaRefri },
  { id: 'cocina', nombre: 'Cocina', icono: 'olla', ubicaciones: ['Frutero'], frase: 'Fruta y algo rico', animo: '¿Cocinamos algo rico hoy?', tema: 'cocina', Escena: EscenaCocina },
  { id: 'alacena', nombre: 'Alacena', icono: 'alacena', ubicaciones: ['Alacena'], frase: 'Granos y latas', animo: 'La alacena está bien surtida.', tema: 'despensa', Escena: EscenaAlacena },
];

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Comentario de Freddy en la nube de cada lugar, según lo que hay ahí:
 * primero lo caducado, luego lo que caduca pronto; si todo está bien,
 * una frase propia del lugar.
 */
export function comentario(ambiente: Ambiente, productos: Producto[]): string {
  const { ubicaciones } = ambiente;
  const propios = ubicaciones ? productos.filter((p) => ubicaciones.includes(p.ubicacion)) : productos;
  if (!propios.length) {
    return ubicaciones ? `Aquí no hay nada todavía. ¿Agregamos algo?` : '¡Hola! Agrega tu primer producto con el +.';
  }
  const caducados = propios.filter(estaCaducado);
  const pronto = propios.filter(estaPorCaducar).sort(ordenarPorCaducidad);

  if (!ubicaciones) {
    // En la casa, un resumen general.
    if (caducados.length) return `¡Ojo! Hay ${plural(caducados.length, 'producto caducado', 'productos caducados')}.`;
    if (pronto.length) return `${plural(pronto.length, 'cosa caduca', 'cosas caducan')} pronto. ¡Úsalas primero!`;
    return ambiente.animo;
  }

  if (caducados.length) {
    const p = caducados[0];
    const mas = caducados.length > 1 ? ` y ${plural(caducados.length - 1, 'cosa más', 'cosas más')}` : '';
    return `${p.nombre}${mas}: ${estadoCaducidad(p).texto.toLowerCase()}. Mejor sácalo.`;
  }
  const p = pronto[0];
  if (p) {
    const urgente = nivelDe(p) === 'urgente';
    const idea = ambiente.id === 'cocina' ? '¿Lo cocinamos?' : urgente ? '¡Úsalo ya!' : 'Úsalo pronto.';
    return `${p.nombre}: ${estadoCaducidad(p).texto.toLowerCase()}. ${idea}`;
  }
  return ambiente.animo;
}
