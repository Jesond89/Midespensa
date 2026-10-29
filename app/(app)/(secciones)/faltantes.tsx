import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Icono } from '../../../src/components/ui/Icono';
import { Grupo, Campo, Boton, Nota } from '../../../src/components/ui/Formulario';
import { CabeceraGrupo, FilaFaltante, VacioAccion } from '../../../src/components/inventario/piezas';
import { vibrar } from '../../../src/components/hogar/animaciones';
import { useHogar } from '../../../src/state/HogarProvider';
import { usePreferencias } from '../../../src/state/PreferenciasProvider';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';

// Lista de compras: lo que se marcó como agotado más lo que se agregue a
// mano. Al terminar la compra, lo marcado pasa a la despensa con fecha de hoy.
//
// Esta pantalla se usa de pie en el súper y con una mano, así que:
//   · toda la fila marca y desmarca, y quitar tiene su propio botón aparte;
//   · lo que ya está en el carrito baja a su grupo y se tacha, de modo que
//     la lista de arriba se va acortando conforme se avanza;
//   · el botón de guardar queda fijo abajo, al alcance del pulgar, sin
//     tener que recorrer toda la lista para encontrarlo.
export default function Faltantes() {
  const espacioInferior = useEspacioInferior();
  const router = useRouter();
  const { faltantes, agregarFaltante, quitarFaltante, terminarCompra } = useHogar();
  const { prefs } = usePreferencias();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState('');

  const vibra = (tipo: keyof typeof vibrar) => { if (prefs.vibracion) vibrar[tipo](); };

  // Estables entre renders para que las filas memoizadas no se redibujen.
  const alternar = useCallback((id: string) => {
    if (prefs.vibracion) vibrar.seleccion();
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }, [prefs.vibracion]);

  const quitar = useCallback((id: string) => quitarFaltante(id), [quitarFaltante]);

  const agregar = () => {
    if (!nuevo.trim()) return;
    agregarFaltante(nuevo, 1, 'pieza');
    setNuevo('');
    vibra('seleccion');
  };

  const terminar = () => {
    vibra('exito');
    terminarCompra(seleccionados);
    setSeleccionados([]);
  };

  // Lo marcado baja; lo que falta por echar al carrito se queda arriba.
  const marcados = faltantes.filter((f) => seleccionados.includes(f.id));
  const pendientes = faltantes.filter((f) => !seleccionados.includes(f.id));
  // Freddy flota en la esquina inferior derecha: se le deja su hueco para
  // que no se siente encima del botón.
  const hueco = prefs.freddyEnSecciones ? 96 : 0;
  const altoPie = 54 + spacing.md + espacioInferior;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          { paddingBottom: (marcados.length ? altoPie : espacioInferior) + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
              <Pressable
                onPress={agregar}
                hitSlop={8}
                style={({ pressed }) => [styles.agregarBoton, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${nuevo.trim()} a la lista`}
              >
                <Icono nombre="flecha-arriba" tamano={18} color={ui.accionTexto} />
              </Pressable>
            )}
          </View>
        </Grupo>

        {faltantes.length === 0 ? (
          <VacioAccion
            icono="carrito"
            titulo="No falta nada"
            texto="Cuando algo se acabe, ábrelo en tu despensa y toca “Se acabó”: aparecerá aquí para la próxima compra."
            accion={{ etiqueta: 'Ver mi despensa', icono: 'frasco', onPress: () => router.push('/inventario') }}
          />
        ) : (
          <>
            {pendientes.length > 0 ? (
              <View style={styles.grupo}>
                <CabeceraGrupo
                  titulo="Por comprar"
                  cuenta={pendientes.length}
                  nota="Tócalos cuando los eches al carrito."
                />
                <Grupo sangria={60}>
                  {pendientes.map((f) => (
                    <FilaFaltante
                      key={f.id}
                      item={f}
                      marcado={false}
                      onAlternar={alternar}
                      onQuitar={quitar}
                    />
                  ))}
                </Grupo>
              </View>
            ) : (
              <Text style={styles.todoListo}>Ya tienes todo en el carrito.</Text>
            )}

            {marcados.length > 0 && (
              <View style={styles.grupo}>
                <CabeceraGrupo titulo="En el carrito" cuenta={marcados.length} />
                <Grupo sangria={60}>
                  {marcados.map((f) => (
                    <FilaFaltante
                      key={f.id}
                      item={f}
                      marcado
                      onAlternar={alternar}
                      onQuitar={quitar}
                    />
                  ))}
                </Grupo>
                <Nota>Al guardar entran a tu despensa con la fecha de hoy. Después puedes ponerles su caducidad.</Nota>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {marcados.length > 0 && (
        <View style={[styles.pie, { paddingBottom: espacioInferior, paddingRight: spacing.lg + hueco }]}>
          <Boton
            titulo={marcados.length === 1 ? 'Guardar 1 en mi despensa' : `Guardar ${marcados.length} en mi despensa`}
            icono="bolsa-lista"
            onPress={terminar}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.fondo },
  contenido: {
    padding: spacing.lg, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  agregar: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.md },
  agregarBoton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: ui.accion,
    alignItems: 'center', justifyContent: 'center',
  },
  grupo: { gap: spacing.sm },
  todoListo: { fontSize: 15, color: ui.textoSecundario, textAlign: 'center', lineHeight: 20 },
  pie: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: ui.fondo,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.separador,
  },
});
