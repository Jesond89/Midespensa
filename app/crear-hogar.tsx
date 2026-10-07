import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { color, spacing, type } from '../src/theme/tokens';

// Reemplaza el "Registro" genérico de la plantilla de la materia: aquí no
// se crea una cuenta individual, se crea el hogar compartido (HU-01).
export default function CrearHogar() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={type.body}>
        Dale un nombre a tu hogar. Vas a recibir un código único que puedes compartir
        con el resto de la familia para que entren sin crear una cuenta.
      </Text>

      <View style={styles.campo}>
        <Text style={styles.etiqueta}>Nombre del hogar</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Casa Pineda"
          placeholderTextColor={color.inkFaint}
          value={nombre}
          onChangeText={setNombre}
        />
      </View>

      <Pressable
        style={[styles.boton, !nombre && styles.botonDeshabilitado]}
        disabled={!nombre}
        onPress={() => router.replace('/(tabs)/inventario')}
      >
        <Text style={type.button}>Crear hogar</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper, padding: spacing.xl, gap: spacing.lg },
  campo: { gap: spacing.xs },
  etiqueta: { ...type.label },
  input: {
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line,
    borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15.5, color: color.ink,
  },
  boton: { backgroundColor: color.brand, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: spacing.md },
  botonDeshabilitado: { opacity: 0.5 },
});
