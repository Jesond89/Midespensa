import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Grupo, Campo, Seccion, BotonEncabezado } from '../../../src/components/ui/Formulario';
import { FilaProducto, Vacio } from '../../../src/components/ui/Lista';
import { useHogar } from '../../../src/state/HogarProvider';
import { UBICACIONES } from '../../../src/data/catalogo';
import { estaCaducado, estaPorCaducar, ordenarPorCaducidad } from '../../../src/utils/caducidad';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';

type Filtro = 'todos' | 'por-caducar' | 'caducados';

const FILTROS: { id: Filtro; etiqueta: string; titulo: string }[] = [
  { id: 'todos', etiqueta: 'Todos', titulo: 'Mi despensa' },
  { id: 'por-caducar', etiqueta: 'Por caducar', titulo: 'Por caducar' },
  { id: 'caducados', etiqueta: 'Caducados', titulo: 'Caducados' },
];

const VACIOS = {
  'todos': { icono: 'frasco', titulo: 'Tu despensa está vacía', texto: 'Agrega tu primer producto con el botón +.' },
  'por-caducar': { icono: 'check-circulo', titulo: 'Nada por caducar', texto: 'Ningún producto caduca en los próximos 5 días.' },
  'caducados': { icono: 'check-circulo', titulo: 'Sin caducados', texto: 'No tienes productos vencidos. ¡Bien hecho!' },
} as const;

export default function Inventario() {
  const espacioInferior = useEspacioInferior();
  const router = useRouter();
  const params = useLocalSearchParams<{ filtro?: Filtro }>();
  const { productos } = useHogar();
  const [filtro, setFiltro] = useState<Filtro>(params.filtro ?? 'todos');
  const [busqueda, setBusqueda] = useState('');
  const navigation = useNavigation();

  // La pestaña sigue montada al volver desde los botones del inicio,
  // así que el filtro se actualiza cuando cambia el parámetro.
  useEffect(() => {
    if (params.filtro) setFiltro(params.filtro);
  }, [params.filtro]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: FILTROS.find((f) => f.id === filtro)!.titulo,
      headerRight: () => (
        <BotonEncabezado icono="mas" etiqueta="Agregar producto" onPress={() => router.push('/producto/registrar')} />
      ),
    });
  }, [navigation, filtro, router]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos
      .filter((p) => filtro === 'todos' || (filtro === 'caducados' ? estaCaducado(p) : estaPorCaducar(p)))
      .filter((p) => !texto || p.nombre.toLowerCase().includes(texto) || p.categoria.toLowerCase().includes(texto))
      .sort(ordenarPorCaducidad);
  }, [productos, filtro, busqueda]);

  // En "Todos" se agrupa por ubicación, como los anaqueles de la casa.
  const secciones = filtro === 'todos'
    ? UBICACIONES.map((u) => ({ titulo: u.nombre, items: visibles.filter((p) => p.ubicacion === u.nombre) }))
      .filter((s) => s.items.length > 0)
    : [{ titulo: '', items: visibles }];

  const vacio = busqueda
    ? { icono: 'buscar' as const, titulo: 'Sin resultados', texto: `No hay productos que coincidan con “${busqueda}”.` }
    : VACIOS[filtro];

  return (
    <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioInferior + spacing.lg }]} keyboardShouldPersistTaps="handled">
      <Grupo>
        <Campo icono="buscar" placeholder="Buscar producto o categoría" value={busqueda} onChangeText={setBusqueda} />
      </Grupo>

      <View style={styles.segmentos} accessibilityRole="tablist">
        {FILTROS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFiltro(f.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filtro === f.id }}
            style={[styles.segmento, filtro === f.id && styles.segmentoActivo]}
          >
            <Text style={[styles.segmentoTexto, filtro === f.id && styles.segmentoTextoActivo]}>{f.etiqueta}</Text>
          </Pressable>
        ))}
      </View>

      {visibles.length === 0 ? (
        <Vacio {...vacio} />
      ) : (
        secciones.map((s) => (
          <Seccion key={s.titulo || 'lista'} titulo={s.titulo ? `${s.titulo} · ${s.items.length}` : undefined}>
            <Grupo sangria={64}>
              {s.items.map((p) => <FilaProducto key={p.id} producto={p} />)}
            </Grupo>
          </Seccion>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, paddingBottom: 150, gap: spacing.lg,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  segmentos: { flexDirection: 'row', backgroundColor: ui.relleno, borderRadius: 10, padding: 2 },
  segmento: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segmentoActivo: {
    backgroundColor: ui.tarjeta,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  segmentoTexto: { fontSize: 14, fontWeight: '500', color: ui.textoSecundario },
  segmentoTextoActivo: { color: ui.texto, fontWeight: '600' },
});
