import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icono } from '../src/components/ui/Icono';
import { Freddy } from '../src/components/avatar/Freddy';
import { Boton } from '../src/components/ui/Formulario';
import { useSesion } from '../src/state/SesionProvider';
import { ui, spacing } from '../src/theme/tokens';

// Pantalla de Inicio. No hay cuentas individuales (HU-01): se inicia sesión
// con el código y la contraseña del hogar, se crea uno nuevo o se une a uno.
export default function Bienvenida() {
  const router = useRouter();
  const sesion = useSesion();
  const [saludando, setSaludando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const saludar = () => {
    setSaludando(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaludando(false), 1400);
  };

  // Si ya hay una sesión guardada en el dispositivo, entra directo.
  if (!sesion.listo) return <View style={styles.root} />;
  if (sesion.hogar) return <Redirect href="/inicio" />;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Pressable onPress={saludar} accessibilityLabel="Saludar a Freddy">
          <Freddy size={220} estado={saludando ? 'feliz' : 'reposo'} />
        </Pressable>
        <Text style={styles.titulo}>Mi Despensa</Text>
        <Text style={styles.subtitulo}>
          Lo que hay en casa, lo que falta y lo que está por caducar, compartido con toda tu familia.
        </Text>
      </View>

      <View style={styles.acciones}>
        <Boton titulo="Iniciar sesión" icono="entrar" onPress={() => router.push('/iniciar-sesion')} />
        <Boton variante="secundario" titulo="Crear un hogar" icono="mas" onPress={() => router.push('/crear-hogar')} />
        <Boton variante="texto" titulo="Me invitaron: unirme con un código" onPress={() => router.push('/unirse-hogar')} />
        <View style={styles.privacidad}>
          <Icono nombre="candado" tamano={12} color={ui.textoTerciario} />
          <Text style={styles.privacidadTexto}>Solo los miembros de tu hogar ven tu despensa</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.fondo, paddingHorizontal: spacing.xl },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, maxWidth: 420, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, color: ui.texto, marginTop: spacing.lg },
  subtitulo: { fontSize: 17, lineHeight: 24, letterSpacing: -0.2, textAlign: 'center', color: ui.textoSecundario },
  acciones: { gap: spacing.md, paddingBottom: spacing.xl, maxWidth: 420, width: '100%', alignSelf: 'center' },
  privacidad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 0 },
  privacidadTexto: { fontSize: 13, color: ui.textoTerciario },
});
