import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icono, NombreIcono } from '../ui/Icono';
import { Boton } from '../ui/Formulario';
import { IconoCuadro } from '../ui/Lista';
import { iconoCategoria } from '../../data/catalogo';
import { NivelCaducidad, estadoCaducidad, nivelDe } from '../../utils/caducidad';
import { cantidadTexto } from '../../utils/cantidad';
import { diasHasta } from '../../utils/fechas';
import type { ItemFaltante, Producto } from '../../data/mock';
import { ui, spacing } from '../../theme/tokens';

// Piezas de las pantallas de despensa y lista de compras. Aquí vive solo
// cómo se ve lo que las pantallas ya saben; la lógica de caducidad sigue en
// utils/caducidad.ts.
//
// Regla de color, la misma que en Registrar compras: el color aparece solo
// donde avisa de algo. Lo caducado y lo que vence hoy o mañana llevan franja
// roja, lo de los próximos días franja ámbar, y lo que está bien no lleva
// nada. Si todas las filas tuvieran color, el color dejaría de informar.

/** Franja del borde izquierdo; null cuando no hay nada que atender. */
export function franjaDe(nivel: NivelCaducidad) {
  if (nivel === 'caducado' || nivel === 'urgente') return ui.urgente;
  if (nivel === 'porVencer') return ui.porVencer;
  return null;
}

/**
 * Plazo en dos o tres palabras para la columna derecha de la lista: se lee
 * de corrido hacia abajo y así se ve de un tirón qué urge. El texto completo
 * ("Caducó hace 3 días") se queda para el lector de pantalla y para la ficha.
 */
export function plazoCorto(producto: Pick<Producto, 'fechaCaducidad'>) {
  const nivel = nivelDe(producto);
  if (!producto.fechaCaducidad) return { texto: 'Sin fecha', tono: ui.textoSecundario };
  const dias = diasHasta(producto.fechaCaducidad);
  if (dias < 0) return { texto: 'Caducó', tono: ui.urgente };
  if (dias === 0) return { texto: 'Hoy', tono: ui.urgente };
  if (dias === 1) return { texto: 'Mañana', tono: ui.urgente };
  const texto = `${dias} días`;
  if (nivel === 'urgente') return { texto, tono: ui.urgente };
  if (nivel === 'porVencer') return { texto, tono: ui.porVencer };
  return { texto, tono: ui.textoSecundario };
}

// ——— Fila de producto en la despensa ———

/**
 * Qué, cuánto, dónde y cuándo, en ese orden de lectura: el nombre manda, la
 * cantidad y el lugar van abajo en chico y el plazo se alinea a la derecha
 * para formar una columna.
 */
function FilaInventarioBase({ producto }: { producto: Producto }) {
  const router = useRouter();
  const nivel = nivelDe(producto);
  const franja = franjaDe(nivel);
  const plazo = plazoCorto(producto);
  const cantidad = cantidadTexto(producto.cantidad, producto.unidad);
  return (
    <Pressable
      onPress={() => router.push(`/producto/${producto.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${producto.nombre}, ${cantidad}, en ${producto.ubicacion}. ${estadoCaducidad(producto).texto}.`}
      accessibilityHint="Abre la ficha del producto"
      style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}
    >
      {franja && <View style={[styles.franja, { backgroundColor: franja }]} />}
      <IconoCuadro icono={iconoCategoria(producto.categoria)} />
      <View style={styles.filaCentro}>
        <Text style={styles.filaNombre} numberOfLines={1}>{producto.nombre}</Text>
        <Text style={styles.filaDetalle} numberOfLines={1}>
          <Text style={styles.filaCantidad}>{cantidad}</Text>
          {` · ${producto.ubicacion}`}
        </Text>
      </View>
      <Text style={[styles.plazo, { color: plazo.tono }]} numberOfLines={1}>{plazo.texto}</Text>
      <Icono nombre="chevron" tamano={14} color={ui.textoTerciario} />
    </Pressable>
  );
}

// ——— Cabecera de grupo ———

