import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';

import { aTexto, desdeTexto, diasHasta, formatear, haceCuanto, hoyISO, sumarDias } from '../src/utils/fechas';

// Las fechas se guardan como texto ISO local para no depender de la zona
// horaria. Estas pruebas fijan ese contrato: si alguien cambia a Date o a UTC,
// fallan aqui en vez de fallar en el telefono de un usuario.

describe('sumarDias', () => {
  test('cruza el fin de mes', () => {
    assert.equal(sumarDias('2026-01-31', 1), '2026-02-01');
  });

  test('cruza el fin de anio', () => {
    assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  });

  test('respeta el anio bisiesto', () => {
    assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  });

  test('resta con dias negativos', () => {
    assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
  });

  test('sumar cero no mueve la fecha', () => {
    assert.equal(sumarDias('2026-10-12', 0), '2026-10-12');
  });
});

describe('diasHasta', () => {
  test('hoy son cero dias', () => {
    assert.equal(diasHasta(hoyISO()), 0);
  });

  test('cuenta hacia adelante', () => {
    assert.equal(diasHasta(sumarDias(hoyISO(), 5)), 5);
  });

  test('cuenta hacia atras con signo negativo', () => {
    assert.equal(diasHasta(sumarDias(hoyISO(), -3)), -3);
  });
});

describe('desdeTexto', () => {
  test('acepta DD/MM/AAAA', () => {
    assert.equal(desdeTexto('12/10/2026'), '2026-10-12');
  });

  test('acepta un solo digito en dia y mes', () => {
    assert.equal(desdeTexto('1/1/2026'), '2026-01-01');
  });

  test('rechaza una fecha que no existe', () => {
    assert.equal(desdeTexto('31/02/2026'), null);
  });

  test('rechaza el 29 de febrero en anio comun', () => {
    assert.equal(desdeTexto('29/02/2026'), null);
  });

  test('acepta el 29 de febrero en anio bisiesto', () => {
    assert.equal(desdeTexto('29/02/2028'), '2028-02-29');
  });

  test('rechaza el formato ISO, que no es el de entrada', () => {
    assert.equal(desdeTexto('2026-10-12'), null);
  });

  test('rechaza texto vacio y basura', () => {
    assert.equal(desdeTexto(''), null);
    assert.equal(desdeTexto('manzanas'), null);
  });
});

describe('ida y vuelta', () => {
  test('aTexto y desdeTexto son inversas', () => {
    for (const iso of ['2026-01-01', '2026-10-12', '2028-02-29', '2026-12-31']) {
      assert.equal(desdeTexto(aTexto(iso)), iso);
    }
  });
});

describe('texto para el usuario', () => {
  test('formatear usa el mes abreviado en espaniol', () => {
    assert.equal(formatear('2026-10-12'), '12 oct 2026');
  });

  test('haceCuanto nombra hoy y ayer', () => {
    assert.equal(haceCuanto(hoyISO()), 'hoy');
    assert.equal(haceCuanto(sumarDias(hoyISO(), -1)), 'ayer');
  });

  test('haceCuanto cuenta los dias mas atras', () => {
    assert.equal(haceCuanto(sumarDias(hoyISO(), -5)), 'hace 5 días');
  });
});
