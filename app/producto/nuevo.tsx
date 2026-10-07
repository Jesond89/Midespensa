import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useHogar } from '../../src/state/HogarProvider';
import { color, spacing, type } from '../../src/theme/tokens';
import type { Ubicacion } from '../../src/data/mock';

const UBICACIONES: Ubicacion[] = ['Refrigerador', 'Alacena', 'Congelador'];
// Botones rápidos de caducidad en vez de un selector de calendario,
// como ya se había decidido para el prototipo original.
const CADUCIDADES = [
  { etiqueta: 'Rápida', dias: 3 },
  { etiqueta: 'Media', dias: 10 },
  { etiqueta: 'Larga', dias: 60 },
];

export default function NuevoProducto() {
  const router = useRouter();
  const { agregarProducto } = useHogar();
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState<Ubicacion>('Refrigerador');
  const [caducidad, setCaducidad] = useState<number | null>(null);

  const guardar = () => {
    agregarProducto({
      nombre, categoria: 'Sin categoría', ubicacion, cantidad: 1, unidad: 'pieza', diasParaCaducar: caducidad,
    });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.campo}>
        <Text style={type.label}>Nombre del producto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Yogur natural"
          placeholderTextColor={color.inkFaint}
          value={nombre}
          onChangeText={setNombre}
        />
      </View>

      <View style={styles.campo}>
        <Text style={type.label}>Ubicación</Text>
        <View style={styles.chips}>
          {UBICACIONES.map((u) => (
            <Pressable key={u} onPress={() => setUbicacion(u)} style={[styles.chip, ubicacion === u && styles.chipActivo]}>
              <Text style={[styles.chipTexto, ubicacion === u && styles.chipTextoActivo]}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.campo}>
        <Text style={type.label}>Caducidad</Text>
        <View style={styles.chips}>
          {CADUCIDADES.map((c) => (
            <Pressable
              key={c.etiqueta}
              onPress={() => setCaducidad(c.dias)}
              style={[styles.chip, caducidad === c.dias && styles.chipActivo]}
            >
              <Text style={[styles.chipTexto, caducidad === c.dias && styles.chipTextoActivo]}>{c.etiqueta}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={[styles.boton, !nombre && styles.botonDeshabilitado]} disabled={!nombre} onPress={guardar}>
        <Text style={type.button}>Agregar al inventario</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.xl, gap: spacing.lg },
  campo: { gap: spacing.sm },
  input: {
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line,
    borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15.5, color: color.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: color.surfaceAlt, borderWidth: 1, borderColor: color.line,
  },
  chipActivo: { backgroundColor: color.brand, borderColor: color.brand },
  chipTexto: { color: color.ink, fontWeight: '600', fontSize: 14 },
  chipTextoActivo: { color: color.blanco },
  boton: { backgroundColor: color.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: spacing.md },
  botonDeshabilitado: { opacity: 0.5 },
});
