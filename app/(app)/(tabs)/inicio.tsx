import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icono, NombreIcono } from '../../../src/components/ui/Icono';
import { Freddy } from '../../../src/components/avatar/Freddy';
import { Burbuja } from '../../../src/components/ui/Burbuja';
import { ChatFreddy } from '../../../src/components/chat/ChatFreddy';
import { TEMAS } from '../../../src/chat/temas';
import { Boton } from '../../../src/components/ui/Formulario';
import { useHogar } from '../../../src/state/HogarProvider';
import { useSesion } from '../../../src/state/SesionProvider';
import { estaCaducado, estaPorCaducar } from '../../../src/utils/caducidad';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioBarra } from '../../../src/theme/navegacion';


type Atajo = {
  titulo: string;
  icono: NombreIcono;
  ruta: Href;
  valor?: number;
  detalle: string;
  tono?: string;
};

// Inicio dentro de la app: Freddy arriba con el nombre del hogar, la acción
// principal de agregar un producto y un resumen rápido en botones.
// Sin scroll: la rejilla ocupa el espacio que queda y se encoge en
// pantallas bajas (Freddy también se hace más pequeño).
export default function Inicio() {
  const espacioBarra = useEspacioBarra();
  const router = useRouter();
  const { hogar } = useSesion();
  const { productos, faltantes } = useHogar();
  const { height } = useWindowDimensions();
  const compacto = height < 760;
  const [chat, setChat] = useState(false);

  const porCaducar = productos.filter(estaPorCaducar).length;
  const caducados = productos.filter(estaCaducado).length;

  const atajos: Atajo[] = [
    { titulo: 'Mi despensa', icono: 'frasco', ruta: '/inventario', valor: productos.length, detalle: 'productos' },
    { titulo: 'Por caducar', icono: 'reloj', ruta: '/inventario?filtro=por-caducar', valor: porCaducar, detalle: 'en 5 días', tono: porCaducar ? ui.porVencer : undefined },
    { titulo: 'Caducados', icono: 'alerta', ruta: '/inventario?filtro=caducados', valor: caducados, detalle: caducados === 1 ? 'producto' : 'productos', tono: caducados ? ui.urgente : undefined },
    { titulo: 'Mi lista', icono: 'carrito', ruta: '/faltantes', valor: faltantes.length, detalle: 'por comprar' },
    { titulo: '¿Qué cocino?', icono: 'olla', ruta: '/cocina', detalle: 'Ideas con lo que tienes' },
    { titulo: 'Mi hogar', icono: 'casa', ruta: '/perfil', detalle: hogar?.codigo ?? '' },
  ];

  const filas = [atajos.slice(0, 2), atajos.slice(2, 4), atajos.slice(4, 6)];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.contenido, { paddingBottom: espacioBarra + spacing.lg }]}>
        <View style={styles.encabezado}>
          {/* Burbuja y Freddy son un solo botón: los dos abren el chat. */}
          <Pressable onPress={() => setChat(true)} accessibilityRole="button" accessibilityLabel="Platicar con Freddy" style={styles.freddy}>
            <Burbuja texto={TEMAS.general.saludo} accion="Hazme clic y platicamos" />
            <Freddy size={compacto ? 100 : 140} estado={chat ? 'feliz' : 'reposo'} />
          </Pressable>
          <Text style={[styles.hogar, compacto && styles.hogarCompacto]} numberOfLines={1}>{hogar?.nombre}</Text>
        </View>

        <Boton titulo="Agregar producto" icono="mas" onPress={() => router.push('/producto/nuevo')} />

        <View style={styles.rejilla}>
          {filas.map((fila, i) => (
            <View key={i} style={styles.fila}>
              {fila.map((a) => (
                <Pressable
                  key={a.titulo}
                  onPress={() => router.push(a.ruta)}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.titulo}${a.valor !== undefined ? `, ${a.valor} ${a.detalle}` : ''}`}
                  style={({ pressed }) => [styles.atajo, compacto && styles.atajoCompacto, pressed && styles.atajoPresionado]}
                >
                  <View style={styles.atajoArriba}>
                    <View style={styles.atajoIcono}>
                      <Icono nombre={a.icono} tamano={20} color={a.tono ?? ui.texto} />
                    </View>
                    {a.valor !== undefined && (
                      <Text style={[styles.atajoValor, a.tono && { color: a.tono }]}>{a.valor}</Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.atajoTitulo} numberOfLines={1}>{a.titulo}</Text>
                    {height >= 700 && <Text style={styles.atajoDetalle} numberOfLines={1}>{a.detalle}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </View>
      <ChatFreddy visible={chat} tema="general" onCerrar={() => setChat(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.fondo },
  contenido: {
    flex: 1, padding: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg,
    maxWidth: 520, width: '100%', alignSelf: 'center', justifyContent: 'center',
  },
  encabezado: { alignItems: 'center', gap: spacing.xs },
  freddy: { alignItems: 'center', gap: spacing.xs },
  hogar: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, color: ui.texto, marginTop: spacing.xs },
  hogarCompacto: { fontSize: 24, marginTop: 0 },
  // Las filas reparten la altura disponible; el tope evita tarjetas gigantes en tabletas.
  rejilla: { flex: 1, maxHeight: 400, gap: spacing.md },
  fila: { flex: 1, flexDirection: 'row', gap: spacing.md },
  atajo: {
    flex: 1, padding: spacing.lg, borderRadius: 18, backgroundColor: ui.tarjeta,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  atajoCompacto: { padding: spacing.md, borderRadius: 16 },
  atajoPresionado: { backgroundColor: ui.tarjetaPresionada, transform: [{ scale: 0.98 }] },
  atajoArriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  atajoIcono: { width: 36, height: 36, borderRadius: 10, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  atajoValor: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, color: ui.texto },
  atajoTitulo: { fontSize: 16, fontWeight: '600', color: ui.texto, letterSpacing: -0.2, marginTop: spacing.sm },
  atajoDetalle: { fontSize: 13, color: ui.textoSecundario, marginTop: 1 },
});
