import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../ui/Icono';
import { ui, spacing } from '../../theme/tokens';

// Piezas de la pestaña "Cámara" de Registrar compras: las pistas para
// encuadrar la foto, el estado mientras se lee y los avisos cuando algo sale
// mal. Aquí no hay lógica de escaneo, solo cómo se ve lo que la pantalla ya
// sabe; así registrar.tsx no carga además con todo el estilo.
//
// Tintes suaves de los tonos del tema (tokens.ts guarda solo el color pleno).
// Se usan de fondo detrás de un ícono o de texto grande, nunca de texto chico.
const TINTE_AVISO = '#FFF1DC';
const TINTE_ERROR = '#FBE9E7';

// ——— Pistas para la foto ———

// Solo se muestran mientras no hay foto: son consejos para encuadrar y, una
// vez tomada, estorban. Cortas para que quepan en un renglón en pantalla chica.
const PISTAS: { icono: NombreIcono; texto: string }[] = [
  { icono: 'ojo', texto: 'De frente' },
  { icono: 'chispas', texto: 'Con luz' },
  { icono: 'caja', texto: 'Sin amontonar' },
];

export function PistasFoto() {
  return (
    <View
      style={styles.pistas}
      accessible
      accessibilityLabel={`Para que se lean bien: ${PISTAS.map((p) => p.texto.toLowerCase()).join(', ')}.`}
    >
      {PISTAS.map((p) => (
        <View key={p.texto} style={styles.pista}>
          <Icono nombre={p.icono} tamano={13} color={ui.icono} />
          <Text style={styles.pistaTexto}>{p.texto}</Text>
        </View>
      ))}
    </View>
  );
}

// ——— Mientras se lee la foto ———

// El escaneo no reporta avance, así que no inventamos una barra que se llene:
// se dice en qué va (por tiempo transcurrido) y cuánto suele tardar.
const FASES = [
  { hasta: 1800, texto: 'Preparando la foto' },
  { hasta: 6000, texto: 'Buscando productos' },
  { hasta: 12000, texto: 'Leyendo marcas y tamaños' },
  { hasta: Infinity, texto: 'Ordenando lo que encontré' },
];
const LENTO = 15000;

