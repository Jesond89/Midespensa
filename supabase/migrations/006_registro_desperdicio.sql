-- 006: registro de desperdicio.
--
-- La aplicacion existe para reducir el desperdicio de alimentos, y hasta
-- ahora no podia medirlo: "se acabo" y "lo tire" terminaban igual, con el
-- producto fuera de la despensa y nada que distinguiera un caso del otro.
--
-- Se guarda una copia de los datos del producto, no una referencia: al
-- tirarlo, el producto sale de la despensa, asi que una clave foranea a
-- productos quedaria colgando. Lo que importa conservar es que se tiro
-- tanto de tal cosa, tal dia.
--
-- No se guarda nada derivable. Los dias que llevaba vencido salen de
-- registrado_en menos fecha_caducidad cuando haga falta.

BEGIN;

CREATE TABLE IF NOT EXISTS public.desperdicios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hogar_id        UUID NOT NULL REFERENCES public.hogares(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  cantidad        NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  unidad          TEXT NOT NULL,
  categoria       TEXT,
  fecha_caducidad DATE,
  registrado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.desperdicios IS
  'Productos que un hogar marco como tirados. Copia de los datos del producto, que ya no existe.';
COMMENT ON COLUMN public.desperdicios.fecha_caducidad IS
  'La que tenia el producto al tirarlo; NULL si no tenia fecha.';

-- Las consultas utiles son siempre por hogar y por periodo.
CREATE INDEX IF NOT EXISTS desperdicios_hogar_fecha_idx
  ON public.desperdicios (hogar_id, registrado_en DESC);

-- Mismo criterio que la migracion 002: ninguna tabla es alcanzable por la
-- Data API. Todo el acceso pasa por el backend con la llave de servicio,
-- que filtra por el hogar_id que viene firmado en el JWT.
ALTER TABLE public.desperdicios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.desperdicios FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
