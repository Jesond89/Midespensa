import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icono, NombreIcono } from './Icono';
import { useRouter } from 'expo-router';
import { Producto } from '../../data/mock';
import { iconoCategoria } from '../../data/catalogo';
import { estadoCaducidad } from '../../utils/caducidad';
import { ui, spacing } from '../../theme/tokens';
import { cantidadTexto } from '../../utils/cantidad';

// Filas para las listas agrupadas de la app.


export function IconoCuadro({ icono, tamano = 36, color = ui.texto }: { icono: NombreIcono; tamano?: number; color?: string }) {
  return (
    <View style={[styles.iconoCuadro, { width: tamano, height: tamano, borderRadius: tamano * 0.28 }]}>
      <Icono nombre={icono} tamano={tamano * 0.5} color={color} />
    </View>
  );
}

export function EstadoCaducidad({ producto, pastilla }: { producto: Pick<Producto, 'fechaCaducidad'>; pastilla?: boolean }) {
  const { tono, texto } = estadoCaducidad(producto);
  return (
    <View style={[styles.estado, pastilla && [styles.pastilla, { backgroundColor: tono + '1A' }]]}>
      <View style={[styles.punto, { backgroundColor: tono }]} />
      <Text style={[styles.estadoTexto, { color: tono }]}>{texto}</Text>
    </View>
  );
}

export function FilaProducto({ producto }: { producto: Producto }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/producto/${producto.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${producto.nombre}, ${cantidadTexto(producto.cantidad, producto.unidad)}, ${estadoCaducidad(producto).texto}`}
      style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}
    >
      <IconoCuadro icono={iconoCategoria(producto.categoria)} />
      <View style={styles.filaCentro}>
        <Text style={styles.filaTitulo} numberOfLines={1}>{producto.nombre}</Text>
        <Text style={styles.filaSub} numberOfLines={1}>
          {cantidadTexto(producto.cantidad, producto.unidad)} · {producto.ubicacion}
        </Text>
      </View>
      <EstadoCaducidad producto={producto} />
      <Icono nombre="chevron" tamano={16} color={ui.textoTerciario} />
    </Pressable>
  );
}

export function FilaDato({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        <Text style={styles.datoValor}>{valor}</Text>
        {detalle && <Text style={styles.datoDetalle}>{detalle}</Text>}
      </View>
    </View>
  );
}

type FilaAccionProps = { icono: NombreIcono; titulo: string; onPress: () => void; destructiva?: boolean };

export function FilaAccion({ icono, titulo, onPress, destructiva }: FilaAccionProps) {
  const tono = destructiva ? ui.error : ui.texto;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}
    >
      <Icono nombre={icono} tamano={21} color={tono} style={{ width: 24 }} />
      <Text style={[styles.accionTitulo, { color: tono }]}>{titulo}</Text>
      {!destructiva && <Icono nombre="chevron" tamano={16} color={ui.textoTerciario} />}
    </Pressable>
  );
}

export function Vacio({ icono, titulo, texto }: { icono: NombreIcono; titulo: string; texto: string }) {
  return (
    <View style={styles.vacio}>
      <Icono nombre={icono} tamano={40} color={ui.textoTerciario} />
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      <Text style={styles.vacioTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconoCuadro: { backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pastilla: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  estadoTexto: { fontSize: 13, fontWeight: '500' },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 11, minHeight: 56, backgroundColor: ui.tarjeta,
  },
  filaPresionada: { backgroundColor: ui.tarjetaPresionada },
  filaCentro: { flex: 1, gap: 2 },
  filaTitulo: { fontSize: 16, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  filaSub: { fontSize: 13, color: ui.textoSecundario },
  dato: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 13, minHeight: 50,
  },
  datoEtiqueta: { fontSize: 16, color: ui.texto },
  datoValor: { fontSize: 16, color: ui.textoSecundario, textAlign: 'right' },
  datoDetalle: { fontSize: 12, color: ui.textoSecundario, marginTop: 1 },
  accionTitulo: { flex: 1, fontSize: 16, letterSpacing: -0.2 },
  vacio: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  vacioTitulo: { fontSize: 17, fontWeight: '600', color: ui.texto, marginTop: spacing.xs },
  vacioTexto: { fontSize: 15, color: ui.textoSecundario, textAlign: 'center', lineHeight: 20 },
});
