import React, { useMemo, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Href } from 'expo-router';
import { Boton, Grupo } from '../ui/Formulario';
import { FilaInventario } from '../inventario/piezas';
import { Entrada } from '../hogar/animaciones';
import { Ambiente } from '../hogar/ambientes';
import { AvisoHoja, Cargando, EncabezadoHoja, FilaVerMas, TarjetaAtajo, TonoAviso, VacioHoja } from './piezas';
import { estadoCaducidad, estaCaducado, estaPorCaducar, ordenarPorCaducidad } from '../../utils/caducidad';
import { Producto } from '../../data/mock';
import { ui, spacing } from '../../theme/tokens';

// Contenido de la hoja inferior del inicio: la casa (página 0) y cada
// lugar (refri, cocina, alacena). La hoja no se desplaza hacia abajo, así
// que todo se acomoda a la altura que hay.
//
// Jerarquía, de arriba hacia abajo: primero lo que hay que atender hoy
// (caducado o por caducar), con su acción; luego los atajos y las listas,
// que acompañan sin competir. Las filas de productos son las mismas de Mi
// despensa (FilaInventario), para que un producto se vea igual en las dos
// pantallas.

/** Alto de una fila de producto (FilaInventario mide 62 más el separador). */
const ALTO_FILA = 63;

export type ContenidoProps = {
  ambiente: Ambiente;
  /** Falso mientras se difiere el montaje: solo ocupa su lugar en el carrusel. */
  montado?: boolean;
  /** Es la página que se está viendo: las demás salen del árbol accesible. */
  activo: boolean;
  indice: number;
  ancho: number;
  arriba: number;
  abajo: number;
  scrollX: Animated.Value;
  montaje: Animated.Value;
  productos: Producto[];
  faltantes: number;
  codigoHogar: string;
  /** La despensa todavía no llega: no se dan cifras que serían falsas. */
  cargando: boolean;
  /** Pantalla baja (menos de 720): el aviso se reduce a un renglón. */
  compacto: boolean;
  onIr: (ruta: Href) => void;
};

