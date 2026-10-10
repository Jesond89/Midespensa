import React from 'react';
import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Icono, NombreIcono } from '../../../src/components/ui/Icono';
import { useHogar } from '../../../src/state/HogarProvider';
import { ui } from '../../../src/theme/tokens';
import { BarraFlotante } from '../../../src/components/ui/BarraFlotante';


// Barra inferior de la app: cápsula flotante (BarraFlotante). Los íconos
// duotono cambian de gris a grafito en la pestaña activa.
function icono(nombre: NombreIcono) {
  return function IconoPestana({ color, size }: { color: ColorValue; size: number }) {
    return <Icono nombre={nombre} tamano={size} color={String(color)} />;
  };
}

export default function TabsLayout() {
  const { faltantes } = useHogar();

  return (
    <Tabs
      tabBar={(props) => <BarraFlotante {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: ui.fondo },
        headerTintColor: ui.texto,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: ui.fondo },
      }}
    >
      <Tabs.Screen name="inicio" options={{
        title: 'Inicio', headerShown: false,
        tabBarIcon: icono('casa'),
      }} />
      <Tabs.Screen name="inventario" options={{
        title: 'Mi despensa', tabBarLabel: 'Despensa',
        tabBarIcon: icono('frasco'),
      }} />
      <Tabs.Screen name="faltantes" options={{
        title: 'Lista de compras', tabBarLabel: 'Lista',
        tabBarIcon: icono('carrito'),
        tabBarBadge: faltantes.length || undefined,
      }} />
      <Tabs.Screen name="cocina" options={{
        title: '¿Qué cocino?', tabBarLabel: 'Cocina',
        tabBarIcon: icono('olla'),
      }} />
      <Tabs.Screen name="perfil" options={{
        title: 'Mi hogar', tabBarLabel: 'Perfil',
        tabBarIcon: icono('persona'),
      }} />
    </Tabs>
  );
}
