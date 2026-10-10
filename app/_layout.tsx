import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HogarProvider } from '../src/state/HogarProvider';
import { SesionProvider } from '../src/state/SesionProvider';
import { opcionesEncabezado } from '../src/theme/navegacion';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SesionProvider>
        <HogarProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ ...opcionesEncabezado, headerTitle: '' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="iniciar-sesion" options={{ title: 'Iniciar sesión' }} />
            <Stack.Screen name="crear-hogar" options={{ title: 'Crear hogar' }} />
            <Stack.Screen name="unirse-hogar" options={{ title: 'Unirme' }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </HogarProvider>
      </SesionProvider>
    </SafeAreaProvider>
  );
}
