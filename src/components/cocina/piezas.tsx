import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../ui/Icono';
import { IconoCuadro } from '../ui/Lista';
import { franjaDe, plazoCorto } from '../inventario/piezas';
import { nivelDe } from '../../utils/caducidad';
import type { Producto } from '../../data/mock';
import type { Receta } from '../../services/esquemaRecetas';
import { ui, spacing } from '../../theme/tokens';

// Piezas de "¿Qué cocino?": la espera mientras el modelo escribe las recetas,
// la lista de lo que conviene usar pronto y la tarjeta de cada receta. Aquí no
// se pide nada al servidor; eso sigue en services/recetas.ts.
//
// Regla de color, la misma del resto de la app: el color solo aparece donde
// avisa de algo. En esta pantalla eso es la caducidad —el plazo de la lista de
// arriba y los ingredientes de la receta que ya están por vencer—. El resto va
// en gris, así que lo ámbar se lee de un tirón.

// ——— Mientras el modelo escribe las recetas ———

// Mismo criterio que el escaneo de la cámara (components/registro/escaneo.tsx):
// el servicio no reporta avance, así que no se dibuja una barra que se llene
// sola; se dice en qué va, por tiempo transcurrido, y cuánto suele tardar. No
// se reusa EscaneoProgreso porque esa va encima de la cámara y a pantalla
// completa; esta vive en el flujo, en el lugar del botón que se acaba de tocar.
const FASES = [
  { hasta: 2500, texto: 'Revisando tu despensa' },
  { hasta: 8000, texto: 'Buscando qué se puede cocinar' },
  { hasta: 16000, texto: 'Escribiendo los pasos' },
  { hasta: Infinity, texto: 'Acomodando las recetas' },
];
const LENTO = 20000;

