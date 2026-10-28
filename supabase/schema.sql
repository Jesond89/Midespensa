-- =========================================================================
-- Mi Despensa — Arquitectura Backend (Multi-tenant y Roles)
-- Autenticación anónima + miembros_hogar + Row Level Security (RLS)
-- IMPORTANTE: después de este archivo ejecuta supabase/migrations/001_seguridad_auth.sql
-- (hash bcrypt de contraseñas, refresh tokens y permisos de la columna clave).
-- Para dejar la base como esta hoy, ejecutar en este orden:
--   1. este archivo (schema.sql)
--   2. migrations/001_seguridad_auth.sql      (bcrypt + JWT + refresh tokens)
--   3. migrations/002_cerrar_acceso_datos.sql (cierra el acceso anonimo)

-- =========================================================================

-- 1. HOGARES
CREATE TABLE IF NOT EXISTS public.hogares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo VARCHAR(32) UNIQUE,
  codigo_invitacion VARCHAR(32) UNIQUE NOT NULL,
  clave TEXT DEFAULT '123456',
  creado_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INTEGRANTES
CREATE TABLE IF NOT EXISTS public.integrantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hogar_id UUID NOT NULL REFERENCES public.hogares(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_hogar_integrante UNIQUE (hogar_id, nombre)
);

-- 3. MIEMBROS_HOGAR (Puente dispositivo/usuario -> hogar con rol)
CREATE TABLE IF NOT EXISTS public.miembros_hogar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hogar_id UUID NOT NULL REFERENCES public.hogares(id) ON DELETE CASCADE,
  auth_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_mostrado TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'miembro')) DEFAULT 'miembro',
  unido_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_hogar_auth UNIQUE (hogar_id, auth_uid)
);

