import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BotonEncabezado, Grupo, Seccion } from '../../../src/components/ui/Formulario';
import { EstadoCaducidad, FilaAccion, FilaDato, IconoCuadro } from '../../../src/components/ui/Lista';
import { VacioAccion, franjaDe } from '../../../src/components/inventario/piezas';
import { useHogar } from '../../../src/state/HogarProvider';
import { iconoCategoria } from '../../../src/data/catalogo';
import { estadoCaducidad, nivelDe } from '../../../src/utils/caducidad';
import { formatear, haceCuanto } from '../../../src/utils/fechas';
import { confirmar } from '../../../src/utils/confirmar';
import { ui, spacing } from '../../../src/theme/tokens';
import { cantidadTexto } from '../../../src/utils/cantidad';

// Ficha de un producto. Arriba, lo que se viene a consultar: qué es, cuánto
// queda, dónde está y si todavía sirve. Abajo, los datos completos y las
// tres cosas que se pueden hacer con él. Editar vive en el encabezado, que
// es donde se busca.
export default function DetalleProducto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { productos, marcarAgotado, eliminarProducto } = useHogar();
  const router = useRouter();
  const producto = productos.find((p) => p.id === id);

  const aDespensa = () => (router.canGoBack() ? router.back() : router.replace('/inventario'));

  if (!producto) {
    return (
      <VacioAccion
        icono="frasco"
        titulo="Este producto ya no está"
        texto="Alguien de tu hogar lo pudo haber eliminado o marcado como agotado."
        accion={{ etiqueta: 'Ver mi despensa', icono: 'frasco', onPress: aDespensa }}
      />
    );
  }

  const nivel = nivelDe(producto);
  const franja = franjaDe(nivel);
  const estado = estadoCaducidad(producto);

  const agotado = () => {
    marcarAgotado(producto.id);
    aDespensa();
  };

  const eliminar = async () => {
    if (!(await confirmar('Eliminar producto', `¿Quitar "${producto.nombre}" de la despensa?`, 'Eliminar'))) return;
    eliminarProducto(producto.id);
    aDespensa();
  };

  return (
    <>
      <Stack.Screen options={{
        title: '',
        headerRight: () => (
          <BotonEncabezado
            titulo="Editar"
            etiqueta={`Editar ${producto.nombre}`}
            onPress={() => router.push(`/producto/nuevo?id=${producto.id}`)}
          />
        ),
      }} />
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.ficha}>
          {franja && <View style={[styles.franja, { backgroundColor: franja }]} />}
          <View style={styles.fichaFila}>
            <IconoCuadro icono={iconoCategoria(producto.categoria)} tamano={52} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.nombre}>{producto.nombre}</Text>
              <Text style={styles.resumen}>
                <Text style={styles.cantidad}>{cantidadTexto(producto.cantidad, producto.unidad)}</Text>
                {` · ${producto.ubicacion}`}
              </Text>
            </View>
          </View>
          {producto.fechaCaducidad ? (
            <View style={styles.fichaEstado}>
              <EstadoCaducidad producto={producto} pastilla />
              <Text style={styles.fichaFecha}>{formatear(producto.fechaCaducidad)}</Text>
            </View>
          ) : (
            <Text style={styles.sinFecha}>Sin fecha de caducidad. Ponle una al editarlo si quieres que te avise.</Text>
          )}
        </View>

        <Seccion titulo="Detalles">
          <Grupo sangria={16}>
            <FilaDato etiqueta="Categoría" valor={producto.categoria} />
            <FilaDato etiqueta="Comprado" valor={formatear(producto.fechaCompra)} detalle={haceCuanto(producto.fechaCompra)} />
            <FilaDato
              etiqueta="Caducidad"
              valor={producto.fechaCaducidad ? formatear(producto.fechaCaducidad) : 'No caduca'}
              detalle={producto.fechaCaducidad ? estado.texto : undefined}
            />
          </Grupo>
        </Seccion>

        {producto.notas ? (
          <Seccion titulo="Notas">
            <Grupo>
              <Text style={styles.notas}>{producto.notas}</Text>
            </Grupo>
          </Seccion>
        ) : null}

        <Grupo sangria={52}>
          <FilaAccion icono="carrito" titulo="Se acabó, pásalo a mi lista" onPress={agotado} />
          <FilaAccion icono="basura" titulo="Eliminar de la despensa" onPress={eliminar} destructiva />
        </Grupo>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, paddingBottom: 150, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  ficha: {
    backgroundColor: ui.tarjeta, borderRadius: 14, overflow: 'hidden', padding: spacing.lg, gap: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  franja: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  fichaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nombre: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: ui.texto },
  resumen: { fontSize: 15, color: ui.textoSecundario },
  cantidad: { fontSize: 15, fontWeight: '600', color: ui.texto },
  fichaEstado: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  fichaFecha: { fontSize: 13, color: ui.textoSecundario },
  sinFecha: { fontSize: 13, color: ui.textoSecundario, lineHeight: 18 },
  notas: { fontSize: 16, lineHeight: 22, color: ui.texto, padding: spacing.lg },
});
