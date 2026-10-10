// Mi Despensa — sistema de diseño
// Estilo iOS: grises de sistema, grafito para las acciones y tarjetas blancas
// agrupadas. El color solo aparece donde informa (estado de caducidad).
// Cámbialo aquí; no repitas valores sueltos en cada pantalla.

export const ui = {
  fondo: '#F5F5F7',
  tarjeta: '#FFFFFF',
  tarjetaPresionada: '#EDEDF0',
  relleno: '#EEEEF1',        // fondos de íconos, chips inactivos
  separador: '#E3E3E8',
  texto: '#1D1D1F',
  textoSecundario: '#6E6E73',
  textoTerciario: '#AEAEB2',
  icono: '#8E8E93',
  accion: '#1D1D1F',
  accionTexto: '#FFFFFF',
  error: '#B3261E',

  // Semáforo de caducidad (RF-05 / HU-03), tonos apagados.
  fresco: '#2F7D4F',
  porVencer: '#A86A12',
  urgente: '#B3261E',
  sinFecha: '#8E8E93',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 14, xl: 20,
} as const;

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.8, color: ui.texto },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4, color: ui.texto },
  headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.3, color: ui.texto },
  body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.2, color: ui.texto, lineHeight: 23 },
  callout: { fontSize: 15, fontWeight: '400' as const, color: ui.textoSecundario, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400' as const, color: ui.textoSecundario, lineHeight: 18 },
  sectionHeader: { fontSize: 13, fontWeight: '600' as const, color: ui.textoSecundario, letterSpacing: 0.2 },
};