export function RecetasProgreso() {
  const [ms, setMs] = useState(0);
  const [ancho, setAncho] = useState(0);
  const [barrido] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const desde = Date.now();
    const reloj = setInterval(() => setMs(Date.now() - desde), 500);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (!ancho) return;
    const anim = Animated.loop(Animated.timing(barrido, {
      toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web',
    }));
    anim.start();
    return () => { anim.stop(); barrido.setValue(0); };
  }, [barrido, ancho]);

  const fase = FASES.find((f) => ms < f.hasta) ?? FASES[FASES.length - 1];
  const detalle = ms >= LENTO
    ? 'Está tardando más de lo normal. No cierres la pantalla.'
    : 'Suele tardar unos segundos.';

  return (
    <View
      style={styles.progreso}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${fase.texto}. ${detalle}`}
    >
      {ancho > 0 && (
        <Animated.View
          style={[styles.barrido, {
            transform: [{ translateX: barrido.interpolate({ inputRange: [0, 1], outputRange: [-110, ancho] }) }],
          }]}
        />
      )}
      <ActivityIndicator color={ui.texto} />
      <View style={{ flex: 1 }}>
        <Text style={styles.progresoTitulo}>{fase.texto}…</Text>
        <Text style={styles.progresoDetalle}>{detalle}</Text>
      </View>
    </View>
  );
}

// ——— Lo que conviene usar pronto ———

/**
 * Los productos que vencen, con su plazo a la derecha para que se lea de
 * corrido hacia abajo, igual que en la despensa. Es la lista con la que el
 * servidor arma las recetas, así que se enseña antes de pedirlas: así se
 * entiende de dónde van a salir.
 */
export function FilaUsarPronto({ producto }: { producto: Producto }) {
  const franja = franjaDe(nivelDe(producto));
  const plazo = plazoCorto(producto);
  return (
    <View
      style={styles.usar}
      accessible
      accessibilityLabel={`${producto.nombre}, ${plazo.texto.toLowerCase()}`}
    >
      {franja && <View style={[styles.franja, { backgroundColor: franja }]} />}
      <Text style={styles.usarNombre} numberOfLines={1}>{producto.nombre}</Text>
      <Text style={[styles.usarPlazo, { color: plazo.tono }]} numberOfLines={1}>{plazo.texto}</Text>
    </View>
  );
}

// ——— Receta ———

/** Para comparar nombres del modelo con los de la despensa: sin acentos ni mayúsculas. */
const clave = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Cuáles de los ingredientes de la receta son productos que ya vencen. El
 * modelo escribe los nombres tal cual están en la despensa, pero a veces los
 * acorta o los alarga ("leche" / "leche entera"), así que basta con que uno
 * contenga al otro.
 */
export function ingredientesQueVencen(usa: string[], porCaducar: Producto[]) {
  const nombres = porCaducar.map((p) => clave(p.nombre)).filter(Boolean);
  return new Set(
    usa.filter((i) => {
      const c = clave(i);
      return c.length > 2 && nombres.some((n) => n.includes(c) || c.includes(n));
    }),
  );
}

/**
 * Qué se cocina, con qué y cómo, en ese orden. El subtítulo dice cuántos
 * productos ocupa y cuántos de ellos vencen, que es lo que hace elegir una
 * receta sobre otra; los pasos van numerados porque sí son una secuencia.
 */
export function TarjetaReceta({ receta, porCaducar }: { receta: Receta; porCaducar: Producto[] }) {
  const vencen = ingredientesQueVencen(receta.usa, porCaducar);
  const n = receta.usa.length;
  const resumen = n === 0
    ? 'Con lo que hay en tu despensa.'
    : vencen.size > 0
      ? `Usa ${n} ${n === 1 ? 'producto' : 'productos'} de tu despensa, ${vencen.size} por caducar.`
      : `Usa ${n} ${n === 1 ? 'producto' : 'productos'} de tu despensa.`;

  return (
    <View style={styles.receta}>
      <View style={styles.recetaCabecera} accessible accessibilityLabel={`${receta.titulo}. ${resumen}`}>
        <IconoCuadro icono="olla" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.recetaTitulo}>{receta.titulo}</Text>
          <Text style={styles.recetaResumen}>{resumen}</Text>
        </View>
      </View>

      {receta.usa.length > 0 && (
        <View style={styles.ingredientes}>
          {receta.usa.map((i, k) => {
            const vence = vencen.has(i);
            return (
              <View
                key={`${i}-${k}`}
                style={[styles.ingrediente, vence && styles.ingredienteVence]}
                accessible
                accessibilityLabel={vence ? `${i}, por caducar` : i}
              >
                {vence && <Icono nombre="reloj" tamano={12} color={ui.porVencer} />}
                <Text style={[styles.ingredienteTexto, vence && { color: ui.porVencer }]}>{i}</Text>
              </View>
            );
          })}
        </View>
      )}

      {receta.pasos.length > 0 && (
        <View style={styles.pasos}>
          {receta.pasos.map((paso, i) => (
            <View key={i} style={styles.paso} accessible accessibilityLabel={`Paso ${i + 1}. ${paso}`}>
              <View style={styles.pasoNumero}>
                <Text style={styles.pasoNumeroTexto}>{i + 1}</Text>
              </View>
              <Text style={styles.pasoTexto}>{paso}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progreso: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, overflow: 'hidden',
    minHeight: 54, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: ui.tarjeta, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  barrido: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 110,
    backgroundColor: ui.tarjetaPresionada,
  },
  progresoTitulo: { fontSize: 15, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  progresoDetalle: { fontSize: 13, color: ui.textoSecundario, lineHeight: 18, marginTop: 1 },

  usar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44,
    paddingLeft: spacing.lg, paddingRight: spacing.lg, paddingVertical: 11, backgroundColor: ui.tarjeta,
  },
  franja: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  usarNombre: { flex: 1, fontSize: 16, fontWeight: '500', color: ui.texto, letterSpacing: -0.2 },
  usarPlazo: { fontSize: 13, fontWeight: '600', textAlign: 'right', letterSpacing: -0.1 },

  receta: { padding: spacing.lg, gap: spacing.md },
  recetaCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recetaTitulo: { fontSize: 17, fontWeight: '600', color: ui.texto, letterSpacing: -0.3 },
  recetaResumen: { fontSize: 13, color: ui.textoSecundario, lineHeight: 18 },

  ingredientes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ingrediente: {
    flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 30, paddingHorizontal: 10, borderRadius: 15,
    backgroundColor: ui.relleno,
  },
  ingredienteVence: { backgroundColor: ui.tarjeta, borderWidth: 1, borderColor: ui.porVencer },
  ingredienteTexto: { fontSize: 13, fontWeight: '500', color: ui.texto, letterSpacing: -0.1 },

  pasos: { gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.separador, paddingTop: spacing.md },
  paso: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pasoNumero: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: ui.relleno,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  pasoNumeroTexto: { fontSize: 12, fontWeight: '700', color: ui.textoSecundario },
  pasoTexto: { flex: 1, fontSize: 15, lineHeight: 21, color: ui.texto },
});
