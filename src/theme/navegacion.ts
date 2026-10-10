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

// Barra de pestañas flotante (src/components/ui/BarraFlotante.tsx): cápsula
// de ALTO_BARRA separada del borde inferior. En equipos sin área segura
// (web, Android con botones) se deja un margen mínimo.
export const ALTO_BARRA = 64;
export const margenBarra = (insetInferior: number) => Math.max(insetInferior, 14);

// Espacio que deben dejar abajo las pantallas con pestañas para que su
// contenido no quede detrás de la barra. Freddy flotante se coloca encima.
export function useEspacioBarra() {
  const { bottom } = useSafeAreaInsets();
  return margenBarra(bottom) + ALTO_BARRA;
}
