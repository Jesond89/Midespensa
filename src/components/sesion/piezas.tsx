import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../ui/Icono';
import { IconoCuadro } from '../ui/Lista';
import { AccionAviso, AvisoEscaneo } from '../registro/escaneo';
import { ErrorSesion, mensajeError } from '../../state/SesionProvider';
import { ui, spacing } from '../../theme/tokens';

// Piezas de las cuatro pantallas de acceso (bienvenida, crear hogar, iniciar
// sesión y unirse). Aquí vive solo cómo se ve lo que esas pantallas ya saben;
// la sesión sigue en state/SesionProvider.
//
// Lo que más estorba al llegar por primera vez es no saber si hay que crear un
// hogar o unirse a uno, así que esa decisión no se deja en el nombre del botón:
// cada camino es una fila que dice para quién es. Y cuando algo falla, el
// mensaje va en una tarjeta con la salida al lado —ver la contraseña, crear un
// hogar, reintentar— en vez de una línea roja debajo del formulario.

// ——— Elegir camino ———

/**
 * Un camino de acceso: el ícono, qué es y para quién. La descripción es la
 * mitad útil de la fila, así que no se recorta a una palabra.
 */
export function FilaOpcion({ icono, titulo, descripcion, onPress }: {
  icono: NombreIcono; titulo: string; descripcion: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${descripcion}`}
      style={({ pressed }) => [styles.opcion, pressed && styles.opcionPresionada]}
    >
      <IconoCuadro icono={icono} />
      <View style={styles.opcionTextos}>
        <Text style={styles.opcionTitulo}>{titulo}</Text>
        <Text style={styles.opcionDescripcion}>{descripcion}</Text>
      </View>
      <Icono nombre="chevron" tamano={14} color={ui.textoTerciario} />
    </Pressable>
  );
}

// ——— Cuando el acceso falla ———

// Un título corto por error para que se vea de un tirón qué pasó; el detalle
// (los minutos del bloqueo, por ejemplo) lo sigue escribiendo mensajeError,
// que es quien conoce los errores que de verdad devuelve el servidor.
const TITULOS: Record<ErrorSesion, string> = {
  codigo: 'Ese código no existe',
  clave: 'Revisa la contraseña',
  nombre: 'Revisa el nombre del hogar',
  bloqueado: 'Demasiados intentos',
  servidor: 'El servidor no está listo',
  red: 'Sin conexión',
};

/**
 * El error del servidor con sus salidas. `mensaje` solo se usa donde el texto
 * general no aplica (en "Crear hogar" el error 'clave' es que la contraseña no
 * sirve, no que esté equivocada).
 */
export function AvisoSesion({ error, reintentarEn, mensaje, acciones }: {
  error: ErrorSesion;
  reintentarEn?: number;
  mensaje?: string;
  acciones?: AccionAviso[];
}) {
  return (
    <AvisoEscaneo
      tono={error === 'bloqueado' ? 'aviso' : 'error'}
      titulo={TITULOS[error]}
      mensaje={mensaje ?? mensajeError(error, reintentarEn)}
      acciones={acciones}
    />
  );
}

// ——— Mientras el servidor responde ———

/**
 * El botón ya gira, pero no dice qué está pasando: esta línea sí, y además la
 * anuncia el lector de pantalla. Comprobar la contraseña se hace en el
 * servidor y a veces tarda.
 */
export function EstadoEnvio({ texto }: { texto: string }) {
  return (
    <View style={styles.envio} accessible accessibilityLiveRegion="polite" accessibilityLabel={texto}>
      <ActivityIndicator size="small" color={ui.icono} />
      <Text style={styles.envioTexto}>{texto}</Text>
    </View>
  );
}

// ——— El código del hogar recién creado ———

/**
 * El código es lo único que no se puede recuperar solo, así que se enseña
 * grande, separado en dos mitades para dictarlo sin equivocarse, y se puede
 * seleccionar para copiarlo.
 */
export function CodigoHogar({ nombre, codigo }: { nombre: string; codigo: string }) {
  return (
    <View
      style={styles.codigoCaja}
      accessible
      accessibilityLabel={`Código de ${nombre}: ${codigo.split('').join(' ')}`}
    >
      <Text style={styles.codigoEtiqueta}>{nombre}</Text>
      <Text style={styles.codigo} selectable>{codigo}</Text>
      <Text style={styles.codigoNota}>Anótalo o tómale una captura: se pide cada vez que alguien entra.</Text>
    </View>
  );
}

/** Invitar sí es una secuencia, así que va numerada. */
export function PasosInvitar({ pasos }: { pasos: string[] }) {
  return (
    <View style={styles.pasos}>
      {pasos.map((paso, i) => (
        <View key={i} style={styles.paso} accessible accessibilityLabel={`Paso ${i + 1}. ${paso}`}>
          <View style={styles.pasoNumero}>
            <Text style={styles.pasoNumeroTexto}>{i + 1}</Text>
          </View>
          <Text style={styles.pasoTexto}>{paso}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 66,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: ui.tarjeta,
  },
  opcionPresionada: { backgroundColor: ui.tarjetaPresionada },
  opcionTextos: { flex: 1, gap: 2 },
  opcionTitulo: { fontSize: 16, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  opcionDescripcion: { fontSize: 13, color: ui.textoSecundario, lineHeight: 18 },

  envio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 22 },
  envioTexto: { fontSize: 13, color: ui.textoSecundario },

  codigoCaja: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.xs },
  codigoEtiqueta: { fontSize: 13, fontWeight: '500', color: ui.textoSecundario },
  codigo: { fontSize: 32, fontWeight: '700', letterSpacing: 2, color: ui.texto },
  codigoNota: {
    fontSize: 13, color: ui.textoSecundario, lineHeight: 18, textAlign: 'center',
    marginTop: spacing.xs, maxWidth: 280,
  },

  pasos: { gap: spacing.md, padding: spacing.lg },
  paso: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pasoNumero: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: ui.relleno,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  pasoNumeroTexto: { fontSize: 12, fontWeight: '700', color: ui.textoSecundario },
  pasoTexto: { flex: 1, fontSize: 15, lineHeight: 21, color: ui.texto },
});
