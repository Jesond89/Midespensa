import React from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Lienzo, Pieza, PropsEscena, useBucle, useVaiven } from './lienzo';

// Ilustraciones de los ambientes del inicio, dibujadas a mano en SVG para
// poder animar cada parte. Viewbox 400×300 (ver lienzo.tsx). Freddy se
// para en x≈112 sobre el suelo, así que los muebles altos van a la
// derecha y la esquina superior izquierda queda despejada para el texto.

// ——— Piezas reutilizables ———

const rango = (desde: number, hasta: number, paso: number) =>
  Array.from({ length: Math.floor((hasta - desde) / paso) + 1 }, (_, i) => desde + i * paso);

/** Pared con degradado, suelo con líneas en perspectiva y zócalo. */
function Interior({ id, pared, suelo, zocalo, lineas }: { id: string; pared: [string, string]; suelo: string; zocalo: string; lineas: string }) {
  const lineasSuelo = rango(-120, 520, 44).map((x) => `M${x} 234L${x + (x - 200) * 0.7} 300`).join('');
  return (
    <>
      <Defs>
        <LinearGradient id={`${id}-pared`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={pared[0]} />
          <Stop offset="1" stopColor={pared[1]} />
        </LinearGradient>
      </Defs>
      <Rect x={-100} y={0} width={600} height={236} fill={`url(#${id}-pared)`} />
      <Rect x={-100} y={232} width={600} height={68} fill={suelo} />
      <Path d={lineasSuelo} stroke={lineas} strokeWidth={1.2} />
      <Rect x={-100} y={228} width={600} height={7} fill={zocalo} />
    </>
  );
}

const Sombra = ({ cx, ancho }: { cx: number; ancho: number }) => (
  <Ellipse cx={cx} cy={236} rx={ancho / 2} ry={6} fill="#000" opacity={0.08} />
);

type ParticulaProps = {
  x: number; y: number; r: number; color: string; borde?: string;
  ms: number; retraso?: number; sube: number; deriva?: number;
};

/** Burbuja, vaho o humo: sube, se agranda y se desvanece en bucle. */
function Particula({ x, y, r, color, borde, ms, retraso = 0, sube, deriva = 0 }: ParticulaProps) {
  const v = useBucle(ms, retraso);
  const t = r + 2;
  return (
    <Pieza
      x={x - t} y={y - t} w={t * 2} h={t * 2}
      mover={{
        y: v.interpolate({ inputRange: [0, 1], outputRange: [0, -sube] }),
        x: v.interpolate({ inputRange: [0, 1], outputRange: [0, deriva] }),
        opacidad: v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 0.8, 0] }),
        escala: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }),
      }}
    >
      <Circle cx={t} cy={t} r={r} fill={color} stroke={borde} strokeWidth={borde ? 1.2 : 0} />
    </Pieza>
  );
}

function Vapor({ x, y, retraso }: { x: number; y: number; retraso: number }) {
  const v = useBucle(2800, retraso);
  return (
    <Pieza
      x={x - 7} y={y - 26} w={14} h={26}
      mover={{
        y: v.interpolate({ inputRange: [0, 1], outputRange: [6, -30] }),
        opacidad: v.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 0.9, 0.6, 0] }),
        escala: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }),
      }}
    >
      <Path d="M7 24C2 18 12 14 7 8C3 4 9 2 7 0" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />
    </Pieza>
  );
}

function Destello({ x, y, retraso, color = '#F6C66B' }: { x: number; y: number; retraso: number; color?: string }) {
  const v = useVaiven(1800, retraso);
  return (
    <Pieza
      x={x - 6} y={y - 6} w={12} h={12}
      mover={{
        escala: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
        opacidad: v,
        giro: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }),
      }}
    >
      <Path d="M6 0C6.6 4.4 7.6 5.4 12 6C7.6 6.6 6.6 7.6 6 12C5.4 7.6 4.4 6.6 0 6C4.4 5.4 5.4 4.4 6 0Z" fill={color} />
    </Pieza>
  );
}

