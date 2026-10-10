import React, { useEffect, useState } from 'react';
import { Animated, Keyboard, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ui } from '../../theme/tokens';
import { ALTO_BARRA, margenBarra } from '../../theme/navegacion';

// Barra de pestañas flotante al estilo de iOS: una cápsula de vidrio
// esmerilado separada de los bordes, con una píldora que se desliza
// detrás de la pestaña activa.

const ND = Platform.OS !== 'web';
const RELLENO = 6; // espacio entre la cápsula y la píldora activa

export function BarraFlotante({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [ancho, setAncho] = useState(0);
  const [posicion] = useState(() => new Animated.Value(state.index));
  const [teclado, setTeclado] = useState(false);
  const anchoPestana = ancho ? (ancho - RELLENO * 2) / state.routes.length : 0;

  useEffect(() => {
    Animated.spring(posicion, { toValue: state.index, friction: 9, tension: 90, useNativeDriver: ND }).start();
  }, [state.index, posicion]);

  // En Android la ventana se encoge con el teclado; la barra se esconde para no quedar encima.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const a = Keyboard.addListener('keyboardDidShow', () => setTeclado(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setTeclado(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  if (teclado) return null;

  return (
    <View pointerEvents="box-none" style={[styles.contenedor, { bottom: margenBarra(insets.bottom) }]}>
      <View style={styles.sombra}>
        <View style={styles.capsula} onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 40}
            tint={Platform.OS === 'ios' ? 'systemChromeMaterialLight' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.velo]} />

          {anchoPestana > 0 && (
            <Animated.View
              style={[
                styles.pildora,
                {
                  width: anchoPestana,
                  transform: [{ translateX: Animated.multiply(posicion, anchoPestana) }],
                },
              ]}
            />
          )}

          {state.routes.map((route, i) => {
            const { options } = descriptors[route.key];
            const activo = state.index === i;
            const color = activo ? ui.texto : ui.icono;
            const etiqueta = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
            const insignia = options.tabBarBadge;

            const presionar = () => {
              const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!activo && !evento.defaultPrevented) navigation.navigate(route.name, route.params);
            };

            return (
              <Pressable
                key={route.key}
                onPress={presionar}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={insignia ? `${etiqueta}, ${insignia}` : etiqueta}
                style={({ pressed }) => [styles.pestana, pressed && { transform: [{ scale: 0.9 }] }]}
              >
                <View>
                  {options.tabBarIcon?.({ focused: activo, color, size: 24 })}
                  {insignia !== undefined && (
                    <View style={styles.insignia}>
                      <Text style={styles.insigniaTexto}>{insignia}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.etiqueta, { color }, activo && styles.etiquetaActiva]} numberOfLines={1}>
                  {etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  sombra: {
    width: '100%', maxWidth: 440, borderRadius: ALTO_BARRA / 2,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 10, backgroundColor: 'transparent',
  },
  capsula: {
    height: ALTO_BARRA, borderRadius: ALTO_BARRA / 2, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: RELLENO,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)',
  },
  // Android no difumina igual que iOS; un velo blanco mantiene la cápsula legible.
  velo: { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.78)' },
  pildora: {
    position: 'absolute', left: RELLENO, top: RELLENO, bottom: RELLENO,
    borderRadius: (ALTO_BARRA - RELLENO * 2) / 2, backgroundColor: 'rgba(29,29,31,0.07)',
  },
  pestana: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  etiqueta: { fontSize: 10.5, fontWeight: '500', letterSpacing: -0.1 },
  etiquetaActiva: { fontWeight: '600' },
  insignia: {
    position: 'absolute', top: -4, right: -9, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: ui.accion, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: ui.tarjeta,
  },
  insigniaTexto: { color: ui.accionTexto, fontSize: 10, fontWeight: '700' },
});