/** Encabezado de un grupo de la lista: el ícono del lugar y cuántos hay. */
export function CabeceraGrupo({ icono, titulo, cuenta, nota }: {
  icono?: NombreIcono; titulo: string; cuenta?: number; nota?: string;
}) {
  return (
    <View style={styles.cabecera}>
      <View style={styles.cabeceraFila}>
        {icono && <Icono nombre={icono} tamano={15} color={ui.icono} />}
        <Text style={styles.cabeceraTitulo}>{titulo}</Text>
        {cuenta !== undefined && <Text style={styles.cabeceraCuenta}>{cuenta}</Text>}
      </View>
      {nota && <Text style={styles.cabeceraNota}>{nota}</Text>}
    </View>
  );
}

// ——— Filtros de la despensa ———

export type Filtro = 'todos' | 'por-caducar' | 'caducados';

export const FILTROS: { id: Filtro; etiqueta: string; titulo: string }[] = [
  { id: 'todos', etiqueta: 'Todos', titulo: 'Mi despensa' },
  { id: 'por-caducar', etiqueta: 'Por caducar', titulo: 'Por caducar' },
  { id: 'caducados', etiqueta: 'Caducados', titulo: 'Caducados' },
];

/**
 * Filtros con su cuenta: el número se ve antes de tocar, así se sabe si hay
 * algo caducado sin entrar a mirar. Las cuentas son del total, no de la
 * búsqueda, porque sirven de aviso.
 */
