import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  PantallaAcceso, Grupo, Campo, Boton, Nota, Seccion, useReaccionFreddy,
} from '../src/components/ui/Formulario';
import { AccionAviso } from '../src/components/registro/escaneo';
import { AvisoSesion, CodigoHogar, EstadoEnvio, FilaOpcion, PasosInvitar } from '../src/components/sesion/piezas';
import { ErrorSesion, Hogar, useSesion } from '../src/state/SesionProvider';
import { spacing } from '../src/theme/tokens';

// Reemplaza el "Registro" genérico de la plantilla de la materia: aquí no
// se crea una cuenta individual, se crea el hogar compartido (HU-01) y la
// contraseña con la que el resto de la familia podrá entrar.
//
// Al terminar, lo único que no se puede recuperar solo es el código, así que la
// pantalla de confirmación no se queda en "listo": enseña el código y los tres
// pasos para invitar, que es lo que sigue.

// En "Crear hogar" el error 'clave' viene de la base por contraseña inservible
// (menos de 6 caracteres o pasada de larga), no por contraseña equivocada, así
// que el texto general de mensajeError() no aplica.
const CLAVE_NO_SIRVE = 'Usa una contraseña de al menos 6 caracteres y no más de 72.';

export default function CrearHogar() {
  const router = useRouter();
  const sesion = useSesion();
  const freddy = useReaccionFreddy();
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [creado, setCreado] = useState<Hogar | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ tipo: ErrorSesion; reintentarEn?: number } | null>(null);

  const claveCorta = clave.length > 0 && clave.length < 6;
  const noCoinciden = confirmar.length > 0 && confirmar !== clave;
  const valido = nombre.trim().length >= 2 && clave.length >= 6 && confirmar === clave;

  const crear = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    const r = await sesion.crearHogar(nombre, clave);
    if (!r.ok) {
      setEnviando(false);
      setError({ tipo: r.error, reintentarEn: r.reintentarEn });
      freddy.confundir();
      return;
    }
    freddy.celebrar(() => setCreado(r.hogar));
  };

  if (creado) {
    return (
      <PantallaAcceso
        titulo="Tu hogar está listo"
        subtitulo="Este es el código de tu hogar. Con él y tu contraseña entra toda tu familia."
        estado="feliz"
      >
        <Grupo>
          <CodigoHogar nombre={creado.nombre} codigo={creado.codigo} />
        </Grupo>

        <Seccion titulo="Cómo invitar a tu familia">
          <Grupo>
            <PasosInvitar
              pasos={[
                `Comparte el código ${creado.codigo} y la contraseña con quien vive contigo.`,
                'Cada quien abre Mi Despensa y toca “Unirme a un hogar”.',
                'Escriben el código, su nombre y la contraseña, y ya ven la misma despensa.',
              ]}
            />
          </Grupo>
        </Seccion>

        <View style={{ marginTop: spacing.sm }}>
          <Boton titulo="Ir a mi despensa" icono="flecha-derecha" onPress={() => router.replace('/inicio')} />
        </View>
      </PantallaAcceso>
    );
  }

  // Sin conexión lo único que ayuda es volver a intentar; un nombre o una
  // contraseña que no sirven se arreglan en el campo, no con un botón.
  const salidas = (tipo: ErrorSesion): AccionAviso[] =>
    tipo === 'red' ? [{ etiqueta: 'Reintentar', icono: 'mas', principal: true, onPress: () => void crear() }] : [];

  return (
    <PantallaAcceso
      titulo="Crea tu hogar"
      subtitulo="Recibirás un código para compartir con tu familia. Nadie necesita crear una cuenta."
      estado={freddy.estado}
      progreso={nombre.length / 22}
    >
      <Grupo>
        <Campo
          icono="casa"
          placeholder="Nombre del hogar"
          autoCapitalize="words"
          maxLength={60}
          value={nombre}
          onChangeText={(t) => { setNombre(t); setError(null); }}
          returnKeyType="next"
          {...freddy.enfocar('nombre')}
        />
      </Grupo>

      <Grupo>
        <Campo
          icono="candado"
          placeholder="Contraseña"
          clave
          claveVisible={freddy.claveVisible}
          onAlternarClave={freddy.alternarClave}
          autoCapitalize="none"
          value={clave}
          onChangeText={(t) => { setClave(t); setError(null); }}
          returnKeyType="next"
          {...freddy.enfocar('clave', true)}
        />
        <Campo
          icono="escudo"
          placeholder="Confirmar contraseña"
          clave
          claveVisible={freddy.claveVisible}
          onAlternarClave={freddy.alternarClave}
          autoCapitalize="none"
          value={confirmar}
          onChangeText={(t) => { setConfirmar(t); setError(null); }}
          returnKeyType="done"
          onSubmitEditing={crear}
          {...freddy.enfocar('confirmar', true)}
        />
      </Grupo>
      {error ? (
        <AvisoSesion
          error={error.tipo}
          reintentarEn={error.reintentarEn}
          mensaje={error.tipo === 'clave' ? CLAVE_NO_SIRVE : undefined}
          acciones={salidas(error.tipo)}
        />
      ) : noCoinciden ? (
        <Nota error>Las contraseñas no coinciden.</Nota>
      ) : (
        <Nota error={claveCorta}>
          Usa al menos 6 caracteres. La compartirás con tu familia, así que no uses una tuya de siempre.
        </Nota>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Boton titulo="Crear hogar" deshabilitado={!valido} cargando={enviando} onPress={crear} />
        {enviando && <EstadoEnvio texto="Creando tu hogar y su código…" />}
      </View>

      <Seccion titulo="¿Tu familia ya tiene uno?">
        <Grupo sangria={64}>
          <FilaOpcion
            icono="persona"
            titulo="Unirme con un código"
            descripcion="Te compartieron un código como DESP-7F3K y entras por primera vez."
            onPress={() => router.replace('/unirse-hogar')}
          />
          <FilaOpcion
            icono="entrar"
            titulo="Iniciar sesión"
            descripcion="Ya habías entrado antes al hogar de tu familia."
            onPress={() => router.replace('/iniciar-sesion')}
          />
        </Grupo>
      </Seccion>
    </PantallaAcceso>
  );
}
