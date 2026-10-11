import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  PantallaAcceso, Grupo, Campo, Boton, Nota, useReaccionFreddy,
} from '../src/components/ui/Formulario';
import { ErrorSesion, mensajeError, useSesion } from '../src/state/SesionProvider';
import { spacing } from '../src/theme/tokens';

// Para quien entra por primera vez a un hogar que ya existe: además del
// código y la contraseña, deja su nombre para aparecer como integrante
// (HU-01, acceso compartido sin cuentas individuales).
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

  return (
    <PantallaAcceso
      titulo="Únete a un hogar"
      subtitulo="Usa el código y la contraseña que te compartió tu familia."
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
        <Nota error>{mensajeError(error.tipo, error.reintentarEn)}</Nota>
      ) : (
        <Nota>El código tiene el formato DESP-7F3K. Pídeselo a quien administra la despensa.</Nota>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Boton titulo="Unirme" deshabilitado={!valido} cargando={enviando} onPress={unirme} />
        <Boton variante="texto" titulo="Ya soy integrante, iniciar sesión" onPress={() => router.replace('/iniciar-sesion')} />
      </View>
    </PantallaAcceso>
  );
}
