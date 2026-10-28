-- =========================================================================
-- Mi Despensa - Cierre del acceso anonimo a los datos (RNF-01)
--
-- Antes de esta migracion, las politicas *_acceso_total permitian a cualquiera
-- con la publishable key (que viaja dentro de la app, o sea es publica) leer,
-- modificar y BORRAR los productos y faltantes de TODOS los hogares.
--
-- A partir de aqui la app ya no habla directo con Supabase: pasa por
-- /api/datos, que valida el JWT y filtra por el hogar_id del token. El unico
-- acceso que conserva anon son las 4 funciones auth_* (SECURITY DEFINER).
--
-- ORDEN IMPORTANTE: ejecutar DESPUES de desplegar el codigo nuevo y de
-- agregar SUPABASE_SECRET_KEY en Railway. Si se corre antes, la version
-- desplegada deja de poder leer la despensa.
--
-- Idempotente: se puede volver a correr sin romper nada.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. Fuera las politicas permisivas (USING true para anon)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS productos_acceso_total      ON public.productos;
DROP POLICY IF EXISTS faltantes_acceso_total      ON public.faltantes;
DROP POLICY IF EXISTS hogares_acceso_total        ON public.hogares;
DROP POLICY IF EXISTS miembros_acceso_total       ON public.miembros_hogar;

-- Restos de versiones anteriores del esquema, por si siguen presentes.
DROP POLICY IF EXISTS permitir_lectura_hogares_anon ON public.hogares;
DROP POLICY IF EXISTS permitir_insert_hogares_anon  ON public.hogares;

-- -------------------------------------------------------------------------
-- 2. RLS encendido en todo. Sin politicas, nadie entra por la API:
--    solo la clave secreta (que usa el servidor) la salta.
-- -------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hogares','productos','faltantes','miembros_hogar','integrantes','recetas','sesiones_refresh']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 3. Lo unico que anon conserva: iniciar sesion y crear hogar.
--    Son SECURITY DEFINER, corren como dueno y no exponen las tablas.
-- -------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.auth_crear_hogar(TEXT, TEXT, TEXT)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_iniciar_sesion(TEXT, TEXT, TEXT, TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_rotar_sesion(TEXT, TEXT)                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_cerrar_sesion(TEXT)                      TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
