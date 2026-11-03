import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icono } from '../src/components/ui/Icono';
import { Freddy } from '../src/components/avatar/Freddy';
import { Boton, Seccion, Grupo } from '../src/components/ui/Formulario';
import { FilaOpcion } from '../src/components/sesion/piezas';
import { useSesion } from '../src/state/SesionProvider';
import { ui, spacing } from '../src/theme/tokens';

// Pantalla de Inicio. No hay cuentas individuales (HU-01): se inicia sesión
// con el código y la contraseña del hogar, se crea uno nuevo o se une a uno.
//
// Quien llega por primera vez no tiene por qué saber si le toca "crear" o
// "unirse", y con tres botones iguales la decisión se adivina. Así que los dos
// caminos nuevos son filas que dicen para quién es cada uno —el primero de la
// familia, o quien ya recibió un código— y entrar con un hogar que ya existe
// se queda aparte, abajo.
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

  // Si ya hay una sesión guardada en el dispositivo, entra directo. Mientras se
  // comprueba se dice que se está comprobando: la renovación es una petición al
  // servidor y con mala señal tarda, y una pantalla gris en blanco parece una
  // app rota.
  if (!sesion.listo) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.cargando} accessible accessibilityLiveRegion="polite" accessibilityLabel="Abriendo tu despensa">
          <ActivityIndicator color={ui.icono} />
          <Text style={styles.cargandoTexto}>Abriendo tu despensa…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (sesion.hogar) return <Redirect href="/inicio" />;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pressable onPress={saludar} accessibilityRole="button" accessibilityLabel="Saludar a Freddy">
            <Freddy size={190} estado={saludando ? 'feliz' : 'reposo'} />
          </Pressable>
          <Text style={styles.titulo}>Mi Despensa</Text>
          <Text style={styles.subtitulo}>
            Lo que hay en casa, lo que falta y lo que está por caducar, compartido con toda tu familia.
          </Text>
        </View>

        <View style={styles.acciones}>
          <Seccion titulo="Es tu primera vez">
            <Grupo sangria={64}>
              <FilaOpcion
                icono="casa"
                titulo="Crear un hogar"
                descripcion="Eres el primero de tu familia. Recibes un código para invitarlos."
                onPress={() => router.push('/crear-hogar')}
              />
              <FilaOpcion
                icono="llave"
                titulo="Unirme a un hogar"
                descripcion="Alguien de tu familia ya creó uno y te compartió su código."
                onPress={() => router.push('/unirse-hogar')}
              />
            </Grupo>
          </Seccion>

          <Boton
            variante="secundario"
            titulo="Iniciar sesión"
            icono="entrar"
            onPress={() => router.push('/iniciar-sesion')}
          />

          <View style={styles.privacidad}>
            <Icono nombre="candado" tamano={12} color={ui.textoTerciario} />
            <Text style={styles.privacidadTexto}>Solo los miembros de tu hogar ven tu despensa</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.fondo },
  contenido: {
    flexGrow: 1, justifyContent: 'space-between', gap: spacing.xl,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl,
    maxWidth: 460, width: '100%', alignSelf: 'center',
  },
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  cargandoTexto: { fontSize: 15, color: ui.textoSecundario },
  hero: { alignItems: 'center', gap: spacing.sm },
  titulo: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, color: ui.texto, marginTop: spacing.md },
  subtitulo: { fontSize: 17, lineHeight: 24, letterSpacing: -0.2, textAlign: 'center', color: ui.textoSecundario },
  acciones: { gap: spacing.lg },
  privacidad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  privacidadTexto: { fontSize: 13, color: ui.textoSecundario },
});
