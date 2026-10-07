import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color } from '../theme/tokens';

// RF-05 / HU-03: rojo < 3 días, ámbar 3–5 días, verde > 5 días.
export function estadoDe(dias: number | null) {
  if (dias === null) return { tono: color.inkFaint, texto: 'Sin fecha' };
  if (dias < 3) return { tono: color.urgente, texto: `Caduca en ${dias} d` };
  if (dias <= 5) return { tono: color.porVencer, texto: `Caduca en ${dias} d` };
  return { tono: color.fresco, texto: `${dias} d restantes` };
}

export default function EstadoCaducidad({ dias }: { dias: number | null }) {
  const { tono, texto } = estadoDe(dias);
  return (
    <View style={styles.row}>
      <View style={[styles.punto, { backgroundColor: tono }]} />
      <Text style={[styles.texto, { color: tono }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  texto: { fontSize: 12.5, fontWeight: '600' },
});
