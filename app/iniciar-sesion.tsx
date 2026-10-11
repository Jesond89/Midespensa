import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  PantallaAcceso, Grupo, Campo, Boton, Nota, useReaccionFreddy,
} from '../src/components/ui/Formulario';
import { ErrorSesion, mensajeError, useSesion } from '../src/state/SesionProvider';
import { spacing } from '../src/theme/tokens';

// Inicio de sesión de un hogar existente: código + contraseña, validados en
// el servidor (bcrypt). Tras 5 intentos fallidos el hogar se bloquea 15 min.
export default function IniciarSesion() {
  const router = useRouter();
  const sesion = useSesion();
  const freddy = useReaccionFreddy();
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<{ tipo: ErrorSesion; reintentarEn?: number } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const valido = codigo.trim().length >= 4 && clave.length >= 6;

  const entrar = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    const r = await sesion.iniciarSesion(codigo, clave);
    if (r.ok) {
      freddy.celebrar(() => router.replace('/inicio'));
      return;
    }
    setEnviando(false);
    setError({ tipo: r.error, reintentarEn: r.reintentarEn });
    freddy.confundir();
  };

  return (
    <PantallaAcceso
      titulo="Inicia sesión"
      subtitulo="Entra a tu hogar con su código y contraseña."
      estado={freddy.estado}
      progreso={codigo.length / 10}
    >
      <Grupo>
        <Campo
          icono="llave"
          placeholder="Código del hogar"
          autoCapitalize="characters"
          maxLength={12}
          value={codigo}
          onChangeText={(t) => { setCodigo(t); setError(null); }}
          returnKeyType="next"
          {...freddy.enfocar('codigo')}
        />
        <Campo
          icono="candado"
          placeholder="Contraseña"
          clave
          claveVisible={freddy.claveVisible}
          onAlternarClave={freddy.alternarClave}
          autoCapitalize="none"
          value={clave}
          onChangeText={(t) => { setClave(t); setError(null); }}
          returnKeyType="go"
          onSubmitEditing={entrar}
          {...freddy.enfocar('clave', true)}
        />
      </Grupo>
      {error ? (
        <Nota error>{mensajeError(error.tipo, error.reintentarEn)}</Nota>
      ) : (
        <Nota>¿Olvidaste la contraseña? Pídela a quien creó el hogar. Para probar usa DESP-7F3K y 123456.</Nota>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Boton titulo="Iniciar sesión" icono="entrar" deshabilitado={!valido} cargando={enviando} onPress={entrar} />
        <Boton variante="texto" titulo="¿No tienes un hogar? Crea uno" onPress={() => router.replace('/crear-hogar')} />
      </View>
    </PantallaAcceso>
  );
}