export function FiltrosCaducidad({ actual, cuentas, onCambiar }: {
  actual: Filtro; cuentas: Record<Filtro, number>; onCambiar: (f: Filtro) => void;
}) {
  return (
    <View style={styles.filtros} accessibilityRole="tablist">
      {FILTROS.map((f) => {
        const activo = f.id === actual;
        const n = cuentas[f.id];
        return (
          <Pressable
            key={f.id}
            onPress={() => onCambiar(f.id)}
            hitSlop={6}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${f.etiqueta}, ${n} ${n === 1 ? 'producto' : 'productos'}`}
            style={({ pressed }) => [styles.filtro, activo && styles.filtroActivo, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>{f.etiqueta}</Text>
            <Text style={[styles.filtroCuenta, activo && styles.filtroCuentaActiva]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ——— Pantalla vacía con salida ———

export type AccionVacio = { etiqueta: string; icono?: NombreIcono; onPress: () => void };

/**
 * Una pantalla vacía dice qué hacer, no solo que está vacía: de ahí el botón.
 * Mismos tamaños que `Vacio` de ui/Lista, con una acción debajo.
 */
export function VacioAccion({ icono, titulo, texto, accion, secundaria }: {
  icono: NombreIcono; titulo: string; texto: string; accion?: AccionVacio; secundaria?: AccionVacio;
}) {
  return (
    <View style={styles.vacio}>
      <Icono nombre={icono} tamano={40} color={ui.textoTerciario} />
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      <Text style={styles.vacioTexto}>{texto}</Text>
      {accion && (
        <View style={styles.vacioBoton}>
          <Boton titulo={accion.etiqueta} icono={accion.icono} onPress={accion.onPress} />
        </View>
      )}
      {secundaria && (
        <Pressable
          onPress={secundaria.onPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={secundaria.etiqueta}
          style={({ pressed }) => [styles.vacioTextoBoton, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.vacioTextoBotonTexto}>{secundaria.etiqueta}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ——— Fila de la lista de compras ———

/**
 * Pensada para el súper y con una mano: toda la fila marca y desmarca, y
 * quitar está en su propio botón grande y separado para no borrar sin querer.
 */
function FilaFaltanteBase({ item, marcado, onAlternar, onQuitar }: {
  // Reciben el id al llamarlas, en vez de venir ya ligadas a el: con una
  // flecha por fila la identidad cambiaba en cada render y React.memo no
  // servia de nada.
  item: ItemFaltante; marcado: boolean;
  onAlternar: (id: string) => void; onQuitar: (id: string) => void;
}) {
  const cantidad = cantidadTexto(item.cantidad, item.unidad);
  return (
    <Pressable
      onPress={() => onAlternar(item.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      accessibilityLabel={`${item.nombre}, ${cantidad}`}
      accessibilityHint={marcado ? 'Quitar del carrito' : 'Marcar como puesto en el carrito'}
      style={({ pressed }) => [styles.compra, pressed && styles.filaPresionada]}
    >
      <View style={styles.compraCaja}>
        <Icono nombre={marcado ? 'check-circulo' : 'circulo'} tamano={26} color={marcado ? ui.accion : ui.icono} />
      </View>
      <View style={styles.filaCentro}>
        <Text style={[styles.compraNombre, marcado && styles.compraNombreMarcado]} numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text style={styles.filaDetalle} numberOfLines={1}>
          {cantidad}
        </Text>
      </View>
      <Pressable
        onPress={(e) => { e.stopPropagation(); onQuitar(item.id); }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${item.nombre} de la lista`}
        style={({ pressed }) => [styles.compraQuitar, pressed && { opacity: 0.5 }]}
      >
        <Icono nombre="cerrar" tamano={17} color={ui.textoSecundario} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingLeft: spacing.lg, paddingRight: spacing.md, paddingVertical: 11, minHeight: 62, backgroundColor: ui.tarjeta,
  },
  filaPresionada: { backgroundColor: ui.tarjetaPresionada },
  franja: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  filaCentro: { flex: 1, gap: 2 },
  filaNombre: { fontSize: 16, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  filaDetalle: { fontSize: 13, color: ui.textoSecundario },
  filaCantidad: { fontSize: 13, fontWeight: '600', color: ui.texto },
  plazo: { fontSize: 13, fontWeight: '600', textAlign: 'right', letterSpacing: -0.1 },

  cabecera: { gap: 2, paddingHorizontal: spacing.lg },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cabeceraTitulo: { flex: 1, fontSize: 13, fontWeight: '600', color: ui.textoSecundario, letterSpacing: 0.2 },
  cabeceraCuenta: { fontSize: 13, fontWeight: '500', color: ui.textoSecundario },
  cabeceraNota: { fontSize: 13, color: ui.textoSecundario, lineHeight: 18 },

  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filtro: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: ui.tarjeta, borderWidth: StyleSheet.hairlineWidth, borderColor: ui.separador,
  },
  filtroActivo: { backgroundColor: ui.accion, borderColor: ui.accion },
  filtroTexto: { fontSize: 15, fontWeight: '500', color: ui.texto, letterSpacing: -0.2 },
  filtroTextoActivo: { color: ui.accionTexto, fontWeight: '600' },
  filtroCuenta: { fontSize: 13, fontWeight: '600', color: ui.textoSecundario },
  filtroCuentaActiva: { color: 'rgba(255,255,255,0.75)' },

  vacio: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  vacioTitulo: { fontSize: 17, fontWeight: '600', color: ui.texto, marginTop: spacing.xs },
  vacioTexto: { fontSize: 15, color: ui.textoSecundario, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  vacioBoton: { alignSelf: 'stretch', maxWidth: 300, width: '100%', marginTop: spacing.md },
  vacioTextoBoton: { height: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  vacioTextoBotonTexto: { fontSize: 15, fontWeight: '500', color: ui.texto, letterSpacing: -0.2 },

  compra: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingLeft: spacing.sm, paddingRight: spacing.sm, paddingVertical: 8, minHeight: 60, backgroundColor: ui.tarjeta,
  },
  compraCaja: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  compraNombre: { fontSize: 16, fontWeight: '500', color: ui.texto, letterSpacing: -0.2 },
  compraNombreMarcado: { textDecorationLine: 'line-through', color: ui.textoSecundario },
  compraQuitar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

// Las filas se memoizan: sin esto, cada tecla del buscador o cada cambio de
// filtro vuelve a dibujar la lista entera. Los productos vienen de un useMemo,
// asi que su identidad solo cambia cuando el producto cambio de verdad.
export const FilaInventario = React.memo(FilaInventarioBase);
export const FilaFaltante = React.memo(FilaFaltanteBase);
