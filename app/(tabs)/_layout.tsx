import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { color } from '../../src/theme/tokens';

// Tabs = "Menú" del índice de Fase 2. Sin iconos de fuente externa para no
// sumar otra dependencia de red en v0.1; las letras bastan para navegar.
function Marca({ letra, enfocado }: { letra: string; enfocado: boolean }) {
  return (
    <Text style={{ fontSize: 16, fontWeight: '700', color: enfocado ? color.brand : color.inkFaint }}>
      {letra}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.paper },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: color.ink },
        tabBarActiveTintColor: color.brand,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.line },
      }}
    >
      <Tabs.Screen name="inventario" options={{
        title: 'Mi Inventario',
        tabBarLabel: 'Inventario',
        tabBarIcon: ({ focused }) => <Marca letra="IN" enfocado={focused} />,
      }} />
      <Tabs.Screen name="faltantes" options={{
        title: 'Lista de Faltantes',
        tabBarLabel: 'Faltantes',
        tabBarIcon: ({ focused }) => <Marca letra="FA" enfocado={focused} />,
      }} />
      <Tabs.Screen name="cocina" options={{
        title: '¿Qué cocinamos?',
        tabBarLabel: 'Cocina',
        tabBarIcon: ({ focused }) => <Marca letra="CO" enfocado={focused} />,
      }} />
      <Tabs.Screen name="perfil" options={{
        title: 'Mi Hogar',
        tabBarLabel: 'Perfil',
        tabBarIcon: ({ focused }) => <Marca letra="PE" enfocado={focused} />,
      }} />
    </Tabs>
  );
}