export function ContenidoHoja(p: ContenidoProps) {
  const { ambiente, indice, ancho, arriba, abajo, scrollX, productos, activo, montado = true } = p;
  const { ubicaciones } = ambiente;
  const propios = ubicaciones ? productos.filter((x) => ubicaciones.includes(x.ubicacion)) : productos;
  // El contenido que se va se desvanece antes de salir de la pantalla.
  const opacidad = scrollX.interpolate({
    inputRange: [(indice - 0.75) * ancho, indice * ancho, (indice + 0.75) * ancho],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  if (!montado) return <View style={{ width: ancho }} />;
  return (
    <Animated.View
      style={[styles.hoja, { width: ancho, paddingTop: arriba, paddingBottom: abajo + spacing.md, opacity: opacidad }]}
      // Las páginas que no se ven no se tocan ni se leen en voz alta.
      pointerEvents={activo ? 'auto' : 'none'}
      accessibilityElementsHidden={!activo}
      importantForAccessibility={activo ? 'auto' : 'no-hide-descendants'}
    >
      {ubicaciones
        ? <HojaLugar {...p} productos={propios} />
        : <HojaCasa {...p} />}
    </Animated.View>
  );
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function hoyTexto() {
  const t = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Lo que hay que atender en una lista, y qué hacer al respecto. */
function avisoDe(lista: Producto[]): { tono: TonoAviso; titulo: string; mensaje: string } | null {
  const caducados = lista.filter(estaCaducado).sort(ordenarPorCaducidad);
  if (caducados.length) {
    const peor = caducados[0];
    return {
      tono: 'urgente',
      titulo: plural(caducados.length, 'producto caducado', 'productos caducados'),
      mensaje: `${peor.nombre} ${estadoCaducidad(peor).texto.toLowerCase()}. ${caducados.length === 1
        ? 'Revísalo y decide si todavía sirve.'
        : 'Revísalos y decide si todavía sirven.'}`,
    };
  }
  const pronto = lista.filter(estaPorCaducar).sort(ordenarPorCaducidad);
  if (pronto.length) {
    const primero = pronto[0];
    return {
      tono: 'porVencer',
      titulo: pronto.length === 1 ? '1 producto caduca pronto' : `${pronto.length} productos caducan pronto`,
      mensaje: `${primero.nombre} ${estadoCaducidad(primero).texto.toLowerCase()}. ${pronto.length === 1 ? 'Úsalo' : 'Úsalos'} primero.`,
    };
  }
  return null;
}

// ——— Hoja de la casa ———

/**
 * Lo primero que se ve al abrir la app. Arriba, un solo bloque con lo que
 * hay que atender hoy; debajo, los cuatro atajos en gris, que llevan a
 * donde ya está el detalle en vez de repetirlo aquí.
 */
function HojaCasa({ indice, ancho, scrollX, montaje, productos, faltantes, codigoHogar, cargando, compacto, onIr }: ContenidoProps) {
  const entrada = { scrollX, montaje, pagina: indice, ancho };
  const aviso = useMemo(() => (cargando ? null : avisoDe(productos)), [cargando, productos]);
  // En pantallas bajas los botones del aviso no caben sin empujar los
  // atajos fuera de la hoja: el aviso se vuelve un renglón que lleva
  // directo a la lista filtrada, que es lo que se iba a tocar de todos modos.
  const avisoCorto = compacto;

  const atajos = [
    {
      icono: 'frasco' as const, titulo: 'Mi despensa',
      valor: cargando ? undefined : productos.length,
      detalle: !cargando && productos.length === 1 ? 'producto' : 'productos',
      ruta: '/inventario' as Href,
    },
    {
      icono: 'carrito' as const, titulo: 'Mi lista',
      valor: cargando ? undefined : faltantes,
      detalle: 'por comprar',
      ruta: '/faltantes' as Href,
    },
    { icono: 'olla' as const, titulo: '¿Qué cocino?', detalle: 'Ideas con lo que hay', ruta: '/cocina' as Href },
    { icono: 'persona' as const, titulo: 'Mi hogar', detalle: codigoHogar || 'Invita a tu familia', ruta: '/perfil' as Href },
  ];

  return (
    <>
      <Entrada {...entrada} orden={0}>
        <EncabezadoHoja
          titulo="Tu casa hoy"
          subtitulo={hoyTexto()}
          accion={{ etiqueta: 'Agregar', icono: 'mas', principal: true, onPress: () => onIr('/producto/registrar') }}
        />
      </Entrada>

      <Entrada {...entrada} orden={1}>
        {cargando ? (
          <Cargando fila />
        ) : productos.length === 0 ? (
          <AvisoHoja
            tono="neutro"
            icono="frasco"
            titulo="Tu despensa está vacía"
            mensaje="Registra lo que trajiste del súper: una foto basta."
            acciones={[{ etiqueta: 'Registrar compras', icono: 'camara', principal: true, onPress: () => onIr('/producto/registrar') }]}
            onPress={avisoCorto ? () => onIr('/producto/registrar') : undefined}
            unaLinea={avisoCorto}
          />
        ) : aviso ? (
          <AvisoHoja
            {...aviso}
            unaLinea={avisoCorto}
            onPress={avisoCorto
              ? () => onIr(aviso.tono === 'urgente' ? '/inventario?filtro=caducados' : '/inventario?filtro=por-caducar')
              : undefined}
            acciones={aviso.tono === 'urgente'
              ? [
                  { etiqueta: 'Ver caducados', principal: true, onPress: () => onIr('/inventario?filtro=caducados') },
                  { etiqueta: 'Por caducar', onPress: () => onIr('/inventario?filtro=por-caducar') },
                ]
              : [
                  { etiqueta: 'Ver cuáles', principal: true, onPress: () => onIr('/inventario?filtro=por-caducar') },
                  { etiqueta: '¿Qué cocino?', onPress: () => onIr('/cocina') },
                ]}
          />
        ) : (
          <AvisoHoja
            tono="neutro"
            titulo="Todo en orden"
            mensaje="Nada caduca en los próximos 5 días."
            unaLinea
            onPress={() => onIr('/inventario?filtro=por-caducar')}
          />
        )}
      </Entrada>

      <View style={styles.rejilla}>
        {[atajos.slice(0, 2), atajos.slice(2)].map((fila, f) => (
          <View key={f} style={styles.filaRejilla}>
            {fila.map((a, c) => (
              <Entrada key={a.titulo} {...entrada} orden={2 + f * 2 + c} style={{ flex: 1 }}>
                <TarjetaAtajo
                  icono={a.icono}
                  titulo={a.titulo}
                  valor={a.valor}
                  detalle={a.detalle}
                  onPress={() => onIr(a.ruta)}
                />
              </Entrada>
            ))}
          </View>
        ))}
      </View>
    </>
  );
}

// ——— Hoja de un lugar ———

/**
 * Los productos de ese lugar, los que caducan antes primero y con la misma
 * fila que Mi despensa: franja de color solo en lo que hay que atender y el
 * plazo alineado a la derecha, para leer de un tirón qué urge. Se muestran
 * los que caben; el resto queda en "Ver N más".
 */
function HojaLugar({ ambiente, indice, ancho, scrollX, montaje, productos, cargando, onIr }: ContenidoProps) {
  const [alto, setAlto] = useState(0);
  const lista = useMemo(() => [...productos].sort(ordenarPorCaducidad), [productos]);
  const caben = Math.max(1, Math.floor(alto / ALTO_FILA));
  const visibles = lista.length > caben ? lista.slice(0, caben - 1) : lista;
  const resto = lista.length - visibles.length;
  const entrada = { scrollX, montaje, pagina: indice, ancho };

  // El titular de arriba ya dice cuántos hay, así que el subtítulo solo
  // habla de lo que hay que atender.
  const aviso = cargando ? null : avisoDe(lista);
  const subtitulo = cargando || !lista.length ? undefined : aviso ? aviso.titulo : 'Todo en orden';

  return (
    <>
      <Entrada {...entrada} orden={0}>
        <EncabezadoHoja
          titulo={ambiente.nombre}
          subtitulo={subtitulo}
          tono={aviso ? (aviso.tono === 'urgente' ? ui.urgente : ui.porVencer) : undefined}
          accion={lista.length > 0 && !cargando ? { etiqueta: 'Ver todo', onPress: () => onIr('/inventario') } : undefined}
        />
      </Entrada>

      <View style={{ flex: 1 }} onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
        {cargando ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Entrada {...entrada} orden={1} style={{ flex: 1 }}>
            <VacioHoja
              icono={ambiente.icono}
              titulo="Aún no hay nada aquí"
              texto="Registra lo que trajiste del súper y aparecerá aquí."
              accion={{ etiqueta: 'Registrar compras', icono: 'camara', onPress: () => onIr('/producto/registrar') }}
            />
          </Entrada>
        ) : alto > 0 && (
          <Entrada {...entrada} orden={1}>
            <Grupo sangria={64}>
              {visibles.map((x) => <FilaInventario key={x.id} producto={x} />)}
              {resto > 0 && <FilaVerMas cuantos={resto} onPress={() => onIr('/inventario')} />}
            </Grupo>
          </Entrada>
        )}
      </View>

      {ambiente.id === 'cocina' && !cargando && lista.length > 0 && (
        <Entrada {...entrada} orden={2}>
          <Boton titulo="¿Qué cocino hoy?" icono="olla" onPress={() => onIr('/cocina')} />
        </Entrada>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hoja: { height: '100%', paddingHorizontal: spacing.xl, gap: spacing.md },
  // Los atajos no crecen sin medida en pantallas altas; el sobrante queda
  // de aire al pie de la hoja.
  rejilla: { flex: 1, gap: spacing.sm, maxHeight: 220 },
  filaRejilla: { flex: 1, flexDirection: 'row', gap: spacing.sm },
});
