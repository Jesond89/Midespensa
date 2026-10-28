import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Grupo, Campo, BotonEncabezado } from '../../../src/components/ui/Formulario';
import { Icono, NombreIcono } from '../../../src/components/ui/Icono';
import {
  CabeceraGrupo, FILTROS, FilaInventario, Filtro, FiltrosCaducidad, VacioAccion,
} from '../../../src/components/inventario/piezas';
import { useHogar } from '../../../src/state/HogarProvider';
import { UBICACIONES, iconoUbicacion } from '../../../src/data/catalogo';
import { estaCaducado, estaPorCaducar, nivelDe, ordenarPorCaducidad } from '../../../src/utils/caducidad';
import type { Producto } from '../../../src/data/mock';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';

// Mi despensa: todo lo que hay en casa, ordenado por lo que caduca antes.
//
// En "Todos" los productos van por lugar, como los anaqueles de la casa,
// pero lo caducado y lo que le quedan dos días o menos sube a un grupo
// propio al principio: es lo que hay que resolver hoy y no debe quedar
// escondido en su estante. Los filtros traen su cuenta para saber si hay algo vencido sin
// tener que entrar a mirar.

// Lo que sube al grupo de arriba en "Todos".
const urge = (p: Producto) => ['caducado', 'urgente'].includes(nivelDe(p));

type GrupoLista = {
  clave: string;
  titulo: string;
  icono?: NombreIcono;
  nota?: string;
  items: Producto[];
};

export default function Inventario() {
  const espacioInferior = useEspacioInferior();
  const router = useRouter();
  const params = useLocalSearchParams<{ filtro?: Filtro }>();
  const { productos } = useHogar();
  const [filtro, setFiltro] = useState<Filtro>(params.filtro ?? 'todos');
  const [busqueda, setBusqueda] = useState('');
  const navigation = useNavigation();

  // La pantalla sigue montada al volver desde los botones del inicio, así
  // que cuando el enlace trae otro filtro (?filtro=caducados) se ajusta en
  // el mismo render, sin un efecto que obligue a dibujar dos veces.
  const [filtroDelEnlace, setFiltroDelEnlace] = useState(params.filtro);
  if (params.filtro !== filtroDelEnlace) {
    setFiltroDelEnlace(params.filtro);
    if (params.filtro) setFiltro(params.filtro);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: FILTROS.find((f) => f.id === filtro)!.titulo,
      headerRight: () => (
        <BotonEncabezado icono="mas" etiqueta="Registrar compras" onPress={() => router.push('/producto/registrar')} />
      ),
    });
  }, [navigation, filtro, router]);

  // Las cuentas de los filtros son del total: sirven de aviso, no de resumen
  // de la búsqueda.
  const cuentas = useMemo(() => ({
    'todos': productos.length,
    'por-caducar': productos.filter(estaPorCaducar).length,
    'caducados': productos.filter(estaCaducado).length,
  }), [productos]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos
      .filter((p) => filtro === 'todos' || (filtro === 'caducados' ? estaCaducado(p) : estaPorCaducar(p)))
      .filter((p) => !texto || p.nombre.toLowerCase().includes(texto) || p.categoria.toLowerCase().includes(texto))
      .sort(ordenarPorCaducidad);
  }, [productos, filtro, busqueda]);

  const grupos = useMemo<GrupoLista[]>(() => {
    if (filtro !== 'todos') {
      return [{
        clave: filtro,
        titulo: filtro === 'caducados' ? 'Ya caducaron' : 'Se acaban pronto',
        nota: filtro === 'caducados'
          ? 'Revísalos y decide si todavía sirven o se tiran.'
          : 'Vencen en los próximos 5 días. Úsalos primero.',
        items: visibles,
      }];
    }
    const urgentes = visibles.filter(urge);
    const resto = visibles.filter((p) => !urge(p));
    return [
      ...(urgentes.length
        ? [{
            clave: 'urgentes',
            titulo: 'Revisa primero',
            nota: 'Ya caducó o le quedan dos días o menos, sin importar dónde esté guardado.',
            items: urgentes,
          }]
        : []),
      ...UBICACIONES
        .map((u) => ({
          clave: u.nombre,
          titulo: u.nombre,
          icono: iconoUbicacion(u.nombre),
          items: resto.filter((p) => p.ubicacion === u.nombre),
        }))
        .filter((g) => g.items.length > 0),
    ];
  }, [filtro, visibles]);

  const vacio = busqueda.trim()
    ? {
        icono: 'buscar' as const,
        titulo: 'Sin resultados',
        texto: `Nada en tu despensa coincide con “${busqueda.trim()}”.`,
        secundaria: { etiqueta: 'Borrar la búsqueda', onPress: () => setBusqueda('') },
      }
    : filtro === 'todos'
      ? {
          icono: 'frasco' as const,
          titulo: 'Tu despensa está vacía',
          texto: 'Registra lo que trajiste del súper: una foto basta y Mi Despensa lo acomoda por ti.',
          accion: { etiqueta: 'Registrar compras', icono: 'camara' as const, onPress: () => router.push('/producto/registrar') },
        }
      : filtro === 'por-caducar'
        ? {
            icono: 'check-circulo' as const,
            titulo: 'Nada se acaba pronto',
            texto: 'Ningún producto vence en los próximos 5 días.',
            secundaria: { etiqueta: 'Ver toda mi despensa', onPress: () => setFiltro('todos') },
          }
        : {
            icono: 'check-circulo' as const,
            titulo: 'Nada caducado',
            texto: 'No hay nada vencido en tu despensa. Así se ahorra comida.',
            secundaria: { etiqueta: 'Ver toda mi despensa', onPress: () => setFiltro('todos') },
          };

  return (
    <ScrollView
      contentContainerStyle={[styles.contenido, { paddingBottom: espacioInferior + 110 }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Grupo>
        <View style={styles.buscar}>
          <View style={{ flex: 1 }}>
            <Campo
              icono="buscar"
              placeholder="Buscar producto o categoría"
              value={busqueda}
              onChangeText={setBusqueda}
              returnKeyType="search"
            />
          </View>
          {busqueda.length > 0 && (
            <Pressable
              onPress={() => setBusqueda('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Borrar la búsqueda"
              style={({ pressed }) => [styles.limpiar, pressed && { opacity: 0.6 }]}
            >
              <Icono nombre="cerrar" tamano={13} color={ui.textoSecundario} />
            </Pressable>
          )}
        </View>
      </Grupo>

      <FiltrosCaducidad actual={filtro} cuentas={cuentas} onCambiar={setFiltro} />

      {visibles.length === 0 ? (
        <VacioAccion {...vacio} />
      ) : (
        grupos.map((g) => (
          <View key={g.clave} style={styles.grupo}>
            <CabeceraGrupo icono={g.icono} titulo={g.titulo} cuenta={g.items.length} nota={g.nota} />
            <Grupo sangria={64}>
              {g.items.map((p) => <FilaInventario key={p.id} producto={p} />)}
            </Grupo>
          </View>
        ))
      )}

      {visibles.length > 0 && busqueda.trim().length === 0 && filtro === 'todos' && (
        <Text style={styles.pie}>
          {productos.length === 1 ? '1 producto en tu despensa' : `${productos.length} productos en tu despensa`}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, gap: spacing.lg,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  buscar: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.md },
  limpiar: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: ui.relleno,
    alignItems: 'center', justifyContent: 'center',
  },
  grupo: { gap: spacing.sm },
  pie: { fontSize: 13, color: ui.textoSecundario, textAlign: 'center', paddingTop: spacing.xs },
});
