import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TextStyle,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Icono } from '../../../src/components/ui/Icono';
import { Grupo, Campo, Boton, BotonEncabezado, Chip, Chips, Nota, Seccion } from '../../../src/components/ui/Formulario';
import { EstadoCaducidad } from '../../../src/components/ui/Lista';
import { vibrar } from '../../../src/components/hogar/animaciones';
import { useHogar } from '../../../src/state/HogarProvider';
import { usePreferencias } from '../../../src/state/PreferenciasProvider';
import { CATEGORIAS, UBICACIONES, UNIDADES, Categoria, Ubicacion, Unidad } from '../../../src/data/catalogo';
import { aTexto, desdeTexto, haceCuanto, hoyISO, sumarDias } from '../../../src/utils/fechas';
import { confirmar } from '../../../src/utils/confirmar';
import { ui, spacing } from '../../../src/theme/tokens';

// Alta y edición de productos (con ?id= edita uno existente). Las fechas se
// escriben como DD/MM/AAAA o se eligen con atajos, sin depender de un
// selector de calendario nativo que no existe en web.
//
// El orden sigue el de la cabeza de quien registra: qué es, cuánto trajo,
// dónde lo guarda y hasta cuándo sirve. La categoría va al final porque solo
// decide el ícono. Cada fecha se confirma debajo en palabras ("Caduca en 12
// días") para no guardar un año equivocado, y al guardar el botón lo dice.

const ATAJOS_COMPRA = [
  { etiqueta: 'Hoy', dias: 0 },
  { etiqueta: 'Ayer', dias: -1 },
  { etiqueta: 'Hace 1 semana', dias: -7 },
];

const ATAJOS_CADUCIDAD = [
  { etiqueta: '3 días', dias: 3 },
  { etiqueta: '1 semana', dias: 7 },
  { etiqueta: '2 semanas', dias: 14 },
  { etiqueta: '1 mes', dias: 30 },
  { etiqueta: '3 meses', dias: 90 },
  { etiqueta: '6 meses', dias: 180 },
];

const leerNumero = (t: string) => Number(t.replace(',', '.'));

