import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useSesion } from '../../src/state/SesionProvider';
import { FreddyAyudante } from '../../src/components/ui/FreddyAyudante';
import { opcionesEncabezado } from '../../src/theme/navegacion';
import { ui } from '../../src/theme/tokens';

// Parte interna de la app (requiere sesión): las secciones (con el inicio
// como centro) y, encima, las pantallas de producto. Freddy flota sobre todo.
export default function AppLayout() {
  const { listo, hogar } = useSesion();
  if (!listo) return null;
  if (!hogar) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: ui.fondo }}>
      <Stack screenOptions={opcionesEncabezado}>
        <Stack.Screen name="(secciones)" options={{ headerShown: false }} />
        <Stack.Screen name="producto/[id]" options={{ title: '' }} />
        <Stack.Screen name="producto/nuevo" options={{ title: 'Editar producto', presentation: 'modal' }} />
        <Stack.Screen name="producto/registrar" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <FreddyAyudante />
    </View>
  );
}