function Nube({ x, y, k, ms, recorrido }: { x: number; y: number; k: number; ms: number; recorrido: [number, number] }) {
  const v = useVaiven(ms);
  // Nube fina y alargada, sin contorno de caricatura.
  return (
    <Pieza x={x} y={y} w={110 * k} h={24 * k} mover={{ x: v.interpolate({ inputRange: [0, 1], outputRange: recorrido }) }}>
      <G transform={`scale(${k})`} opacity={0.75}>
        <Ellipse cx={55} cy={15} rx={52} ry={7} fill="#FFFFFF" />
        <Ellipse cx={42} cy={11} rx={26} ry={9} fill="#FFFFFF" />
        <Ellipse cx={70} cy={12} rx={18} ry={7} fill="#FFFFFF" />
      </G>
    </Pieza>
  );
}

// ——— Casa (exterior moderno) ———

/** Pasto ornamental: hojas delgadas que se mecen con el viento. */
function Pastos({ x, retraso }: { x: number; retraso: number }) {
  const v = useVaiven(3400, retraso);
  return (
    <Pieza x={x} y={196} w={20} h={30} pivote="abajo" mover={{ giro: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }}>
      <Path
        d="M10 30C9 20 4 12 1 4M10 30C10 18 9 8 10 0M10 30C11 20 15 12 19 5M10 30C8 22 6 16 4 12M10 30C12 22 14 17 16 13"
        stroke="#8FA67F" strokeWidth={1.4} strokeLinecap="round" fill="none"
      />
    </Pieza>
  );
}

