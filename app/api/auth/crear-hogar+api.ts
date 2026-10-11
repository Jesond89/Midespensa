import { error, excedeLimite, leerJson, manejar, nuevoRefresh, rpc, sesionEmitida, texto } from '../../../src/server/auth';

// POST /api/auth/crear-hogar { nombre, clave } → hogar + tokens.
// La contraseña se guarda con bcrypt (costo 12) dentro de Postgres.
export const POST = manejar(async (request) => {
  if (excedeLimite(request, 'crear')) return error('demasiados-intentos');
  const cuerpo = await leerJson(request);
  const nombre = texto(cuerpo?.nombre, 60);
  const clave = texto(cuerpo?.clave, 200);
  if (!nombre || !clave) return error('solicitud-invalida');

  const refresh = nuevoRefresh();
  const r = await rpc('auth_crear_hogar', { p_nombre: nombre, p_clave: clave, p_refresh_hash: refresh.hash });
  if (!r.ok) return error(r.error);
  return sesionEmitida(r.hogar, refresh.token, { rol: 'admin' });
});