export default function FormularioProducto() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { productos, agregarProducto, actualizarProducto } = useHogar();
  const { prefs } = usePreferencias();
  const existente = id ? productos.find((p) => p.id === id) : undefined;

  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [categoria, setCategoria] = useState<Categoria>(existente?.categoria ?? 'Frutas');
  const [ubicacion, setUbicacion] = useState<Ubicacion>(existente?.ubicacion ?? 'Refrigerador');
  const [cantidad, setCantidad] = useState(String(existente?.cantidad ?? 1));
  const [unidad, setUnidad] = useState<Unidad>(existente?.unidad ?? 'pieza');
  const [compra, setCompra] = useState(aTexto(existente?.fechaCompra ?? hoyISO()));
  const [caducidad, setCaducidad] = useState(existente?.fechaCaducidad ? aTexto(existente.fechaCaducidad) : '');
  const [notas, setNotas] = useState(existente?.notas ?? '');
  // El nombre solo reclama una vez que se tocó el campo: no se regaña a
  // nadie por un formulario que todavía no empieza a llenar.
  const [nombreTocado, setNombreTocado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const salida = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(salida.current), []);

  const hoy = hoyISO();
  const compraISO = desdeTexto(compra);
  const caducidadISO = caducidad.trim() ? desdeTexto(caducidad) : null;
  const numero = leerNumero(cantidad);

  const errores = {
    nombre: nombreTocado && !nombre.trim() ? 'Escribe cómo se llama el producto.' : null,
    cantidad: !(numero > 0) ? 'Escribe una cantidad mayor a 0.' : null,
    compra: !compraISO ? 'Escribe la fecha como DD/MM/AAAA.' : compraISO > hoy ? 'La fecha de compra no puede ser futura.' : null,
    caducidad: caducidad.trim() && !caducidadISO ? 'Escribe la fecha como DD/MM/AAAA.'
      : caducidadISO && compraISO && caducidadISO < compraISO ? 'La caducidad es anterior a la compra.' : null,
  };
  const valido = nombre.trim().length > 0 && !errores.cantidad && !errores.compra && !errores.caducidad;
  // Por qué no se puede guardar todavía, dicho junto al botón.
  const pendiente = !nombre.trim()
    ? 'Falta el nombre del producto.'
    : errores.cantidad ?? errores.compra ?? errores.caducidad ?? null;

  // Huella de lo escrito: si cambió desde que se abrió, cerrar avisa antes
  // de tirar los cambios.
  const huella = [nombre, categoria, ubicacion, cantidad, unidad, compra, caducidad, notas].join('|');
  const original = useRef(huella);

  const salir = () => (router.canGoBack() ? router.back() : router.replace('/inventario'));

  const cancelar = async () => {
    if (guardado) return;
    const sucio = huella !== original.current;
    if (sucio && !(await confirmar('Descartar cambios', 'Lo que escribiste no se guardará.', 'Descartar'))) return;
    salir();
  };

  const cambiarCantidad = (delta: number) => {
    const actual = numero > 0 ? numero : 0;
    setCantidad(String(Math.max(1, Math.round((actual + delta) * 100) / 100)));
  };

  const guardar = () => {
    if (!valido || !compraISO || guardado) return;
    const datos = {
      nombre: nombre.trim(), categoria, ubicacion, cantidad: numero, unidad,
      fechaCompra: compraISO, fechaCaducidad: caducidadISO, notas: notas.trim(),
    };
    if (existente) actualizarProducto(existente.id, datos);
    else agregarProducto(datos);
    if (prefs.vibracion) vibrar.exito();
    // Un momento de "Guardado" antes de cerrar: así nadie se queda con la
    // duda de si el cambio se aplicó.
    setGuardado(true);
    salida.current = setTimeout(salir, 900);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{
        title: existente ? 'Editar producto' : 'Nuevo producto',
        headerLeft: () => <BotonEncabezado titulo="Cancelar" etiqueta="Cancelar y cerrar" onPress={cancelar} />,
        headerRight: () => (
          <BotonEncabezado
            titulo={guardado ? 'Guardado' : 'Guardar'}
            etiqueta={guardado ? 'Guardado' : 'Guardar producto'}
            onPress={guardar}
            deshabilitado={!valido}
          />
        ),
      }} />
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Seccion titulo="¿Qué es?">
          <Grupo>
            <Campo
              icono="lapiz"
              placeholder="Nombre (ej. Manzana, Leche, Jabón)"
              autoCapitalize="sentences"
              value={nombre}
              onChangeText={setNombre}
              onBlur={() => setNombreTocado(true)}
              autoFocus={!existente}
            />
          </Grupo>
          {errores.nombre && <Nota error>{errores.nombre}</Nota>}
        </Seccion>

        <Seccion titulo="¿Cuánto?">
          <Grupo>
            <View style={styles.cantidad}>
              <Pressable
                onPress={() => cambiarCantidad(-1)}
                disabled={!(numero > 1)}
                style={[styles.paso, !(numero > 1) && styles.pasoApagado]}
                accessibilityRole="button"
                accessibilityLabel={`Quitar 1 ${unidad}`}
              >
                <Icono nombre="menos" tamano={22} color={ui.texto} />
              </Pressable>
              <View style={styles.cantidadCentro}>
                <TextInput
                  style={[styles.cantidadInput, sinContornoWeb]}
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  accessibilityLabel="Cantidad"
                />
                <Text style={styles.cantidadUnidad}>{unidad}</Text>
              </View>
              <Pressable
                onPress={() => cambiarCantidad(1)}
                style={styles.paso}
                accessibilityRole="button"
                accessibilityLabel={`Agregar 1 ${unidad}`}
              >
                <Icono nombre="mas" tamano={22} color={ui.texto} />
              </Pressable>
            </View>
          </Grupo>
          <Chips>
            {UNIDADES.map((u) => <Chip key={u} etiqueta={u} activo={unidad === u} onPress={() => setUnidad(u)} />)}
          </Chips>
          {errores.cantidad && <Nota error>{errores.cantidad}</Nota>}
        </Seccion>

        <Seccion titulo="¿Dónde se guarda?">
          <Chips>
            {UBICACIONES.map((u) => (
              <Chip key={u.nombre} etiqueta={u.nombre} icono={u.icono} activo={ubicacion === u.nombre} onPress={() => setUbicacion(u.nombre)} />
            ))}
          </Chips>
        </Seccion>

        <Seccion titulo="Caducidad">
          <Grupo>
            <Campo icono="calendario" placeholder="DD/MM/AAAA (vacío si no caduca)" value={caducidad} onChangeText={setCaducidad} keyboardType="numbers-and-punctuation" maxLength={10} />
          </Grupo>
          <Chips>
            <Chip etiqueta="No caduca" icono="infinito" activo={!caducidad.trim()} onPress={() => setCaducidad('')} />
            {ATAJOS_CADUCIDAD.map((a) => {
              const valor = aTexto(sumarDias(hoy, a.dias));
              return <Chip key={a.etiqueta} etiqueta={a.etiqueta} activo={caducidad === valor} onPress={() => setCaducidad(valor)} />;
            })}
          </Chips>
          {errores.caducidad ? (
            <Nota error>{errores.caducidad}</Nota>
          ) : caducidadISO ? (
            <View style={styles.vistaPrevia}>
              <EstadoCaducidad producto={{ fechaCaducidad: caducidadISO }} pastilla />
            </View>
          ) : (
            <Nota>Sin fecha no te avisamos de este producto.</Nota>
          )}
        </Seccion>

        <Seccion titulo="¿Cuándo lo compraste?">
          <Grupo>
            <Campo icono="bolsa" placeholder="DD/MM/AAAA" value={compra} onChangeText={setCompra} keyboardType="numbers-and-punctuation" maxLength={10} />
          </Grupo>
          <Chips>
            {ATAJOS_COMPRA.map((a) => {
              const valor = aTexto(sumarDias(hoy, a.dias));
              return <Chip key={a.etiqueta} etiqueta={a.etiqueta} activo={compra === valor} onPress={() => setCompra(valor)} />;
            })}
          </Chips>
          {errores.compra ? <Nota error>{errores.compra}</Nota> : compraISO ? <Nota>{`Comprado ${haceCuanto(compraISO)}.`}</Nota> : null}
        </Seccion>

        <Seccion titulo="Categoría" nota="Define el ícono con el que aparece en tus listas.">
          <Chips>
            {CATEGORIAS.map((c) => (
              <Chip key={c.nombre} etiqueta={c.nombre} icono={c.icono} activo={categoria === c.nombre} onPress={() => setCategoria(c.nombre)} />
            ))}
          </Chips>
        </Seccion>

        <Seccion titulo="Notas">
          <Grupo>
            <TextInput
              style={[styles.notas, sinContornoWeb]}
              placeholder="Marca, tienda, precio, cómo guardarlo…"
              placeholderTextColor={ui.textoTerciario}
              value={notas}
              onChangeText={setNotas}
              multiline
            />
          </Grupo>
        </Seccion>

        <View style={{ gap: spacing.sm }}>
          <Boton
            titulo={guardado ? 'Guardado' : existente ? 'Guardar cambios' : 'Agregar a mi despensa'}
            icono="check"
            deshabilitado={!valido}
            onPress={guardar}
          />
          {!valido && pendiente && <Nota>{pendiente}</Nota>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const sinContornoWeb = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  cantidad: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm },
  paso: { width: 44, height: 44, borderRadius: 22, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  pasoApagado: { opacity: 0.35 },
  cantidadCentro: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cantidadInput: { fontSize: 22, fontWeight: '600', color: ui.texto, textAlign: 'right', minWidth: 48 },
  cantidadUnidad: { fontSize: 17, color: ui.textoSecundario, letterSpacing: -0.2 },
  vistaPrevia: { paddingHorizontal: spacing.lg },
  notas: { minHeight: 88, fontSize: 16, lineHeight: 22, color: ui.texto, padding: spacing.lg, textAlignVertical: 'top' },
});
