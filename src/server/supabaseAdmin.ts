import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ErrorConfiguracion } from './jwt';

// Cliente de Supabase SOLO para rutas de servidor (app/api). Usa la clave
// secreta, que salta el RLS: por eso nunca debe importarse desde pantallas,
// providers ni nada que viaje al telefono. Las rutas que lo usan filtran
// siempre por el hogar_id que viene del JWT, nunca por uno que mande el cliente.

// Sin tipos generados de la base: cliente laxo para que insert/update acepten objetos.
let cliente: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) {
    throw new ErrorConfiguracion('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en las variables de entorno.');
  }
  cliente = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cliente;
}
