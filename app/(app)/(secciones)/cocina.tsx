import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Grupo, Boton, Nota } from '../../../src/components/ui/Formulario';
import { AccionAviso, AvisoEscaneo } from '../../../src/components/registro/escaneo';
import { CabeceraGrupo, VacioAccion } from '../../../src/components/inventario/piezas';
import { FilaUsarPronto, RecetasProgreso, TarjetaReceta } from '../../../src/components/cocina/piezas';
import { useHogar } from '../../../src/state/HogarProvider';
import { ErrorRecetas, sugerirRecetas } from '../../../src/services/recetas';
import type { Receta } from '../../../src/services/esquemaRecetas';
import { estaPorCaducar, ordenarPorCaducidad } from '../../../src/utils/caducidad';
import { ui, spacing } from '../../../src/theme/tokens';
import { useEspacioInferior } from '../../../src/theme/navegacion';

// RF-08 / HU-04. Las recetas las genera Gemini en la ruta de servidor
// /api/recetas, que lee el inventario del hogar desde el JWT: esta pantalla
// solo pide y muestra, no manda productos ni conoce la clave.
//
// La pantalla se lee de arriba abajo como una decisión: primero qué hay que
// gastar (con su plazo, igual que en la despensa), luego el botón que pide las
// ideas, y en su lugar la espera mientras el modelo escribe. Generar tarda
// bastante y el servicio no reporta avance, así que no se dibuja una barra
// que se llene sola: se dice en qué va y cuánto suele tardar
// (components/cocina/piezas.tsx). Cuando algo falla, el mensaje del servicio
// va en una tarjeta con el reintento al lado, no en texto rojo suelto.

/** Cuántos productos por caducar se enseñan antes de pedir recetas. */
const TOPE_USAR_PRONTO = 4;

export default function Cocina() {
  const espacioInferior = useEspacioInferior();
  const router = useRouter();
  const { productos } = useHogar();
  const [cargando, setCargando] = useState(false);
  const [recetas, setRecetas] = useState<Receta[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prioridad = useMemo(
    () => productos.filter(estaPorCaducar).sort(ordenarPorCaducidad),
    [productos],
  );

  const pedirRecetas = async () => {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      const resultado = await sugerirRecetas();
      setRecetas(resultado.recetas);
      setAviso(resultado.aviso);
    } catch (e) {
      setRecetas(null);
      setError(e instanceof ErrorRecetas ? e.message : 'No se pudieron sugerir recetas. Intenta de nuevo en un momento.');
    } finally {
      setCargando(false);
    }
  };

  const pedir = () => void pedirRecetas();

  // Sin nada registrado no hay con qué cocinar: el servidor responde que la
  // despensa está vacía, así que mejor decirlo aquí con la salida a la mano.
  if (productos.length === 0) {
    return (
      <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioInferior + 110 }]}>
        <VacioAccion
          icono="olla"
          titulo="Todavía no hay nada que cocinar"
          texto="Registra lo que tengas en casa y te propongo recetas con eso, empezando por lo que caduca pronto."
          accion={{ etiqueta: 'Registrar compras', icono: 'camara', onPress: () => router.push('/producto/registrar') }}
        />
      </ScrollView>
    );
  }

  const reintentar: AccionAviso = { etiqueta: 'Reintentar', icono: 'chispas', principal: true, onPress: pedir };
  const verDespensa: AccionAviso = {
    etiqueta: 'Ver mi despensa',
    onPress: () => router.push('/inventario'),
  };
  const registrar: AccionAviso = {
    etiqueta: 'Registrar compras',
    icono: 'camara',
    onPress: () => router.push('/producto/registrar'),
  };
  // Si falta registrar productos, reintentar con lo mismo da lo mismo: la
  // salida es agregar más. En cualquier otro fallo, lo normal es reintentar.
  // ErrorRecetas solo trae el texto ya traducido, así que se reconoce por él;
  // si cambia el mensaje de 'despensa-vacia' en services/recetas.ts, aquí solo
  // se pierde el cambio de acciones, no el aviso.
  const faltanProductos = !!error && error.includes('al menos dos productos');
  const accionesError = faltanProductos ? [registrar, verDespensa] : [reintentar, registrar];

  return (
    <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioInferior + 110 }]}>
      <Text style={styles.entrada}>
        Recetas con lo que ya hay en tu despensa, empezando por lo que está por caducar.
      </Text>

      {prioridad.length > 0 && (
        <View style={styles.seccion}>
          <CabeceraGrupo
            icono="reloj"
            titulo="Conviene usar pronto"
            cuenta={prioridad.length}
            nota="Las recetas empiezan por estos productos."
          />
          <Grupo sangria={spacing.lg}>
            {prioridad.slice(0, TOPE_USAR_PRONTO).map((p) => (
              <FilaUsarPronto key={p.id} producto={p} />
            ))}
          </Grupo>
          {prioridad.length > TOPE_USAR_PRONTO && (
            <Nota>
              {prioridad.length - TOPE_USAR_PRONTO === 1
                ? 'Y 1 más en tu despensa.'
                : `Y ${prioridad.length - TOPE_USAR_PRONTO} más en tu despensa.`}
            </Nota>
          )}
        </View>
      )}

      {cargando ? (
        <RecetasProgreso />
      ) : (
        <View style={styles.seccion}>
          <Boton
            titulo={recetas?.length ? 'Sugerir otras recetas' : 'Sugerir recetas'}
            icono="chispas"
            onPress={pedir}
          />
          {!recetas && !error && (
            <Nota>Te propongo hasta tres platillos con lo que hay registrado. Tarda unos segundos.</Nota>
          )}
        </View>
      )}

      {error && (
        <AvisoEscaneo
          tono="error"
          titulo={faltanProductos ? 'Falta registrar productos' : 'No se pudieron sugerir recetas'}
          mensaje={error}
          acciones={accionesError}
        />
      )}

      {!error && recetas && recetas.length === 0 && (
        <AvisoEscaneo
          tono="aviso"
          titulo="No salieron recetas esta vez"
          mensaje={aviso ?? 'Con lo que hay registrado no se armaron platillos. Agrega algunos productos más y vuelve a intentar.'}
          acciones={[reintentar, registrar]}
        />
      )}

      {!error && recetas && recetas.length > 0 && (
        <View style={styles.seccion}>
          <CabeceraGrupo
            titulo="Ideas para hoy"
            cuenta={recetas.length}
            nota={aviso ?? undefined}
          />
          <View style={styles.recetas}>
            {recetas.map((r) => (
              <Grupo key={r.id}>
                <TarjetaReceta receta={r} porCaducar={prioridad} />
              </Grupo>
            ))}
          </View>
          <Nota>Las recetas las escribe una IA con tu inventario. Revisa las cantidades antes de cocinar.</Nota>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg, gap: spacing.xl,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  entrada: {
    fontSize: 15, lineHeight: 21, color: ui.textoSecundario,
    paddingHorizontal: spacing.lg, marginTop: spacing.xs,
  },
  seccion: { gap: spacing.sm },
  recetas: { gap: spacing.lg },
});