export function EscaneoProgreso({ alto }: { alto: number }) {
  const [ms, setMs] = useState(0);
  const [barrido] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const desde = Date.now();
    const reloj = setInterval(() => setMs(Date.now() - desde), 500);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    const anim = Animated.loop(Animated.timing(barrido, {
      toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web',
    }));
    anim.start();
    return () => anim.stop();
  }, [barrido]);

  const fase = FASES.find((f) => ms < f.hasta) ?? FASES[FASES.length - 1];
  const detalle = ms >= LENTO
    ? 'Está tardando más de lo normal. No cierres la pantalla.'
    : 'Suele tardar unos segundos.';

  return (
    <View style={[StyleSheet.absoluteFill, styles.escaneo]} pointerEvents="none">
      <Animated.View
        style={[styles.barrido, {
          transform: [{ translateY: barrido.interpolate({ inputRange: [0, 1], outputRange: [-20, alto] }) }],
        }]}
      />
      <View
        style={styles.escaneoCaja}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${fase.texto}. ${detalle}`}
      >
        <ActivityIndicator color="#FFFFFF" size="small" />
        <View style={{ flex: 1 }}>
          <Text style={styles.escaneoTitulo}>{fase.texto}…</Text>
          <Text style={styles.escaneoDetalle}>{detalle}</Text>
        </View>
      </View>
    </View>
  );
}

// ——— Aviso de error o de advertencia, con la salida a la mano ———

export type AccionAviso = { etiqueta: string; icono?: NombreIcono; onPress: () => void; principal?: boolean };

export function AvisoEscaneo({ tono, titulo, mensaje, acciones = [] }: {
  tono: 'error' | 'aviso';
  titulo: string;
  mensaje: string;
  acciones?: AccionAviso[];
}) {
  const color = tono === 'error' ? ui.error : ui.porVencer;
  const tinte = tono === 'error' ? TINTE_ERROR : TINTE_AVISO;
  return (
    <View style={[styles.aviso, { borderLeftColor: color }]} accessibilityLiveRegion="polite">
      <View style={styles.avisoFila}>
        <View style={[styles.avisoIcono, { backgroundColor: tinte }]}>
          <Icono nombre="alerta" tamano={18} color={color} />
        </View>
        <View style={styles.avisoTextos}>
          <Text style={styles.avisoTitulo}>{titulo}</Text>
          <Text style={styles.avisoMensaje}>{mensaje}</Text>
        </View>
      </View>
      {acciones.length > 0 && (
        <View style={styles.avisoAcciones}>
          {acciones.map((a) => (
            <Pressable
              key={a.etiqueta}
              onPress={a.onPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={a.etiqueta}
              style={({ pressed }) => [styles.avisoBoton, a.principal && styles.avisoBotonPrincipal, pressed && { opacity: 0.7 }]}
            >
              {a.icono && <Icono nombre={a.icono} tamano={15} color={a.principal ? ui.accionTexto : ui.texto} />}
              <Text style={[styles.avisoBotonTexto, a.principal && { color: ui.accionTexto }]}>{a.etiqueta}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ——— Qué tan segura viene una detección ———

export type Confianza = 'alta' | 'media' | 'baja';

/** Color de la franja en el borde izquierdo de la fila; null cuando no hay duda. */
export const bandaConfianza = (revisar: boolean, confianza?: Confianza) =>
  revisar ? ui.porVencer : confianza === 'media' ? ui.textoTerciario : null;

/** Lo mismo que dice la marca, para quien escucha la pantalla. */
export const textoConfianza = (revisar: boolean, confianza?: Confianza) =>
  revisar ? 'por revisar, la cámara no lo leyó bien' : confianza === 'media' ? 'confírmalo' : null;

/** Marca junto al nombre: fuerte para lo que no se leyó, discreta para la duda. */
export function MarcaConfianza({ revisar, confianza }: { revisar: boolean; confianza?: Confianza }) {
  if (revisar) {
    return (
      <View style={styles.marcaRevisar}>
        <Text style={styles.marcaRevisarTexto}>Revisar</Text>
      </View>
    );
  }
  if (confianza === 'media') return <Text style={styles.marcaConfirmar}>Confírmalo</Text>;
  return null;
}

/** Dentro del editor: qué hay que corregir, justo donde se corrige. */
export function NotaRevision({ revisar, confianza }: { revisar: boolean; confianza?: Confianza }) {
  const texto = revisar
    ? 'La cámara no leyó bien este producto. Revisa el nombre y la cantidad.'
    : confianza === 'media'
      ? 'La cámara no está del todo segura. Confirma el nombre y la cantidad.'
      : null;
  if (!texto) return null;
  return (
    <View style={styles.notaRevision}>
      <Icono nombre="alerta" tamano={15} color={ui.porVencer} />
      <Text style={styles.notaRevisionTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pistas: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm },
  pista: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14,
    backgroundColor: ui.tarjeta, borderWidth: StyleSheet.hairlineWidth, borderColor: ui.separador,
  },
  pistaTexto: { fontSize: 13, fontWeight: '500', color: ui.textoSecundario, letterSpacing: -0.1 },

  escaneo: { backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end', padding: spacing.md },
  barrido: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 20,
    backgroundColor: 'rgba(255,255,255,0.35)', shadowColor: '#FFFFFF', shadowOpacity: 0.9, shadowRadius: 12,
  },
  escaneoCaja: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  escaneoTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  escaneoDetalle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 1, lineHeight: 16 },

  aviso: {
    backgroundColor: ui.tarjeta, borderRadius: 14, borderLeftWidth: 3, padding: spacing.lg, gap: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  avisoFila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avisoIcono: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avisoTextos: { flex: 1, gap: 2 },
  avisoTitulo: { fontSize: 15, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  avisoMensaje: { fontSize: 13, color: ui.textoSecundario, lineHeight: 18 },
  avisoAcciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingLeft: 32 + spacing.md },
  avisoBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19,
    backgroundColor: ui.tarjeta, borderWidth: StyleSheet.hairlineWidth, borderColor: ui.separador,
  },
  avisoBotonPrincipal: { backgroundColor: ui.accion, borderColor: ui.accion },
  avisoBotonTexto: { fontSize: 14, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },

  marcaRevisar: {
    paddingHorizontal: 8, height: 22, justifyContent: 'center', borderRadius: 11,
    borderWidth: 1, borderColor: ui.porVencer, backgroundColor: ui.tarjeta,
  },
  marcaRevisarTexto: { fontSize: 11, fontWeight: '700', color: ui.porVencer, letterSpacing: 0.1 },
  marcaConfirmar: { fontSize: 12, fontWeight: '600', color: ui.textoSecundario },

  notaRevision: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: TINTE_AVISO, borderRadius: 10, padding: spacing.md,
  },
  notaRevisionTexto: { flex: 1, fontSize: 13, color: ui.texto, lineHeight: 18 },
});
