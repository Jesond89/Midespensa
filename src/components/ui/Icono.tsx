import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Íconos propios de Mi Despensa. Estilo "duotono": formas rellenas y
// redondeadas en dos capas (una sólida y otra translúcida del mismo color),
// casi sin contornos. Solo los glifos pequeños (+, ✓, flechas) son trazos
// gruesos. Todo se dibuja en una cuadrícula de 24×24.
//
// Capas:  p  relleno sólido (por defecto)
//         s  relleno translúcido (secundario)
//         l  trazo grueso redondeado

type Capa = { d: string; t?: 's' | 'l' };

const OPACIDAD_SECUNDARIA = 0.4;
const GROSOR = 2.4;

// Círculo como trazado, para poder combinarlo con otras formas.
const c = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;

const s = (d: string): Capa => ({ d, t: 's' });
const l = (d: string): Capa => ({ d, t: 'l' });
const p = (d: string): Capa => ({ d });

// Engranaje de 8 dientes, calculado para que quede simétrico.
const ENGRANAJE = (() => {
  const g = (a: number, r: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(12 + r * Math.cos(rad)).toFixed(2)} ${(12 + r * Math.sin(rad)).toFixed(2)}`;
  };
  const puntos = Array.from({ length: 8 }, (_, t) => {
    const a = t * 45;
    return [g(a - 14, 7.6), g(a - 8, 10.2), g(a + 8, 10.2), g(a + 14, 7.6)].join('L');
  });
  return `M${puntos.join('L')}Z`;
})();

const BOLSA = [
  s('M4.5 8.5A1.5 1.5 0 0 1 6 7h12a1.5 1.5 0 0 1 1.5 1.5l-.8 10.6a2 2 0 0 1-2 1.9H7.3a2 2 0 0 1-2-1.9z'),
  p('M8 8V6a4 4 0 0 1 8 0v2h-2.2V6a1.8 1.8 0 0 0-3.6 0v2z'),
];

const ICONOS = {
  // Navegación y lugares
  casa: [
    s('M3.5 10.2c0-.6.3-1.2.8-1.6l6.4-5a2 2 0 0 1 2.6 0l6.4 5c.5.4.8 1 .8 1.6V19a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z'),
    p('M9.5 21v-4.5a2.5 2.5 0 0 1 5 0V21z'),
  ],
  frasco: [
    s('M5 9.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z'),
    p('M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5v.5A1.5 1.5 0 0 1 16.5 5.5h-9A1.5 1.5 0 0 1 6 4z'),
    p('M5 11.5h14v5H5z'),
  ],
  carrito: [
    s('M5.6 6.5h14a1 1 0 0 1 1 1.3l-1.5 5.5a2 2 0 0 1-1.9 1.5H7.9z'),
    l('M2.8 3.8h1.9l3 11.4h9.8'),
    p(c(9, 19.8, 1.8)),
    p(c(17, 19.8, 1.8)),
  ],
  bolsa: BOLSA,
  'bolsa-lista': [...BOLSA, l('M9 14.2l2.1 2.1 4-4.1')],
  olla: [
    s('M4 10.5h16v6A4.5 4.5 0 0 1 15.5 21h-7A4.5 4.5 0 0 1 4 16.5z'),
    p('M3 8.5A1.5 1.5 0 0 1 4.5 7h15a1.5 1.5 0 0 1 0 3h-15A1.5 1.5 0 0 1 3 8.5z'),
    p('M10.5 5.5a1.5 1.5 0 0 1 3 0V7h-3z'),
    p('M2.5 12H4v2.5H2.5a1.25 1.25 0 0 1 0-2.5z'),
    p('M20 12h1.5a1.25 1.25 0 0 1 0 2.5H20z'),
  ],
  persona: [
    p(c(12, 7.5, 4)),
    s('M4 19.5c0-3.5 3.6-6 8-6s8 2.5 8 6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z'),
  ],
  ajustes: [s(ENGRANAJE), p(c(12, 12, 3.6))],
  camara: [
    s('M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.4-2h6.2l1.4 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z'),
    p(c(12, 13, 3.6)),
  ],
  galeria: [
    s('M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z'),
    p('M5.5 18l4-5 3 3.5 2-2.5 4 4z'),
    p(c(15.5, 8, 1.8)),
  ],
  globo: [
    s('M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6l-4.5 3.5V17H7a3 3 0 0 1-3-3z'),
    p(c(8.5, 10, 1.3)), p(c(12, 10, 1.3)), p(c(15.5, 10, 1.3)),
  ],
  vibrar: [
    s('M7.5 4a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z'),
    p('M10.5 17.8h3a.8.8 0 0 1 0 1.6h-3a.8.8 0 0 1 0-1.6z'),
    l('M4 9v6M20 9v6'),
  ],
  entrar: [
    s('M12 3h5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-5z'),
    l('M3.5 12h10M10 8.5l3.5 3.5-3.5 3.5'),
  ],
  salir: [
    s('M4 6a3 3 0 0 1 3-3h5v18H7a3 3 0 0 1-3-3z'),
    l('M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5'),
  ],

  // Acciones y estados
  lapiz: [
    s('M15.6 3.6a2 2 0 0 1 2.8 0l2 2a2 2 0 0 1 0 2.8L9.5 19.3 4 20l.7-5.5z'),
    p('M15.6 3.6a2 2 0 0 1 2.8 0l2 2a2 2 0 0 1 0 2.8l-1.6 1.6-4.8-4.8z'),
  ],
  basura: [
    p('M9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4h4a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2h4z'),
    s('M6 8h12l-.9 11.2a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8z'),
  ],
  buscar: [
    s(c(10.5, 10.5, 6.5)),
    l('M16 16l4.5 4.5'),
  ],
  chispas: [
    p('M10 3c.5 3.8 2.2 5.5 6 6-3.8.5-5.5 2.2-6 6-.5-3.8-2.2-5.5-6-6 3.8-.5 5.5-2.2 6-6z'),
    s('M18 13c.3 2.2 1.3 3.2 3.5 3.5-2.2.3-3.2 1.3-3.5 3.5-.3-2.2-1.3-3.2-3.5-3.5 2.2-.3 3.2-1.3 3.5-3.5z'),
  ],
  alerta: [
    s(c(12, 12, 9.5)),
    p('M12 6.5a1.2 1.2 0 0 1 1.2 1.2v4.6a1.2 1.2 0 0 1-2.4 0V7.7A1.2 1.2 0 0 1 12 6.5z'),
    p(c(12, 16.2, 1.3)),
  ],
  reloj: [
    s(c(12, 12, 9.5)),
    l('M12 7.5V12l3 2'),
  ],
  calendario: [
    s('M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z'),
    p('M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3z'),
    p('M7 3a1 1 0 0 1 2 0v2H7zM15 3a1 1 0 0 1 2 0v2h-2z'),
    p('M14 14.5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H15a1 1 0 0 1-1-1z'),
  ],
  infinito: [
    l('M12 12c-1.8-2.4-3.2-3.5-5-3.5a3.5 3.5 0 0 0 0 7c1.8 0 3.2-1.1 5-3.5s3.2-3.5 5-3.5a3.5 3.5 0 0 1 0 7c-1.8 0-3.2-1.1-5-3.5z'),
  ],
  llave: [
    s('M11 10.5h9.5A1.5 1.5 0 0 1 22 12v2.5a1 1 0 0 1-2 0v-1h-1.5V15a1 1 0 0 1-2 0v-1.5H11z'),
    p('M7.5 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z'),
  ],
  candado: [
    p('M7 10V7.5a5 5 0 0 1 10 0V10h-2.4V7.5a2.6 2.6 0 0 0-5.2 0V10z'),
    s('M4.5 12A2.5 2.5 0 0 1 7 9.5h10a2.5 2.5 0 0 1 2.5 2.5v6.5A2.5 2.5 0 0 1 17 21H7a2.5 2.5 0 0 1-2.5-2.5z'),
    p('M12 13a1.5 1.5 0 0 1 .9 2.7V17a.9.9 0 0 1-1.8 0v-1.3A1.5 1.5 0 0 1 12 13z'),
  ],
  escudo: [
    s('M12 2.5l7.5 3v6c0 4.6-3.2 8.4-7.5 10-4.3-1.6-7.5-5.4-7.5-10v-6z'),
    l('M8.8 12.2l2.2 2.2 4.2-4.4'),
  ],
  ojo: [
    s('M12 5c4.6 0 8 3.6 9.5 7-1.5 3.4-4.9 7-9.5 7s-8-3.6-9.5-7C4 8.6 7.4 5 12 5z'),
    p(c(12, 12, 3)),
  ],
  'ojo-tachado': [
    s('M12 5c4.6 0 8 3.6 9.5 7-1.5 3.4-4.9 7-9.5 7s-8-3.6-9.5-7C4 8.6 7.4 5 12 5z'),
    l('M4 4l16 16'),
  ],
  toque: [s(c(12, 12, 9.5)), p(c(12, 12, 4.5))],
  circulo: [s(c(12, 12, 9.5))],
  'check-circulo': [s(c(12, 12, 9.5)), l('M7.8 12.3l2.8 2.8 5.6-5.8')],
  'mas-circulo': [s(c(12, 12, 9.5)), l('M12 8v8M8 12h8')],

  // Glifos
  mas: [l('M12 5v14M5 12h14')],
  menos: [l('M5 12h14')],
  check: [l('M5 12.5l4.5 4.5L19 7.5')],
  cerrar: [l('M6.5 6.5l11 11M17.5 6.5l-11 11')],
  chevron: [l('M9 5l7 7-7 7')],
  'flecha-derecha': [l('M4 12h15M13 6l6 6-6 6')],
  'flecha-arriba': [l('M12 20V5M6 11l6-6 6 6')],

  // Categorías
  manzana: [
    s('M12 7.5c1.6-1 3-1.3 4.3-1 2.6.6 4 3 3.6 6.4-.5 4.2-3.3 8.1-5.9 8.1-.9 0-1.3-.4-2-.4s-1.1.4-2 .4c-2.6 0-5.4-3.9-5.9-8.1-.4-3.4 1-5.8 3.6-6.4 1.3-.3 2.7 0 4.3 1z'),
    p('M12.5 6.5c0-2.4 1.6-4 4-4 0 2.4-1.6 4-4 4z'),
  ],
  hoja: [
    s('M20 4c0 9-5 15-12 15-1.4 0-2.6-.3-3.5-.8C4.2 10.4 9.5 4 20 4z'),
    l('M4 20c3-5 6.5-8.5 11-11'),
  ],
  huevo: [
    s('M12 2.5c3.6 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3.4-11 7-11z'),
    p(c(12, 14.5, 3)),
  ],
  pez: [
    s('M7 12c1.8-3.4 4.6-5.5 7.5-5.5 3.2 0 5.6 2.2 6.5 5.5-.9 3.3-3.3 5.5-6.5 5.5-2.9 0-5.7-2.1-7.5-5.5z'),
    p('M2.5 7.5c2 .4 3.7 2 4.5 4.5-.8 2.5-2.5 4.1-4.5 4.5.7-1.5 1-3 1-4.5s-.3-3-1-4.5z'),
    p(c(16.5, 11, 1.2)),
  ],
  pan: [
    s('M4 10.5C4 7.5 7.6 5 12 5s8 2.5 8 5.5c0 1.2-.6 2-1.5 2.5V18a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-5C4.6 12.5 4 11.7 4 10.5z'),
    l('M9 11l1.5-2.5M13.5 11 15 8.5'),
  ],
  saco: [
    s('M7 7.5h10c2.5 3 3.5 6 3.5 8.5a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5c0-2.5 1-5.5 3.5-8.5z'),
    p('M8 3.5A1.5 1.5 0 0 1 9.5 2h5A1.5 1.5 0 0 1 16 3.5V4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z'),
  ],
  caja: [
    p('M11.1 2.9a2 2 0 0 1 1.8 0l7.1 3.7a.5.5 0 0 1 0 .9L12 11.5 4 7.5a.5.5 0 0 1 0-.9z'),
    s('M3.5 8.8 11 12.8v8.7l-6.4-3.4a2 2 0 0 1-1.1-1.8z'),
    s('M20.5 8.8 13 12.8v8.7l6.4-3.4a2 2 0 0 0 1.1-1.8z'),
  ],
  taza: [
    s('M4 8.5h12v6A5.5 5.5 0 0 1 10.5 20h-1A5.5 5.5 0 0 1 4 14.5z'),
    p('M16 9.5h1.5a3 3 0 0 1 0 6H16v-2h1.5a1 1 0 0 0 0-2H16z'),
    l('M8 3v2M12 3v2'),
  ],
  copo: [
    s(c(12, 12, 5)),
    l('M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9'),
  ],
  etiqueta: [
    s('M3 5a2 2 0 0 1 2-2h6.2a2 2 0 0 1 1.4.6l8.2 8.2a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.6 12.6A2 2 0 0 1 3 11.2z'),
    p(c(8, 8, 1.8)),
  ],

  // Ubicaciones
  refri: [
    s('M5 5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4H5z'),
    s('M5 10.5h14V19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z'),
    p('M8 5.5a1 1 0 0 1 2 0V7a1 1 0 0 1-2 0zM8 13a1 1 0 0 1 2 0v3a1 1 0 0 1-2 0z'),
  ],
  alacena: [
    s('M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14H4z'),
    p('M4 17.5h16V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'),
    p(c(10.3, 10, 1.1)),
    p(c(13.7, 10, 1.1)),
  ],
  frutero: [
    p(c(9, 8, 3)),
    p(c(15, 8.5, 2.5)),
    s('M3 11.5h18c0 4.7-4 8.5-9 8.5s-9-3.8-9-8.5z'),
  ],
} satisfies Record<string, Capa[]>;

export type NombreIcono = keyof typeof ICONOS;

type IconoProps = {
  nombre: NombreIcono;
  tamano?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icono({ nombre, tamano = 24, color = '#000', style }: IconoProps) {
  const capas: Capa[] = ICONOS[nombre];
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" style={style} pointerEvents="none">
      {capas.map(({ d, t }, i) =>
        t === 'l' ? (
          <Path key={i} d={d} fill="none" stroke={color} strokeWidth={GROSOR} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <Path key={i} d={d} fill={color} fillRule="evenodd" fillOpacity={t === 's' ? OPACIDAD_SECUNDARIA : 1} />
        ),
      )}
    </Svg>
  );
}
