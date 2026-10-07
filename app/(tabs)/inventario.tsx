import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHogar } from '../../src/state/HogarProvider';
import Anaquel from '../../src/components/Anaquel';
import { color, spacing, type } from '../../src/theme/tokens';
import type { Ubicacion } from '../../src/data/mock';

const UBICACIONES: Ubicacion[] = ['Refrigerador', 'Alacena', 'Congelador'];

export default function Inventario() {
  const { productos } = useHogar();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {productos.length === 0 && (
          <Text style={[type.body, { color: color.inkMuted }]}>
            Tu despensa está vacía. Agrega el primer producto con el botón de abajo.
          </Text>
        )}
        {UBICACIONES.map((ubicacion) => (
          <Anaquel
            key={ubicacion}
            titulo={ubicacion}
            productos={productos.filter((p) => p.ubicacion === ubicacion)}
          />
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/producto/nuevo')}>
        <Text style={styles.fabTexto}>+ Agregar producto</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  fab: {
    position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg,
    backgroundColor: color.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  fabTexto: { color: color.blanco, fontWeight: '700', fontSize: 15.5 },
});
