import { error, excedeLimite, leerJson, manejar, nuevoRefresh, rpc, sesionEmitida, texto } from '../../../src/server/auth';

// POST /api/auth/iniciar-sesion { codigo, clave, integrante? } → hogar + tokens.
// Sirve para "Iniciar sesión" y para "Unirme" (con integrante). Tras 5
// contraseñas incorrectas el hogar se bloquea 15 minutos (lo lleva Postgres).
export const POST = manejar(async (request) => {
  if (excedeLimite(request, 'iniciar')) return error('demasiados-intentos');
  const cuerpo = await leerJson(request);
  const codigo = texto(cuerpo?.codigo, 32);
  const clave = texto(cuerpo?.clave, 200);
  const integrante = cuerpo?.integrante == null ? null : texto(cuerpo.integrante, 40);
  if (!codigo || !clave || (cuerpo?.integrante != null && !integrante)) return error('solicitud-invalida');

  const refresh = nuevoRefresh();
  const r = await rpc('auth_iniciar_sesion', {
    p_codigo: codigo,
    p_clave: clave,
    p_integrante: integrante,
    p_refresh_hash: refresh.hash,
  });
  if (!r.ok) return error(r.error, r.reintentar_en ? { reintentarEn: r.reintentar_en } : undefined);
  return sesionEmitida(r.hogar, refresh.token);
});
