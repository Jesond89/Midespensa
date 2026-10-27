-- =========================================================================
-- Mi Despensa — Seguridad de acceso
--   1. Contraseñas del hogar con hash bcrypt (pgcrypto, costo 12) + bloqueo
--      temporal tras intentos fallidos.
--   2. Refresh tokens de larga vida con rotación y detección de reutilización
--      (los JWT de acceso, de vida corta, los firma el servidor de Expo).
--
-- Se ejecuta UNA vez en Supabase → SQL Editor. Es idempotente: si se vuelve
-- a correr no rompe nada.
-- =========================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -------------------------------------------------------------------------
-- 1. HOGARES: hash de contraseñas y bloqueo por intentos
-- -------------------------------------------------------------------------

ALTER TABLE public.hogares ALTER COLUMN clave DROP DEFAULT;
ALTER TABLE public.hogares ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.hogares ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMPTZ NULL;

-- Las contraseñas que estaban en texto plano pasan a bcrypt. Las vacías ('')
-- quedan "sin definir": la primera persona que inicie sesión la establece.
UPDATE public.hogares
SET clave = extensions.crypt(clave, extensions.gen_salt('bf', 12))
WHERE clave IS NOT NULL AND clave <> '' AND clave !~ '^\$2[abxy]\$\d\d\$';

-- Hogar de demostración (DESP-7F3K / 123456) si todavía no existe.
INSERT INTO public.hogares (nombre, codigo, codigo_invitacion, clave)
SELECT 'Casa Pineda', 'DESP-7F3K', 'DESP-7F3K', extensions.crypt('123456', extensions.gen_salt('bf', 12))
WHERE NOT EXISTS (
  SELECT 1 FROM public.hogares WHERE codigo_invitacion = 'DESP-7F3K' OR codigo = 'DESP-7F3K'
);

-- La app ya no puede leer ni escribir la columna clave: solo las funciones
-- de abajo (SECURITY DEFINER) la tocan. Se sigue pudiendo leer el resto.
DO $$
DECLARE
  columnas TEXT;
BEGIN
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.hogares FROM anon, authenticated;
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO columnas
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'hogares'
    AND column_name NOT IN ('clave', 'intentos_fallidos', 'bloqueado_hasta');
  EXECUTE format('GRANT SELECT (%s) ON public.hogares TO anon, authenticated', columnas);
  -- Transición: la versión anterior de la app (Railway, compañeros) crea
  -- hogares con un INSERT directo. Se sigue permitiendo, pero el trigger de
  -- abajo impide que una contraseña quede guardada en texto plano.
  GRANT INSERT (nombre, codigo, codigo_invitacion, clave) ON public.hogares TO anon, authenticated;
END $$;

CREATE OR REPLACE FUNCTION public._auth_hash_clave_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.clave IS NULL THEN
    NEW.clave := '';
  ELSIF NEW.clave <> '' AND NEW.clave !~ '^\$2[abxy]\$\d\d\$' THEN
    NEW.clave := crypt(NEW.clave, gen_salt('bf', 12));
  END IF;
  NEW.intentos_fallidos := 0;
  NEW.bloqueado_hasta := NULL;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._auth_hash_clave_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_hogares_hash_clave ON public.hogares;
CREATE TRIGGER trg_hogares_hash_clave
  BEFORE INSERT ON public.hogares
  FOR EACH ROW EXECUTE FUNCTION public._auth_hash_clave_insert();

