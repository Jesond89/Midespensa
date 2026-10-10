import React, { createContext, useContext, useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

// Base de las escenas del inicio. Cada escena se dibuja en un viewBox de
// 400×300 (suelo desde y≈232) y se escala para cubrir su contenedor,
// anclada abajo. El fondo se extiende 100 unidades a cada lado para que el
// paralaje no deje huecos al deslizar.
//
// Las partes animadas (`Pieza`) son Views encima del dibujo, colocadas en
// las mismas coordenadas del viewBox.

import { VB, marcoDe, Marco } from './disposicion';

export { VB, marcoDe };
const ND = Platform.OS !== 'web';

const MarcoCtx = createContext<Marco>({ s: 1, x: 0, y: 0 });

/**
 * Si la escena está a la vista. Las que no, pausan sus animaciones en bucle:
 * con varias escenas montadas a la vez, correrlas todas traba el recorrido.
 */
export const EscenaActivaCtx = createContext(true);

export type PropsEscena = {
  ancho: number;
  alto: number;
  /** Desplazamiento horizontal del dibujo (paralaje), en px. */
  paralaje: Animated.AnimatedInterpolation<number>;
};

type LienzoProps = PropsEscena & { fondo: React.ReactNode; children?: React.ReactNode };

export function Lienzo({ ancho, alto, paralaje, fondo, children }: LienzoProps) {
  const m = marcoDe(ancho, alto);
  return (
    <View style={[styles.lienzo, { width: ancho, height: alto }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: paralaje }] }]}>
        <Svg
          width={(VB.w + VB.margen * 2) * m.s}
          height={VB.h * m.s}
          viewBox={`${-VB.margen} 0 ${VB.w + VB.margen * 2} ${VB.h}`}
          style={{ position: 'absolute', left: m.x - VB.margen * m.s, top: m.y }}
        >
          {fondo}
        </Svg>
        <MarcoCtx.Provider value={m}>{children}</MarcoCtx.Provider>
      </Animated.View>
    </View>
  );
}

type Num = Animated.Value | Animated.AnimatedInterpolation<number>;

type PiezaProps = {
  /** Posición y tamaño en unidades del viewBox; el dibujo usa 0..w × 0..h. */
  x: number; y: number; w: number; h: number;
  mover?: { x?: Num; y?: Num; giro?: Animated.AnimatedInterpolation<string>; escala?: Num; opacidad?: Num };
  /** Punto sobre el que gira. */
  pivote?: 'centro' | 'abajo' | 'arriba';
  /** Recorta lo que sale del rectángulo (o del círculo, con `redondo`). */
  recorte?: boolean;
  redondo?: boolean;
  children: React.ReactNode;
};

export function Pieza({ x, y, w, h, mover, pivote = 'centro', recorte, redondo, children }: PiezaProps) {
  const m = useContext(MarcoCtx);
  const W = w * m.s;
  const H = h * m.s;
  const desp = pivote === 'abajo' ? H / 2 : pivote === 'arriba' ? -H / 2 : 0;
  const transform = [
    ...(mover?.x ? [{ translateX: Animated.multiply(mover.x, m.s) }] : []),
    ...(mover?.y ? [{ translateY: Animated.multiply(mover.y, m.s) }] : []),
    ...(mover?.giro ? [{ translateY: desp }, { rotate: mover.giro }, { translateY: -desp }] : []),
    ...(mover?.escala ? [{ scale: mover.escala }] : []),
  ];
  return (
    <View
      style={{
        position: 'absolute', left: m.x + x * m.s, top: m.y + y * m.s, width: W, height: H, pointerEvents: 'none',
        overflow: recorte || redondo ? 'hidden' : 'visible', borderRadius: redondo ? W / 2 : 0,
      }}
    >
      <Animated.View style={{ width: W, height: H, opacity: mover?.opacidad ?? 1, transform }}>
        <Svg width={W} height={H} viewBox={`0 0 ${w} ${h}`}>{children}</Svg>
      </Animated.View>
    </View>
  );
}

/** Valor que va de 0 a 1 una y otra vez (humo, burbujas, giros). */
export function useBucle(ms: number, retraso = 0) {
  const [v] = useState(() => new Animated.Value(0));
  const activa = useContext(EscenaActivaCtx);
  useEffect(() => {
    if (!activa) return;
    const anim = Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: ND }));
    const t = setTimeout(() => anim.start(), retraso);
    return () => { clearTimeout(t); anim.stop(); };
  }, [v, ms, retraso, activa]);
  return v;
}

/** Valor que va y viene entre 0 y 1 con suavidad (balanceos, nubes, brillos). */
export function useVaiven(ms: number, retraso = 0) {
  const [v] = useState(() => new Animated.Value(0));
  const activa = useContext(EscenaActivaCtx);
  useEffect(() => {
    if (!activa) return;
    const paso = (a: number) => Animated.timing(v, { toValue: a, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: ND });
    const anim = Animated.loop(Animated.sequence([paso(1), paso(0)]));
    const t = setTimeout(() => anim.start(), retraso);
    return () => { clearTimeout(t); anim.stop(); };
  }, [v, ms, retraso, activa]);
  return v;
}

const styles = StyleSheet.create({
  lienzo: { overflow: 'hidden' },
});
