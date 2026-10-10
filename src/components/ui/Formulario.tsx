import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TextInputProps, TextStyle, Pressable, StyleSheet, Platform, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Keyboard,
} from 'react-native';
import { Icono, NombreIcono } from './Icono';
import { Freddy, EstadoFreddy } from '../avatar/Freddy';
import { ui, spacing } from '../../theme/tokens';

// Piezas de interfaz compartidas (acceso y app), estilo "inset grouped" de iOS:
// campos agrupados en una tarjeta blanca con separadores finos.


// `sangria`: dónde empieza el separador (alineado con el texto, no con el ícono).
export function Grupo({ children, sangria = 50 }: { children: React.ReactNode; sangria?: number }) {
  const hijos = React.Children.toArray(children);
  return (
    <View style={styles.grupo}>
      {hijos.map((hijo, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[styles.separador, { marginLeft: sangria }]} />}
          {hijo}
        </React.Fragment>
      ))}
    </View>
  );
}

type CampoProps = TextInputProps & {
  icono: NombreIcono;
  clave?: boolean;
  claveVisible?: boolean;
  onAlternarClave?: () => void;
};

export function Campo({ icono, clave, claveVisible, onAlternarClave, onFocus, onBlur, style, ...resto }: CampoProps) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={styles.campo}>
      <Icono nombre={icono} tamano={20} color={enfocado ? ui.texto : ui.icono} style={styles.campoIcono} />
      <TextInput
        {...resto}
        style={[styles.input, sinContornoWeb, style]}
        placeholderTextColor={ui.textoTerciario}
        secureTextEntry={clave && !claveVisible}
        autoCorrect={false}
        onFocus={(e) => { setEnfocado(true); onFocus?.(e); }}
        onBlur={(e) => { setEnfocado(false); onBlur?.(e); }}
      />
      {clave && (
        <Pressable
          onPress={onAlternarClave}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={claveVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Icono nombre={claveVisible ? 'ojo-tachado' : 'ojo'} tamano={20} color={ui.icono} />
        </Pressable>
      )}
    </View>
  );
}

type BotonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'texto';
  icono?: NombreIcono;
  deshabilitado?: boolean;
  cargando?: boolean;
};

export function Boton({ titulo, onPress, variante = 'primario', icono, deshabilitado, cargando }: BotonProps) {
  const colorTexto = variante === 'primario' ? ui.accionTexto : ui.texto;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.boton,
        variante === 'primario' && styles.botonPrimario,
        variante === 'secundario' && styles.botonSecundario,
        variante === 'texto' && styles.botonTexto,
        deshabilitado && styles.botonDeshabilitado,
        pressed && styles.botonPresionado,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <>
          {icono && <Icono nombre={icono} tamano={19} color={colorTexto} />}
          <Text style={[styles.botonTitulo, { color: colorTexto }, variante === 'texto' && styles.botonTituloTexto]}>
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Decide qué hace Freddy según el campo enfocado: mira los campos de texto,
// se tapa en los de contraseña, se alegra al enviar el formulario y se
// confunde cuando los datos no son correctos.
export function useReaccionFreddy() {
  const [foco, setFoco] = useState<{ id: string; clave: boolean } | null>(null);
  const [claveVisible, setClaveVisible] = useState(false);
  const [feliz, setFeliz] = useState(false);
  const [confundido, setConfundido] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const estado: EstadoFreddy = feliz ? 'feliz'
    : confundido ? 'confundido'
    : !foco ? 'reposo'
    : !foco.clave ? 'mirando'
    : claveVisible ? 'espiando' : 'tapado';

  return {
    estado,
    focoId: foco?.id ?? null,
    claveVisible,
    alternarClave: () => setClaveVisible((v) => !v),
    enfocar: (id: string, clave = false) => ({
      onFocus: () => setFoco({ id, clave }),
      onBlur: () => setFoco((f) => (f?.id === id ? null : f)),
    }),
    celebrar: (luego: () => void) => {
      Keyboard.dismiss();
      clearTimeout(timer.current);
      setConfundido(false);
      setFeliz(true);
      timer.current = setTimeout(luego, 900);
    },
    confundir: () => {
      clearTimeout(timer.current);
      setConfundido(true);
      timer.current = setTimeout(() => setConfundido(false), 1800);
    },
  };
}

type PantallaProps = {
  titulo: string;
  subtitulo: string;
  estado: EstadoFreddy;
  progreso?: number;
  children: React.ReactNode;
};

// Estructura común de "Crear hogar" y "Unirse": Freddy arriba, título y formulario.
export function PantallaAcceso({ titulo, subtitulo, estado, progreso, children }: PantallaProps) {
  return (
    <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.pantallaContenido} keyboardShouldPersistTaps="handled">
        <View style={styles.encabezado}>
          <Freddy size={170} estado={estado} progreso={progreso} />
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.subtitulo}>{subtitulo}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Botón para el encabezado de navegación (ícono o texto). En web la pila
// no agrega margen lateral, así que se lo damos aquí.
type BotonEncabezadoProps = { icono?: NombreIcono; titulo?: string; etiqueta: string; onPress: () => void; deshabilitado?: boolean };

export function BotonEncabezado({ icono, titulo, etiqueta, onPress, deshabilitado }: BotonEncabezadoProps) {
  const tinta = deshabilitado ? ui.textoTerciario : ui.texto;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [Platform.OS === 'web' && { paddingHorizontal: spacing.lg }, pressed && { opacity: 0.5 }]}
    >
      {icono ? <Icono nombre={icono} tamano={28} color={tinta} /> : <Text style={[styles.encabezadoTexto, { color: tinta }]}>{titulo}</Text>}
    </Pressable>
  );
}

