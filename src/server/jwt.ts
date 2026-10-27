import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// JWT HS256 firmados con JWT_SECRET (.env). Solo se usa en las rutas de
// servidor (app/api): nunca importar desde pantallas o providers.

export const EMISOR = 'midespensa';
export const AUDIENCIA = 'midespensa-app';
export const VIDA_ACCESO_SEG = 15 * 60; // 15 minutos
const MARGEN_RELOJ_SEG = 30;

export type ClaimsAcceso = {
  sub: string; // id del hogar
  cod: string; // código del hogar
  typ: 'access';
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
};

export class ErrorConfiguracion extends Error {}

function secreto(): Buffer {
  const valor = process.env.JWT_SECRET;
  // 32 bytes = 256 bits, lo mínimo para HMAC-SHA256.
  if (!valor || Buffer.byteLength(valor) < 32) {
    throw new ErrorConfiguracion('JWT_SECRET no está configurado o es muy corto (mínimo 32 caracteres).');
  }
  return Buffer.from(valor);
}

const b64url = (datos: Buffer | string) => Buffer.from(datos).toString('base64url');
const firma = (contenido: string) => createHmac('sha256', secreto()).update(contenido).digest();

export function firmarAcceso(hogarId: string, codigo: string): { token: string; expiraEnSeg: number } {
  const ahora = Math.floor(Date.now() / 1000);
  const claims: ClaimsAcceso = {
    sub: hogarId,
    cod: codigo,
    typ: 'access',
    iss: EMISOR,
    aud: AUDIENCIA,
    iat: ahora,
    exp: ahora + VIDA_ACCESO_SEG,
    jti: randomBytes(12).toString('base64url'),
  };
  const contenido = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  return { token: `${contenido}.${b64url(firma(contenido))}`, expiraEnSeg: VIDA_ACCESO_SEG };
}

/** Devuelve los claims si el token es auténtico y vigente; si no, null. */
export function verificarAcceso(token: string): ClaimsAcceso | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [cabecera64, claims64, firma64] = partes;

  let cabecera: { alg?: unknown; typ?: unknown };
  let claims: Partial<ClaimsAcceso>;
  try {
    cabecera = JSON.parse(Buffer.from(cabecera64, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(claims64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  // Solo HS256: evita los ataques de "alg: none" o de cambio de algoritmo.
  if (cabecera.alg !== 'HS256') return null;

  const esperada = firma(`${cabecera64}.${claims64}`);
  const recibida = Buffer.from(firma64, 'base64url');
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;

  const ahora = Math.floor(Date.now() / 1000);
  if (claims.typ !== 'access' || claims.iss !== EMISOR || claims.aud !== AUDIENCIA) return null;
  if (typeof claims.exp !== 'number' || claims.exp + MARGEN_RELOJ_SEG < ahora) return null;
  if (typeof claims.iat !== 'number' || claims.iat - MARGEN_RELOJ_SEG > ahora) return null;
  if (typeof claims.sub !== 'string' || typeof claims.cod !== 'string') return null;
  return claims as ClaimsAcceso;
}
