import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

// Microanimaciones del recorrido del inicio.

const ND = Platform.OS !== 'web';

/** Vibración ligera; en web no hace nada. */
export const vibrar = {
  seleccion: () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); },
  aterrizaje: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  exito: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
};

type ReboteProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  escala?: number;
  /** El área táctil ocupa todo el espacio disponible (para tarjetas en rejilla). */
  llenar?: boolean;
  children: React.ReactNode;
};

/** Botón que se hunde al tocarlo y regresa con un pequeño rebote. */
export function Rebote({ style, escala = 0.95, llenar, children, onPressIn, onPressOut, ...resto }: ReboteProps) {
  const [v] = useState(() => new Animated.Value(1));
  const ir = (a: number) =>
    Animated.spring(v, { toValue: a, speed: 40, bounciness: a === 1 ? 12 : 0, useNativeDriver: ND }).start();
  return (
    <Pressable
      {...resto}
      style={llenar ? { flex: 1 } : undefined}
      onPressIn={(e) => { ir(escala); onPressIn?.(e); }}
      onPressOut={(e) => { ir(1); onPressOut?.(e); }}
    >
      <Animated.View style={[llenar && { flex: 1 }, style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Número que cuenta desde cero cada vez que `activo` se vuelve verdadero. */
export function useContador(valor: number, activo: boolean) {
  const [mostrado, setMostrado] = useState(valor);
  const [v] = useState(() => new Animated.Value(valor));
  useEffect(() => {
    const id = v.addListener(({ value }) => setMostrado(Math.round(value)));
    return () => v.removeListener(id);
  }, [v]);
  useEffect(() => {
    if (!activo) return;
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: valor, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [activo, valor, v]);
  return mostrado;
}

/** Valor de 0 a 1 que corre una sola vez al montar la pantalla. */
export function useMontaje(ms = 1100) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    anim.start();
    return () => anim.stop();
  }, [v, ms]);
  return v;
}

type EntradaProps = {
  scrollX: Animated.Value;
  montaje: Animated.Value;
  pagina: number;
  ancho: number;
  /** Posición en la cascada: los de más abajo llegan después. */
  orden: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Elemento de la hoja que entra en cascada: al abrir la pantalla (con
 * retraso según `orden`) y al deslizar entre páginas, donde el desfase
 * sigue al dedo en lugar de a un reloj.
 */
export function Entrada({ scrollX, montaje, pagina, ancho, orden, style, children }: EntradaProps) {
  const inicio = Math.min(orden * 0.07, 0.5);
  const lejos = 16 + orden * 10;
  const porDeslizar = scrollX.interpolate({
    inputRange: [(pagina - 1) * ancho, pagina * ancho, (pagina + 1) * ancho],
    outputRange: [lejos, 0, lejos],
    extrapolate: 'clamp',
  });
  const porMontaje = montaje.interpolate({ inputRange: [inicio, inicio + 0.5], outputRange: [28, 0], extrapolate: 'clamp' });
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: montaje.interpolate({ inputRange: [inicio, inicio + 0.45], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: Animated.add(porDeslizar, porMontaje) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
