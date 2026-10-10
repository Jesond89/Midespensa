import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Icono } from '../../../src/components/ui/Icono';
import { Grupo, Boton, Nota, Seccion } from '../../../src/components/ui/Formulario';
import { useHogar } from '../../../src/state/HogarProvider';
import { recetasMock } from '../../../src/data/mock';
import { estaPorCaducar } from '../../../src/utils/caducidad';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioBarra } from '../../../src/theme/navegacion';

// RF-08 / HU-04. La generación real vendrá del backend + Gemini; aquí se
// deja la interacción completa con datos de prueba, marcada como tal.
export default function Cocina() {
  const espacioBarra = useEspacioBarra();
  const { productos } = useHogar();
  const [cargando, setCargando] = useState(false);
  const [mostrarRecetas, setMostrarRecetas] = useState(false);
  const prioridad = productos.filter(estaPorCaducar);

  const pedirRecetas = () => {
    setCargando(true);
    setTimeout(() => { setCargando(false); setMostrarRecetas(true); }, 700);
  };

  return (
    <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioBarra + spacing.lg }]}>
      <View style={styles.intro}>
        <Icono nombre="olla" tamano={34} color={ui.texto} />
        <Text style={styles.titulo}>Ideas con lo que ya tienes</Text>
        <Text style={styles.texto}>Recetas que usan tu inventario, empezando por lo que está por caducar.</Text>
      </View>

      {prioridad.length > 0 && (
        <Seccion titulo="Conviene usar pronto">
          <Grupo>
            <Text style={styles.prioridad}>{prioridad.map((p) => p.nombre).join(' · ')}</Text>
          </Grupo>
        </Seccion>
      )}

      <Boton titulo="Sugerir recetas" icono="chispas" cargando={cargando} onPress={pedirRecetas} />

      {mostrarRecetas && (
        <View style={{ gap: spacing.lg }}>
          <Nota>Vista previa con datos de prueba; la IA se conecta en el siguiente sprint.</Nota>
          {recetasMock.map((r) => (
            <Grupo key={r.id}>
              <View style={styles.receta}>
                <Text style={styles.recetaTitulo}>{r.titulo}</Text>
                <Text style={styles.recetaUsa}>Usa: {r.usa.join(', ')}</Text>
                {r.pasos.map((paso, i) => (
                  <Text key={i} style={styles.recetaPaso}>{i + 1}. {paso}</Text>
                ))}
              </View>
            </Grupo>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, paddingBottom: 150, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  intro: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  titulo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: ui.texto, textAlign: 'center' },
  texto: { fontSize: 15, lineHeight: 20, color: ui.textoSecundario, textAlign: 'center' },
  prioridad: { fontSize: 15, lineHeight: 21, color: ui.texto, padding: spacing.lg },
  receta: { padding: spacing.lg, gap: 6 },
  recetaTitulo: { fontSize: 17, fontWeight: '600', color: ui.texto, letterSpacing: -0.3 },
  recetaUsa: { fontSize: 13, color: ui.textoSecundario, marginBottom: 4 },
  recetaPaso: { fontSize: 15, lineHeight: 21, color: ui.texto },
});
