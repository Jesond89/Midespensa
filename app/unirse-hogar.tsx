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

// Para quien entra por primera vez a un hogar que ya existe: además del
// código y la contraseña, deja su nombre para aparecer como integrante
// (HU-01, acceso compartido sin cuentas individuales).
//
// Es la pantalla más fácil de confundir con "Iniciar sesión", porque pide lo
// mismo más el nombre; de ahí que el subtítulo diga que es para la primera vez
// y que abajo quede a la mano la otra puerta.
export default function UnirseHogar() {
  const router = useRouter();
  const sesion = useSesion();
  const freddy = useReaccionFreddy();
  const [codigo, setCodigo] = useState('');
  const [integrante, setIntegrante] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<{ tipo: ErrorSesion; reintentarEn?: number } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const valido = codigo.trim().length >= 4 && integrante.trim().length >= 2 && clave.length >= 6;
  const textoEnFoco = freddy.focoId === 'integrante' ? integrante : codigo;

  const unirme = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    const r = await sesion.unirse(codigo, clave, integrante);
    if (r.ok) {
      freddy.celebrar(() => router.replace('/inicio'));
      return;
    }
    setEnviando(false);
    setError({ tipo: r.error, reintentarEn: r.reintentarEn });
    freddy.confundir();
  };

  // Las mismas salidas que en iniciar sesión, con una diferencia: aquí el
  // código lo escribió otra persona, así que lo primero es volver a pedírselo.
  const salidas = (tipo: ErrorSesion): AccionAviso[] => {
    if (tipo === 'clave' && !freddy.claveVisible) {
      return [{ etiqueta: 'Mostrar la contraseña', icono: 'ojo', onPress: freddy.alternarClave }];
    }
    if (tipo === 'red') {
      return [{ etiqueta: 'Reintentar', icono: 'entrar', principal: true, onPress: () => void unirme() }];
    }
    if (tipo === 'codigo') {
      return [{ etiqueta: 'Crear un hogar', icono: 'casa', onPress: () => router.replace('/crear-hogar') }];
    }
    return [];
  };

  return (
    <PantallaAcceso
      titulo="Únete a un hogar"
      subtitulo="Es tu primera vez aquí: usa el código y la contraseña que te compartió tu familia, y tu nombre quedará como integrante."
      estado={freddy.estado}
      progreso={textoEnFoco.length / 14}
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
          icono="persona"
          placeholder="Tu nombre"
          autoCapitalize="words"
          maxLength={40}
          value={integrante}
          onChangeText={setIntegrante}
          returnKeyType="next"
          {...freddy.enfocar('integrante')}
        />
        <Campo
          icono="candado"
          placeholder="Contraseña del hogar"
          clave
          claveVisible={freddy.claveVisible}
          onAlternarClave={freddy.alternarClave}
          autoCapitalize="none"
          value={clave}
          onChangeText={(t) => { setClave(t); setError(null); }}
          returnKeyType="go"
          onSubmitEditing={unirme}
          {...freddy.enfocar('clave', true)}
        />
      </Grupo>
      {error ? (
        <AvisoSesion error={error.tipo} reintentarEn={error.reintentarEn} acciones={salidas(error.tipo)} />
      ) : (
        <Nota>El código tiene el formato DESP-7F3K. Pídeselo a quien administra la despensa.</Nota>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Boton titulo="Unirme" icono="entrar" deshabilitado={!valido} cargando={enviando} onPress={unirme} />
        {enviando && <EstadoEnvio texto="Comprobando el código y la contraseña…" />}
      </View>

      <Seccion titulo="¿No era esto?">
        <Grupo sangria={64}>
          <FilaOpcion
            icono="entrar"
            titulo="Iniciar sesión"
            descripcion="Ya habías entrado antes a este hogar en este u otro teléfono."
            onPress={() => router.replace('/iniciar-sesion')}
          />
          <FilaOpcion
            icono="casa"
            titulo="Crear un hogar"
            descripcion="Nadie de tu familia lo ha creado todavía y no tienes ningún código."
            onPress={() => router.replace('/crear-hogar')}
          />
        </Grupo>
      </Seccion>
    </PantallaAcceso>
  );
}
