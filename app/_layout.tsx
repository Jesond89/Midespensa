import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HogarProvider } from '../src/state/HogarProvider';
import { color } from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <HogarProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{
          headerStyle: { backgroundColor: color.paper },
          headerTintColor: color.ink,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: color.paper },
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="crear-hogar" options={{ title: 'Crear hogar' }} />
          <Stack.Screen name="unirse-hogar" options={{ title: 'Unirme a un hogar' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="producto/[id]" options={{ title: 'Detalle del producto' }} />
          <Stack.Screen name="producto/nuevo" options={{ title: 'Agregar producto', presentation: 'modal' }} />
        </Stack>
      </HogarProvider>
    </SafeAreaProvider>
  );
}
