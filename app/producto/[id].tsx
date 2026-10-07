import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHogar } from '../../src/state/HogarProvider';
import EstadoCaducidad from '../../src/components/EstadoCaducidad';
import { color, spacing, type } from '../../src/theme/tokens';

export default function DetalleProducto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { productos, marcarAgotado } = useHogar();
  const router = useRouter();
  const producto = productos.find((p) => p.id === id);

  if (!producto) {
    return (
      <View style={styles.root}>
        <Text style={type.body}>Este producto ya no está en el inventario.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={type.display}>{producto.nombre}</Text>
      <EstadoCaducidad dias={producto.diasParaCaducar} />

      <View style={styles.tarjeta}>
        <Fila etiqueta="Ubicación" valor={producto.ubicacion} />
        <Fila etiqueta="Categoría" valor={producto.categoria} />
        <Fila etiqueta="Cantidad" valor={`${producto.cantidad} ${producto.unidad}`} />
      </View>

      <Pressable
        style={styles.boton}
        onPress={() => { marcarAgotado(producto.id); router.back(); }}
      >
        <Text style={type.button}>Marcar como agotado</Text>
      </Pressable>
    </ScrollView>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.xl, gap: spacing.lg },
  tarjeta: {
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line,
    borderRadius: 14, overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: color.line,
  },
  filaEtiqueta: { color: color.inkMuted, fontSize: 14 },
  filaValor: { color: color.ink, fontSize: 14, fontWeight: '600' },
  boton: { backgroundColor: color.urgente, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
});