// Encabezado pequeño sobre un grupo, como en Ajustes de iOS.
export function Seccion({ titulo, children, nota }: { titulo?: string; children: React.ReactNode; nota?: string }) {
  return (
    <View style={styles.seccion}>
      {titulo && <Text style={styles.seccionTitulo}>{titulo}</Text>}
      {children}
      {nota && <Nota>{nota}</Nota>}
    </View>
  );
}

type ChipProps = { etiqueta: string; icono?: NombreIcono; activo?: boolean; onPress: () => void };

export function Chip({ etiqueta, icono, activo, onPress }: ChipProps) {
  const tinta = activo ? ui.accionTexto : ui.texto;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      style={({ pressed }) => [styles.chip, activo && styles.chipActivo, pressed && { opacity: 0.7 }]}
    >
      {icono && <Icono nombre={icono} tamano={15} color={activo ? tinta : ui.icono} />}
      <Text style={[styles.chipTexto, { color: tinta }]}>{etiqueta}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

export function Nota({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return <Text style={[styles.nota, error && { color: ui.error }]}>{children}</Text>;
}

const sinContornoWeb = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: ui.fondo },
  pantallaContenido: {
    flexGrow: 1, padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg,
    maxWidth: 460, width: '100%', alignSelf: 'center',
  },
  encabezado: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  titulo: { fontSize: 30, fontWeight: '700', letterSpacing: -0.7, color: ui.texto, marginTop: spacing.md },
  subtitulo: { fontSize: 16, lineHeight: 22, letterSpacing: -0.2, textAlign: 'center', color: ui.textoSecundario },
  grupo: {
    backgroundColor: ui.tarjeta, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: ui.separador },
  seccion: { gap: spacing.sm },
  encabezadoTexto: { fontSize: 17, fontWeight: '600' },
  seccionTitulo: { fontSize: 13, fontWeight: '600', color: ui.textoSecundario, paddingHorizontal: spacing.lg, letterSpacing: 0.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: ui.tarjeta, borderWidth: StyleSheet.hairlineWidth, borderColor: ui.separador,
  },
  chipActivo: { backgroundColor: ui.accion, borderColor: ui.accion },
  chipTexto: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  campo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, minHeight: 54 },
  campoIcono: { width: 22, marginRight: spacing.md },
  input: { flex: 1, fontSize: 17, color: ui.texto, paddingVertical: 15, letterSpacing: -0.2 },
  boton: {
    height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  botonPrimario: { backgroundColor: ui.accion },
  botonSecundario: { backgroundColor: ui.tarjeta, borderWidth: StyleSheet.hairlineWidth, borderColor: ui.separador },
  botonTexto: { height: 44 },
  botonDeshabilitado: { opacity: 0.3 },
  botonPresionado: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  botonTitulo: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  botonTituloTexto: { fontSize: 15, fontWeight: '500', color: ui.textoSecundario },
  nota: { fontSize: 13, color: ui.textoSecundario, lineHeight: 18, paddingHorizontal: spacing.lg },
});
