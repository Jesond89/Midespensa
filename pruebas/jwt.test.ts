import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { test, describe } from 'node:test';

import {
  AUDIENCIA,
  EMISOR,
  ErrorConfiguracion,
  firmarAcceso,
  VIDA_ACCESO_SEG,
  verificarAcceso,
} from '../src/server/jwt';

// El orden no importa: secreto() lee JWT_SECRET en cada llamada, no al
// importar el modulo, y los imports de ESM se izan de todas formas.
const SECRETO = 'secreto-de-prueba-que-pasa-los-32-bytes-exigidos';
process.env.JWT_SECRET = SECRETO;

// RNF-01. El JWT es lo unico que separa los datos de un hogar de los de otro:
// hogar_id sale del token firmado, nunca de lo que mande el cliente. Si
// verificarAcceso aceptara un token manipulado, cualquiera podria leer la
// despensa de otra familia. Estas pruebas son el seguro de esa frontera.

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** Arma un token a mano para poder manipular lo que el firmado normal no deja. */
function forjar(claims: Record<string, unknown>, cabecera: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }, secreto = SECRETO) {
  const contenido = `${b64(cabecera)}.${b64(claims)}`;
  const firma = createHmac('sha256', Buffer.from(secreto)).update(contenido).digest().toString('base64url');
  return `${contenido}.${firma}`;
}

const ahora = () => Math.floor(Date.now() / 1000);

const claimsValidos = (extra: Record<string, unknown> = {}) => ({
  sub: 'hogar-uno',
  cod: 'DESP-AAAA',
  typ: 'access',
  iss: EMISOR,
  aud: AUDIENCIA,
  iat: ahora(),
  exp: ahora() + VIDA_ACCESO_SEG,
  jti: 'abc123',
  ...extra,
});

describe('ida y vuelta', () => {
  test('un token recien firmado se verifica y conserva los claims', () => {
    const { token, expiraEnSeg } = firmarAcceso('hogar-uno', 'DESP-AAAA');
    const claims = verificarAcceso(token);
    assert.ok(claims);
    assert.equal(claims.sub, 'hogar-uno');
    assert.equal(claims.cod, 'DESP-AAAA');
    assert.equal(claims.typ, 'access');
    assert.equal(expiraEnSeg, VIDA_ACCESO_SEG);
  });

  test('dos tokens del mismo hogar no son iguales', () => {
    const a = firmarAcceso('hogar-uno', 'DESP-AAAA').token;
    const b = firmarAcceso('hogar-uno', 'DESP-AAAA').token;
    assert.notEqual(a, b, 'el jti deberia hacerlos distintos');
  });
});

describe('ataques sobre el algoritmo', () => {
  test('rechaza alg none', () => {
    const contenido = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claimsValidos())}`;
    assert.equal(verificarAcceso(`${contenido}.`), null);
  });

  test('rechaza el cambio de algoritmo a HS512', () => {
    assert.equal(verificarAcceso(forjar(claimsValidos(), { alg: 'HS512', typ: 'JWT' })), null);
  });
});

describe('aislamiento entre hogares', () => {
  test('rechaza un token al que le cambiaron el hogar', () => {
    const { token } = firmarAcceso('hogar-uno', 'DESP-AAAA');
    const [cabecera, , firma] = token.split('.');
    const suplantado = `${cabecera}.${b64({ ...claimsValidos(), sub: 'hogar-dos' })}.${firma}`;
    assert.equal(verificarAcceso(suplantado), null);
  });

  test('rechaza un token firmado con otro secreto', () => {
    const otro = 'otro-secreto-distinto-pero-igual-de-largo-32';
    assert.equal(verificarAcceso(forjar(claimsValidos(), { alg: 'HS256', typ: 'JWT' }, otro)), null);
  });
});

describe('vigencia', () => {
  test('rechaza un token vencido mas alla del margen de reloj', () => {
    assert.equal(verificarAcceso(forjar(claimsValidos({ exp: ahora() - 120 }))), null);
  });

  test('tolera un vencimiento dentro del margen de reloj', () => {
    assert.ok(verificarAcceso(forjar(claimsValidos({ exp: ahora() - 10 }))));
  });

  test('rechaza un token emitido en el futuro', () => {
    assert.equal(verificarAcceso(forjar(claimsValidos({ iat: ahora() + 300 }))), null);
  });
});

describe('claims obligatorios', () => {
  test('rechaza otro tipo de token', () => {
    assert.equal(verificarAcceso(forjar(claimsValidos({ typ: 'refresh' }))), null);
  });

  test('rechaza otro emisor y otra audiencia', () => {
    assert.equal(verificarAcceso(forjar(claimsValidos({ iss: 'otra-app' }))), null);
    assert.equal(verificarAcceso(forjar(claimsValidos({ aud: 'otra-audiencia' }))), null);
  });

  test('rechaza un hogar que no es texto', () => {
    assert.equal(verificarAcceso(forjar(claimsValidos({ sub: 42 }))), null);
  });
});

describe('tokens mal formados', () => {
  test('rechaza lo que no tiene tres partes', () => {
    for (const malo of ['', 'a', 'a.b', 'a.b.c.d']) {
      assert.equal(verificarAcceso(malo), null, `acepto ${JSON.stringify(malo)}`);
    }
  });

  test('rechaza partes que no son JSON', () => {
    assert.equal(verificarAcceso('bWFsbw.bWFsbw.bWFsbw'), null);
  });
});

describe('configuracion', () => {
  test('se niega a firmar con un secreto corto', () => {
    const previo = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'corto';
    try {
      assert.throws(() => firmarAcceso('hogar-uno', 'DESP-AAAA'), ErrorConfiguracion);
    } finally {
      process.env.JWT_SECRET = previo;
    }
  });
});
