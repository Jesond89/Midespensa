import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { hogarMock } from '../../src/data/mock';
import { color, spacing, type } from '../../src/theme/tokens';

export default function Perfil() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.tarjeta}>
        <Text style={type.title}>{hogarMock.nombre}</Text>
        <Text style={styles.codigoEtiqueta}>Código del hogar</Text>
        <Text style={styles.codigo}>{hogarMock.codigo}</Text>
        <Text style={styles.ayuda}>Comparte este código con quien quieras invitar a tu hogar.</Text>
      </View>

      <View style={styles.seccion}>
        <Text style={type.label}>Integrantes</Text>
        <View style={styles.listaIntegrantes}>
          {hogarMock.integrantes.map((nombre) => (
            <View key={nombre} style={styles.fila}>
              <View style={styles.avatar}><Text style={styles.avatarLetra}>{nombre[0]}</Text></View>
              <Text style={styles.nombre}>{nombre}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable style={styles.salir} onPress={() => router.replace('/')}>
        <Text style={styles.salirTexto}>Salir del hogar</Text>
      </Pressable>

      <Text style={styles.version}>Mi Despensa · v0.1 (interfaz navegable)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.lg, gap: spacing.xl },
  tarjeta: {
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.line,
    borderRadius: 16, padding: spacing.lg, gap: 4,
  },
  codigoEtiqueta: { ...type.caption, marginTop: spacing.sm },
  codigo: { fontSize: 22, fontWeight: '700', color: color.brand, letterSpacing: 1 },
  ayuda: { ...type.caption, marginTop: 4 },
  seccion: { gap: spacing.sm },
  listaIntegrantes: { gap: spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: color.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetra: { color: color.brandDeep, fontWeight: '700' },
  nombre: { fontSize: 15.5, color: color.ink },
  salir: { alignItems: 'center', paddingVertical: 10 },
  salirTexto: { color: color.urgente, fontWeight: '700' },
  version: { ...type.caption, textAlign: 'center' },
});
