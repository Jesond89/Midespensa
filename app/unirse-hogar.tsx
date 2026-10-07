import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { color, spacing, type } from '../src/theme/tokens';

// Reemplaza el "Login" genérico: no hay usuario/contraseña, se entra con
// el código de hogar que ya existe (HU-01, acceso compartido sin cuentas).
export default function UnirseHogar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={type.body}>
        Pide el código a quien ya administra la despensa de tu casa y
        escríbelo aquí para ver el mismo inventario que ellos.
      </Text>

      <View style={styles.campo}>
        <Text style={styles.etiqueta}>Código de hogar</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. DESP-7F3K"
          placeholderTextColor={color.inkFaint}
          autoCapitalize="characters"
          value={codigo}
          onChangeText={setCodigo}
        />
      </View>

      <Pressable
        style={[styles.boton, !codigo && styles.botonDeshabilitado]}
        disabled={!codigo}
        onPress={() => router.replace('/(tabs)/inventario')}
      >
        <Text style={type.button}>Entrar al hogar</Text>
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
