import { error, hashRefresh, leerJson, manejar, rpc, texto } from '../../../src/server/auth';

// POST /api/auth/cerrar-sesion { refreshToken } → revoca la sesión en la base.
// El JWT de acceso que quede vivo caduca solo en menos de 15 minutos.
export const POST = manejar(async (request) => {
  const cuerpo = await leerJson(request);
  const refreshToken = texto(cuerpo?.refreshToken, 200);
  if (!refreshToken) return error('solicitud-invalida');
  await rpc('auth_cerrar_sesion', { p_refresh_hash: hashRefresh(refreshToken) });
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
});
