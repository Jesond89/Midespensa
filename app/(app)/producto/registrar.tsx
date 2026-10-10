import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  TextStyle, View, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Boton, Chip, Grupo, Nota } from '../../../src/components/ui/Formulario';
import { IconoCuadro } from '../../../src/components/ui/Lista';
import { Icono } from '../../../src/components/ui/Icono';
import { Rebote, vibrar } from '../../../src/components/hogar/animaciones';
import { CATEGORIAS, UBICACIONES, UNIDADES, Categoria, Ubicacion, Unidad, iconoCategoria } from '../../../src/data/catalogo';
import { useHogar } from '../../../src/state/HogarProvider';
import { usePreferencias } from '../../../src/state/PreferenciasProvider';
import { useCatalogo } from '../../../src/state/CatalogoProvider';
import { DEFECTOS_POR_CATEGORIA } from '../../../src/data/productos';
import { ErrorEscaneo, prepararFoto, reconocerProductos } from '../../../src/servicios/reconocer';
import { BuscadorProductos, ProductoAAgregar } from '../../../src/components/registro/BuscadorProductos';
import { hoyISO, sumarDias } from '../../../src/utils/fechas';
import { ui, spacing } from '../../../src/theme/tokens';

// Registrar compras. Se toma una foto de lo que se trajo del súper (o de la
// alacena abierta), Claude detecta los productos y aparecen en una lista
// para revisarlos antes de guardar. También se agregan a mano con el
// buscador: lo que ya hay en casa y un catálogo con presentaciones
// (Coca-Cola 600 ml, 2 L…) o, para lo suelto, cuánto por pieza o por kilo.
//
// Dos secciones, con un selector arriba:
//   Cámara  dedicada a escanear: recuadro grande, consejos para la foto.
//   Lista   el buscador con los productos predefinidos y lo que hay en casa.
// Las dos llenan la misma lista "Por registrar" y el mismo botón de abajo,
// que cambia según el paso (tomar foto → analizando → guardar).

type Borrador = {
  clave: string;
  incluir: boolean;
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  categoria: Categoria;
  ubicacion: Ubicacion;
  dias: number | null;
  /** El escaneo no estaba seguro: se marca para revisar. */
  revisar: boolean;
  /** De qué sección vino. */
  origen: Seccion;
};

type Seccion = 'camara' | 'lista';

const SECCIONES: { id: Seccion; titulo: string; icono: 'camara' | 'buscar' }[] = [
  { id: 'lista', titulo: 'Lista', icono: 'buscar' },
  { id: 'camara', titulo: 'Cámara', icono: 'camara' },
];

const CONSEJOS = ['Productos de frente', 'Buena luz', 'Sin amontonar'];

const CADUCIDADES: { etiqueta: string; dias: number | null }[] = [
  { etiqueta: 'No caduca', dias: null },
  { etiqueta: '3 días', dias: 3 },
  { etiqueta: '1 semana', dias: 7 },
  { etiqueta: '2 semanas', dias: 14 },
  { etiqueta: '1 mes', dias: 30 },
  { etiqueta: '3 meses', dias: 90 },
  { etiqueta: '6 meses', dias: 180 },
  { etiqueta: '1 año', dias: 365 },
];

let siguienteClave = 0;
const nuevaClave = () => `b${Date.now()}-${siguienteClave++}`;

function textoDias(dias: number | null) {
  if (dias === null) return 'No caduca';
  if (dias % 365 === 0) return dias === 365 ? 'Caduca en 1 año' : `Caduca en ${dias / 365} años`;
  if (dias >= 30 && dias % 30 === 0) return dias === 30 ? 'Caduca en 1 mes' : `Caduca en ${dias / 30} meses`;
  if (dias >= 7 && dias % 7 === 0) return dias === 7 ? 'Caduca en 1 semana' : `Caduca en ${dias / 7} semanas`;
  return dias === 1 ? 'Caduca mañana' : `Caduca en ${dias} días`;
}

const formatoCantidad = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

