import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../ui/Icono';
import { Boton } from '../ui/Formulario';
import { Rebote } from '../hogar/animaciones';
import { ui, spacing } from '../../theme/tokens';

// Piezas de la hoja inferior del inicio: el encabezado de cada lugar, el
// aviso de lo que hay que atender, los atajos de la casa y los estados de
// carga y de vacío. Aquí vive solo cómo se ve lo que inicio.tsx ya sabe.
//
// Regla de color, la misma que en Mi despensa y en Registrar compras: el
// color aparece solo donde avisa de algo. Lo lleva el aviso de caducidad y
// nada más; los atajos, el encabezado y las listas se quedan en grafito
// sobre blanco. Si todo llevara color, el color dejaría de informar.
//
// Tintes suaves de los tonos del tema (tokens.ts guarda solo el color
// pleno), los mismos que en registro/escaneo.tsx. Van de fondo detrás de un
// ícono, nunca de texto chico.
const TINTE_AVISO = '#FFF1DC';
const TINTE_ERROR = '#FBE9E7';

export type AccionHoja = { etiqueta: string; icono?: NombreIcono; principal?: boolean; onPress: () => void };

// ——— Encabezado de la hoja ———

/**
 * Qué lugar es y qué hay que atender ahí, con la acción del lugar a la
 * derecha. El subtítulo es opcional: cuando el cuerpo de la hoja ya lo dice
 * (está vacía, está cargando) se queda sin él en vez de repetirlo.
 */
