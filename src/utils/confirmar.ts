import { Alert, Platform } from 'react-native';

// Diálogo de confirmación que funciona igual en móvil y en web
// (Alert.alert con botones no hace nada en react-native-web).
export function confirmar(titulo: string, mensaje: string, accion: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }
  return new Promise((resolve) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: accion, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