export default function RegistrarCompras() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { agregarProducto, productos } = useHogar();
  const { prefs } = usePreferencias();
  const catalogo = useCatalogo();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);

  const [foto, setFoto] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [seccion, setSeccion] = useState<Seccion>('lista');
  const [destello] = useState(() => new Animated.Value(0));

  // En la sección de cámara el recuadro ocupa casi todo el ancho.
  const anchoCaja = Math.min(width - spacing.xl * 2, 420);
  const altoCaja = anchoCaja * 1.15;
  const incluidos = borradores.filter((b) => b.incluir);
  const listos = incluidos.length > 0 && incluidos.every((b) => b.nombre.trim());
  const vibra = (tipo: keyof typeof vibrar) => { if (prefs.vibracion) vibrar[tipo](); };

  const cambiar = (clave: string, cambios: Partial<Borrador>) =>
    setBorradores((lista) => lista.map((b) => (b.clave === clave ? { ...b, ...cambios } : b)));

  // ——— Foto: cámara o galería → escaneo ———

  const procesar = async (uri: string, ancho: number, alto: number) => {
    setFoto(uri);
    setError(null);
    setAviso(null);
    setAnalizando(true);
    try {
      const preparada = await prepararFoto(uri, ancho, alto);
      const resultado = await reconocerProductos(preparada.base64);
      const nuevos: Borrador[] = resultado.productos.map((p) => ({
        clave: nuevaClave(),
        incluir: true,
        nombre: p.nombre,
        cantidad: p.cantidad > 0 ? p.cantidad : 1,
        unidad: p.unidad,
        categoria: p.categoria,
        ubicacion: p.ubicacion,
        dias: p.dias_caducidad,
        revisar: p.confianza === 'baja',
        origen: 'camara' as const,
      }));
      // Las fotos se suman: compras primero y luego la alacena, por ejemplo.
      setBorradores((lista) => [...lista, ...nuevos]);
      setAviso(resultado.aviso ?? (nuevos.length ? null : 'No encontré productos en la foto. Intenta con más luz y los productos de frente.'));
      if (nuevos.length) vibra('exito');
    } catch (e) {
      setError(e instanceof ErrorEscaneo ? e.message : 'No se pudo analizar la foto. Intenta de nuevo o agrégalos a mano.');
    } finally {
      setAnalizando(false);
    }
  };

  const tomarFoto = async () => {
    if (!camara.current || analizando) return;
    vibra('seleccion');
    destello.setValue(1);
    Animated.timing(destello, { toValue: 0, duration: 380, useNativeDriver: Platform.OS !== 'web' }).start();
    try {
      const imagen = await camara.current.takePictureAsync({ quality: 0.8 });
      if (imagen) await procesar(imagen.uri, imagen.width, imagen.height);
    } catch {
      setError('No se pudo tomar la foto. Intenta de nuevo o elige una de la galería.');
    }
  };

  const elegirDeGaleria = async () => {
    if (analizando) return;
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (resultado.canceled) return;
    const a = resultado.assets[0];
    await procesar(a.uri, a.width, a.height);
  };

  // ——— Alta desde el buscador ———

  const agregarDesdeBuscador = (p: ProductoAAgregar) => {
    setBorradores((lista) => [...lista, { clave: nuevaClave(), incluir: true, revisar: !!p.revisar, origen: 'lista', ...p }]);
    vibra('seleccion');
  };

  // ——— Guardar ———

  const guardar = () => {
    if (!listos) return;
    const hoy = hoyISO();
    for (const b of incluidos) {
      // Lo que detectó la cámara y no está en la lista se guarda en "Tus productos"
      // (si ya existe, registrar no lo duplica).
      if (b.origen === 'camara') {
        const porPieza = b.unidad === 'pieza' && DEFECTOS_POR_CATEGORIA[b.categoria].compra === 'pieza';
        catalogo.registrar({
          base: b.nombre.trim(), nombre: b.nombre.trim(), detalle: '',
          compra: b.unidad === 'kg' ? 'kg' : porPieza ? 'pieza' : 'empacado',
          unidad: b.unidad, categoria: b.categoria, ubicacion: b.ubicacion, dias: b.dias,
        });
      }
      agregarProducto({
        nombre: b.nombre.trim(),
        categoria: b.categoria,
        ubicacion: b.ubicacion,
        cantidad: b.cantidad,
        unidad: b.unidad,
        fechaCompra: hoy,
        fechaCaducidad: b.dias === null ? null : sumarDias(hoy, b.dias),
        notas: '',
      });
    }
    vibra('exito');
    if (router.canGoBack()) router.back();
    else router.replace('/inicio');
  };

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/inicio'));

  // ——— Botón principal según el paso ———

  // El permiso se negó y el sistema ya no deja volver a pedirlo.
  const camaraNegada = !!permiso && !permiso.granted && !permiso.canAskAgain;

  const principal = analizando
    ? <Boton titulo="Analizando…" cargando onPress={() => {}} />
    : borradores.length
      ? <Boton titulo={listos ? `Guardar ${incluidos.length} ${incluidos.length === 1 ? 'producto' : 'productos'}` : 'Completa los nombres'} icono="check" deshabilitado={!listos} onPress={guardar} />
      : seccion === 'lista'
        ? <Boton titulo="Guardar" icono="check" deshabilitado onPress={() => {}} />
        : foto
          ? <Boton titulo="Tomar otra foto" icono="camara" onPress={() => setFoto(null)} />
          : permiso?.granted
            ? <Boton titulo="Tomar foto" icono="camara" onPress={tomarFoto} />
            : !camaraNegada
              ? <Boton titulo="Permitir cámara" icono="camara" onPress={pedirPermiso} />
              : <Boton titulo="Elegir de la galería" icono="galeria" onPress={elegirDeGaleria} />;
  // Cada acción aparece una sola vez: si el botón grande ya es la galería, no se repite abajo del recuadro.
  const galeriaEnBoton = seccion === 'camara' && !analizando && !borradores.length && !foto && camaraNegada;
  const cuantos = (s: Seccion) => borradores.filter((b) => b.origen === s).length;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.cabecera}>
        <View style={styles.agarradera} />
        <Text style={styles.titulo}>Registrar compras</Text>
        <Pressable onPress={cerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.cerrar}>
          <Icono nombre="cerrar" tamano={16} color={ui.textoSecundario} />
        </Pressable>
        <SelectorSeccion actual={seccion} cuantos={cuantos} onCambiar={(s) => { if (s !== seccion) { vibra('seleccion'); setSeccion(s); } }} />
      </View>

      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Aparece key={seccion}>
          {seccion === 'camara' ? (
            <View style={styles.seccionCamara}>
              {/* Recuadro: cámara en vivo o la foto que se está analizando */}
              <View style={[styles.caja, { width: anchoCaja, height: altoCaja }]}>
                {foto ? (
                  <>
                    <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    {analizando && <Escaneando alto={altoCaja} />}
                  </>
                ) : permiso?.granted ? (
                  <>
                    <CameraView ref={camara} style={StyleSheet.absoluteFill} facing="back" />
                    <View style={styles.guia} />
                    <Pressable onPress={tomarFoto} accessibilityRole="button" accessibilityLabel="Tomar foto" style={styles.disparador}>
                      <View style={styles.disparadorCentro} />
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.sinCamara}>
                    <Icono nombre="camara" tamano={34} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.sinCamaraTexto}>
                      {camaraNegada
                        ? 'La cámara está desactivada para Mi Despensa. Actívala en los ajustes del teléfono o usa una foto de tu galería.'
                        : 'Permite el acceso a la cámara para escanear tus compras.'}
                    </Text>
                  </View>
                )}
                <Animated.View style={[StyleSheet.absoluteFill, styles.destello, { opacity: destello }]} />
              </View>

              <View style={styles.consejos}>
                {CONSEJOS.map((c) => (
                  <View key={c} style={styles.consejo}>
                    <Icono nombre="check" tamano={11} color={ui.textoSecundario} />
                    <Text style={styles.consejoTexto}>{c}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.accionesFoto}>
                {!galeriaEnBoton && <Chip etiqueta="Elegir de la galería" icono="galeria" onPress={elegirDeGaleria} />}
                {foto && !analizando && <Chip etiqueta="Otra foto" icono="camara" onPress={() => setFoto(null)} />}
              </View>

              {error && <Nota error>{error}</Nota>}
              {aviso && !error && <Nota>{aviso}</Nota>}
            </View>
          ) : (
            <BuscadorProductos productosCasa={productos} onAgregar={agregarDesdeBuscador} />
          )}
        </Aparece>

        {/* Lista para revisar antes de guardar */}
        <View style={styles.seccion}>
          <View style={styles.seccionCabecera}>
            <Text style={styles.seccionTitulo}>
              {borradores.length ? `Por registrar · ${incluidos.length} de ${borradores.length}` : 'Por registrar'}
            </Text>
          </View>

          {borradores.length === 0 ? (
            <Text style={styles.ayuda}>
              {seccion === 'camara'
                ? 'Toma una foto de tus compras sobre la mesa o de la alacena abierta. Lo que se detecte aparece aquí para revisarlo.'
                : 'Elige productos de la lista. Aquí se juntan con lo que escanees con la cámara para revisarlos antes de guardar.'}
            </Text>
          ) : (
            <Grupo sangria={64}>
              {borradores.map((b) => (
                <FilaBorrador
                  key={b.clave}
                  borrador={b}
                  abierto={abierto === b.clave}
                  onAbrir={() => setAbierto((a) => (a === b.clave ? null : b.clave))}
                  onCambiar={(cambios) => cambiar(b.clave, cambios)}
                  onQuitar={() => setBorradores((lista) => lista.filter((x) => x.clave !== b.clave))}
                />
              ))}
            </Grupo>
          )}
        </View>
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{principal}</View>
    </KeyboardAvoidingView>
  );
}

