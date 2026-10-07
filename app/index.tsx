import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, spacing, type } from '../src/theme/tokens';

// Pantalla de Inicio. No hay login tradicional (HU-01): el hogar se crea
// o se recupera con un código compartido, sin cuentas individuales.
export default function Bienvenida() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.marca}>
          <Text style={styles.marcaLetra}>MD</Text>
        </View>
        <Text style={styles.titulo}>Mi Despensa</Text>
        <Text style={styles.subtitulo}>
          Lo que hay en casa, lo que falta y lo que se va a echar a perder,
          todo en un solo lugar que comparte toda la familia.
        </Text>
      </View>

      <View style={styles.acciones}>
        <Pressable style={styles.botonPrimario} onPress={() => router.push('/crear-hogar')}>
          <Text style={type.button}>Crear mi hogar</Text>
        </Pressable>
        <Pressable style={styles.botonSecundario} onPress={() => router.push('/unirse-hogar')}>
          <Text style={styles.textoSecundario}>Ya tengo un código de hogar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper, padding: spacing.xl, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, maxWidth: 420, alignSelf: 'center' },
  marca: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: color.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  marcaLetra: { color: color.blanco, fontSize: 22, fontWeight: '700' },
  titulo: { ...type.display, fontSize: 30, textAlign: 'center' },
  subtitulo: { ...type.body, textAlign: 'center', color: color.inkMuted, paddingHorizontal: spacing.md },
  acciones: { gap: spacing.md, paddingBottom: spacing.lg },
  botonPrimario: {
    backgroundColor: color.brand, paddingVertical: 15, borderRadius: 14, alignItems: 'center',
  },
  botonSecundario: { paddingVertical: 15, alignItems: 'center' },
  textoSecundario: { color: color.brand, fontWeight: '700', fontSize: 15 },
});
