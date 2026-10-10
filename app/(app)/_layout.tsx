import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useSesion } from '../../src/state/SesionProvider';
import { FreddyAyudante } from '../../src/components/ui/FreddyAyudante';
import { opcionesEncabezado } from '../../src/theme/navegacion';
import { ui } from '../../src/theme/tokens';

// Parte interna de la app (requiere sesión): la barra inferior con las
// secciones y, encima, las pantallas de producto. Freddy flota sobre todo.
export default function AppLayout() {
  const { listo, hogar } = useSesion();
  if (!listo) return null;
  if (!hogar) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: ui.fondo }}>
      <Stack screenOptions={opcionesEncabezado}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="producto/[id]" options={{ title: '' }} />
        <Stack.Screen name="producto/nuevo" options={{ title: 'Nuevo producto', presentation: 'modal' }} />
      </Stack>
      <FreddyAyudante />
    </View>
  );
}
