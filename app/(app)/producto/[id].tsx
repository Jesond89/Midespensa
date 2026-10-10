import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Grupo, Seccion } from '../../../src/components/ui/Formulario';
import { EstadoCaducidad, FilaAccion, FilaDato, IconoCuadro, Vacio } from '../../../src/components/ui/Lista';
import { useHogar } from '../../../src/state/HogarProvider';
import { iconoCategoria } from '../../../src/data/catalogo';
import { formatear, haceCuanto } from '../../../src/utils/fechas';
import { confirmar } from '../../../src/utils/confirmar';
import { ui, spacing } from '../../../src/theme/tokens';
import { cantidadTexto } from '../../../src/utils/cantidad';

export default function DetalleProducto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { productos, marcarAgotado, eliminarProducto } = useHogar();
  const router = useRouter();
  const producto = productos.find((p) => p.id === id);

  if (!producto) {
    return <Vacio icono="frasco" titulo="Producto no encontrado" texto="Este producto ya no está en tu despensa." />;
  }

  const agotado = () => {
    marcarAgotado(producto.id);
    router.back();
  };

  const eliminar = async () => {
    if (!(await confirmar('Eliminar producto', `¿Quitar "${producto.nombre}" de la despensa?`, 'Eliminar'))) return;
    eliminarProducto(producto.id);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <IconoCuadro icono={iconoCategoria(producto.categoria)} tamano={64} />
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <EstadoCaducidad producto={producto} pastilla />
      </View>

      <Seccion titulo="Detalles">
        <Grupo sangria={16}>
          <FilaDato etiqueta="Categoría" valor={producto.categoria} />
          <FilaDato etiqueta="Ubicación" valor={producto.ubicacion} />
          <FilaDato etiqueta="Cantidad" valor={cantidadTexto(producto.cantidad, producto.unidad)} />
        </Grupo>
      </Seccion>

      <Seccion titulo="Fechas">
        <Grupo sangria={16}>
          <FilaDato etiqueta="Comprado" valor={formatear(producto.fechaCompra)} detalle={haceCuanto(producto.fechaCompra)} />
          <FilaDato
            etiqueta="Caducidad"
            valor={producto.fechaCaducidad ? formatear(producto.fechaCaducidad) : 'No caduca'}
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
        <FilaAccion icono="lapiz" titulo="Editar" onPress={() => router.push(`/producto/nuevo?id=${producto.id}`)} />
        <FilaAccion icono="carrito" titulo="Se acabó, agregar a mi lista" onPress={agotado} />
        <FilaAccion icono="basura" titulo="Eliminar" onPress={eliminar} destructiva />
      </Grupo>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, paddingBottom: 150, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  cabecera: { alignItems: 'center', gap: spacing.sm },
  nombre: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, color: ui.texto, textAlign: 'center', marginTop: spacing.xs },
  notas: { fontSize: 16, lineHeight: 22, color: ui.texto, padding: spacing.lg },
});