export function EscenaCasa(p: PropsEscena) {
  const sol = useVaiven(5000);
  const arbol = useVaiven(4200);
  const luz = useVaiven(4600);
  const reflejo = useBucle(7000, 800);
  const listones = rango(234, 372, 6).map((x) => `M${x} 104V154`).join('');
  return (
    <Lienzo
      {...p}
      fondo={
        <>
          <Defs>
            <LinearGradient id="casa-cielo" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#C6DCEB" />
              <Stop offset="1" stopColor="#EEF3F4" />
            </LinearGradient>
            <LinearGradient id="casa-vidrio" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#4C5D6C" />
              <Stop offset="1" stopColor="#2C3742" />
            </LinearGradient>
          </Defs>
          <Rect x={-100} y={0} width={600} height={300} fill="url(#casa-cielo)" />
          <Circle cx={342} cy={46} r={15} fill="#FFF3D8" />
          {/* Colinas lejanas y pasto */}
          <Path d="M-100 204Q40 178 160 194T420 188T600 192V300H-100Z" fill="#DCE5E1" />
          <Path d="M-100 226H600V300H-100Z" fill="#C5D6B8" />
          <Path d="M-100 262Q150 252 400 260T600 258V300H-100Z" fill="#BACDAA" />
          {/* Seto recto */}
          <Rect x={-100} y={212} width={292} height={20} rx={10} fill="#A6BE9A" />
          <Rect x={-100} y={222} width={292} height={12} rx={6} fill="#98B18C" />
          {/* Andador de losas */}
          <Path d="M306 234H338L350 300H294Z" fill="#E6E3DD" />
          <Path d="M304 250H341M302 268H344M299 286H347" stroke="#D3CFC7" strokeWidth={1.5} />
          <Ellipse cx={282} cy={236} rx={98} ry={5} fill="#000" opacity={0.08} />
          {/* Volumen bajo: muro blanco con ventanal */}
          <Rect x={194} y={158} width={168} height={76} fill="#F3F1EC" />
          <Rect x={194} y={158} width={168} height={76} fill="#000" opacity={0.02} />
          <Rect x={204} y={170} width={92} height={64} fill="url(#casa-vidrio)" />
          <Circle cx={252} cy={198} r={14} fill="#F6D9A6" opacity={0.28} />
          <Rect x={251} y={198} width={2} height={36} fill="#1F252B" opacity={0.5} />
          <Rect x={204} y={168} width={92} height={2} fill="#2B2F33" />
          <Rect x={234} y={170} width={2} height={64} fill="#2B2F33" />
          <Rect x={265} y={170} width={2} height={64} fill="#2B2F33" />
          <Rect x={310} y={182} width={22} height={52} fill="#8C6B4F" />
          <Rect x={326} y={202} width={2} height={12} rx={1} fill="#E8E1D6" />
          <Rect x={338} y={188} width={4} height={9} rx={1} fill="#2B2F33" />
          <Rect x={190} y={153} width={176} height={6} rx={1} fill="#2B2F33" />
          {/* Volumen alto en voladizo, de madera */}
          <Rect x={230} y={104} width={144} height={50} fill="#B98A62" />
          <Path d={listones} stroke="#A97B55" strokeWidth={1} />
          <Rect x={246} y={116} width={96} height={26} fill="#F3D7A4" />
          <Rect x={246} y={114} width={96} height={2} fill="#2B2F33" />
          <Rect x={293} y={116} width={2} height={26} fill="#2B2F33" />
          <Rect x={226} y={99} width={152} height={6} rx={1} fill="#2B2F33" />
          <Rect x={230} y={159} width={132} height={5} fill="#000" opacity={0.08} />
          {/* Jardinera de concreto */}
          <Rect x={200} y={224} width={58} height={12} rx={2} fill="#CFCBC3" />
          {/* Árbol esbelto: tronco claro (la copa se mece aparte) */}
          <Rect x={166} y={158} width={4} height={76} rx={2} fill="#E9E5DD" />
          <Path d="M166 176h4M166 192h4M166 210h4" stroke="#6F6A62" strokeWidth={1.2} />
        </>
      }
    >
      <Pieza x={312} y={16} w={60} h={60} mover={{ escala: sol.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }), opacidad: sol.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }) }}>
        <Circle cx={30} cy={30} r={28} fill="#FFF3D8" />
      </Pieza>
      <Nube x={10} y={30} k={1} ms={26000} recorrido={[-20, 50]} />
      <Nube x={200} y={70} k={0.7} ms={22000} recorrido={[20, -30]} />
      {/* Luz interior que respira y lámpara de la entrada */}
      <Pieza x={246} y={116} w={96} h={26} mover={{ opacidad: luz.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }}>
        <Rect x={0} y={0} width={96} height={26} fill="#FFFFFF" />
      </Pieza>
      <Pieza x={330} y={180} w={20} h={24} mover={{ opacidad: luz.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] }) }}>
        <Ellipse cx={10} cy={12} rx={9} ry={11} fill="#FFE2A8" opacity={0.6} />
      </Pieza>
      {/* Reflejo que recorre el ventanal */}
      <Pieza x={204} y={170} w={92} h={64} recorte mover={{ x: reflejo.interpolate({ inputRange: [0, 0.55, 1], outputRange: [-70, 110, 110] }) }}>
        <Path d="M10 0H28L8 64H-10Z" fill="#FFFFFF" opacity={0.12} />
        <Path d="M34 0H40L20 64H14Z" fill="#FFFFFF" opacity={0.08} />
      </Pieza>
      <Pastos x={204} retraso={0} />
      <Pastos x={220} retraso={500} />
      <Pastos x={236} retraso={1000} />
      <Pieza x={138} y={90} w={60} h={78} pivote="abajo" mover={{ giro: arbol.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) }}>
        <Ellipse cx={30} cy={34} rx={24} ry={33} fill="#9DB89A" />
        <Ellipse cx={22} cy={44} rx={15} ry={22} fill="#8FAE8C" />
        <Ellipse cx={38} cy={26} rx={12} ry={18} fill="#AAC3A6" />
      </Pieza>
    </Lienzo>
  );
}

// ——— Refrigerador ———