// ——— Selector de sección (cápsula con píldora que se desliza) ———

function SelectorSeccion({ actual, cuantos, onCambiar }: {
  actual: Seccion; cuantos: (s: Seccion) => number; onCambiar: (s: Seccion) => void;
}) {
  const [ancho, setAncho] = useState(0);
  const [pos] = useState(() => new Animated.Value(SECCIONES.findIndex((s) => s.id === actual)));
  useEffect(() => {
    Animated.spring(pos, {
      toValue: SECCIONES.findIndex((s) => s.id === actual), friction: 9, tension: 90, useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [actual, pos]);
  const mitad = (ancho - 8) / SECCIONES.length;
  return (
    <View style={styles.selector} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {ancho > 0 && (
        <Animated.View style={[styles.selectorPildora, { width: mitad, transform: [{ translateX: Animated.multiply(pos, mitad) }] }]} />
      )}
      {SECCIONES.map((s) => {
        const activo = s.id === actual;
        const n = cuantos(s.id);
        return (
          <Pressable
            key={s.id}
            onPress={() => onCambiar(s.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={s.titulo}
            style={styles.selectorBoton}
          >
            <View><Icono nombre={s.icono} tamano={16} color={activo ? ui.texto : ui.textoSecundario} /></View>
            <Text style={[styles.selectorTexto, activo && styles.selectorTextoActivo]}>{s.titulo}</Text>
            {n > 0 && <View style={styles.selectorCuenta}><Text style={styles.selectorCuentaTexto}>{n}</Text></View>}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Contenido que entra con un fundido corto al cambiar de sección. */
function Aparece({ children }: { children: React.ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

// ——— Animación mientras se analiza la foto ———

function Escaneando({ alto }: { alto: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    anim.start();
    return () => anim.stop();
  }, [v]);
  return (
    <View style={[StyleSheet.absoluteFill, styles.escaneando]}>
      <Animated.View
        style={[styles.barrido, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-20, alto] }) }] }]}
      />
      <Text style={styles.escaneandoTexto}>Buscando productos…</Text>
    </View>
  );
}

// ——— Fila de la lista: resumen y editor desplegable ———

function FilaBorrador({ borrador: b, abierto, onAbrir, onCambiar, onQuitar }: {
  borrador: Borrador; abierto: boolean; onAbrir: () => void; onCambiar: (c: Partial<Borrador>) => void; onQuitar: () => void;
}) {
  const paso = b.unidad === 'kg' || b.unidad === 'L' ? 0.5 : 1;
  return (
    <View style={styles.fila}>
      <View style={styles.filaResumen}>
        <Pressable
          onPress={() => onCambiar({ incluir: !b.incluir })}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: b.incluir }}
          accessibilityLabel={`Incluir ${b.nombre || 'producto'}`}
        >
          <Icono nombre={b.incluir ? 'check-circulo' : 'circulo'} tamano={24} color={b.incluir ? ui.accion : ui.icono} />
        </Pressable>
        <Pressable onPress={onAbrir} style={styles.filaTocable} accessibilityRole="button" accessibilityLabel={`Editar ${b.nombre || 'producto'}`}>
          <IconoCuadro icono={iconoCategoria(b.categoria)} />
          <View style={{ flex: 1, opacity: b.incluir ? 1 : 0.45 }}>
            <Text style={[styles.filaNombre, !b.nombre && { color: ui.textoTerciario }]} numberOfLines={1}>{b.nombre || 'Sin nombre'}</Text>
            <Text style={styles.filaDetalle} numberOfLines={1}>
              {formatoCantidad(b.cantidad)} {b.unidad} · {b.ubicacion} · {textoDias(b.dias)}
            </Text>
          </View>
          {b.revisar && <View style={styles.revisar}><Text style={styles.revisarTexto}>Revisar</Text></View>}
          <View style={{ transform: [{ rotate: abierto ? '90deg' : '0deg' }] }}>
            <Icono nombre="chevron" tamano={14} color={ui.textoTerciario} />
          </View>
        </Pressable>
      </View>

      {abierto && (
        <View style={styles.editor}>
          <TextInput
            value={b.nombre}
            onChangeText={(nombre) => onCambiar({ nombre, revisar: false })}
            placeholder="Nombre del producto"
            placeholderTextColor={ui.textoTerciario}
            style={[styles.editorNombre, sinContornoWeb]}
          />

          <View style={styles.cantidad}>
            <Rebote onPress={() => onCambiar({ cantidad: Math.max(paso, +(b.cantidad - paso).toFixed(2)) })} escala={0.85} style={styles.paso} accessibilityLabel="Menos">
              <Icono nombre="menos" tamano={18} color={ui.texto} />
            </Rebote>
            <Text style={styles.cantidadTexto}>{formatoCantidad(b.cantidad)}</Text>
            <Rebote onPress={() => onCambiar({ cantidad: +(b.cantidad + paso).toFixed(2) })} escala={0.85} style={styles.paso} accessibilityLabel="Más">
              <Icono nombre="mas" tamano={18} color={ui.texto} />
            </Rebote>
          </View>

          <Opciones titulo="Unidad">
            {UNIDADES.map((u) => <Chip key={u} etiqueta={u} activo={b.unidad === u} onPress={() => onCambiar({ unidad: u })} />)}
          </Opciones>
          <Opciones titulo="¿Dónde se guarda?">
            {UBICACIONES.map((u) => <Chip key={u.nombre} etiqueta={u.nombre} icono={u.icono} activo={b.ubicacion === u.nombre} onPress={() => onCambiar({ ubicacion: u.nombre })} />)}
          </Opciones>
          <Opciones titulo="Caducidad">
            {!CADUCIDADES.some((c) => c.dias === b.dias) && <Chip etiqueta={textoDias(b.dias).replace('Caduca en ', '')} activo onPress={() => {}} />}
            {CADUCIDADES.map((c) => <Chip key={c.etiqueta} etiqueta={c.etiqueta} activo={b.dias === c.dias} onPress={() => onCambiar({ dias: c.dias })} />)}
          </Opciones>
          <Opciones titulo="Categoría">
            {CATEGORIAS.map((c) => <Chip key={c.nombre} etiqueta={c.nombre} icono={c.icono} activo={b.categoria === c.nombre} onPress={() => onCambiar({ categoria: c.nombre })} />)}
          </Opciones>

          <Pressable onPress={onQuitar} style={styles.quitar} accessibilityRole="button">
            <Icono nombre="basura" tamano={16} color={ui.error} />
            <Text style={styles.quitarTexto}>Quitar de la lista</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Opciones({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.opcionesTitulo}>{titulo}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opciones} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const sinContornoWeb = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.fondo },
  cabecera: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm, maxWidth: 560, width: '100%', alignSelf: 'center' },
  agarradera: { width: 40, height: 5, borderRadius: 3, backgroundColor: ui.separador },
  titulo: { fontSize: 17, fontWeight: '600', color: ui.texto, letterSpacing: -0.3 },
  cerrar: {
    position: 'absolute', right: spacing.lg, top: spacing.lg, width: 30, height: 30, borderRadius: 15,
    backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center',
  },
  contenido: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },

  selector: {
    flexDirection: 'row', alignSelf: 'stretch', marginHorizontal: spacing.xl, marginTop: spacing.xs,
    backgroundColor: ui.relleno, borderRadius: 14, padding: 4,
  },
  selectorPildora: {
    position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: 11, backgroundColor: ui.tarjeta,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  selectorBoton: { flex: 1, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  selectorTexto: { fontSize: 15, fontWeight: '500', color: ui.textoSecundario },
  selectorTextoActivo: { color: ui.texto, fontWeight: '600' },
  selectorCuenta: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: ui.accion, alignItems: 'center', justifyContent: 'center' },
  selectorCuentaTexto: { fontSize: 11, fontWeight: '700', color: ui.accionTexto },

  seccionCamara: { gap: spacing.md },
  caja: { alignSelf: 'center', borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' },
  guia: {
    position: 'absolute', left: '8%', right: '8%', top: '8%', bottom: '22%', borderRadius: 18,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', borderStyle: 'dashed', pointerEvents: 'none',
  },
  consejos: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.md },
  consejo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  consejoTexto: { fontSize: 12, color: ui.textoSecundario },
  disparador: {
    position: 'absolute', bottom: 14, alignSelf: 'center', width: 58, height: 58, borderRadius: 29,
    borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  disparadorCentro: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF' },
  destello: { backgroundColor: '#FFFFFF', pointerEvents: 'none' },
  sinCamara: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  sinCamaraTexto: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', lineHeight: 19 },
  escaneando: { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.lg },
  barrido: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 20,
    backgroundColor: 'rgba(255,255,255,0.35)', shadowColor: '#FFFFFF', shadowOpacity: 0.9, shadowRadius: 12,
  },
  escaneandoTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  accionesFoto: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },

  seccion: { gap: spacing.sm },
  seccionCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg },
  seccionTitulo: { fontSize: 13, fontWeight: '600', color: ui.textoSecundario, letterSpacing: 0.2 },
  ayuda: { fontSize: 14, color: ui.textoSecundario, lineHeight: 20, paddingHorizontal: spacing.lg, textAlign: 'center', marginTop: spacing.sm },

  fila: { backgroundColor: ui.tarjeta },
  filaResumen: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg },
  filaTocable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11, paddingRight: spacing.lg, minHeight: 58 },
  filaNombre: { fontSize: 16, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  filaDetalle: { fontSize: 13, color: ui.textoSecundario, marginTop: 2 },
  revisar: { backgroundColor: '#FFF1DC', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  revisarTexto: { fontSize: 11, fontWeight: '700', color: ui.porVencer },

  editor: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  editorNombre: { fontSize: 16, color: ui.texto, backgroundColor: ui.fondo, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10 },
  cantidad: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.md },
  paso: { width: 38, height: 38, borderRadius: 19, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  cantidadTexto: { fontSize: 18, fontWeight: '600', color: ui.texto, minWidth: 36, textAlign: 'center' },
  opcionesTitulo: { fontSize: 12, fontWeight: '600', color: ui.textoSecundario },
  opciones: { gap: spacing.sm, paddingRight: spacing.lg },
  quitar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  quitarTexto: { fontSize: 14, fontWeight: '500', color: ui.error },

  pie: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, backgroundColor: ui.fondo,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.separador,
  },
});
