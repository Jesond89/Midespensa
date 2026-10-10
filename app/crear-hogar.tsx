import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  PantallaAcceso, Grupo, Campo, Boton, Nota, useReaccionFreddy,
} from '../src/components/ui/Formulario';
import { Hogar, useSesion } from '../src/state/SesionProvider';
import { ui, spacing } from '../src/theme/tokens';

// Reemplaza el "Registro" genérico de la plantilla de la materia: aquí no
// se crea una cuenta individual, se crea el hogar compartido (HU-01) y la
// contraseña con la que el resto de la familia podrá entrar.
export default function CrearHogar() {
  const router = useRouter();
  const sesion = useSesion();
  const freddy = useReaccionFreddy();
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [creado, setCreado] = useState<Hogar | null>(null);
  const [enviando, setEnviando] = useState(false);

  const claveCorta = clave.length > 0 && clave.length < 6;
  const noCoinciden = confirmar.length > 0 && confirmar !== clave;
  const valido = nombre.trim().length >= 2 && clave.length >= 6 && confirmar === clave;

  const crear = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    const hogar = await sesion.crearHogar(nombre, clave);
    freddy.celebrar(() => setCreado(hogar));
  };

  if (creado) {
    return (
      <PantallaAcceso
        titulo="Tu hogar está listo"
        subtitulo="Guarda este código. Con él y tu contraseña podrás iniciar sesión e invitar a tu familia."
        estado="feliz"
      >
        <Grupo>
          <View style={styles.codigoCaja}>
            <Text style={styles.codigoEtiqueta}>{creado.nombre}</Text>
            <Text style={styles.codigo} selectable>{creado.codigo}</Text>
          </View>
        </Grupo>
        <View style={{ marginTop: spacing.sm }}>
          <Boton titulo="Ir a mi despensa" icono="flecha-derecha" onPress={() => router.replace('/inicio')} />
        </View>
      </PantallaAcceso>
    );
  }

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
          value={nombre}
          onChangeText={setNombre}
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
          onChangeText={setClave}
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
          onChangeText={setConfirmar}
          returnKeyType="done"
          onSubmitEditing={crear}
          {...freddy.enfocar('confirmar', true)}
        />
      </Grupo>
      {noCoinciden ? (
        <Nota error>Las contraseñas no coinciden.</Nota>
      ) : (
        <Nota error={claveCorta}>Usa al menos 6 caracteres.</Nota>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Boton titulo="Crear hogar" deshabilitado={!valido} cargando={enviando} onPress={crear} />
        <Boton variante="texto" titulo="Ya tengo un hogar, iniciar sesión" onPress={() => router.replace('/iniciar-sesion')} />
      </View>
    </PantallaAcceso>
  );
}

const styles = StyleSheet.create({
  codigoCaja: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  codigoEtiqueta: { fontSize: 13, fontWeight: '500', color: ui.textoSecundario },
  codigo: { fontSize: 32, fontWeight: '700', letterSpacing: 2, color: ui.texto },
});