export function EscenaRefri(p: PropsEscena) {
  const luz = useVaiven(3400);
  return (
    <Lienzo
      {...p}
      fondo={
        <>
          <Interior id="refri" pared={['#EEF6FB', '#DCEAF4']} suelo="#CCDBE6" zocalo="#E3EDF4" lineas="#BFD0DD" />
          {/* Planta */}
          <Path d="M40 234L44 210H66L70 234Z" fill="#D9876A" />
          <Path d="M55 210C50 190 38 186 34 176C46 178 54 188 55 210ZM55 210C58 186 70 178 78 172C76 186 66 196 55 210ZM55 210C54 192 56 178 60 166C64 180 60 196 55 210Z" fill="#6FB45F" />
          <Sombra cx={266} ancho={150} />
          {/* Refri */}
          <Rect x={206} y={62} width={124} height={172} rx={16} fill="#F7FAFC" />
          <Rect x={318} y={72} width={12} height={156} rx={6} fill="#E6EEF3" />
          <Rect x={210} y={66} width={116} height={44} rx={12} fill="#EEF4F8" />
          <Rect x={222} y={98} width={34} height={5} rx={2.5} fill="#B7C6D1" />
          <Rect x={276} y={74} width={14} height={16} rx={2} fill="#FFE58F" />
          <Circle cx={304} cy={80} r={4} fill="#F07A63" />
          <Rect x={216} y={118} width={104} height={108} rx={8} fill="#D6ECF8" />
          <Rect x={216} y={150} width={104} height={4} fill="#B9D6E7" />
          <Rect x={216} y={186} width={104} height={4} fill="#B9D6E7" />
          {/* Repisa de arriba */}
          <Path d="M226 150V128L232 122H242L248 128V150Z" fill="#FFFFFF" />
          <Rect x={226} y={134} width={22} height={6} fill="#6FA8DC" />
          <Rect x={256} y={124} width={10} height={26} rx={4} fill="#8FD19E" />
          <Rect x={259} y={118} width={4} height={7} fill="#6DBB7F" />
          <Path d="M276 150L308 150L308 134Z" fill="#FFD36E" />
          <Circle cx={298} cy={145} r={2} fill="#F2BE4E" />
          <Circle cx={304} cy={140} r={1.5} fill="#F2BE4E" />
          {/* Repisa de en medio */}
          <Ellipse cx={230} cy={176} rx={5} ry={7} fill="#FFF1DA" />
          <Ellipse cx={242} cy={175} rx={5} ry={7} fill="#FFF1DA" />
          <Ellipse cx={254} cy={176} rx={5} ry={7} fill="#FFF1DA" />
          <Rect x={222} y={178} width={42} height={8} rx={2} fill="#E8D6BD" />
          <Rect x={282} y={162} width={18} height={24} rx={4} fill="#F07A63" />
          <Rect x={281} y={158} width={20} height={6} rx={2} fill="#C4604B" />
          {/* Cajón de verduras */}
          <Circle cx={236} cy={200} r={9} fill="#7CC26F" />
          <Circle cx={254} cy={203} r={7} fill="#F07A63" />
          <Circle cx={298} cy={201} r={8} fill="#8ACD7C" />
          <Rect x={220} y={204} width={96} height={20} rx={6} fill="#EAF6FC" opacity={0.92} />
          {/* Puerta entreabierta */}
          <Path d="M206 118L180 126V222L206 230Z" fill="#EEF4F8" />
          <Rect x={186} y={150} width={6} height={16} rx={2} fill="#F2C94C" />
          <Rect x={194} y={153} width={6} height={13} rx={2} fill="#8FD19E" />
          <Rect x={182} y={166} width={22} height={3} fill="#C9D9E4" />
          <Rect x={186} y={190} width={7} height={14} rx={2} fill="#F07A63" />
          <Rect x={182} y={204} width={22} height={3} fill="#C9D9E4" />
        </>
      }
    >
      <Pieza x={216} y={118} w={104} h={108} mover={{ opacidad: luz.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] }) }}>
        <Rect x={0} y={0} width={104} height={108} rx={8} fill="#FFFFFF" />
      </Pieza>
      {[[0, 150], [1100, 176], [2200, 200]].map(([r, y]) => (
        <Particula key={r} x={204} y={y} r={7} color="#FFFFFF" ms={3300} retraso={r} sube={10} deriva={-46} />
      ))}
      <Destello x={240} y={88} retraso={300} color="#9FC3DD" />
      <Destello x={312} y={100} retraso={1100} color="#9FC3DD" />
    </Lienzo>
  );
}

// ——— Cocina ———

