import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useHogar } from '../../src/state/HogarProvider';
import { color, spacing, type } from '../../src/theme/tokens';

export default function Faltantes() {
  const { faltantes, terminarCompra } = useHogar();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const alternar = (id: string) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  return (
    <View style={styles.root}>
      <FlatList
        contentContainerStyle={styles.lista}
        data={faltantes}
        keyExtractor={(f) => f.id}
        ListEmptyComponent={
          <Text style={[type.body, { color: color.inkMuted }]}>
            No falta nada por ahora. Cuando marques un producto como agotado, aparece aquí.
          </Text>
        }
        renderItem={({ item }) => {
          const marcado = seleccionados.includes(item.id);
          return (
            <Pressable style={styles.fila} onPress={() => alternar(item.id)}>
              <View style={[styles.check, marcado && styles.checkMarcado]} />
              <Text style={[styles.nombre, marcado && styles.nombreTachado]}>
                {item.nombre} · {item.cantidad} {item.unidad}
              </Text>
            </Pressable>
          );
        }}
      />
      {seleccionados.length > 0 && (
        <Pressable
          style={styles.boton}
          onPress={() => { terminarCompra(seleccionados); setSeleccionados([]); }}
        >
          <Text style={type.button}>Terminar compra ({seleccionados.length})</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  lista: { padding: spacing.lg, gap: spacing.sm },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line,
    borderRadius: 12, padding: spacing.md,
  },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: color.line },
  checkMarcado: { backgroundColor: color.brand, borderColor: color.brand },
  nombre: { fontSize: 15.5, color: color.ink, fontWeight: '600' },
  nombreTachado: { textDecorationLine: 'line-through', color: color.inkMuted },
  boton: {
    margin: spacing.lg, marginTop: 0, backgroundColor: color.brand,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
});
