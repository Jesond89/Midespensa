-- =========================================================================
-- Mi Despensa - Limite diario de IA que sobrevive a los reinicios
--
-- Las rutas /api/reconocer y /api/recetas llevaban el conteo en un Map en
-- memoria del proceso de Expo. Railway levanta un proceso nuevo en cada
-- despliegue y ese Map nace vacio: el dia que se desplego seis veces, cada
-- hogar recibio seis veces su cupo y el limite dejo de proteger la cuota
-- gratuita de Gemini (que es UNA sola para todos los hogares).
--
-- El contador se mueve aqui, donde un reinicio no lo borra. El tope NO vive en
-- la base: lo manda el servidor (src/server/limite.ts, LIMITES_IA) para que el
-- numero este en un solo lugar y se pueda ajustar sin otra migracion.
--
-- Se ejecuta UNA vez en Supabase -> SQL Editor. Se puede correr antes o
-- despues de desplegar el codigo: la version anterior no llama a estas
-- funciones, y la nueva, si no las encuentra, responde "sin-configurar".
--
-- Idempotente: se puede volver a correr sin romper nada.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. TABLA: una fila por hogar, tipo de uso y dia
--
-- 'escaneo' (/api/reconocer) y 'recetas' (/api/recetas) llevan cupos
-- distintos, asi que el tipo es parte de la llave: gastar escaneos no toca
-- las sugerencias. La llave primaria (hogar_id, tipo, dia) es la que hace
-- posible el INSERT .. ON CONFLICT atomico de mas abajo.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usos_ia (
  hogar_id UUID NOT NULL REFERENCES public.hogares(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  dia DATE NOT NULL,
  usos INTEGER NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usos_ia_pk PRIMARY KEY (hogar_id, tipo, dia),
  CONSTRAINT usos_ia_tipo_valido CHECK (tipo IN ('escaneo', 'recetas')),
  CONSTRAINT usos_ia_usos_no_negativos CHECK (usos >= 0)
);

-- Para el barrido de filas viejas (ver ia_limpiar_usos): sin este indice el
-- "dia < corte" tendria que leer la tabla completa.
CREATE INDEX IF NOT EXISTS idx_usos_ia_dia ON public.usos_ia(dia);

-- Igual de cerrada que sesiones_refresh: RLS encendido y SIN politicas, asi
-- que por la API publica no entra nadie. El servidor usa la clave secreta
-- (src/server/supabaseAdmin.ts), y de hecho solo habla con las funciones de
-- abajo, nunca con la tabla directo.
ALTER TABLE public.usos_ia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.usos_ia FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 2. EL DIA DEL CONTADOR
--
-- La sesion de Postgres en Supabase corre en UTC, donde la medianoche cae a
-- las 18:00 en Mexico: el cupo se reiniciaria a media tarde. Se cuenta por
-- dia local para que "10 escaneos por dia" sea el dia del usuario.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._ia_dia_local()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$ SELECT (now() AT TIME ZONE 'America/Mexico_City')::date $$;

-- -------------------------------------------------------------------------
-- 3. LIMPIEZA
--
-- Solo hace falta la fila de hoy; se guarda una semana nomas para poder
-- revisar el uso reciente si algo se ve raro. SKIP LOCKED para que el
-- barrido nunca se quede esperando a una peticion en curso.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ia_limpiar_usos(p_dias INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_corte DATE := _ia_dia_local() - greatest(coalesce(p_dias, 7), 1);
  v_borradas INTEGER;
BEGIN
  DELETE FROM usos_ia
  WHERE ctid IN (
    SELECT u.ctid FROM usos_ia u WHERE u.dia < v_corte FOR UPDATE SKIP LOCKED
  );
  GET DIAGNOSTICS v_borradas = ROW_COUNT;
  RETURN v_borradas;
END;
$$;

-- -------------------------------------------------------------------------
-- 4. CONSUMIR UN USO (la que llama el servidor)
--
-- Devuelve {permitido, usos, limite, restantes}. "permitido" es lo unico que
-- la ruta necesita; el resto sirve para los logs y para una pantalla futura
-- que quiera mostrar "te quedan 3".
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ia_consumir_uso(p_hogar_id UUID, p_tipo TEXT, p_limite INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_retencion CONSTANT INTEGER := 7;   -- dias que se guardan (ver ia_limpiar_usos)
  c_prob_barrido CONSTANT REAL := 0.01;
  v_dia DATE := _ia_dia_local();
  v_usos INTEGER;
BEGIN
  -- El tipo y el tope vienen del servidor: si llegan mal es un error de
  -- programacion, no algo que deba traducirse a "no te queda cupo".
  IF p_hogar_id IS NULL OR p_tipo IS NULL OR p_tipo NOT IN ('escaneo', 'recetas') THEN
    RAISE EXCEPTION 'ia_consumir_uso: tipo invalido (%)', coalesce(p_tipo, 'null');
  END IF;
  IF p_limite IS NULL OR p_limite < 1 OR p_limite > 10000 THEN
    RAISE EXCEPTION 'ia_consumir_uso: limite invalido (%)', coalesce(p_limite, -1);
  END IF;

  -- Las filas viejas de ESTE hogar se van en cada llamada: es un acceso por
  -- el prefijo de la llave primaria, casi siempre sin nada que borrar, y no
  -- toca filas de otros hogares, asi que no se traba con sus peticiones.
  DELETE FROM usos_ia
  WHERE hogar_id = p_hogar_id AND tipo = p_tipo AND dia < v_dia - c_retencion;

  -- ATOMICIDAD: un solo enunciado. El INSERT crea la fila del dia si no
  -- existe (y si dos peticiones corren a la vez, la llave primaria hace que
  -- una de las dos caiga en el ON CONFLICT); el DO UPDATE toma el candado de
  -- esa fila, asi que la segunda peticion espera y lee el valor que dejo la
  -- primera. No hay leer-y-luego-escribir, o sea que no hay ventana para que
  -- dos peticiones se queden las dos con el ultimo uso.
  --
  -- El WHERE es lo que impide pasar del tope: cuando la fila ya llego al
  -- limite no se actualiza nada, el contador se queda clavado ahi y una
  -- peticion rechazada no le gasta nada al hogar.
  INSERT INTO usos_ia (hogar_id, tipo, dia, usos)
  VALUES (p_hogar_id, p_tipo, v_dia, 1)
  ON CONFLICT (hogar_id, tipo, dia) DO UPDATE
     SET usos = usos_ia.usos + 1, actualizado_en = now()
   WHERE usos_ia.usos < p_limite
  RETURNING usos INTO v_usos;

  IF v_usos IS NULL THEN
    -- El WHERE no dejo actualizar: el hogar ya estaba en el tope.
    SELECT u.usos INTO v_usos FROM usos_ia u
     WHERE u.hogar_id = p_hogar_id AND u.tipo = p_tipo AND u.dia = v_dia;
    RETURN jsonb_build_object(
      'permitido', false,
      'usos', coalesce(v_usos, p_limite),
      'limite', p_limite,
      'restantes', 0
    );
  END IF;

  -- Barrido general de vez en cuando: recoge lo que dejaron los hogares que
  -- ya no usan la IA. La tabla es minuscula (una fila por hogar, tipo y dia),
  -- asi que 1 de cada 100 llamadas alcanza y sale gratis.
  IF random() < c_prob_barrido THEN
    PERFORM ia_limpiar_usos(c_retencion);
  END IF;

  RETURN jsonb_build_object(
    'permitido', true,
    'usos', v_usos,
    'limite', p_limite,
    'restantes', greatest(p_limite - v_usos, 0)
  );
END;
$$;

-- -------------------------------------------------------------------------
-- 5. PERMISOS
--
-- anon y authenticated NO pueden llamarlas: la publishable key viaja dentro
-- de la app, y con ella cualquiera podria quemarle el cupo del dia a un hogar
-- o pedir un p_limite enorme para saltarse el suyo. Solo el servidor, que usa
-- la clave secreta (service_role), las ejecuta.
-- -------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public._ia_dia_local()                            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ia_limpiar_usos(INTEGER)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ia_consumir_uso(UUID, TEXT, INTEGER)       FROM PUBLIC, anon, authenticated;

-- Explicito, por si el proyecto no tiene los default privileges de Supabase
-- para funciones nuevas (ahi el REVOKE de PUBLIC dejaria fuera al servidor).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ia_consumir_uso(UUID, TEXT, INTEGER) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ia_limpiar_usos(INTEGER) TO service_role';
  END IF;
END $$;

COMMIT;

-- Que la API de Supabase vea las funciones nuevas sin esperar.
NOTIFY pgrst, 'reload schema';
