import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';

import type { Producto } from '../src/data/mock';
import {
  DIAS_POR_CADUCAR,
  estaCaducado,
  estaPorCaducar,
  estadoCaducidad,
  nivelDe,
  ordenarPorCaducidad,
} from '../src/utils/caducidad';
import { hoyISO, sumarDias } from '../src/utils/fechas';

// RF-05 / HU-03. Los umbrales son el corazon de las alertas: caducado por
// debajo de cero dias, urgente de 0 a 2, por vencer de 3 a 5, fresco de 6 en
// adelante. Se prueban los bordes, que es donde se rompen estas reglas.

const en = (dias: number) => ({ fechaCaducidad: sumarDias(hoyISO(), dias) });

const producto = (nombre: string, dias: number | null): Producto =>
  ({ id: nombre, nombre, fechaCaducidad: dias === null ? null : sumarDias(hoyISO(), dias) }) as unknown as Producto;

describe('nivelDe', () => {
  test('sin fecha no inventa un nivel', () => {
    assert.equal(nivelDe({ fechaCaducidad: null }), 'sinFecha');
  });

  test('ayer ya esta caducado', () => {
    assert.equal(nivelDe(en(-1)), 'caducado');
  });

  test('hoy es urgente, no caducado', () => {
    assert.equal(nivelDe(en(0)), 'urgente');
  });

  test('urgente llega hasta dos dias', () => {
    assert.equal(nivelDe(en(1)), 'urgente');
    assert.equal(nivelDe(en(2)), 'urgente');
  });

  test('por vencer empieza al tercer dia', () => {
    assert.equal(nivelDe(en(3)), 'porVencer');
  });

  test('el ultimo dia por vencer es el umbral exacto', () => {
    assert.equal(nivelDe(en(DIAS_POR_CADUCAR)), 'porVencer');
  });

  test('un dia despues del umbral ya es fresco', () => {
    assert.equal(nivelDe(en(DIAS_POR_CADUCAR + 1)), 'fresco');
  });
});

describe('estadoCaducidad', () => {
  test('nombra hoy y maniana sin numeros', () => {
    assert.equal(estadoCaducidad(en(0)).texto, 'Caduca hoy');
    assert.equal(estadoCaducidad(en(1)).texto, 'Caduca mañana');
  });

  test('nombra ayer sin numeros', () => {
    assert.equal(estadoCaducidad(en(-1)).texto, 'Caducó ayer');
  });

  test('cuenta los dias en plural hacia atras', () => {
    assert.equal(estadoCaducidad(en(-3)).texto, 'Caducó hace 3 días');
  });

  test('cuenta los dias hacia adelante', () => {
    assert.equal(estadoCaducidad(en(4)).texto, 'Caduca en 4 días');
  });

  test('sin fecha lo dice en lugar de calcular', () => {
    const estado = estadoCaducidad({ fechaCaducidad: null });
    assert.equal(estado.texto, 'Sin caducidad');
    assert.equal(estado.nivel, 'sinFecha');
  });

  test('siempre devuelve un tono', () => {
    for (const dias of [-5, -1, 0, 2, 3, 5, 10]) {
      assert.ok(estadoCaducidad(en(dias)).tono, `faltó el tono en ${dias} días`);
    }
  });
});

describe('estaCaducado y estaPorCaducar', () => {
  test('separan lo vencido de lo que esta por vencer', () => {
    assert.equal(estaCaducado(producto('leche', -1)), true);
    assert.equal(estaCaducado(producto('pan', 1)), false);
    assert.equal(estaPorCaducar(producto('pan', 1)), true);
    assert.equal(estaPorCaducar(producto('arroz', 10)), false);
  });

  test('lo caducado no cuenta como por caducar: son grupos distintos', () => {
    const vencido = producto('yogur', -2);
    assert.equal(estaCaducado(vencido), true);
    assert.equal(estaPorCaducar(vencido), false);
  });

  test('lo que no tiene fecha no entra en ninguno', () => {
    const sinFecha = producto('sal', null);
    assert.equal(estaCaducado(sinFecha), false);
    assert.equal(estaPorCaducar(sinFecha), false);
  });
});

describe('ordenarPorCaducidad', () => {
  test('primero lo que caduca antes', () => {
    const orden = [producto('arroz', 10), producto('leche', 1), producto('pan', 4)]
      .sort(ordenarPorCaducidad)
      .map((p) => p.nombre);
    assert.deepEqual(orden, ['leche', 'pan', 'arroz']);
  });

  test('lo que no tiene fecha queda al final', () => {
    const orden = [producto('sal', null), producto('leche', 2)]
      .sort(ordenarPorCaducidad)
      .map((p) => p.nombre);
    assert.deepEqual(orden, ['leche', 'sal']);
  });

  test('entre dos sin fecha, orden alfabetico', () => {
    const orden = [producto('sal', null), producto('aceite', null)]
      .sort(ordenarPorCaducidad)
      .map((p) => p.nombre);
    assert.deepEqual(orden, ['aceite', 'sal']);
  });
});

describe('invariante de "Todavía sirven"', () => {
  // extenderCaducidad fija la nueva fecha en hoy + N, no en la fecha anterior
  // + N. Eso solo alarga si el producto ya vencio. La seleccion multiple vive
  // unicamente en el filtro de caducados, que exige estaCaducado, asi que la
  // condicion se cumple. Esta prueba fija ese acoplamiento: si algun dia se
  // habilita la seleccion en otro filtro, "Todavía sirven" podria ACORTAR la
  // caducidad de un producto que aun no vence, y hay que cambiar la funcion.
  const DIAS_SI_SIRVE = 3;

  test('todo lo que pasa el filtro de caducados tiene dias negativos', () => {
    for (const dias of [-1, -2, -30]) {
      assert.equal(estaCaducado(producto('x', dias)), true);
    }
    for (const dias of [0, 1, 5, 10]) {
      assert.equal(estaCaducado(producto('x', dias)), false);
    }
  });

  test('sobre un producto caducado, extender siempre adelanta la fecha', () => {
    for (const dias of [-1, -7, -90]) {
      const antes = sumarDias(hoyISO(), dias);
      const despues = sumarDias(hoyISO(), DIAS_SI_SIRVE);
      assert.ok(despues > antes, `extender no adelanto la fecha con ${dias} días`);
    }
  });

  test('sobre un producto fresco acortaria la fecha, por eso el filtro importa', () => {
    const fresco = sumarDias(hoyISO(), 5);
    const trasExtender = sumarDias(hoyISO(), DIAS_SI_SIRVE);
    assert.ok(trasExtender < fresco);
    assert.equal(estaCaducado(producto('x', 5)), false);
  });
});
