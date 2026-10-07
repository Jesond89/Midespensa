// Mi Despensa — sistema de diseño base
// Concepto: anaqueles de despensa (papel kraft + verde hierba + ámbar de granos),
// no el "SaaS card kit" genérico. El semáforo de caducidad es información, no decoración.

export const color = {
  paper: '#F0EBDD',      // fondo general, papel kraft cálido
  surface: '#FAF7EE',    // superficie de anaqueles / inputs
  surfaceAlt: '#E9E2CE', // chips, estados inactivos
  line: '#D9D0B8',       // divisores (borde de anaquel)
  ink: '#2B2620',        // texto principal
  inkMuted: '#746B5B',   // texto secundario
  inkFaint: '#A79C86',   // placeholders

  brand: '#45664F',      // verde hierba — acciones primarias, tab activo
  brandDeep: '#2F4A38',  // estado presionado
  brandSoft: '#DCE6DC',  // fondos tenues sobre brand

  accent: '#C08A2E',     // ámbar de grano — resaltar, botón secundario

  fresco: '#3F8F5C',     // caducidad > 5 días
  porVencer: '#D9A441',  // caducidad 3–5 días
  urgente: '#C0453A',    // caducidad < 3 días

  blanco: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const;

export const radius = {
  sm: 6, md: 10, lg: 16,
} as const;

export const type = {
  display: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.2, color: color.ink },
  title:   { fontSize: 19, fontWeight: '700' as const, color: color.ink },
  label:   { fontSize: 13, fontWeight: '700' as const, color: color.inkMuted },
  body:    { fontSize: 15.5, fontWeight: '400' as const, color: color.ink, lineHeight: 21 },
  caption: { fontSize: 12.5, fontWeight: '500' as const, color: color.inkMuted },
  button:  { fontSize: 15.5, fontWeight: '700' as const, color: color.blanco },
};
