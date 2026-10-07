import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Producto } from '../data/mock';
import { color, spacing, type } from '../theme/tokens';
import EstadoCaducidad from './EstadoCaducidad';

// Agrupa el inventario por ubicación física, como los anaqueles reales
// de una despensa, en vez de una grilla de tarjetas genérica.
export default function Anaquel({ titulo, productos }: { titulo: string; productos: Producto[] }) {
  const router = useRouter();
  if (productos.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>{titulo}</Text>
      <View style={styles.tabla}>
        {productos.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/producto/${p.id}`)}
            style={({ pressed }) => [
              styles.fila,
              i === productos.length - 1 && styles.filaUltima,
              pressed && styles.filaPresionada,
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{p.nombre}</Text>
              <Text style={styles.meta}>{p.cantidad} {p.unidad} · {p.categoria}</Text>
            </View>
            <EstadoCaducidad dias={p.diasParaCaducar} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.xl },
  titulo: { ...type.label, marginBottom: spacing.sm, marginLeft: spacing.xs },
  tabla: {
    backgroundColor: color.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.line,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  filaUltima: { borderBottomWidth: 0 },
  filaPresionada: { backgroundColor: color.surfaceAlt },
  nombre: { fontSize: 15.5, fontWeight: '600', color: color.ink },
  meta: { fontSize: 12.5, color: color.inkMuted, marginTop: 2 },
});
