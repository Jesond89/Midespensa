/** Inicial para el avatar del hogar: "Casa Pineda" → "P". */
export function inicialHogar(nombre?: string) {
  const limpio = (nombre ?? '').replace(/^(casa|hogar|familia)\s+/i, '').trim();
  return (limpio.charAt(0) || '?').toUpperCase();
}