export function EscenaCocina(p: PropsEscena) {
  const cucharon = useVaiven(2400);
  const fuego = useVaiven(900);
  const azulejos = [
    ...rango(150, 500, 22).map((x) => `M${x} 112V172`),
    'M150 134H500', 'M150 156H500',
  ].join('');
  return (
    <Lienzo
      {...p}
      fondo={
        <>
          <Interior id="cocina" pared={['#FCEFE2', '#F6E0CB']} suelo="#E7D0BA" zocalo="#F0DCC8" lineas="#D9BFA6" />
          <Rect x={150} y={112} width={350} height={62} fill="#FBE7D6" />
          <Path d={azulejos} stroke="#EFD3BD" strokeWidth={1.4} />
          {/* Banquito */}
          <Ellipse cx={50} cy={198} rx={20} ry={5} fill="#D38E62" />
          <Path d="M36 200L32 234M64 200L68 234M42 202L42 234M58 202L58 234" stroke="#BE7A50" strokeWidth={3} strokeLinecap="round" />
          {/* Gabinetes y barra */}
          <Rect x={160} y={180} width={340} height={52} fill="#D38E62" />
          <Path d="M222 184V230M284 184V230M346 184V230" stroke="#BE7A50" strokeWidth={2} />
          {[214, 230, 276, 292, 338, 354].map((x) => <Circle key={x} cx={x} cy={196} r={2.5} fill="#F6E1CD" />)}
          <Rect x={154} y={172} width={346} height={12} rx={4} fill="#F6E7D8" />
          <Rect x={154} y={182} width={346} height={3} fill="#E2CDB8" />
          <Rect x={190} y={166} width={100} height={8} rx={3} fill="#43444C" />
          {/* Olla */}
          <Rect x={192} y={136} width={14} height={6} rx={3} fill="#B8473C" />
          <Rect x={274} y={136} width={14} height={6} rx={3} fill="#B8473C" />
          <Rect x={204} y={128} width={72} height={40} rx={10} fill="#E8665A" />
          <Rect x={212} y={136} width={6} height={22} rx={3} fill="#FFFFFF" opacity={0.3} />
          <Ellipse cx={240} cy={128} rx={38} ry={6} fill="#D3574B" />
          <Rect x={235} y={116} width={10} height={8} rx={3} fill="#B8473C" />
          {/* Frutero */}
          <Path d="M304 158Q312 140 330 146Q316 148 310 158Z" fill="#F6D04D" />
          <Circle cx={330} cy={150} r={8} fill="#E8665A" />
          <Path d="M330 142Q334 136 338 138Q336 142 330 142Z" fill="#6FB45F" />
          <Ellipse cx={344} cy={152} rx={6} ry={8} fill="#6E9E4F" />
          <Path d="M300 158H352A26 13 0 0 1 300 158Z" fill="#8FB7E8" />
          {/* Riel de utensilios */}
          <Rect x={196} y={46} width={130} height={4} rx={2} fill="#A9A9B2" />
          <Rect x={212} y={50} width={3} height={34} fill="#8C5A3C" />
          <Rect x={207} y={82} width={13} height={16} rx={3} fill="#8C5A3C" />
          <Rect x={300} y={50} width={3} height={36} fill="#A9A9B2" />
          <Ellipse cx={301.5} cy={92} rx={6} ry={8} fill="#A9A9B2" />
        </>
      }
    >
      <Pieza x={200} y={163} w={80} h={6} mover={{ opacidad: fuego.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] }) }}>
        <Rect x={0} y={0} width={80} height={6} rx={3} fill="#FF8A3D" />
      </Pieza>
      {[[222, 0], [240, 900], [258, 1800]].map(([x, r]) => <Vapor key={x} x={x} y={116} retraso={r} />)}
      <Pieza x={250} y={48} w={16} h={56} pivote="arriba" mover={{ giro: cucharon.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '7deg'] }) }}>
        <Rect x={6.5} y={0} width={3} height={42} fill="#A9A9B2" />
        <Path d="M1 42H15A7 7 0 0 1 1 42Z" fill="#A9A9B2" />
      </Pieza>
    </Lienzo>
  );
}

// ——— Alacena ———

