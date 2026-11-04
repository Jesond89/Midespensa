-- 005: un hogar sin contraseña ya no se puede reclamar.
--
-- La función auth_iniciar_sesion traía un atajo de migración: si el hogar
-- tenía la contraseña vacía, guardaba la primera que llegara y concedía el
-- acceso. Servía para los hogares creados antes de que hubiera contraseñas,
-- pero deja cualquier hogar vacío al alcance de quien tenga el código de
-- invitación, que no es un secreto: se comparte para invitar.
--
-- Antes de aplicar esto, correr supabase/consultas/estado_claves.sql. Si
-- reporta hogares en estado "vacia", después de esta migración nadie podrá
-- entrar en ellos hasta establecerles la contraseña con:
--
--   UPDATE hogares
--      SET clave = crypt('LA_QUE_ELIJAN', gen_salt('bf', 12)),
--          intentos_fallidos = 0,
--          bloqueado_hasta = NULL
--    WHERE codigo = 'DESP-XXXX';
--
-- El diagnostico del 4 de noviembre reporto: 1 hogar vacio (DESP-SV7Y),
-- 5 en bcrypt, 0 en texto plano. Por eso esta migracion cierra las dos
-- ramas: la contraseña vacia y la de texto plano.

BEGIN;

CREATE OR REPLACE FUNCTION public.auth_iniciar_sesion(
  p_codigo TEXT,
  p_clave TEXT,
  p_integrante TEXT,
  p_refresh_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  c_max_intentos CONSTANT INTEGER := 5;
  c_bloqueo CONSTANT INTERVAL := interval '15 minutes';
  v_codigo TEXT := upper(trim(coalesce(p_codigo, '')));
  v_integrante TEXT := nullif(trim(coalesce(p_integrante, '')), '');
  v_hogar hogares%ROWTYPE;
  v_valida BOOLEAN;
BEGIN
  IF p_clave IS NULL OR char_length(p_clave) < 6 OR octet_length(p_clave) > 72 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'clave');
  END IF;

  SELECT * INTO v_hogar FROM hogares
  WHERE codigo_invitacion = v_codigo OR codigo = v_codigo
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'codigo');
  END IF;

  IF v_hogar.bloqueado_hasta IS NOT NULL AND v_hogar.bloqueado_hasta > now() THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'bloqueado',
      'reintentar_en', ceil(extract(epoch FROM v_hogar.bloqueado_hasta - now()))::int
    );
  END IF;

  IF v_hogar.clave IS NULL OR v_hogar.clave = '' THEN
    -- Un hogar sin contraseña NO se puede reclamar iniciando sesión. Antes,
    -- esta rama guardaba como propia la primera contraseña que llegara y daba
    -- acceso: cualquiera con el código de invitación se quedaba con el hogar.
    -- Ahora se rechaza, y la contraseña solo se puede establecer desde el
    -- editor SQL por quien administra el proyecto.
    RETURN jsonb_build_object('ok', false, 'error', 'clave');
  ELSIF v_hogar.clave ~ '^\$2[abxy]\$\d\d\$' THEN
    v_valida := crypt(p_clave, v_hogar.clave) = v_hogar.clave;
  ELSE
    -- Ya no se aceptan contraseñas en texto plano. El diagnostico del 4 de
    -- noviembre reporto cero hogares en ese estado, asi que esta rama era
    -- codigo muerto que solo debilitaba la garantia de que toda contraseña
    -- guardada es un hash bcrypt.
    v_valida := false;
  END IF;

  IF NOT v_valida THEN
    IF v_hogar.intentos_fallidos + 1 >= c_max_intentos THEN
      UPDATE hogares SET intentos_fallidos = 0, bloqueado_hasta = now() + c_bloqueo WHERE id = v_hogar.id;
      RETURN jsonb_build_object('ok', false, 'error', 'bloqueado',
        'reintentar_en', extract(epoch FROM c_bloqueo)::int);
    END IF;
    UPDATE hogares SET intentos_fallidos = intentos_fallidos + 1 WHERE id = v_hogar.id;
    RETURN jsonb_build_object('ok', false, 'error', 'clave');
  END IF;

  UPDATE hogares SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = v_hogar.id;

  IF v_integrante IS NOT NULL THEN
    BEGIN
      INSERT INTO integrantes (hogar_id, nombre)
      SELECT v_hogar.id, left(v_integrante, 40)
      WHERE NOT EXISTS (
        SELECT 1 FROM integrantes WHERE hogar_id = v_hogar.id AND nombre = left(v_integrante, 40)
      );
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      NULL;
    END;
  END IF;

  -- Limpieza de sesiones vencidas del hogar.
  DELETE FROM sesiones_refresh WHERE hogar_id = v_hogar.id AND expira_en < now() - interval '1 day';

  PERFORM _auth_nueva_sesion(v_hogar.id, gen_random_uuid(), p_refresh_hash);
  RETURN jsonb_build_object('ok', true, 'hogar', _auth_hogar_json(v_hogar.id));
END;
$$;

-- Los permisos no cambian: CREATE OR REPLACE los conserva, pero se repiten
-- aquí para que la migración sea legible por sí sola.
REVOKE EXECUTE ON FUNCTION public.auth_iniciar_sesion(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_iniciar_sesion(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