-- 4. PRODUCTOS (Inventario por ubicación)
CREATE TABLE IF NOT EXISTS public.productos (
  id TEXT PRIMARY KEY DEFAULT ('p_' || substr(md5(random()::text), 1, 12)),
  hogar_id UUID NOT NULL REFERENCES public.hogares(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  categoria TEXT NOT NULL,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unidad TEXT NOT NULL DEFAULT 'pieza',
  fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_caducidad DATE NULL,
  dias_para_caducar INTEGER NULL,
  notas TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  actualizado_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. FALTANTES (Lista de compras automática)
CREATE TABLE IF NOT EXISTS public.faltantes (
  id TEXT PRIMARY KEY DEFAULT ('f_' || substr(md5(random()::text), 1, 12)),
  hogar_id UUID NOT NULL REFERENCES public.hogares(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unidad TEXT NOT NULL DEFAULT 'pieza',
  categoria TEXT NULL,
  ubicacion TEXT NULL,
  agregado_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. RECETAS
CREATE TABLE IF NOT EXISTS public.recetas (
  id TEXT PRIMARY KEY DEFAULT ('r_' || substr(md5(random()::text), 1, 12)),
  hogar_id UUID REFERENCES public.hogares(id) ON DELETE CASCADE NULL,
  titulo TEXT NOT NULL,
  usa JSONB NOT NULL DEFAULT '[]'::jsonb,
  pasos JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado_en TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_miembros_hogar_auth ON public.miembros_hogar(auth_uid);
CREATE INDEX IF NOT EXISTS idx_miembros_hogar_hogar ON public.miembros_hogar(hogar_id);
CREATE INDEX IF NOT EXISTS idx_productos_hogar ON public.productos(hogar_id);
CREATE INDEX IF NOT EXISTS idx_faltantes_hogar ON public.faltantes(hogar_id);
CREATE INDEX IF NOT EXISTS idx_hogares_codigo ON public.hogares(codigo_invitacion);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
--
-- OJO: este bloque describe el estado REAL de la base despues de aplicar
-- supabase/migrations/001 y 002. Las politicas que vivian aqui antes
-- (miembros_ven_productos y companía) nunca llegaron a la base: lo que
-- habia en produccion eran politicas *_acceso_total con USING (true) para
-- anon, es decir, acceso total de cualquiera a los datos de todos los
-- hogares. La migracion 002 las elimino.
--
-- Modelo de acceso actual:
--   - RLS encendido en todas las tablas y SIN politicas: por la API de
--     Supabase (anon/authenticated) no se lee ni se escribe ninguna tabla.
--   - La app nunca habla directo con Supabase. Pasa por el servidor de Expo:
--       * /api/auth/*     -> cliente anon -> funciones auth_* SECURITY DEFINER
--       * /api/datos      -> clave secreta, filtrando por el hogar_id del JWT
--       * /api/reconocer  -> JWT + Gemini (la clave no sale del servidor)
--   - Lo unico que anon puede ejecutar son las 4 funciones auth_*.
--
-- Asi se cumple RNF-01: un hogar no alcanza los datos de otro, porque el
-- hogar_id sale del token firmado y nunca de lo que mande el cliente.
-- =========================================================================

ALTER TABLE public.hogares        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembros_hogar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faltantes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrantes    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;


-- =========================================================================
-- FUNCIONES RPC (SECURITY DEFINER)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.generar_codigo_invitacion()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  caracteres TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  resultado TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    resultado := resultado || substr(caracteres, floor(random() * length(caracteres) + 1)::integer, 1);
  END LOOP;
  RETURN resultado;
END;
$$;

-- Crear hogar
CREATE OR REPLACE FUNCTION public.crear_hogar_con_auth(
  p_nombre TEXT,
  p_nombre_mostrado TEXT,
  p_codigo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_codigo TEXT;
  v_hogar_id UUID;
  v_resultado JSONB;
BEGIN
  IF p_codigo IS NOT NULL AND length(trim(p_codigo)) > 0 THEN
    v_codigo := upper(trim(p_codigo));
  ELSE
    LOOP
      v_codigo := 'DESP-' || public.generar_codigo_invitacion();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.hogares WHERE codigo_invitacion = v_codigo);
    END LOOP;
  END IF;

  INSERT INTO public.hogares (nombre, codigo_invitacion, codigo, clave)
  VALUES (trim(p_nombre), v_codigo, v_codigo, '123456')
  RETURNING id INTO v_hogar_id;

  IF v_uid IS NOT NULL THEN
    INSERT INTO public.miembros_hogar (hogar_id, auth_uid, nombre_mostrado, rol)
    VALUES (v_hogar_id, v_uid, trim(p_nombre_mostrado), 'admin')
    ON CONFLICT (hogar_id, auth_uid) DO UPDATE
      SET rol = 'admin', nombre_mostrado = trim(p_nombre_mostrado);
  END IF;

  INSERT INTO public.integrantes (hogar_id, nombre)
  VALUES (v_hogar_id, trim(p_nombre_mostrado))
  ON CONFLICT (hogar_id, nombre) DO NOTHING;

  SELECT jsonb_build_object(
    'id', h.id,
    'nombre', h.nombre,
    'codigo_invitacion', h.codigo_invitacion,
    'codigo', h.codigo_invitacion,
    'rol', 'admin',
    'nombre_mostrado', trim(p_nombre_mostrado)
  ) INTO v_resultado
  FROM public.hogares h
  WHERE h.id = v_hogar_id;

  RETURN v_resultado;
END;
$$;

-- Unirse a hogar
CREATE OR REPLACE FUNCTION public.unirse_hogar_con_auth(
  p_codigo TEXT,
  p_nombre_mostrado TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_codigo TEXT := upper(trim(p_codigo));
  v_hogar_id UUID;
  v_resultado JSONB;
  v_rol TEXT := 'miembro';
BEGIN
  SELECT id INTO v_hogar_id
  FROM public.hogares
  WHERE codigo_invitacion = v_codigo OR codigo = v_codigo;

  IF v_hogar_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido o no encontrado';
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT rol INTO v_rol
    FROM public.miembros_hogar
    WHERE hogar_id = v_hogar_id AND auth_uid = v_uid;

    IF v_rol IS NULL THEN
      v_rol := 'miembro';
    END IF;

    INSERT INTO public.miembros_hogar (hogar_id, auth_uid, nombre_mostrado, rol)
    VALUES (v_hogar_id, v_uid, trim(p_nombre_mostrado), v_rol)
    ON CONFLICT (hogar_id, auth_uid) DO UPDATE
      SET nombre_mostrado = trim(p_nombre_mostrado);
  END IF;

  INSERT INTO public.integrantes (hogar_id, nombre)
  VALUES (v_hogar_id, trim(p_nombre_mostrado))
  ON CONFLICT (hogar_id, nombre) DO NOTHING;

  SELECT jsonb_build_object(
    'id', h.id,
    'nombre', h.nombre,
    'codigo_invitacion', h.codigo_invitacion,
    'codigo', h.codigo_invitacion,
    'rol', v_rol,
    'nombre_mostrado', trim(p_nombre_mostrado)
  ) INTO v_resultado
  FROM public.hogares h
  WHERE h.id = v_hogar_id;

  RETURN v_resultado;
END;
$$;

-- Obtener mi hogar
CREATE OR REPLACE FUNCTION public.obtener_mi_hogar()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_resultado JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', h.id,
    'nombre', h.nombre,
    'codigo_invitacion', h.codigo_invitacion,
    'rol', mh.rol,
    'nombre_mostrado', mh.nombre_mostrado,
    'integrantes', (
      SELECT jsonb_agg(m2.nombre_mostrado)
      FROM public.miembros_hogar m2
      WHERE m2.hogar_id = h.id
    )
  ) INTO v_resultado
  FROM public.miembros_hogar mh
  JOIN public.hogares h ON h.id = mh.hogar_id
  WHERE mh.auth_uid = v_uid
  ORDER BY mh.unido_en DESC
  LIMIT 1;

  RETURN v_resultado;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.crear_hogar_con_auth(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.unirse_hogar_con_auth(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.obtener_mi_hogar() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generar_codigo_invitacion() TO authenticated, anon;

GRANT ALL ON TABLE public.hogares TO authenticated, anon;
GRANT ALL ON TABLE public.integrantes TO authenticated, anon;
GRANT ALL ON TABLE public.miembros_hogar TO authenticated;
GRANT ALL ON TABLE public.productos TO authenticated, anon;
GRANT ALL ON TABLE public.faltantes TO authenticated, anon;
GRANT ALL ON TABLE public.recetas TO authenticated, anon;
