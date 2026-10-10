import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Grupo, Seccion } from '../../../src/components/ui/Formulario';
import { FilaAccion, IconoCuadro } from '../../../src/components/ui/Lista';
import { useSesion } from '../../../src/state/SesionProvider';
import { confirmar } from '../../../src/utils/confirmar';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioBarra } from '../../../src/theme/navegacion';

export default function Perfil() {
  const espacioBarra = useEspacioBarra();
  const router = useRouter();
  const { hogar, cerrarSesion } = useSesion();
  if (!hogar) return null;

  const salir = async () => {
    if (!(await confirmar('Cerrar sesión', 'Para volver a entrar necesitarás el código y la contraseña del hogar.', 'Cerrar sesión'))) return;
    await cerrarSesion();
    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioBarra + spacing.lg }]}>
      <Grupo>
        <View style={styles.tarjeta}>
          <IconoCuadro icono="casa" tamano={56} />
          <Text style={styles.nombre}>{hogar.nombre}</Text>
          <Text style={styles.etiqueta}>Código del hogar</Text>
          <Text style={styles.codigo} selectable>{hogar.codigo}</Text>
          <Text style={styles.ayuda}>Compártelo junto con la contraseña para invitar a tu familia.</Text>
        </View>
      </Grupo>

      <Seccion titulo={`Integrantes · ${hogar.integrantes.length}`}>
        <Grupo sangria={64}>
          {hogar.integrantes.length === 0 ? (
            <Text style={styles.sinIntegrantes}>Todavía nadie más se ha unido.</Text>
          ) : (
            hogar.integrantes.map((nombre) => (
              <View key={nombre} style={styles.integrante}>
                <View style={styles.inicial}><Text style={styles.inicialTexto}>{nombre[0]}</Text></View>
                <Text style={styles.integranteNombre}>{nombre}</Text>
              </View>
            ))
          )}
        </Grupo>
      </Seccion>

      <Grupo>
        <FilaAccion icono="salir" titulo="Cerrar sesión" onPress={salir} destructiva />
      </Grupo>

      <Text style={styles.version}>Mi Despensa · v0.2</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, paddingBottom: 150, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  tarjeta: { alignItems: 'center', padding: spacing.xl, gap: 4 },
  nombre: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: ui.texto, marginTop: spacing.sm },
  etiqueta: { fontSize: 13, color: ui.textoSecundario, marginTop: spacing.md },
  codigo: { fontSize: 28, fontWeight: '700', letterSpacing: 2, color: ui.texto },
  ayuda: { fontSize: 13, color: ui.textoSecundario, textAlign: 'center', marginTop: spacing.xs },
  integrante: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 },
  inicial: { width: 36, height: 36, borderRadius: 18, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  inicialTexto: { fontSize: 15, fontWeight: '600', color: ui.texto },
  integranteNombre: { fontSize: 16, color: ui.texto },
  sinIntegrantes: { fontSize: 15, color: ui.textoSecundario, padding: spacing.lg },
  version: { fontSize: 12, color: ui.textoTerciario, textAlign: 'center' },
});
