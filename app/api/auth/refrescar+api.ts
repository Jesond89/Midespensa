import { error, hashRefresh, leerJson, manejar, nuevoRefresh, rpc, sesionEmitida, texto } from '../../../src/server/auth';

// POST /api/auth/refrescar { refreshToken } → nuevo JWT + nuevo refresh token.
// El refresh token usado queda invalidado (rotación). Si alguien vuelve a
// presentar uno ya usado, se revoca toda la sesión (posible robo).
export const POST = manejar(async (request) => {
  const cuerpo = await leerJson(request);
  const refreshToken = texto(cuerpo?.refreshToken, 200);
  if (!refreshToken) return error('solicitud-invalida');

  const nuevo = nuevoRefresh();
  const r = await rpc('auth_rotar_sesion', { p_refresh_hash: hashRefresh(refreshToken), p_nuevo_hash: nuevo.hash });
  if (!r.ok) return error(r.error);
  return sesionEmitida(r.hogar, nuevo.token);
});
