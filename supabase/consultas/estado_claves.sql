-- Diagnostico del estado de las contrasenias de los hogares.
-- No revela ninguna contrasenia: solo clasifica la forma del valor guardado.
-- Correr en el editor SQL de Supabase ANTES de aplicar la migracion 005.

SELECT
  CASE
    WHEN clave IS NULL OR clave = ''              THEN '1. vacia (RECLAMABLE por cualquiera)'
    WHEN clave ~ '^\$2[abxy]\$\d\d\$'            THEN '2. bcrypt (correcta)'
    ELSE                                               '3. texto plano (debe migrarse)'
  END AS estado,
  count(*) AS hogares,
  string_agg(codigo, ', ' ORDER BY codigo) AS codigos
FROM hogares
GROUP BY 1
ORDER BY 1;