-- Las RPC anteriores permitían crear/unirse sin contraseña: se desactivan.
DO $$
BEGIN
  IF to_regprocedure('public.crear_hogar_con_auth(text,text,text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.crear_hogar_con_auth(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.unirse_hogar_con_auth(text,text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.unirse_hogar_con_auth(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. SESIONES (refresh tokens)
-- Solo se guarda el SHA-256 del token, nunca el token. Cada uso lo rota:
-- el viejo queda marcado como usado y se emite uno nuevo de la misma
-- "familia". Si alguien presenta uno ya usado, se revoca toda la familia.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sesiones_refresh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hogar_id UUID NOT NULL REFERENCES public.hogares(id) ON DELETE CASCADE,
  familia UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ NULL,
  revocado_en TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_sesiones_refresh_familia ON public.sesiones_refresh(familia);
CREATE INDEX IF NOT EXISTS idx_sesiones_refresh_hogar ON public.sesiones_refresh(hogar_id);

-- Sin políticas: nadie la lee ni escribe por la API, solo las funciones.
ALTER TABLE public.sesiones_refresh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sesiones_refresh FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. FUNCIONES INTERNAS
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._auth_codigo_hogar()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  letras CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 símbolos, sin 0/O ni 1/I
  bytes BYTEA;
  v_codigo TEXT;
BEGIN
  LOOP
    bytes := gen_random_bytes(4);
    v_codigo := 'DESP-';
    FOR i IN 0..3 LOOP
      v_codigo := v_codigo || substr(letras, (get_byte(bytes, i) % 32) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM hogares WHERE codigo_invitacion = v_codigo OR codigo = v_codigo);
  END LOOP;
  RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public._auth_hogar_json(p_hogar_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_integrantes JSONB := '[]'::jsonb;
  v_resultado JSONB;
BEGIN
  BEGIN
    SELECT coalesce(jsonb_agg(i.nombre), '[]'::jsonb) INTO v_integrantes
    FROM integrantes i WHERE i.hogar_id = p_hogar_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_integrantes := '[]'::jsonb;
  END;

  SELECT jsonb_build_object(
    'id', h.id,
    'nombre', h.nombre,
    'codigo', coalesce(h.codigo_invitacion, h.codigo),
    'integrantes', v_integrantes
  ) INTO v_resultado
  FROM hogares h WHERE h.id = p_hogar_id;

  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public._auth_nueva_sesion(p_hogar_id UUID, p_familia UUID, p_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'refresh_hash inválido';
  END IF;
  INSERT INTO sesiones_refresh (hogar_id, familia, token_hash, expira_en)
  VALUES (p_hogar_id, p_familia, p_hash, now() + interval '30 days');
END;
$$;

REVOKE EXECUTE ON FUNCTION public._auth_codigo_hogar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._auth_hogar_json(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._auth_nueva_sesion(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 4. FUNCIONES PÚBLICAS (las llama el servidor de Expo)
-- Todas responden {ok: true, hogar} o {ok: false, error}.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_crear_hogar(p_nombre TEXT, p_clave TEXT, p_refresh_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_nombre TEXT := trim(coalesce(p_nombre, ''));
  v_codigo TEXT;
  v_id UUID;
BEGIN
  IF char_length(v_nombre) < 2 OR char_length(v_nombre) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nombre');
  END IF;
  -- bcrypt solo considera los primeros 72 bytes.
  IF p_clave IS NULL OR char_length(p_clave) < 6 OR octet_length(p_clave) > 72 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'clave-debil');
  END IF;

  v_codigo := _auth_codigo_hogar();
  INSERT INTO hogares (nombre, codigo, codigo_invitacion, clave)
  VALUES (v_nombre, v_codigo, v_codigo, crypt(p_clave, gen_salt('bf', 12)))
  RETURNING id INTO v_id;

  PERFORM _auth_nueva_sesion(v_id, gen_random_uuid(), p_refresh_hash);
  RETURN jsonb_build_object('ok', true, 'hogar', _auth_hogar_json(v_id));
END;
$$;

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
    -- Hogar creado antes de que se guardara la contraseña: se establece ahora.
    UPDATE hogares SET clave = crypt(p_clave, gen_salt('bf', 12)) WHERE id = v_hogar.id;
    v_valida := true;
  ELSIF v_hogar.clave ~ '^\$2[abxy]\$\d\d\$' THEN
    v_valida := crypt(p_clave, v_hogar.clave) = v_hogar.clave;
  ELSE
    -- Por si quedó algún valor en texto plano: se compara y se migra a bcrypt.
    v_valida := v_hogar.clave = p_clave;
    IF v_valida THEN
      UPDATE hogares SET clave = crypt(p_clave, gen_salt('bf', 12)) WHERE id = v_hogar.id;
    END IF;
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

CREATE OR REPLACE FUNCTION public.auth_rotar_sesion(p_refresh_hash TEXT, p_nuevo_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  -- Dos pestañas o peticiones que refrescan a la vez: la segunda llega con el
  -- token recién rotado. Dentro de esta ventana no se considera robo.
  c_gracia CONSTANT INTERVAL := interval '30 seconds';
  v_sesion sesiones_refresh%ROWTYPE;
BEGIN
  SELECT * INTO v_sesion FROM sesiones_refresh WHERE token_hash = p_refresh_hash FOR UPDATE;

  IF NOT FOUND OR v_sesion.revocado_en IS NOT NULL OR v_sesion.expira_en <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalido');
  END IF;

  IF v_sesion.usado_en IS NOT NULL THEN
    IF v_sesion.usado_en > now() - c_gracia THEN
      RETURN jsonb_build_object('ok', false, 'error', 'concurrente');
    END IF;
    -- Reutilización de un token ya rotado: posible robo, se cierra la familia.
    UPDATE sesiones_refresh SET revocado_en = now()
    WHERE familia = v_sesion.familia AND revocado_en IS NULL;
    RETURN jsonb_build_object('ok', false, 'error', 'reutilizado');
  END IF;

  UPDATE sesiones_refresh SET usado_en = now() WHERE id = v_sesion.id;
  PERFORM _auth_nueva_sesion(v_sesion.hogar_id, v_sesion.familia, p_nuevo_hash);
  RETURN jsonb_build_object('ok', true, 'hogar', _auth_hogar_json(v_sesion.hogar_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_cerrar_sesion(p_refresh_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_familia UUID;
BEGIN
  SELECT familia INTO v_familia FROM sesiones_refresh WHERE token_hash = p_refresh_hash;
  IF v_familia IS NOT NULL THEN
    UPDATE sesiones_refresh SET revocado_en = now()
    WHERE familia = v_familia AND revocado_en IS NULL;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auth_crear_hogar(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_iniciar_sesion(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_rotar_sesion(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_cerrar_sesion(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_crear_hogar(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_iniciar_sesion(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_rotar_sesion(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_cerrar_sesion(TEXT) TO anon, authenticated;

COMMIT;

-- Que la API de Supabase vea las funciones nuevas sin esperar.
NOTIFY pgrst, 'reload schema';
