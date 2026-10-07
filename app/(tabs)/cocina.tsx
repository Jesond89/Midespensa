import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { recetasMock } from '../../src/data/mock';
import { color, spacing, type } from '../../src/theme/tokens';

// RF-08 / HU-04. La generación real vendrá del backend + Gemini; aquí se
// deja la interacción completa con datos de prueba, marcada como tal.
export default function Cocina() {
  const [cargando, setCargando] = useState(false);
  const [mostrarRecetas, setMostrarRecetas] = useState(false);

  const pedirRecetas = () => {
    setCargando(true);
    setTimeout(() => { setCargando(false); setMostrarRecetas(true); }, 700);
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={type.body}>
        Genera ideas para cocinar usando únicamente lo que ya tienes en el inventario.
      </Text>

      <Pressable style={styles.boton} onPress={pedirRecetas} disabled={cargando}>
        {cargando
          ? <ActivityIndicator color={color.blanco} />
          : <Text style={type.button}>¿Qué cocinamos hoy?</Text>}
      </Pressable>

      {mostrarRecetas && (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.aviso}>Vista previa con datos de prueba — la IA se conecta en el siguiente sprint.</Text>
          {recetasMock.map((r) => (
            <View key={r.id} style={styles.receta}>
              <Text style={styles.recetaTitulo}>{r.titulo}</Text>
              <Text style={styles.recetaUsa}>Usa: {r.usa.join(', ')}</Text>
              {r.pasos.map((paso, i) => (
                <Text key={i} style={styles.recetaPaso}>{i + 1}. {paso}</Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.lg, gap: spacing.lg },
  boton: { backgroundColor: color.brand, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  aviso: { ...type.caption, fontStyle: 'italic' },
  receta: {
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line,
    borderRadius: 14, padding: spacing.lg, gap: 6,
  },
  recetaTitulo: { ...type.title },
  recetaUsa: { ...type.caption, color: color.brand, fontWeight: '700' },
  recetaPaso: { ...type.body, marginTop: 4 },
});
