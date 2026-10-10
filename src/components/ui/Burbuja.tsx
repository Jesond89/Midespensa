import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { Icono } from './Icono';
import { ui, spacing } from '../../theme/tokens';

// Globo de diálogo de Freddy. La cola apunta hacia él: al centro cuando
// está debajo, a la derecha cuando flota en la esquina o a la izquierda
// cuando el globo está a su lado (recorrido del inicio).
// `accion` agrega una segunda línea con una mano, para invitar a tocarlo.
// `vidrio` lo vuelve discreto: translúcido y esmerilado, con letra más ligera,
// para que acompañe a la escena sin robarle protagonismo.
type Props = { texto: string; accion?: string; cola?: 'centro' | 'derecha' | 'izquierda'; vidrio?: boolean };

const VELO = 'rgba(255,255,255,0.62)';

export function Burbuja({ texto, accion, cola = 'centro', vidrio }: Props) {
  const lado = cola === 'izquierda';
  const tinta = vidrio ? '#3A3A3C' : ui.texto;
  return (
    <View style={[styles.wrap, lado && styles.wrapLado]}>
      <View style={[styles.globo, vidrio && styles.globoVidrio]}>
        {vidrio && (
          <>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 20} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: VELO }]} />
          </>
        )}
        <Text style={[styles.texto, lado && styles.textoLado, vidrio && styles.textoVidrio, { color: tinta }]}>{texto}</Text>
        {accion && (
          <View style={[styles.accion, lado && styles.accionLado]}>
            <View><Icono nombre="toque" tamano={vidrio ? 12 : 15} color={vidrio ? ui.textoSecundario : ui.texto} /></View>
            <Text style={[styles.accionTexto, vidrio && styles.accionTextoVidrio]}>{accion}</Text>
          </View>
        )}
      </View>
      {vidrio && lado ? (
        // Cola como triángulo pegado al globo: con transparencia, un cuadro
        // girado se encimaría con él y se notaría la unión.
        <Svg width={6} height={12} style={styles.colaVidrio}>
          <Path d="M6 0L0 6L6 12Z" fill={VELO} />
        </Svg>
      ) : (
        <View style={[styles.cola, vidrio && { backgroundColor: VELO }, cola === 'centro' ? styles.colaCentro : lado ? styles.colaIzquierda : styles.colaDerecha]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingBottom: 6 },
  wrapLado: { alignItems: 'flex-start', paddingBottom: 0, paddingLeft: 6 },
  globo: {
    backgroundColor: ui.tarjeta, borderRadius: 18, paddingVertical: 10, paddingHorizontal: spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    maxWidth: 260,
  },
  globoVidrio: {
    backgroundColor: 'transparent', overflow: 'hidden', borderRadius: 14, paddingVertical: 7, paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.75)',
    shadowOpacity: 0, elevation: 0, maxWidth: 220,
  },
  texto: { fontSize: 15, fontWeight: '500', color: ui.texto, letterSpacing: -0.2, textAlign: 'center' },
  textoLado: { textAlign: 'left' },
  textoVidrio: { fontSize: 13, lineHeight: 17, fontWeight: '400', letterSpacing: -0.1 },
  accion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 3 },
  accionLado: { justifyContent: 'flex-start' },
  accionTexto: { fontSize: 14, fontWeight: '700', color: ui.texto, letterSpacing: -0.2 },
  accionTextoVidrio: { fontSize: 12, fontWeight: '500', color: ui.textoSecundario },
  cola: {
    position: 'absolute', bottom: 0, width: 14, height: 14, backgroundColor: ui.tarjeta,
    transform: [{ rotate: '45deg' }], borderBottomRightRadius: 3,
  },
  colaCentro: { alignSelf: 'center' },
  colaDerecha: { right: 34 },
  colaIzquierda: { bottom: undefined, left: 0, top: 16 },
  colaVidrio: { position: 'absolute', left: 0, top: 11 },
});
