import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ui } from './tokens';

// Encabezado limpio para todas las pilas: fondo gris de sistema, sin
// sombra y solo la flecha de regresar.
export const opcionesEncabezado = {
  headerStyle: { backgroundColor: ui.fondo },
  headerTintColor: ui.texto,
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: ui.fondo },
};

// Espacio que dejan abajo las pantallas para no pegarse al borde ni al
// indicador de inicio. En equipos sin área segura (web, Android con
// botones) se deja un margen mínimo. Freddy flotante se coloca encima.
export function useEspacioInferior() {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, 16);
}
