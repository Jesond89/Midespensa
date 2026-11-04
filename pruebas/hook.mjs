// Resuelve los imports del proyecto, que no llevan extension: en modo ESM
// Node exige "./fechas.ts" y el codigo dice "./fechas". En vez de tocar
// cientos de imports, se completa la extension aqui.
const CANDIDATOS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (e) {
    if (e?.code !== 'ERR_MODULE_NOT_FOUND' || !especificador.startsWith('.')) throw e;
    for (const sufijo of CANDIDATOS) {
      try {
        return await siguiente(especificador + sufijo, contexto);
      } catch {
        // se prueba el siguiente
      }
    }
    throw e;
  }
}
