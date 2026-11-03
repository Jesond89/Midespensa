import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  PantallaAcceso, Grupo, Campo, Boton, Nota, Seccion, useReaccionFreddy,
} from '../src/components/ui/Formulario';
import { AccionAviso } from '../src/components/registro/escaneo';
import { AvisoSesion, EstadoEnvio, FilaOpcion } from '../src/components/sesion/piezas';
import { ErrorSesion, useSesion } from '../src/state/SesionProvider';
import { spacing } from '../src/theme/tokens';

// Inicio de sesión de un hogar existente: código + contraseña, validados en
// el servidor (bcrypt). Tras 5 intentos fallidos el hogar se bloquea 15 min.
//
// Los tres errores que de verdad pasan aquí son código inexistente, contraseña
// incorrecta y hogar bloqueado, y cada uno tiene una salida distinta: crear un
// hogar, ver lo que se escribió, o esperar. Por eso el error va en una tarjeta
// con sus botones y no en una línea roja al pie del formulario.
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

  // Solo acciones que de verdad sirven para ese error: con el código mal, crear
  // un hogar; con la contraseña mal, ver lo que se escribió; sin conexión,
  // volver a intentar. Bloqueado no lleva ninguna: ahí toca esperar.
  const salidas = (tipo: ErrorSesion): AccionAviso[] => {
    if (tipo === 'codigo') {
      return [{ etiqueta: 'Crear un hogar', icono: 'casa', onPress: () => router.replace('/crear-hogar') }];
    }
    if (tipo === 'clave' && !freddy.claveVisible) {
      return [{ etiqueta: 'Mostrar la contraseña', icono: 'ojo', onPress: freddy.alternarClave }];
    }
    if (tipo === 'red') {
      return [{ etiqueta: 'Reintentar', icono: 'entrar', principal: true, onPress: () => void entrar() }];
    }
    return [];
  };

  return (
    <PantallaAcceso
      titulo="Inicia sesión"
      subtitulo="Entra al hogar que ya existe con su código y su contraseña."
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
        <AvisoSesion error={error.tipo} reintentarEn={error.reintentarEn} acciones={salidas(error.tipo)} />
      ) : (
        <Nota>¿Olvidaste la contraseña? Pídela a quien creó el hogar. Para probar usa DESP-7F3K y 123456.</Nota>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Boton titulo="Iniciar sesión" icono="entrar" deshabilitado={!valido} cargando={enviando} onPress={entrar} />
        {enviando && <EstadoEnvio texto="Comprobando el código y la contraseña…" />}
      </View>

      <Seccion titulo="¿Todavía no estás en un hogar?">
        <Grupo sangria={64}>
          <FilaOpcion
            icono="casa"
            titulo="Crear un hogar"
            descripcion="Eres el primero de tu familia. Recibes un código para invitarlos."
            onPress={() => router.replace('/crear-hogar')}
          />
          <FilaOpcion
            icono="persona"
            titulo="Unirme con un código"
            descripcion="Es tu primera vez en el hogar de tu familia y quieres aparecer como integrante."
            onPress={() => router.replace('/unirse-hogar')}
          />
        </Grupo>
      </Seccion>
    </PantallaAcceso>
  );
}
