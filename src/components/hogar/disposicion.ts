// Acomodo del inicio según el tamaño de la pantalla y la zona segura de
// arriba (muesca, Dynamic Island, barra de estado). Es una función pura
// para poder probarla con las medidas de muchos dispositivos: Freddy nunca
// debe quedar debajo del selector de lugares ni detrás de la hoja.

/** Viewbox de las escenas: 400×300, suelo desde y≈232; se extiende 100 a cada lado. */
export const VB = { w: 400, h: 300, margen: 100 };

export type Marco = { s: number; x: number; y: number };

/** Escala y desplazamiento del viewBox dentro de un contenedor (cubrir, anclado abajo). */
export function marcoDe(ancho: number, alto: number): Marco {
  const s = Math.max(ancho / VB.w, alto / VB.h);
  return { s, x: (ancho - VB.w * s) / 2, y: alto - VB.h * s };
}

export const ALTO_SELECTOR = 44; // botones de 36 + relleno de 4 arriba y abajo
const SOLAPA_HOJA = 28; // la hoja tapa este tanto de la escena
const PROP_FREDDY = 232 / 260; // alto ÷ ancho del lienzo de Freddy
const PIES = 0.94; // a qué altura de su lienzo están los pies
const FREDDY_MIN = 64; // ancho mínimo de Freddy
const ESPACIO_FREDDY = 100; // alto que se reserva para Freddy bajo el selector
const ESPACIO_FREDDY_BAJA = 72; // en pantallas muy bajas, para dejarle lugar a la hoja
const MARGEN = 12;

export function disposicionInicio(ancho: number, alto: number, arriba: number) {
  const compacto = alto < 720;
  /** Pantallas muy bajas (Android chico, iPhone SE en web): tarjetas en una línea. */
  const muyCompacto = alto < 620;
  const topTitular = arriba + 56;
  const topSelector = arriba + (compacto ? 140 : 156);
  const limiteFreddy = topSelector + ALTO_SELECTOR + MARGEN;

  // La escena crece si la zona segura empuja el selector hacia abajo,
  // para que siempre quepa Freddy entre el selector y la hoja.
  const espacioFreddy = muyCompacto ? ESPACIO_FREDDY_BAJA : ESPACIO_FREDDY;
  const altoEscena = Math.round(Math.max(muyCompacto ? 280 : 300, alto * 0.46, limiteFreddy + espacioFreddy + SOLAPA_HOJA + MARGEN));
  const topeHoja = altoEscena - SOLAPA_HOJA;

  // Freddy se para en el suelo del dibujo (x≈112, y≈262), sin bajar detrás
  // de la hoja ni subir más allá del selector; si no cabe, se encoge.
  const m = marcoDe(ancho, altoEscena);
  // En pantallas muy anchas el dibujo se amplía y su suelo queda alto:
  // Freddy baja lo necesario para no chocar con el selector.
  const piesMinimos = limiteFreddy + FREDDY_MIN * PROP_FREDDY * PIES;
  const pies = Math.min(Math.max(m.y + 262 * m.s, piesMinimos), topeHoja - 6);
  const maximo = (pies - limiteFreddy) / (PROP_FREDDY * PIES);
  const tam = Math.round(Math.max(FREDDY_MIN, Math.min(altoEscena * 0.3, maximo)));
  const altoFreddy = tam * PROP_FREDDY;
  const izquierda = Math.max(8, m.x + 112 * m.s - tam / 2);

  return {
    compacto,
    muyCompacto,
    topTitular,
    topSelector,
    altoEscena,
    topeHoja,
    freddy: { tam, alto: altoFreddy, izquierda, pies, top: pies - altoFreddy * PIES, limite: limiteFreddy },
  };
}

export type DisposicionInicio = ReturnType<typeof disposicionInicio>;
