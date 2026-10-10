import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Freddy } from '../avatar/Freddy';
import { Icono } from '../ui/Icono';
import { useHogar } from '../../state/HogarProvider';
import { useSesion } from '../../state/SesionProvider';
import { Contexto, Globo, Item, Opcion, TEMAS, TemaId } from '../../chat/temas';
import { ui, spacing } from '../../theme/tokens';

// Chat con Freddy en una hoja que sube desde abajo. No hay campo de texto:
// el usuario elige opciones y Freddy contesta (con una pausa de "escribiendo"
// para que se sienta como plática). Las opciones con `ir` cierran el chat y
// abren esa pantalla.

type Mensaje = { id: number; de: 'freddy' | 'usuario'; globo: Globo };

const ND = Platform.OS !== 'web';
// Freddy tarda más en "escribir" los globos largos, como una persona.
const pausaPara = (globo: Globo) => {
  const largo = typeof globo === 'string'
    ? globo.length
    : globo.texto.length + globo.items.reduce((n, i) => n + (typeof i === 'string' ? i : i.texto).length, 0);
  return Math.min(450 + largo * 10, 1400);
};

type Props = { visible: boolean; tema: TemaId; onCerrar: () => void };

export function ChatFreddy({ visible, tema, onCerrar }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hogar } = useSesion();
  const { productos, faltantes } = useHogar();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const siguienteId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const t = TEMAS[tema];
  const ctx = useMemo<Contexto | null>(() => (hogar ? { hogar, productos, faltantes } : null), [hogar, productos, faltantes]);
  // La bienvenida usa los datos del momento en que se abre, sin reiniciar
  // la plática cada vez que cambian.
  const ctxRef = useRef(ctx);
  useEffect(() => { ctxRef.current = ctx; }, [ctx]);

  const limpiarTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Freddy "escribe" cada globo con una pausa y al final muestra las opciones.
  const decir = useCallback((globos: Globo[], despues: Opcion[]) => {
    setOpciones([]);
    setEscribiendo(true);
    let espera = 0;
    globos.forEach((globo, i) => {
      espera += pausaPara(globo);
      timers.current.push(setTimeout(() => {
        setMensajes((m) => [...m, { id: siguienteId.current++, de: 'freddy', globo }]);
        if (i === globos.length - 1) {
          setEscribiendo(false);
          setOpciones(despues);
        }
      }, espera));
    });
  }, []);

  // Cada vez que se abre, la plática empieza de nuevo con el tema de la sección.
  useEffect(() => {
    if (!visible || !ctxRef.current) return;
    limpiarTimers();
    setMensajes([]);
    decir(t.bienvenida(ctxRef.current), t.menu);
    return limpiarTimers;
  }, [visible, t, decir]);

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [mensajes, escribiendo, opciones]);

  const elegir = (opcion: Opcion) => {
    if (escribiendo || !ctx) return;
    if (opcion.ir) {
      onCerrar();
      router.push(opcion.ir);
      return;
    }
    setMensajes((m) => [...m, { id: siguienteId.current++, de: 'usuario', globo: opcion.etiqueta }]);
    const r = t.responder(opcion.id, ctx);
    // Después de responder: los atajos de la respuesta y el resto de las preguntas.
    const resto = t.menu.filter((o) => o.id !== opcion.id);
    decir(r.globos, [...(r.opciones ?? []), ...resto]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <View style={styles.fondo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} accessibilityLabel="Cerrar chat" />
        <View style={[styles.hoja, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.agarradera} />
          <View style={styles.cabecera}>
            <Freddy size={58} estado={escribiendo ? 'mirando' : 'reposo'} progreso={0.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>Freddy</Text>
              <Text style={styles.subtitulo}>{t.titulo}</Text>
            </View>
            <Pressable onPress={onCerrar} hitSlop={10} style={styles.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar chat">
              <Icono nombre="cerrar" tamano={16} color={ui.textoSecundario} />
            </Pressable>
          </View>

          <ScrollView ref={scroll} style={styles.mensajes} contentContainerStyle={styles.mensajesContenido}>
            {mensajes.map((m) => <GloboChat key={m.id} mensaje={m} />)}
            {escribiendo && <Escribiendo />}
          </ScrollView>

          {opciones.length > 0 && (
            <View style={styles.opciones}>
              {opciones.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => elegir(o)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.opcion, o.ir && styles.opcionIr, pressed && { opacity: 0.6 }]}
                >
                  {o.icono && <Icono nombre={o.icono} tamano={15} color={o.ir ? ui.accionTexto : ui.texto} />}
                  <Text style={[styles.opcionTexto, o.ir && { color: ui.accionTexto }]}>{o.etiqueta}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function GloboChat({ mensaje }: { mensaje: Mensaje }) {
  const deFreddy = mensaje.de === 'freddy';
  const { globo } = mensaje;
  return (
    <View style={[styles.globo, deFreddy ? styles.globoFreddy : styles.globoUsuario, typeof globo !== 'string' && styles.globoLista]}>
      <Text style={[styles.globoTexto, !deFreddy && { color: ui.accionTexto }]}>
        {typeof globo === 'string' ? globo : globo.texto}
      </Text>
      {typeof globo !== 'string' && (
        <View style={styles.items}>
          {globo.items.map((item, i) => (
            <Renglon key={i} item={item} numero={globo.numerada ? i + 1 : undefined} primero={i === 0} />
          ))}
        </View>
      )}
    </View>
  );
}

// Un renglón de lista dentro de un globo: viñeta (o número), el nombre y,
// a la derecha, un detalle con el color de su estado.
function Renglon({ item, numero, primero }: { item: string | Item; numero?: number; primero: boolean }) {
  const { texto, detalle, tono } = typeof item === 'string' ? { texto: item, detalle: undefined, tono: undefined } : item;
  return (
    <View style={[styles.renglon, !primero && styles.renglonSeparado]}>
      {numero !== undefined ? (
        <View style={styles.numero}><Text style={styles.numeroTexto}>{numero}</Text></View>
      ) : (
        <View style={[styles.vineta, tono && { backgroundColor: tono }]} />
      )}
      <Text style={styles.renglonTexto}>{texto}</Text>
      {detalle && <Text style={[styles.renglonDetalle, tono && { color: tono }]}>{detalle}</Text>}
    </View>
  );
}

// Tres puntos que laten mientras Freddy "escribe".
function Escribiendo() {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 3, duration: 900, useNativeDriver: ND }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={[styles.globo, styles.globoFreddy, styles.escribiendo]} accessibilityLabel="Freddy está escribiendo">
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[styles.punto, {
            opacity: v.interpolate({ inputRange: [i, i + 0.5, i + 1, 3.01], outputRange: [0.3, 1, 0.3, 0.3], extrapolate: 'clamp' }),
          }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' },
  hoja: {
    height: '82%', backgroundColor: ui.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    width: '100%', maxWidth: 640, alignSelf: 'center', overflow: 'hidden',
  },
  agarradera: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: ui.separador, marginTop: 8 },
  cabecera: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ui.separador,
  },
  nombre: { fontSize: 17, fontWeight: '700', color: ui.texto, letterSpacing: -0.3 },
  subtitulo: { fontSize: 13, color: ui.textoSecundario },
  cerrar: { width: 30, height: 30, borderRadius: 15, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  mensajes: { flex: 1 },
  mensajesContenido: { padding: spacing.lg, gap: spacing.sm },
  globo: { maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  globoFreddy: { alignSelf: 'flex-start', backgroundColor: ui.tarjeta, borderBottomLeftRadius: 6 },
  globoUsuario: { alignSelf: 'flex-end', backgroundColor: ui.accion, borderBottomRightRadius: 6 },
  globoTexto: { fontSize: 16, lineHeight: 22, color: ui.texto, letterSpacing: -0.2 },
  globoLista: { minWidth: '80%' },
  items: { marginTop: 8 },
  renglon: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  renglonSeparado: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.separador },
  vineta: { width: 7, height: 7, borderRadius: 4, backgroundColor: ui.textoTerciario },
  numero: { width: 20, height: 20, borderRadius: 10, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontSize: 12, fontWeight: '700', color: ui.texto },
  renglonTexto: { flex: 1, fontSize: 15, lineHeight: 20, color: ui.texto },
  renglonDetalle: { fontSize: 14, fontWeight: '500', color: ui.textoSecundario, textAlign: 'right', flexShrink: 0, maxWidth: '50%' },
  escribiendo: { flexDirection: 'row', gap: 5, paddingVertical: 14 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: ui.textoSecundario },
  opciones: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.separador,
  },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: ui.tarjeta, borderWidth: StyleSheet.hairlineWidth, borderColor: ui.separador,
  },
  opcionIr: { backgroundColor: ui.accion, borderColor: ui.accion },
  opcionTexto: { fontSize: 15, fontWeight: '500', color: ui.texto, letterSpacing: -0.2 },
});
