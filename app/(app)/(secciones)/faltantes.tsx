import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Icono } from '../../../src/components/ui/Icono';
import { Grupo, Campo, Boton, Nota, Seccion } from '../../../src/components/ui/Formulario';
import { Vacio } from '../../../src/components/ui/Lista';
import { useHogar } from '../../../src/state/HogarProvider';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';
import { cantidadTexto } from '../../../src/utils/cantidad';

// Lista de compras: lo que se marcó como agotado más lo que se agregue a
// mano. Al terminar la compra, lo marcado pasa a la despensa con fecha de hoy.
export default function Faltantes() {
  const espacioInferior = useEspacioInferior();
  const { faltantes, agregarFaltante, quitarFaltante, terminarCompra } = useHogar();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState('');

  const alternar = (id: string) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const agregar = () => {
    if (!nuevo.trim()) return;
    agregarFaltante(nuevo, 1, 'pieza');
    setNuevo('');
  };

  const terminar = () => {
    terminarCompra(seleccionados);
    setSeleccionados([]);
  };

  return (
    <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioInferior + spacing.lg }]} keyboardShouldPersistTaps="handled">
      <Grupo>
        <View style={styles.agregar}>
          <View style={{ flex: 1 }}>
            <Campo
              icono="mas-circulo"
              placeholder="Agregar a la lista"
              value={nuevo}
              onChangeText={setNuevo}
              onSubmitEditing={agregar}
              returnKeyType="done"
              submitBehavior="submit"
            />
          </View>
          {nuevo.trim().length > 0 && (
            <Pressable onPress={agregar} style={styles.agregarBoton} accessibilityRole="button" accessibilityLabel="Agregar">
              <Icono nombre="flecha-arriba" tamano={18} color={ui.accionTexto} />
            </Pressable>
          )}
        </View>
      </Grupo>

      {faltantes.length === 0 ? (
        <Vacio
          icono="carrito"
          titulo="No falta nada"
          texto="Cuando un producto se acabe, márcalo como agotado y aparecerá aquí."
        />
      ) : (
        <Seccion titulo={`Por comprar · ${faltantes.length}`} nota="Toca para marcar lo que ya está en el carrito.">
          <Grupo sangria={52}>
            {faltantes.map((f) => {
              const marcado = seleccionados.includes(f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => alternar(f.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${f.nombre}, ${cantidadTexto(f.cantidad, f.unidad)}`}
                  accessibilityState={{ checked: marcado }}
                  style={({ pressed }) => [styles.fila, pressed && { backgroundColor: ui.tarjetaPresionada }]}
                >
                  <Icono
                    nombre={marcado ? 'check-circulo' : 'circulo'}
                    tamano={24}
                    color={marcado ? ui.accion : ui.icono}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nombre, marcado && styles.nombreMarcado]}>{f.nombre}</Text>
                    <Text style={styles.detalle}>{cantidadTexto(f.cantidad, f.unidad)}</Text>
                  </View>
                  <Pressable onPress={() => quitarFaltante(f.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Quitar ${f.nombre}`}>
                    <Icono nombre="cerrar" tamano={18} color={ui.textoTerciario} />
                  </Pressable>
                </Pressable>
              );
            })}
          </Grupo>
        </Seccion>
      )}

      {seleccionados.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Boton titulo={`Terminar compra (${seleccionados.length})`} icono="bolsa-lista" onPress={terminar} />
          <Nota>Se agregan a tu despensa con la fecha de hoy. Después puedes editar su caducidad.</Nota>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, paddingBottom: 150, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  agregar: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.md },
  agregarBoton: { width: 30, height: 30, borderRadius: 15, backgroundColor: ui.accion, alignItems: 'center', justifyContent: 'center' },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 11, minHeight: 56, backgroundColor: ui.tarjeta,
  },
  nombre: { fontSize: 16, fontWeight: '500', color: ui.texto },
  nombreMarcado: { textDecorationLine: 'line-through', color: ui.textoSecundario },
  detalle: { fontSize: 13, color: ui.textoSecundario, marginTop: 1 },
});
