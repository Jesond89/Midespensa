import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Icono } from '../../../src/components/ui/Icono';
import { Grupo, Boton, Nota, Seccion } from '../../../src/components/ui/Formulario';
import { useHogar } from '../../../src/state/HogarProvider';
import { ErrorRecetas, sugerirRecetas } from '../../../src/services/recetas';
import type { Receta } from '../../../src/services/esquemaRecetas';
import { estaPorCaducar } from '../../../src/utils/caducidad';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';

// RF-08 / HU-04. Las recetas las genera Gemini en la ruta de servidor
// /api/recetas, que lee el inventario del hogar desde el JWT: esta pantalla
// solo pide y muestra, no manda productos ni conoce la clave.
export default function Cocina() {
  const espacioInferior = useEspacioInferior();
  const { productos } = useHogar();
  const [cargando, setCargando] = useState(false);
  const [recetas, setRecetas] = useState<Receta[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prioridad = productos.filter(estaPorCaducar);

  const pedirRecetas = async () => {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      const resultado = await sugerirRecetas();
      setRecetas(resultado.recetas);
      setAviso(resultado.aviso);
    } catch (e) {
      setRecetas(null);
      setError(e instanceof ErrorRecetas ? e.message : 'No se pudieron sugerir recetas. Intenta de nuevo en un momento.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioInferior + spacing.lg }]}>
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

      <Boton
        titulo={recetas?.length ? 'Sugerir otras recetas' : 'Sugerir recetas'}
        icono="chispas"
        cargando={cargando}
        onPress={() => void pedirRecetas()}
      />

      {error && <Nota error>{error}</Nota>}

      {!error && recetas && (
        <View style={{ gap: spacing.lg }}>
          {aviso && <Nota>{aviso}</Nota>}
          {recetas.length === 0 && !aviso && (
            <Nota>No salieron recetas con lo que hay registrado. Agrega algunos productos más y vuelve a intentar.</Nota>
          )}
          {recetas.map((r) => (
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
