import React from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Grupo, Seccion } from '../../../src/components/ui/Formulario';
import { FilaAccion } from '../../../src/components/ui/Lista';
import { Icono, NombreIcono } from '../../../src/components/ui/Icono';
import { AMBIENTES } from '../../../src/components/hogar/ambientes';
import { usePreferencias, Preferencias } from '../../../src/state/PreferenciasProvider';
import { confirmar } from '../../../src/utils/confirmar';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';

// Ajustes del dispositivo: cómo se ve y se comporta la app. Lo del hogar
// (código, integrantes, cerrar sesión) está en el perfil.

type Interruptor = { clave: keyof Preferencias; icono: NombreIcono; titulo: string; detalle: string };

// En web el interruptor trae su propio color de bolita; aquí va blanca como en iOS.
const bolitaWeb = Platform.OS === 'web' ? ({ activeThumbColor: ui.tarjeta } as object) : {};

export default function Ajustes() {
  const router = useRouter();
  const espacioInferior = useEspacioInferior();
  const { prefs, cambiar, restablecer } = usePreferencias();

  const fila = ({ clave, icono, titulo, detalle }: Interruptor) => (
    <View key={clave} style={styles.fila}>
      <View style={styles.icono}><Icono nombre={icono} tamano={18} color={ui.texto} /></View>
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.detalle}>{detalle}</Text>
      </View>
      <Switch
        value={prefs[clave] as boolean}
        onValueChange={(v) => cambiar(clave, v)}
        trackColor={{ false: ui.separador, true: ui.accion }}
        thumbColor={ui.tarjeta}
        {...bolitaWeb}
        ios_backgroundColor={ui.separador}
        accessibilityLabel={titulo}
      />
    </View>
  );

  const reiniciar = async () => {
    if (!(await confirmar('Restablecer ajustes', 'Los ajustes vuelven a como venían. Tus productos no se tocan.', 'Restablecer'))) return;
    restablecer();
  };

  return (
    <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioInferior + spacing.lg }]}>
      <Seccion titulo="Abrir el inicio en" nota="El lugar que ves primero al abrir la app.">
        <Grupo sangria={60}>
          {AMBIENTES.map((a) => {
            const elegido = prefs.inicioEn === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => cambiar('inicioEn', a.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: elegido }}
                style={({ pressed }) => [styles.fila, pressed && { backgroundColor: ui.tarjetaPresionada }]}
              >
                <View style={styles.icono}><Icono nombre={a.icono} tamano={18} color={ui.texto} /></View>
                <Text style={[styles.titulo, styles.textos]}>{a.nombre}</Text>
                {elegido && <Icono nombre="check" tamano={18} color={ui.texto} />}
              </Pressable>
            );
          })}
        </Grupo>
      </Seccion>

      <Seccion titulo="Inicio">
        <Grupo sangria={60}>
          {fila({ clave: 'escenasAnimadas', icono: 'chispas', titulo: 'Escenas animadas', detalle: 'Nubes, vapor, luces y reflejos. Apágalas para ahorrar batería.' })}
          {fila({ clave: 'comentariosFreddy', icono: 'globo', titulo: 'Comentarios de Freddy', detalle: 'La nube con avisos de cada lugar.' })}
        </Grupo>
      </Seccion>

      <Seccion titulo="General">
        <Grupo sangria={60}>
          {fila({ clave: 'freddyEnSecciones', icono: 'persona', titulo: 'Freddy en las secciones', detalle: 'Freddy en la esquina de la despensa, la lista y la cocina.' })}
          {fila({ clave: 'vibracion', icono: 'vibrar', titulo: 'Vibración', detalle: 'Al cambiar de lugar en el inicio. Solo en el teléfono.' })}
        </Grupo>
      </Seccion>

      <Seccion titulo="Hogar">
        <Grupo sangria={60}>
          <FilaAccion icono="casa" titulo="Perfil del hogar" onPress={() => router.push('/perfil')} />
        </Grupo>
      </Seccion>

      <Grupo>
        <FilaAccion icono="basura" titulo="Restablecer ajustes" onPress={reiniciar} destructiva />
      </Grupo>

      <Text style={styles.version}>Mi Despensa · v0.2</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 11, minHeight: 56, backgroundColor: ui.tarjeta,
  },
  icono: { width: 32, height: 32, borderRadius: 9, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 16, color: ui.texto, letterSpacing: -0.2 },
  detalle: { fontSize: 13, color: ui.textoSecundario, lineHeight: 17 },
  version: { fontSize: 12, color: ui.textoTerciario, textAlign: 'center' },
});
