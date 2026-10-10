import React, { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Freddy } from '../avatar/Freddy';
import { Burbuja } from './Burbuja';
import { ChatFreddy } from '../chat/ChatFreddy';
import { TEMAS, temaDeRuta } from '../../chat/temas';
import { useEspacioBarra } from '../../theme/navegacion';

// Freddy pequeño en la esquina inferior derecha de las pantallas internas.
// Al entrar a cada pantalla saluda unos segundos con una burbuja propia de
// esa sección; tocarlo a él o a la burbuja abre el chat de esa sección.
// No aparece en el inicio (ahí está grande) ni en el formulario de producto.

const ND = Platform.OS !== 'web';
const OCULTO_EN = ['/inicio', '/producto/nuevo'];
// Pantallas con barra inferior: Freddy se sube para no taparla.
const CON_BARRA = ['/inventario', '/faltantes', '/cocina', '/perfil'];

export function FreddyAyudante() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const espacioBarra = useEspacioBarra();
  // Ruta en la que la burbuja ya se ocultó; al cambiar de pantalla vuelve a salir.
  const [ocultaEn, setOcultaEn] = useState<string | null>(null);
  const [chat, setChat] = useState(false);
  const burbuja = ocultaEn !== pathname && !chat;
  const tema = temaDeRuta(pathname);
  const [aparicion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const t = setTimeout(() => setOcultaEn(pathname), 6000);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    Animated.spring(aparicion, { toValue: burbuja ? 1 : 0, friction: 7, tension: 80, useNativeDriver: ND }).start();
  }, [burbuja, aparicion]);

  if (OCULTO_EN.some((ruta) => pathname.startsWith(ruta))) return null;

  const abrirChat = () => {
    setOcultaEn(pathname);
    setChat(true);
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.esquina, { bottom: CON_BARRA.includes(pathname) ? espacioBarra + 8 : insets.bottom + 8 }]}
      >
        <Animated.View
          pointerEvents={burbuja ? 'auto' : 'none'}
          style={{
            opacity: aparicion,
            transform: [
              { translateY: aparicion.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              { scale: aparicion.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            ],
          }}
        >
          <Pressable onPress={abrirChat} accessibilityRole="button" accessibilityLabel="Platicar con Freddy">
            <Burbuja texto={TEMAS[tema].saludo} accion="Hazme clic y platicamos" cola="derecha" />
          </Pressable>
        </Animated.View>
        <Pressable
          onPress={abrirChat}
          accessibilityRole="button"
          accessibilityLabel="Freddy, tu asistente. Toca para platicar"
          style={styles.freddy}
        >
          <Freddy size={92} />
        </Pressable>
      </View>
      <ChatFreddy visible={chat} tema={tema} onCerrar={() => setChat(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  esquina: { position: 'absolute', right: 12, alignItems: 'flex-end' },
  freddy: { marginRight: 4 },
});
