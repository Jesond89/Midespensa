// Fechas como texto ISO local "AAAA-MM-DD": se guardan y comparan sin
// problemas de zona horaria y se ven igual en todos los dispositivos.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const deISO = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

export const hoyISO = () => aISO(new Date());

export function sumarDias(iso: string, dias: number) {
  const d = deISO(iso);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

/** Días desde hoy hasta la fecha (negativo si ya pasó). */
export function diasHasta(iso: string) {
  return Math.round((deISO(iso).getTime() - deISO(hoyISO()).getTime()) / 86_400_000);
}

/** "12 oct 2026" */
export function formatear(iso: string) {
  const d = deISO(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "hoy", "ayer", "hace 5 días" */
export function haceCuanto(iso: string) {
  const dias = -diasHasta(iso);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

/** Convierte "DD/MM/AAAA" a ISO; null si no es una fecha válida. */
export function desdeTexto(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m.map(Number);
  const fecha = new Date(a, mes - 1, d);
  if (fecha.getFullYear() !== a || fecha.getMonth() !== mes - 1 || fecha.getDate() !== d) return null;
  return aISO(fecha);
}

/** ISO a "DD/MM/AAAA" para editar. */
export function aTexto(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
