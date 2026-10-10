import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icono } from './Icono';
import { ui, spacing } from '../../theme/tokens';

// Globo de diálogo de Freddy. La cola apunta hacia él: al centro cuando
// está debajo (inicio) o a la derecha cuando flota en la esquina.
// `accion` agrega una segunda línea con una mano, para invitar a tocarlo.
type Props = { texto: string; accion?: string; cola?: 'centro' | 'derecha' };

export function Burbuja({ texto, accion, cola = 'centro' }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.globo}>
        <Text style={styles.texto}>{texto}</Text>
        {accion && (
          <View style={styles.accion}>
            <Icono nombre="toque" tamano={15} color={ui.texto} />
            <Text style={styles.accionTexto}>{accion}</Text>
          </View>
        )}
      </View>
      <View style={[styles.cola, cola === 'centro' ? styles.colaCentro : styles.colaDerecha]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingBottom: 6 },
  globo: {
    backgroundColor: ui.tarjeta, borderRadius: 18, paddingVertical: 10, paddingHorizontal: spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    maxWidth: 260,
  },
  texto: { fontSize: 15, fontWeight: '500', color: ui.texto, letterSpacing: -0.2, textAlign: 'center' },
  accion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 3 },
  accionTexto: { fontSize: 14, fontWeight: '700', color: ui.texto, letterSpacing: -0.2 },
  cola: {
    position: 'absolute', bottom: 0, width: 14, height: 14, backgroundColor: ui.tarjeta,
    transform: [{ rotate: '45deg' }], borderBottomRightRadius: 3,
  },
  colaCentro: { alignSelf: 'center' },
  colaDerecha: { right: 34 },
});