export function EncabezadoHoja({ titulo, subtitulo, tono, accion }: {
  titulo: string; subtitulo?: string; tono?: string; accion?: AccionHoja;
}) {
  return (
    <View style={styles.encabezado}>
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo}>{titulo}</Text>
        {!!subtitulo && (
          <Text style={[styles.subtitulo, !!tono && { color: tono, fontWeight: '600' }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        )}
      </View>
      {accion && (
        <Rebote
          onPress={accion.onPress}
          accessibilityRole="button"
          accessibilityLabel={accion.etiqueta}
          hitSlop={8}
          escala={0.92}
          style={[styles.pastilla, accion.principal && styles.pastillaPrincipal]}
        >
          {accion.icono && (
            <View><Icono nombre={accion.icono} tamano={15} color={accion.principal ? ui.accionTexto : ui.texto} /></View>
          )}
          <Text style={[styles.pastillaTexto, accion.principal && { color: ui.accionTexto }]}>{accion.etiqueta}</Text>
          {!accion.icono && <View><Icono nombre="chevron" tamano={12} color={ui.texto} /></View>}
        </Rebote>
      )}
    </View>
  );
}

// ——— Aviso de lo que hay que atender ———

export type TonoAviso = 'urgente' | 'porVencer' | 'neutro';

const TONOS: Record<TonoAviso, { franja: string | null; tinte: string; tinta: string; icono: NombreIcono }> = {
  urgente: { franja: ui.urgente, tinte: TINTE_ERROR, tinta: ui.urgente, icono: 'alerta' },
  porVencer: { franja: ui.porVencer, tinte: TINTE_AVISO, tinta: ui.porVencer, icono: 'reloj' },
  neutro: { franja: null, tinte: ui.relleno, tinta: ui.textoSecundario, icono: 'check-circulo' },
};

/**
 * Lo primero que se lee al abrir la app: qué caducó o caduca pronto, con la
 * salida a la mano. Mismo molde que el aviso de Registrar compras (franja
 * de 3 px, ícono sobre su tinte, botones debajo).
 *
 * Con `onPress` toda la caja es un botón y no lleva botones propios: así
 * cabe en una línea en pantallas bajas y así se ve el "todo en orden", que
 * no necesita franja ni acciones aparte.
 */
export function AvisoHoja({ tono, icono, titulo, mensaje, acciones = [], unaLinea, onPress }: {
  tono: TonoAviso;
  icono?: NombreIcono;
  titulo: string;
  mensaje: string;
  acciones?: AccionHoja[];
  unaLinea?: boolean;
  onPress?: () => void;
}) {
  const t = TONOS[tono];
  const caja = [
    styles.aviso,
    !!unaLinea && styles.avisoBajo,
    !!t.franja && { borderLeftWidth: 3, borderLeftColor: t.franja },
  ];
  const cuerpo = (
    <View style={styles.avisoFila}>
      <View style={[styles.avisoIcono, !!unaLinea && styles.avisoIconoChico, { backgroundColor: t.tinte }]}>
        <Icono nombre={icono ?? t.icono} tamano={unaLinea ? 16 : 18} color={t.tinta} />
      </View>
      <View style={styles.avisoTextos}>
        <Text style={styles.avisoTitulo} numberOfLines={1}>{titulo}</Text>
        <Text style={styles.avisoMensaje} numberOfLines={unaLinea ? 1 : 2}>{mensaje}</Text>
      </View>
      {!!onPress && <View><Icono nombre="chevron" tamano={14} color={ui.textoTerciario} /></View>}
    </View>
  );

  if (onPress) {
    return (
      <Rebote
        onPress={onPress}
        escala={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${titulo}. ${mensaje}`}
        style={caja}
      >
        {cuerpo}
      </Rebote>
    );
  }

  return (
    <View style={caja} accessibilityLiveRegion="polite">
      {cuerpo}
      {acciones.length > 0 && (
        <View style={styles.avisoAcciones}>
          {acciones.map((a) => (
            <Rebote
              key={a.etiqueta}
              onPress={a.onPress}
              hitSlop={8}
              escala={0.95}
              accessibilityRole="button"
              accessibilityLabel={a.etiqueta}
              style={[styles.avisoBoton, !!a.principal && styles.avisoBotonPrincipal]}
            >
              {a.icono && <View><Icono nombre={a.icono} tamano={15} color={a.principal ? ui.accionTexto : ui.texto} /></View>}
              <Text style={[styles.avisoBotonTexto, !!a.principal && { color: ui.accionTexto }]}>{a.etiqueta}</Text>
            </Rebote>
          ))}
        </View>
      )}
    </View>
  );
}

// ——— Atajos de la casa ———

/**
 * Entrada a otra pantalla. Sin número grande: la cifra va dentro de la
 * frase ("12 productos"), en negritas, como en las filas de la despensa.
 * Así se lee como lenguaje y no compite con la cifra del titular, que ya
 * dice cuántos productos hay en la casa.
 *
 * Siempre en un renglón (ícono, nombre y frase): la hoja no se desplaza y
 * en pantallas bajas una tarjeta en columna no cabe junto al aviso.
 */
export function TarjetaAtajo({ icono, titulo, valor, detalle, onPress }: {
  icono: NombreIcono; titulo: string; valor?: number; detalle: string; onPress: () => void;
}) {
  return (
    <Rebote
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${valor !== undefined ? `${valor} ` : ''}${detalle}`}
      llenar
      escala={0.97}
      style={styles.atajo}
    >
      <View style={styles.atajoIcono}>
        <Icono nombre={icono} tamano={15} color={ui.texto} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.atajoTitulo} numberOfLines={1}>{titulo}</Text>
        <Text style={styles.atajoDetalle} numberOfLines={1}>
          {valor !== undefined && <Text style={styles.atajoValor}>{`${valor} `}</Text>}
          {detalle}
        </Text>
      </View>
    </Rebote>
  );
}

// ——— Mientras llega la despensa ———

/**
 * No hay avance que reportar (la despensa llega de una sola vez), así que
 * no se dibuja ninguna barra que se llene: se dice qué se está esperando.
 */
export function Cargando({ fila }: { fila?: boolean }) {
  return (
    <View
      style={fila ? styles.cargandoFila : styles.cargando}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel="Cargando tu despensa"
    >
      <ActivityIndicator color={ui.icono} size="small" />
      <Text style={styles.cargandoTexto}>Cargando tu despensa…</Text>
    </View>
  );
}

// ——— Lugar sin nada guardado ———

/** Una pantalla vacía dice qué hacer y trae el botón para hacerlo. */
export function VacioHoja({ icono, titulo, texto, accion }: {
  icono: NombreIcono; titulo: string; texto: string; accion: AccionHoja;
}) {
  return (
    <View style={styles.vacio}>
      <Icono nombre={icono} tamano={36} color={ui.textoTerciario} />
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      <Text style={styles.vacioTexto}>{texto}</Text>
      <View style={styles.vacioBoton}>
        <Boton titulo={accion.etiqueta} icono={accion.icono} onPress={accion.onPress} />
      </View>
    </View>
  );
}

// ——— Cola de la lista: lo que no cupo ———

export function FilaVerMas({ cuantos, onPress }: { cuantos: number; onPress: () => void }) {
  return (
    <Rebote
      onPress={onPress}
      escala={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${cuantos} ${cuantos === 1 ? 'producto más' : 'productos más'} en Mi despensa`}
      style={styles.verMas}
    >
      <Text style={styles.verMasTexto}>{`Ver ${cuantos} más`}</Text>
      <View><Icono nombre="chevron" tamano={14} color={ui.textoTerciario} /></View>
    </Rebote>
  );
}

const styles = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titulo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: ui.texto },
  subtitulo: { fontSize: 13, color: ui.textoSecundario, marginTop: 2 },
  pastilla: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18,
    backgroundColor: ui.tarjeta, borderWidth: StyleSheet.hairlineWidth, borderColor: ui.separador,
  },
  pastillaPrincipal: { backgroundColor: ui.accion, borderColor: ui.accion },
  pastillaTexto: { fontSize: 14, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },

  // Mismo molde que el aviso de Registrar compras; avisoBajo lo recorta
  // cuando la pantalla no da para los botones.
  aviso: {
    backgroundColor: ui.tarjeta, borderRadius: 14, padding: spacing.lg, gap: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  avisoBajo: { paddingVertical: spacing.md },
  avisoFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avisoIcono: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avisoIconoChico: { width: 28, height: 28, borderRadius: 14 },
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

  atajo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44,
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 14, backgroundColor: ui.tarjeta,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  atajoIcono: { width: 28, height: 28, borderRadius: 14, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  atajoTitulo: { fontSize: 14, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  atajoDetalle: { fontSize: 12, color: ui.textoSecundario, marginTop: 1 },
  atajoValor: { fontWeight: '600', color: ui.texto },

  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  cargandoFila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60,
    backgroundColor: ui.tarjeta, borderRadius: 14, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  cargandoTexto: { fontSize: 15, color: ui.textoSecundario, letterSpacing: -0.2 },

  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  vacioTitulo: { fontSize: 17, fontWeight: '600', color: ui.texto, marginTop: spacing.xs },
  vacioTexto: { fontSize: 15, color: ui.textoSecundario, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  vacioBoton: { alignSelf: 'stretch', maxWidth: 300, width: '100%', marginTop: spacing.sm },

  verMas: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, height: 48, backgroundColor: ui.tarjeta,
  },
  verMasTexto: { fontSize: 15, fontWeight: '500', color: ui.textoSecundario },
});
