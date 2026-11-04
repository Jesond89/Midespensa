import { Platform } from 'react-native';

// Base de las rutas de servidor (/api/*).
//
// En web la app y las rutas se sirven desde el mismo origen, así que la ruta
// relativa resuelve sola. En un build nativo NO hay origen: fetch('/api/datos')
// falla con "Network request failed", por eso ahí hace falta la URL absoluta
// del despliegue.
//
// EXPO_PUBLIC_API_URL se incrusta al compilar (viene de eas.json o de .env);
// no se lee en tiempo de ejecución, así que cambiarla exige volver a compilar.

const base = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

if (!base && Platform.OS !== 'web') {
  console.error(
    '[api] Falta EXPO_PUBLIC_API_URL. En nativo las rutas relativas no resuelven ' +
      'y toda llamada a /api/* va a fallar. Defínela en eas.json o en .env.',
  );
}

/** Convierte '/api/datos' en la URL a la que hay que pegarle. */
export function urlApi(ruta: string): string {
  if (/^https?:\/\//i.test(ruta)) return ruta;
  return base ? base + ruta : ruta;
}
