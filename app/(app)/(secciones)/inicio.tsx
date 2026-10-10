import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono, NombreIcono } from '../../../src/components/ui/Icono';
import { Freddy } from '../../../src/components/avatar/Freddy';
import { ChatFreddy } from '../../../src/components/chat/ChatFreddy';
import { Boton, Grupo } from '../../../src/components/ui/Formulario';
import { FilaProducto } from '../../../src/components/ui/Lista';
import { AMBIENTES, Ambiente, comentario } from '../../../src/components/hogar/ambientes';
import { EscenaActivaCtx, useVaiven } from '../../../src/components/hogar/lienzo';
import { disposicionInicio, DisposicionInicio } from '../../../src/components/hogar/disposicion';
import { Burbuja } from '../../../src/components/ui/Burbuja';
import { Entrada, Rebote, useContador, useMontaje, vibrar } from '../../../src/components/hogar/animaciones';
import { useHogar } from '../../../src/state/HogarProvider';
import { useSesion } from '../../../src/state/SesionProvider';
import { estaCaducado, estaPorCaducar, ordenarPorCaducidad } from '../../../src/utils/caducidad';
import { Producto } from '../../../src/data/mock';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';
import { inicialHogar } from '../../../src/utils/hogar';
import { usePreferencias } from '../../../src/state/PreferenciasProvider';

// Inicio: un recorrido por la casa (afuera, refri, cocina y alacena).
//
// Capas, de abajo hacia arriba:
//   1. Escenas apiladas: no se deslizan; la siguiente aparece con un fundido
//      y un acercamiento, como si Freddy entrara al cuarto.
//   2. Fondo fijo de la hoja inferior.
//   3. Carrusel horizontal: solo el contenido de la hoja se desliza, y es lo
//      que mueve todo lo demás (scrollX).
//   4. Títulos, Freddy, barra superior y selector, que reaccionan a scrollX.
// Sin scroll vertical: todo se acomoda a la altura de la pantalla.
//
// Rendimiento: al abrir solo se monta el primer lugar (los demás llegan
// un instante después), las escenas fuera de vista pausan sus animaciones
// y las piezas están memorizadas para que cambiar de página no redibuje
// las cuatro ilustraciones.

const ND = Platform.OS !== 'web';
const ANCHO_MAXIMO = 640;
const N = AMBIENTES.length;
const PASO_SELECTOR = 40; // botón de 36 + separación de 4
const ALTO_FILA = 58;

/** Interpolación por tramos que se repite entre cada par de páginas. */
function porTramos<T extends number | string>(ancho: number, puntos: [number, T][]) {
  const entrada: number[] = [];
  const salida: T[] = [];
  for (let i = 0; i < N - 1; i++) {
    for (const [t, valor] of puntos) {
      if (i > 0 && t === 0) continue; // el inicio de un tramo es el final del anterior
      entrada.push((i + t) * ancho);
      salida.push(valor);
    }
  }
  return { inputRange: entrada, outputRange: salida as number[] | string[], extrapolate: 'clamp' as const };
}

// Versiones memorizadas: solo se redibujan si cambian sus props.
const Escenas = memo(EscenasApiladas);
const Contenido = memo(ContenidoHoja);
const TitularM = memo(Titular);
const Freddyv = memo(FreddyViajero);
const Nube = memo(NubeFreddy);
const SelectorM = memo(Selector);

