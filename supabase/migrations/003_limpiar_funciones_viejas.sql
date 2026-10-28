-- =========================================================================
-- Mi Despensa - Limpieza de funciones de la etapa con Supabase Auth
--
-- obtener_mi_hogar() y generar_codigo_invitacion() quedaron del intento
-- anterior (signInAnonymously), que se abandono. Nada en la app las llama.
--
-- obtener_mi_hogar es SECURITY DEFINER, o sea que corre como dueno y salta
-- el RLS. Hoy devuelve NULL porque auth.uid() es null sin sesion de Supabase,
-- asi que no filtra datos; aun asi no hay motivo para que anon la ejecute.
--
-- Idempotente.
-- =========================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.obtener_mi_hogar()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.obtener_mi_hogar() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.generar_codigo_invitacion()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.generar_codigo_invitacion() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
