import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import definicion from '../../../assets/avatar/freddy.avatar.json';

// Freddy, la mascota de la app. Se dibuja con Views a partir del archivo
// exportado de Avatar Studio (assets/avatar/freddy.avatar.json): forma del
// cuerpo, colores, expresiones y parpadeo salen de ahí, no están a mano.
//
// Estados:
//   reposo    se mueve solo (animación "idle" del archivo) y parpadea
//   mirando   mira hacia el campo y sigue el texto mientras se escribe
//   tapado    voltea la cara y cierra los ojos (contraseña oculta)
//   espiando  igual que tapado pero con un ojo abierto (contraseña visible)
//   feliz     expresión alegre al confirmar el formulario
//   confundido  ladea la cabeza (animación "confused") cuando algo sale mal

export type EstadoFreddy = 'reposo' | 'mirando' | 'tapado' | 'espiando' | 'feliz' | 'confundido';

type Ojo = { width: number; height: number; x: number; y: number; angle: number };
type Pose = { head: { x: number; y: number; z: number }; eyes: { left: Ojo; right: Ojo; spacing: number } };
type Superficie = { type: string; width: number; height: number; roundness: number };
type Paso = { expression: string; holdMs: number; transitionMs: number };
type Definicion = {
  colors: { body: string; eyes: string };
  body: { primary: Superficie; nodes: { surface: Superficie; position: number[] }[] };
  expressions: Record<string, Pose>;
  animations: Record<string, {
    steps: Paso[];
    blink: { initialDelayMs: number; minIntervalMs: number; maxIntervalMs: number; durationMs: number };
  }>;
};

const freddy = definicion as unknown as Definicion;

// Lienzo en unidades del archivo; todo se escala con `size`.
const LIENZO = { w: 260, h: 232, cx: 130, cy: 128 };
const PARALAJE = 0.7; // cuánto se desplazan los ojos al girar la cabeza
const ND = Platform.OS !== 'web';
const SUAVE = Easing.bezier(0.25, 0.1, 0.25, 1);

const pose = (nombre: string): Pose => freddy.expressions[nombre] ?? freddy.expressions.neutral;

function poseMirando(progreso: number): Pose {
  const t = Math.min(Math.max(progreso, 0), 1);
  const base = pose('downward-gaze');
  return { head: { x: -14, y: -26 + 52 * t, z: -5 + 10 * t }, eyes: base.eyes };
}

// Ojos cerrados del archivo, un poco más angostos para que no salgan de la cara al voltear.
const CERRADO: Ojo = { ...pose('eyes-closed').eyes.left, width: 44, height: 16 };
const POSE_TAPADO: Pose = {
  head: { x: 4, y: -28, z: 9 },
  eyes: { left: CERRADO, right: CERRADO, spacing: 62 },
};
const POSE_ESPIANDO: Pose = {
  head: { x: 0, y: -18, z: 6 },
  eyes: { ...POSE_TAPADO.eyes, right: { width: 26, height: 40, x: 0, y: -2, angle: 0 } },
};

// En reposo alterna la animación "idle" del archivo con la expresión neutral.
const PASOS_REPOSO: Paso[] = freddy.animations.idle.steps.flatMap((p) => [
  { ...p, holdMs: p.holdMs / 2 },
  { expression: 'neutral', holdMs: 2200, transitionMs: 700 },
]);
const PASOS_CONFUNDIDO: Paso[] = freddy.animations.confused.steps.map((p) => ({ ...p, holdMs: 500, transitionMs: 260 }));

function oscurecer(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * (1 - f)).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

function radio(sup: Superficie) {
  return (Math.min(sup.width, sup.height) / 2) * Math.min(sup.roundness, 1);
}

const grados = (v: Animated.Value | Animated.AnimatedMultiplication<number>) =>
  v.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

function crearValores(p: Pose) {
  const ojo = (o: Ojo) => ({
    w: new Animated.Value(o.width), h: new Animated.Value(o.height),
    x: new Animated.Value(o.x), y: new Animated.Value(o.y), a: new Animated.Value(o.angle),
  });
  return {
    hx: new Animated.Value(p.head.x), hy: new Animated.Value(p.head.y), hz: new Animated.Value(p.head.z),
    sp: new Animated.Value(p.eyes.spacing), l: ojo(p.eyes.left), r: ojo(p.eyes.right),
  };
}

type Props = { size?: number; estado?: EstadoFreddy; progreso?: number };

