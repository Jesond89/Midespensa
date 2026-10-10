import { Stack } from 'expo-router';
import { opcionesEncabezado } from '../../../src/theme/navegacion';

// Secciones de la app. El inicio (el recorrido por la casa) es el centro:
// desde sus lugares y tarjetas se abren la despensa, la lista y la cocina;
// arriba, la píldora del hogar lleva al perfil y la tuerca a los ajustes.
// Cada una tiene su flecha para regresar. No hay barra inferior.

// Si se entra directo a una sección (enlace o recarga en web), el inicio
// queda debajo para poder regresar.
export const unstable_settings = { initialRouteName: 'inicio' };

export default function SeccionesLayout() {
  return (
    <Stack screenOptions={opcionesEncabezado}>
      <Stack.Screen name="inicio" options={{ title: 'Inicio', headerShown: false }} />
      <Stack.Screen name="inventario" options={{ title: 'Mi despensa' }} />
      <Stack.Screen name="faltantes" options={{ title: 'Lista de compras' }} />
      <Stack.Screen name="cocina" options={{ title: '¿Qué cocino?' }} />
      <Stack.Screen name="perfil" options={{ title: 'Mi hogar' }} />
      <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Stack>
  );
}