export default function Inicio() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const espacioInferior = useEspacioInferior();
  const { hogar } = useSesion();
  const { productos, faltantes } = useHogar();
  const { prefs, listo: prefsListas } = usePreferencias();

  const [caja, setCaja] = useState({ w: 0, h: 0 });
  const [pagina, setPagina] = useState(0);
  const [feliz, setFeliz] = useState(false);
  const [chat, setChat] = useState(false);
  const [listo, setListo] = useState(false);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [polvo] = useState(() => new Animated.Value(1));
  const montaje = useMontaje();
  const paginaRef = useRef(0);
  const enVuelo = useRef(false);
  const inicialAplicado = useRef(false);
  const vibrarOn = useRef(prefs.vibracion);
  useEffect(() => { vibrarOn.current = prefs.vibracion; }, [prefs.vibracion]);
  const pager = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Primero se pinta el lugar visible; el resto se monta enseguida, ya
  // con la pantalla en pie, para que la entrada no se trabe.
  useEffect(() => {
    const t = setTimeout(() => setListo(true), 450);
    return () => clearTimeout(t);
  }, []);

  // En pantallas anchas (web de escritorio, tabletas en horizontal) el recorrido
  // se centra con un ancho máximo para que la escena no se amplíe de más.
  const W = Math.min(caja.w, ANCHO_MAXIMO);
  // Acomodo según pantalla y zona segura: Freddy nunca queda bajo el selector
  // ni detrás de la hoja, en ningún dispositivo (ver disposicion.ts).
  const disp = useMemo(() => disposicionInicio(W, caja.h, insets.top), [W, caja.h, insets.top]);
  const { altoEscena, compacto, muyCompacto } = disp;

  const alDeslizar = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: ND }),
    [scrollX],
  );

  // Sigue el desplazamiento: cambia de página a medio camino y, cuando el
  // carrusel se asienta, Freddy "aterriza" (polvo y vibración).
  useEffect(() => {
    if (!W) return;
    const id = scrollX.addListener(({ value }) => {
      const exacto = value / W;
      const i = Math.min(N - 1, Math.max(0, Math.round(exacto)));
      const distancia = Math.abs(exacto - Math.round(exacto));
      if (distancia > 0.12) enVuelo.current = true;
      else if (enVuelo.current && distancia < 0.02) {
        enVuelo.current = false;
        polvo.setValue(0);
        Animated.timing(polvo, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
        if (vibrarOn.current) vibrar.aterrizaje();
      }
      if (i === paginaRef.current) return;
      paginaRef.current = i;
      setPagina(i);
      setFeliz(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFeliz(false), 1400);
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, polvo, W]);

  // Abre en el lugar elegido en Ajustes (una sola vez, al montar).
  useEffect(() => {
    if (!W || !prefsListas || inicialAplicado.current) return;
    inicialAplicado.current = true;
    const i = Math.max(0, AMBIENTES.findIndex((a) => a.id === prefs.inicioEn));
    if (i > 0) requestAnimationFrame(() => pager.current?.scrollTo({ x: i * W, animated: false }));
  }, [W, prefsListas, prefs.inicioEn]);

  const irA = useCallback((i: number) => {
    if (vibrarOn.current) vibrar.seleccion();
    pager.current?.scrollTo({ x: i * W, animated: true });
  }, [W]);
  const onIr = useCallback((ruta: Href) => router.push(ruta), [router]);
  const abrirChat = useCallback(() => setChat(true), []);

  const medir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - caja.w) > 1 || Math.abs(height - caja.h) > 1) setCaja({ w: width, h: height });
  };

  const ambiente = AMBIENTES[pagina];
  const { topeHoja } = disp;

  return (
    <View style={styles.root} onLayout={medir}>
      {W > 0 && (
        <View style={[styles.recorrido, { width: W }]}>
          <Escenas ancho={W} alto={altoEscena} scrollX={scrollX} pagina={pagina} listo={listo} animadas={prefs.escenasAnimadas} />

          <View style={[styles.hojaFondo, { top: topeHoja }]}>
            <View style={styles.agarradera} />
          </View>

          <Animated.ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={alDeslizar}
            style={StyleSheet.absoluteFill}
          >
            {AMBIENTES.map((a, i) => (
              <Contenido
                key={a.id}
                montado={listo || i === pagina}
                ambiente={a}
                indice={i}
                ancho={W}
                arriba={topeHoja + 22}
                abajo={espacioInferior}
                scrollX={scrollX}
                montaje={montaje}
                productos={productos}
                faltantes={faltantes.length}
                codigoHogar={hogar?.codigo ?? ''}
                compacto={compacto}
                muyCompacto={muyCompacto}
                onIr={onIr}
              />
            ))}
          </Animated.ScrollView>

          {AMBIENTES.map((a, i) => (
            <TitularM
              key={a.id}
              ambiente={a}
              indice={i}
              ancho={W}
              top={disp.topTitular}
              activo={pagina === i}
              compacto={compacto}
              productos={productos}
              scrollX={scrollX}
            />
          ))}

          <Freddyv
            ancho={W}
            geo={disp.freddy}
            scrollX={scrollX}
            polvo={polvo}
            feliz={feliz || chat}
            nombre={ambiente.nombre}
            onPress={abrirChat}
          />

          {prefs.comentariosFreddy && AMBIENTES.map((a, i) => Math.abs(i - pagina) <= 1 && (
            <Nube
              key={a.id}
              indice={i}
              ancho={W}
              geo={disp.freddy}
              scrollX={scrollX}
              activo={pagina === i && !chat}
              texto={comentario(a, productos)}
              accion={i === 0 ? 'Toca para platicar' : undefined}
              onPress={abrirChat}
            />
          ))}

          {/* Barra superior: perfil del hogar y ajustes */}
          <Animated.View
            style={[
              styles.barraSuperior,
              {
                top: insets.top + spacing.sm, pointerEvents: 'box-none', opacity: montaje,
                transform: [{ translateY: montaje.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
              },
            ]}
          >
            <Rebote onPress={() => router.push('/perfil')} accessibilityRole="button" accessibilityLabel={`Perfil del hogar ${hogar?.nombre ?? ''}`} escala={0.94}>
              <Vidrio style={styles.pildoraHogar}>
                <View style={styles.avatar}><Text style={styles.avatarTexto}>{inicialHogar(hogar?.nombre)}</Text></View>
                <Text style={styles.pildoraTexto} numberOfLines={1}>{hogar?.nombre}</Text>
                <View><Icono nombre="chevron" tamano={12} color={ui.textoSecundario} /></View>
              </Vidrio>
            </Rebote>
            <Rebote onPress={() => router.push('/ajustes')} accessibilityRole="button" accessibilityLabel="Ajustes" escala={0.88}>
              <Vidrio style={styles.botonRedondo}>
                <View><Icono nombre="ajustes" tamano={21} color={ui.texto} /></View>
              </Vidrio>
            </Rebote>
          </Animated.View>

          <SelectorM
            top={disp.topSelector}
            ancho={W}
            scrollX={scrollX}
            montaje={montaje}
            pagina={pagina}
            onElegir={irA}
          />

          <ChatFreddy visible={chat} tema={ambiente.tema} onCerrar={() => setChat(false)} />
        </View>
      )}
    </View>
  );
}

// ——— Escenas: cortina + acercamiento entre una y otra ———

function EscenasApiladas({ ancho, alto, scrollX, pagina, listo, animadas }: {
  ancho: number; alto: number; scrollX: Animated.Value; pagina: number; listo: boolean; animadas: boolean;
}) {
  return (
    <View style={[styles.escenas, { height: alto }]}>
      {AMBIENTES.map(({ id, Escena }, i) => {
        if (!listo && i !== pagina) return null;
        const rango = [(i - 1) * ancho, i * ancho, (i + 1) * ancho];
        // La que llega se asienta desde un acercamiento ligero; la que se va
        // se acerca un poco más, como si avanzaras hacia el otro cuarto.
        const escala = scrollX.interpolate({ inputRange: rango, outputRange: [1.12, 1, 1.06], extrapolate: 'clamp' });
        const paralaje = scrollX.interpolate({ inputRange: rango, outputRange: [ancho * 0.12, 0, -ancho * 0.1], extrapolate: 'clamp' });
        // Cortina: cada escena se descubre desde la derecha, siguiendo al
        // dedo, encima de la anterior. El marco recorta y el contenido se
        // compensa para quedarse en su lugar.
        const llegada = [(i - 1) * ancho, i * ancho];
        const cortina = i === 0 ? 0 : scrollX.interpolate({ inputRange: llegada, outputRange: [ancho, 0], extrapolate: 'clamp' });
        const compensa = i === 0 ? 0 : scrollX.interpolate({ inputRange: llegada, outputRange: [-ancho, 0], extrapolate: 'clamp' });
        // La que queda detrás se oscurece un poco: da profundidad.
        const sombra = scrollX.interpolate({ inputRange: [i * ancho, (i + 1) * ancho], outputRange: [0, 0.22], extrapolate: 'clamp' });
        return (
          <Animated.View key={id} style={[StyleSheet.absoluteFill, styles.cortina, { transform: [{ translateX: cortina }] }]}>
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: compensa }, { scale: escala }] }]}>
              <EscenaActivaCtx.Provider value={animadas && i === pagina}>
                <Escena ancho={ancho} alto={alto} paralaje={paralaje} />
              </EscenaActivaCtx.Provider>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.sombraEscena, { opacity: sombra }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

// ——— Cifra grande y frase de cada lugar ———

function Titular({ ambiente, indice, ancho, top, activo, compacto, productos, scrollX }: {
  ambiente: Ambiente; indice: number; ancho: number; top: number; activo: boolean; compacto: boolean;
  productos: Producto[]; scrollX: Animated.Value;
}) {
  const { ubicaciones } = ambiente;
  const total = ubicaciones ? productos.filter((p) => ubicaciones.includes(p.ubicacion)).length : productos.length;
  const cifra = useContador(total, activo);
  const rango = [(indice - 1) * ancho, indice * ancho, (indice + 1) * ancho];
  return (
    <Animated.View
      style={[
        styles.titular,
        {
          top,
          pointerEvents: 'none',
          opacity: scrollX.interpolate({
            // Uno sale antes de que entre el otro: nunca se enciman.
            inputRange: [(indice - 0.42) * ancho, indice * ancho, (indice + 0.42) * ancho],
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          }),
          transform: [{ translateX: scrollX.interpolate({ inputRange: rango, outputRange: [48, 0, -48], extrapolate: 'clamp' }) }],
        },
      ]}
    >
      <View style={styles.cifra}>
        <Text style={[styles.cifraNumero, compacto && styles.cifraNumeroCompacto]}>{cifra}</Text>
        <Text style={styles.cifraUnidad}>{total === 1 ? 'producto' : 'productos'}</Text>
      </View>
      <Text style={styles.frase} numberOfLines={1}>{ambiente.frase}</Text>
    </Animated.View>
  );
}

// ——— Contenido de la hoja de cada lugar ———

type ContenidoProps = {
  ambiente: Ambiente;
  /** Falso mientras se difiere el montaje: solo ocupa su lugar en el carrusel. */
  montado?: boolean;
  indice: number;
  ancho: number;
  arriba: number;
  abajo: number;
  scrollX: Animated.Value;
  montaje: Animated.Value;
  productos: Producto[];
  faltantes: number;
  codigoHogar: string;
  compacto: boolean;
  /** Pantalla muy baja: tarjetas con icono y número en la misma línea. */
  muyCompacto?: boolean;
  onIr: (ruta: Href) => void;
};

function ContenidoHoja(p: ContenidoProps) {
  const { ambiente, indice, ancho, arriba, abajo, scrollX, productos, montado = true } = p;
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
    <Animated.View style={[styles.contenidoHoja, { width: ancho, paddingTop: arriba, paddingBottom: abajo + spacing.md, opacity: opacidad }]}>
      {ubicaciones
        ? <HojaLugar {...p} productos={propios} />
        : <HojaCasa {...p} />}
    </Animated.View>
  );
}

function resumenCaducidad(lista: Producto[]) {
  const caducados = lista.filter(estaCaducado).length;
  const pronto = lista.filter(estaPorCaducar).length;
  if (caducados) return `${caducados} ${caducados === 1 ? 'caducado' : 'caducados'}`;
  if (pronto) return `${pronto} ${pronto === 1 ? 'caduca' : 'caducan'} pronto`;
  return 'Todo en orden';
}

function hoyTexto() {
  const t = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

type AccionHoja = { texto: string; icono?: NombreIcono; onPress: () => void };

function EncabezadoHoja({ titulo, subtitulo, accion }: { titulo: string; subtitulo: string; accion?: AccionHoja }) {
  return (
    <View style={styles.encabezadoHoja}>
      <View style={{ flex: 1 }}>
        <Text style={styles.hojaTitulo}>{titulo}</Text>
        <Text style={styles.hojaSubtitulo} numberOfLines={1}>{subtitulo}</Text>
      </View>
      {accion && (
        <Rebote onPress={accion.onPress} accessibilityRole="button" hitSlop={8} style={styles.chipAccion} escala={0.9}>
          {accion.icono && <View><Icono nombre={accion.icono} tamano={13} color={ui.texto} /></View>}
          <Text style={styles.chipAccionTexto}>{accion.texto}</Text>
          {!accion.icono && <View><Icono nombre="chevron" tamano={12} color={ui.texto} /></View>}
        </Rebote>
      )}
    </View>
  );
}

type TarjetaProps = {
  titulo: string; icono: NombreIcono; tinta: string; fondo: string;
  valor?: number; alerta?: boolean; detalle: string; ruta: Href;
};

// Hoja de la casa: resumen general en tarjetas que llegan en cascada.
function HojaCasa({ indice, ancho, scrollX, montaje, productos, faltantes, codigoHogar, compacto, muyCompacto, onIr }: ContenidoProps) {
  const porCaducar = productos.filter(estaPorCaducar).length;
  const caducados = productos.filter(estaCaducado).length;
  const tarjetas: TarjetaProps[] = [
    { titulo: 'Mi despensa', icono: 'frasco', tinta: '#5468D4', fondo: '#E9EDFF', valor: productos.length, detalle: 'productos', ruta: '/inventario' },
    { titulo: 'Por caducar', icono: 'reloj', tinta: ui.porVencer, fondo: '#FFF1DC', valor: porCaducar, alerta: true, detalle: 'en 5 días', ruta: '/inventario?filtro=por-caducar' },
    { titulo: 'Caducados', icono: 'alerta', tinta: ui.urgente, fondo: '#FDE5E3', valor: caducados, alerta: true, detalle: caducados === 1 ? 'producto' : 'productos', ruta: '/inventario?filtro=caducados' },
    { titulo: 'Mi lista', icono: 'carrito', tinta: ui.fresco, fondo: '#E3F4EA', valor: faltantes, detalle: 'por comprar', ruta: '/faltantes' },
    { titulo: '¿Qué cocino?', icono: 'olla', tinta: '#C4603F', fondo: '#FFE9DF', detalle: 'Ideas con lo que hay', ruta: '/cocina' },
    { titulo: 'Mi hogar', icono: 'persona', tinta: ui.texto, fondo: ui.relleno, detalle: codigoHogar, ruta: '/perfil' },
  ];
  const entrada = { scrollX, montaje, pagina: indice, ancho };
  return (
    <>
      <Entrada {...entrada} orden={0}>
        <EncabezadoHoja
          titulo="Tu casa hoy"
          subtitulo={`${hoyTexto()} · ${resumenCaducidad(productos)}`}
          accion={{ texto: 'Agregar', icono: 'mas', onPress: () => onIr('/producto/registrar') }}
        />
      </Entrada>
      <View style={styles.rejilla}>
        {[tarjetas.slice(0, 3), tarjetas.slice(3)].map((fila, f) => (
          <View key={f} style={styles.filaRejilla}>
            {fila.map((t, c) => (
              <Entrada key={t.titulo} {...entrada} orden={1 + f * 3 + c} style={{ flex: 1 }}>
                <Tarjeta {...t} compacto={compacto} muyCompacto={muyCompacto} onIr={onIr} />
              </Entrada>
            ))}
          </View>
        ))}
      </View>
    </>
  );
}

function Tarjeta({ titulo, icono, tinta, fondo, valor, alerta, detalle, ruta, compacto, muyCompacto, onIr }: TarjetaProps & { compacto: boolean; muyCompacto?: boolean; onIr: (r: Href) => void }) {
  if (muyCompacto) {
    return (
      <Rebote
        onPress={() => onIr(ruta)}
        accessibilityRole="button"
        accessibilityLabel={`${titulo}${valor !== undefined ? `, ${valor} ${detalle}` : ''}`}
        llenar
        style={[styles.tarjeta, styles.tarjetaBaja]}
      >
        <View style={styles.tarjetaFila}>
          <View style={[styles.tarjetaIcono, styles.tarjetaIconoBajo, { backgroundColor: fondo }]}>
            <Icono nombre={icono} tamano={15} color={tinta} />
          </View>
          {valor !== undefined && <Text style={[styles.tarjetaValor, styles.tarjetaValorBajo, alerta && valor > 0 && { color: tinta }]}>{valor}</Text>}
        </View>
        <Text style={styles.tarjetaTitulo} numberOfLines={1}>{titulo}</Text>
      </Rebote>
    );
  }
  return (
    <Rebote
      onPress={() => onIr(ruta)}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}${valor !== undefined ? `, ${valor} ${detalle}` : ''}`}
      llenar
      style={styles.tarjeta}
    >
      <View style={[styles.tarjetaIcono, { backgroundColor: fondo }]}>
        <Icono nombre={icono} tamano={18} color={tinta} />
      </View>
      <View>
        {valor !== undefined && <Text style={[styles.tarjetaValor, alerta && valor > 0 && { color: tinta }]}>{valor}</Text>}
        <Text style={styles.tarjetaTitulo} numberOfLines={1}>{titulo}</Text>
        {!compacto && <Text style={styles.tarjetaDetalle} numberOfLines={1}>{detalle}</Text>}
      </View>
    </Rebote>
  );
}

// Hoja de un lugar: sus productos, los que caducan antes primero. Se
// muestran los que caben; el resto queda en "Ver todo".
function HojaLugar({ ambiente, indice, ancho, scrollX, montaje, productos, onIr }: ContenidoProps) {
  const [alto, setAlto] = useState(0);
  const lista = [...productos].sort(ordenarPorCaducidad);
  const caben = Math.max(1, Math.floor(alto / ALTO_FILA));
  const visibles = lista.length > caben ? lista.slice(0, caben - 1) : lista;
  const resto = lista.length - visibles.length;
  const subtitulo = lista.length
    ? `${lista.length} ${lista.length === 1 ? 'producto' : 'productos'} · ${resumenCaducidad(lista)}`
    : 'Vacío por ahora';
  const entrada = { scrollX, montaje, pagina: indice, ancho };

  return (
    <>
      <Entrada {...entrada} orden={0}>
        <EncabezadoHoja
          titulo={ambiente.nombre}
          subtitulo={subtitulo}
          accion={lista.length ? { texto: 'Ver todo', onPress: () => onIr('/inventario') } : undefined}
        />
      </Entrada>
      <View style={{ flex: 1 }} onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
        {lista.length === 0 ? (
          <Entrada {...entrada} orden={1} style={styles.vacio}>
            <View style={styles.vacioIcono}>
              <Icono nombre={ambiente.icono} tamano={30} color={ui.textoSecundario} />
            </View>
            <Text style={styles.vacioTexto}>Aún no hay nada aquí.</Text>
          </Entrada>
        ) : alto > 0 && (
          <Entrada {...entrada} orden={1}>
            <Grupo sangria={64}>
              {visibles.map((x) => <FilaProducto key={x.id} producto={x} />)}
              {resto > 0 && (
                <Rebote onPress={() => onIr('/inventario')} escala={0.98} style={styles.filaMas}>
                  <Text style={styles.filaMasTexto}>{`Ver ${resto} más`}</Text>
                  <View><Icono nombre="chevron" tamano={14} color={ui.textoTerciario} /></View>
                </Rebote>
              )}
            </Grupo>
          </Entrada>
        )}
      </View>
      {ambiente.id === 'cocina' && (
        <Entrada {...entrada} orden={2}>
          <Boton titulo="¿Qué cocino hoy?" icono="olla" onPress={() => onIr('/cocina')} />
        </Entrada>
      )}
      {lista.length === 0 && (
        <Entrada {...entrada} orden={2}>
          <Boton variante="secundario" titulo="Agregar producto" icono="mas" onPress={() => onIr('/producto/registrar')} />
        </Entrada>
      )}
    </>
  );
}

// ——— Freddy: salto con anticipación, estiramiento y aterrizaje ———

type GeoFreddy = DisposicionInicio['freddy'];

function FreddyViajero({ ancho, geo, scrollX, polvo, feliz, nombre, onPress }: {
  ancho: number; geo: GeoFreddy; scrollX: Animated.Value; polvo: Animated.Value;
  feliz: boolean; nombre: string; onPress: () => void;
}) {
  const { tam, alto, izquierda, pies } = geo;

  const mov = useMemo(() => {
    // Tramo de una página a otra: se agacha, sale disparado estirándose,
    // cae aplastándose un poco y recupera su forma.
    const t = <T extends number | string>(a: T, b: T, c: T, d: T) =>
      scrollX.interpolate(porTramos<T>(ancho, [[0, a], [0.12, b], [0.5, c], [0.88, b], [1, d]]));
    return {
      y: t(0, 3, -tam * 0.42, 0),
      sx: t(1, 1.1, 0.92, 1),
      sy: t(1, 0.88, 1.1, 1),
      giro: t('0deg', '-4deg', '9deg', '0deg'),
    };
  }, [scrollX, ancho, tam]);

  const bocanada = (lado: 1 | -1) => (
    <Animated.View
      style={[
        styles.polvo,
        {
          left: izquierda + tam / 2 - 7,
          top: pies - 12,
          opacity: polvo.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.75, 0] }),
          transform: [
            { translateX: polvo.interpolate({ inputRange: [0, 1], outputRange: [lado * 8, lado * tam * 0.38] }) },
            { translateY: polvo.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { scale: polvo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.4] }) },
          ],
        },
      ]}
    />
  );

  return (
    <>
      {bocanada(-1)}
      {bocanada(1)}
      <Animated.View
        style={{
          position: 'absolute',
          left: izquierda,
          top: pies - alto * 0.94,
          // Todo gira y se deforma desde los pies.
          transform: [
            { translateY: mov.y },
            { translateY: alto / 2 },
            { rotate: mov.giro },
            { scaleX: mov.sx },
            { scaleY: mov.sy },
            { translateY: -alto / 2 },
          ],
        }}
      >
        <Rebote onPress={onPress} escala={0.9} accessibilityRole="button" accessibilityLabel={`Freddy en ${nombre}. Toca para platicar`}>
          <Freddy size={tam} estado={feliz ? 'feliz' : 'reposo'} />
        </Rebote>
      </Animated.View>
    </>
  );
}

// ——— Nube de diálogo de cada lugar ———

// Sale a un lado de Freddy con la cola apuntándole, discreta y translúcida
// para no competir con la escena. Al llegar a un lugar aparece suave;
// mientras está, flota apenas. Al deslizar se desvanece antes de que
// llegue la del siguiente lugar.
function NubeFreddy({ indice, ancho, geo, scrollX, activo, texto, accion, onPress }: {
  indice: number; ancho: number; geo: GeoFreddy; scrollX: Animated.Value; activo: boolean;
  texto: string; accion?: string; onPress: () => void;
}) {
  const { tam, alto, izquierda, pies } = geo;
  const izquierdaNube = izquierda + tam * 0.84;
  const [pop] = useState(() => new Animated.Value(0));
  const flotar = useVaiven(3200, indice * 400);

  useEffect(() => {
    const anim = activo
      ? Animated.sequence([Animated.delay(250), Animated.spring(pop, { toValue: 1, friction: 9, tension: 70, useNativeDriver: ND })])
      : Animated.timing(pop, { toValue: 0, duration: 160, useNativeDriver: ND });
    anim.start();
    return () => anim.stop();
  }, [activo, pop]);

  const porDeslizar = scrollX.interpolate({
    inputRange: [(indice - 0.35) * ancho, indice * ancho, (indice + 0.35) * ancho],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: izquierdaNube,
        top: pies - alto * 0.94 + 10,
        maxWidth: ancho - izquierdaNube - spacing.lg,
        pointerEvents: activo ? 'box-none' : 'none',
        opacity: Animated.multiply(porDeslizar, pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' })),
        transform: [
          { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
          { translateY: flotar.interpolate({ inputRange: [0, 1], outputRange: [-1.5, 1.5] }) },
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
        ],
      }}
    >
      <Rebote onPress={onPress} escala={0.94} accessibilityRole="button" accessibilityLabel={`Freddy dice: ${texto}`}>
        <Burbuja texto={texto} accion={accion} cola="izquierda" vidrio />
      </Rebote>
    </Animated.View>
  );
}

// ——— Selector de lugares (cápsula de vidrio) ———

function Selector({ top, ancho, scrollX, montaje, pagina, onElegir }: {
  top: number; ancho: number; scrollX: Animated.Value; montaje: Animated.Value; pagina: number; onElegir: (i: number) => void;
}) {
  const desplazamiento = scrollX.interpolate({
    inputRange: [0, ancho * (N - 1)],
    outputRange: [0, PASO_SELECTOR * (N - 1)],
    extrapolate: 'clamp',
  });
  // La píldora se estira mientras viaja, como una gota.
  const estirar = scrollX.interpolate(porTramos(ancho, [[0, 1], [0.5, 1.45], [1, 1]]));
  return (
    <Animated.View
      style={[
        styles.selectorCaja,
        {
          top,
          opacity: montaje.interpolate({ inputRange: [0.2, 0.7], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ scale: montaje.interpolate({ inputRange: [0.2, 0.8], outputRange: [0.9, 1], extrapolate: 'clamp' }) }],
        },
      ]}
    >
      <Vidrio style={styles.selector}>
        <Animated.View style={[styles.selectorPildora, { transform: [{ translateX: desplazamiento }, { scaleX: estirar }] }]} />
        {AMBIENTES.map((a, i) => {
          const rango = [(i - 1) * ancho, i * ancho, (i + 1) * ancho];
          const encendido = scrollX.interpolate({ inputRange: rango, outputRange: [0, 1, 0], extrapolate: 'clamp' });
          const crecer = scrollX.interpolate({ inputRange: rango, outputRange: [1, 1.12, 1], extrapolate: 'clamp' });
          return (
            <Rebote
              key={a.id}
              onPress={() => onElegir(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: pagina === i }}
              accessibilityLabel={a.nombre}
              hitSlop={4}
              escala={0.82}
              style={styles.selectorBoton}
            >
              <Animated.View style={[styles.selectorIcono, { transform: [{ scale: crecer }] }]}>
                <Icono nombre={a.icono} tamano={19} color={ui.texto} />
              </Animated.View>
              <Animated.View style={[styles.selectorIcono, { opacity: encendido, transform: [{ scale: crecer }] }]}>
                <Icono nombre={a.icono} tamano={19} color={ui.accionTexto} />
              </Animated.View>
            </Rebote>
          );
        })}
      </Vidrio>
    </Animated.View>
  );
}

function Vidrio({ style, children }: { style?: React.ComponentProps<typeof View>['style']; children: React.ReactNode }) {
  return (
    <View style={[styles.vidrio, style]}>
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.vidrioVelo]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.fondo, overflow: 'hidden', alignItems: 'center' },
  recorrido: { flex: 1, alignSelf: 'center', overflow: 'hidden' },
  escenas: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  cortina: {
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: -6, height: 0 },
  },
  sombraEscena: { backgroundColor: '#0B1220', pointerEvents: 'none' },

  barraSuperior: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vidrio: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.7)' },
  vidrioVelo: { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.72)' },
  pildoraHogar: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingLeft: 4, paddingRight: 12, borderRadius: 20, maxWidth: 260 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: ui.accion, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 14, fontWeight: '700', color: ui.accionTexto },
  pildoraTexto: { fontSize: 15, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  botonRedondo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  titular: { position: 'absolute', left: spacing.xl, right: '42%' },
  cifra: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  cifraNumero: { fontSize: 60, lineHeight: 64, fontWeight: '700', letterSpacing: -2.5, color: ui.texto, fontVariant: ['tabular-nums'] },
  cifraNumeroCompacto: { fontSize: 48, lineHeight: 52 },
  cifraUnidad: { fontSize: 17, fontWeight: '600', color: ui.texto, marginBottom: 10 },
  frase: { fontSize: 17, fontWeight: '600', color: ui.texto, letterSpacing: -0.3 },

  selectorCaja: { position: 'absolute', left: spacing.xl },
  selector: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 24 },
  selectorPildora: { position: 'absolute', left: 4, top: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: ui.accion },
  selectorBoton: { width: 36, height: 36 },
  selectorIcono: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

  polvo: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', pointerEvents: 'none' },

  hojaFondo: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: ui.fondo,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: spacing.sm,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 4,
  },
  agarradera: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: ui.separador },
  contenidoHoja: { height: '100%', paddingHorizontal: spacing.xl, gap: spacing.md },
  encabezadoHoja: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hojaTitulo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: ui.texto },
  hojaSubtitulo: { fontSize: 13, color: ui.textoSecundario, marginTop: 2 },
  chipAccion: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: ui.relleno },
  chipAccionTexto: { fontSize: 13, fontWeight: '600', color: ui.texto },

  rejilla: { flex: 1, gap: spacing.sm, maxHeight: 330 },
  filaRejilla: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  tarjeta: {
    flex: 1, padding: spacing.md, borderRadius: 20, backgroundColor: ui.tarjeta, justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  tarjetaBaja: { padding: spacing.sm, justifyContent: 'center', gap: 4 },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tarjetaIconoBajo: { width: 26, height: 26, borderRadius: 13 },
  tarjetaValorBajo: { fontSize: 18 },
  tarjetaIcono: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tarjetaValor: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6, color: ui.texto },
  tarjetaTitulo: { fontSize: 13, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  tarjetaDetalle: { fontSize: 12, color: ui.textoSecundario, marginTop: 1 },

  filaMas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 48, backgroundColor: ui.tarjeta },
  filaMasTexto: { fontSize: 15, fontWeight: '500', color: ui.textoSecundario },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  vacioIcono: { width: 64, height: 64, borderRadius: 32, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  vacioTexto: { fontSize: 15, color: ui.textoSecundario },
});