export function Freddy({ size = 200, estado = 'reposo', progreso = 0 }: Props) {
  const s = size / LIENZO.w;
  const v = useRef(crearValores(pose('neutral'))).current;
  const parpadeo = useRef(new Animated.Value(1)).current;
  const flotar = useRef(new Animated.Value(0)).current;
  const animActual = useRef<Animated.CompositeAnimation | null>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  const irA = useCallback((p: Pose, ms: number) => {
    animActual.current?.stop();
    const t = (val: Animated.Value, to: number) =>
      Animated.timing(val, { toValue: to, duration: ms, easing: SUAVE, useNativeDriver: ND });
    const ojo = (o: typeof v.l, d: Ojo) => [t(o.w, d.width), t(o.h, d.height), t(o.x, d.x), t(o.y, d.y), t(o.a, d.angle)];
    animActual.current = Animated.parallel([
      t(v.hx, p.head.x), t(v.hy, p.head.y), t(v.hz, p.head.z), t(v.sp, p.eyes.spacing),
      ...ojo(v.l, p.eyes.left), ...ojo(v.r, p.eyes.right),
    ]);
    animActual.current.start();
  }, [v]);

  // Cambios de estado.
  useEffect(() => {
    if (estado === 'mirando') { irA(poseMirando(progreso), 260); return; }
    if (estado === 'tapado') { irA(POSE_TAPADO, 420); return; }
    if (estado === 'espiando') { irA(POSE_ESPIANDO, 320); return; }
    if (estado === 'feliz') { irA(pose('joyful-wide'), 380); return; }

    // Reposo y confundido son secuencias en bucle. En reposo hay un pequeño
    // retraso para no reaccionar al saltar de un campo a otro.
    const pasos = estado === 'confundido' ? PASOS_CONFUNDIDO : PASOS_REPOSO;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const siguiente = () => {
      const paso = pasos[i++ % pasos.length];
      irA(pose(paso.expression), paso.transitionMs);
      timer = setTimeout(siguiente, paso.transitionMs + paso.holdMs);
    };
    timer = setTimeout(siguiente, estado === 'confundido' ? 0 : 300);
    return () => clearTimeout(timer);
  }, [estado, progreso, irA]);

  // Parpadeo con los intervalos del archivo.
  useEffect(() => {
    const cfg = freddy.animations.idle.blink;
    let timer: ReturnType<typeof setTimeout>;
    const programar = (ms: number) => {
      timer = setTimeout(() => {
        if (estadoRef.current !== 'tapado' && estadoRef.current !== 'espiando') {
          Animated.sequence([
            Animated.timing(parpadeo, { toValue: 0.08, duration: cfg.durationMs * 0.45, useNativeDriver: ND }),
            Animated.timing(parpadeo, { toValue: 1, duration: cfg.durationMs * 0.55, useNativeDriver: ND }),
          ]).start();
        }
        programar(cfg.minIntervalMs + Math.random() * (cfg.maxIntervalMs - cfg.minIntervalMs));
      }, ms);
    };
    programar(cfg.initialDelayMs);
    return () => clearTimeout(timer);
  }, [parpadeo]);

  // Respiración: flota suavemente todo el tiempo.
  useEffect(() => {
    const t = (to: number) => Animated.timing(flotar, {
      toValue: to, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: ND,
    });
    const loop = Animated.loop(Animated.sequence([t(1), t(0)]));
    loop.start();
    return () => loop.stop();
  }, [flotar]);

  const cuerpo = freddy.body.primary;
  const colorCuerpo = freddy.colors.body;
  const colorFondo = oscurecer(colorCuerpo, 0.08);

  const forma = (sup: Superficie, x: number, y: number, color: string, key?: number) => (
    <View key={key} style={{
      position: 'absolute', backgroundColor: color,
      width: sup.width * s, height: sup.height * s, borderRadius: radio(sup) * s,
      left: (LIENZO.cx + x - sup.width / 2) * s, top: (LIENZO.cy + y - sup.height / 2) * s,
    }} />
  );

  const ojo = (o: typeof v.l, lado: -1 | 1) => (
    <Animated.View style={{
      position: 'absolute', backgroundColor: freddy.colors.eyes,
      width: 100 * s, height: 100 * s, borderRadius: 50 * s,
      left: (LIENZO.cx - 50) * s, top: (LIENZO.cy - 50) * s,
      transform: [
        { translateX: Animated.multiply(Animated.add(Animated.add(Animated.multiply(v.sp, lado / 2), o.x), Animated.multiply(v.hy, PARALAJE)), s) },
        { translateY: Animated.multiply(Animated.add(o.y, Animated.multiply(v.hx, -PARALAJE)), s) },
        { rotate: grados(o.a) },
        { scaleX: Animated.multiply(o.w, 0.01) },
        { scaleY: Animated.multiply(Animated.multiply(o.h, 0.01), parpadeo) },
      ],
    }} />
  );

  return (
    <View
      style={{ width: LIENZO.w * s, height: LIENZO.h * s }}
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel="Freddy, el asistente de Mi Despensa"
    >
      {/* Sombra en el piso */}
      <Animated.View style={{
        position: 'absolute', backgroundColor: 'rgba(0,0,0,0.08)',
        width: 150 * s, height: 14 * s, borderRadius: 7 * s,
        left: (LIENZO.cx - 75) * s, top: (LIENZO.cy + cuerpo.height / 2 + 12) * s,
        opacity: flotar.interpolate({ inputRange: [0, 1], outputRange: [1, 0.65] }),
        transform: [{ scaleX: flotar.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) }],
      }} />

      <Animated.View style={{
        position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
        transform: [
          { perspective: 900 * s },
          { translateY: Animated.multiply(flotar, -6 * s) },
          { rotateX: grados(v.hx) },
          { rotateY: grados(Animated.multiply(v.hy, -1)) },
          { rotateZ: grados(v.hz) },
        ],
      }}>
        {freddy.body.nodes.filter((n) => n.position[2] < 0)
          .map((n, i) => forma(n.surface, n.position[0], n.position[1], colorFondo, i))}
        {forma(cuerpo, 0, 0, colorCuerpo)}
        {freddy.body.nodes.filter((n) => n.position[2] >= 0)
          .map((n, i) => forma(n.surface, n.position[0], n.position[1], colorCuerpo, 100 + i))}
        {ojo(v.l, -1)}
        {ojo(v.r, 1)}
      </Animated.View>
    </View>
  );
}