export function EscenaAlacena(p: PropsEscena) {
  const lampara = useVaiven(3000);
  const lata = (x: number, color: string) => (
    <G key={x}>
      <Rect x={x} y={126} width={20} height={30} rx={3} fill="#D7DCE3" />
      <Rect x={x} y={134} width={20} height={12} fill={color} />
      <Ellipse cx={x + 10} cy={126} rx={10} ry={2.5} fill="#C3C9D2" />
    </G>
  );
  return (
    <Lienzo
      {...p}
      fondo={
        <>
          <Interior id="alacena" pared={['#F7F0E2', '#EDE0C8']} suelo="#E0C7A3" zocalo="#E9D7BC" lineas="#CDB089" />
          {/* Lámpara */}
          <Rect x={261} y={0} width={2} height={28} fill="#8C7A68" />
          <Path d="M248 36L276 36L270 26H254Z" fill="#3D3D44" />
          {/* Canasta de papas */}
          <Circle cx={46} cy={206} r={7} fill="#D2A86E" />
          <Circle cx={60} cy={203} r={8} fill="#C99B5E" />
          <Circle cx={73} cy={206} r={6} fill="#D2A86E" />
          <Path d="M30 234L36 206H78L84 234Z" fill="#C9A27A" />
          <Path d="M34 216H80M32 225H82" stroke="#B48A60" strokeWidth={2} />
          <Sombra cx={262} ancho={180} />
          {/* Mueble */}
          <Path d="M184 44L160 54V222L184 232Z" fill="#C98C61" />
          <Path d="M340 44L364 54V222L340 232Z" fill="#C98C61" />
          <Circle cx={176} cy={140} r={2.5} fill="#F5E4CB" />
          <Circle cx={348} cy={140} r={2.5} fill="#F5E4CB" />
          <Rect x={184} y={40} width={156} height={194} rx={10} fill="#B97E54" />
          <Rect x={194} y={50} width={136} height={176} rx={4} fill="#F5E4CB" />
          <Rect x={194} y={50} width={136} height={6} fill="#E9D3B3" />
          <Rect x={194} y={100} width={136} height={6} fill="#A8714B" />
          <Rect x={194} y={156} width={136} height={6} fill="#A8714B" />
          {/* Arriba: miel, mermelada, cereal, pasta */}
          <Rect x={202} y={74} width={22} height={26} rx={5} fill="#F6C66B" />
          <Rect x={200} y={69} width={26} height={7} rx={3} fill="#B97E54" />
          <Rect x={230} y={78} width={18} height={22} rx={4} fill="#E8665A" />
          <Rect x={229} y={74} width={20} height={6} rx={2} fill="#9C4A3E" />
          <Rect x={256} y={60} width={28} height={40} rx={3} fill="#7FA7E8" />
          <Rect x={260} y={70} width={20} height={14} rx={2} fill="#FFFFFF" />
          <Circle cx={270} cy={77} r={4} fill="#F6C66B" />
          <Rect x={292} y={66} width={30} height={34} rx={6} fill="#FFFFFF" opacity={0.9} />
          <Path d="M298 76L316 80M296 84L318 88M298 92L314 95" stroke="#F2C94C" strokeWidth={3} strokeLinecap="round" />
          <Rect x={290} y={62} width={34} height={6} rx={3} fill="#B97E54" />
          {/* En medio: latas, café, especias */}
          {lata(202, '#E8665A')}
          {lata(226, '#6BB38A')}
          <Path d="M252 156V122L258 114H278L284 122V156Z" fill="#8C5A3C" />
          <Circle cx={268} cy={136} r={6} fill="#F5E4CB" />
          <Rect x={292} y={138} width={10} height={18} rx={2} fill="#E9A23B" />
          <Rect x={305} y={136} width={10} height={20} rx={2} fill="#C4603F" />
          <Rect x={318} y={140} width={9} height={16} rx={2} fill="#6BB38A" />
          {/* Abajo: arroz, aceite, harina */}
          <Path d="M204 226C200 200 206 184 214 176H240C248 184 254 200 250 226Z" fill="#EFE1C8" />
          <Rect x={218} y={172} width={18} height={6} rx={3} fill="#B97E54" />
          <Rect x={266} y={172} width={10} height={6} rx={2} fill="#C4603F" />
          <Rect x={267} y={176} width={8} height={12} fill="#F2C94C" />
          <Rect x={262} y={186} width={18} height={40} rx={6} fill="#F2C94C" />
          <Rect x={290} y={190} width={32} height={36} rx={4} fill="#FFFFFF" />
          <Rect x={296} y={200} width={20} height={10} rx={2} fill="#E9D7BC" />
        </>
      }
    >
      <Pieza x={236} y={36} w={52} h={44} mover={{ opacidad: lampara.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] }) }}>
        <Path d="M14 0H38L52 44H0Z" fill="#FFE8A6" />
      </Pieza>
      <Destello x={214} y={66} retraso={0} />
      <Destello x={318} y={60} retraso={700} />
      <Destello x={276} y={176} retraso={1300} />
    </Lienzo>
  );
}
