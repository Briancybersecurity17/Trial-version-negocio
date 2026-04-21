// ─── Formato de moneda abreviado estilo argentino ─────────────────────────────
//
// fmtMoneda(1500000)   → "$1,5M"
// fmtMoneda(250000)    → "$250K"
// fmtMoneda(1200000000)→ "$1,2B"
// fmtMoneda(9500)      → "$9.500"      (menores a 10K: formato normal)
// fmtMoneda(0)         → "$0"
//
// fmtNum(1500000)      → "1,5M"        (sin símbolo $, para cantidades)
// fmtExacto(1500000)   → "$1.500.000,00" (para tablas detalladas)

/**
 * Formatea un número como moneda abreviada estilo argentino.
 * Usar en cards de resumen, totales, dashboards.
 */
export function fmtMoneda(valor) {
  const n = Number(valor) || 0;
  const abs = Math.abs(n);
  const signo = n < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000;
    return `${signo}$${_fmt(v)}B`;
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${signo}$${_fmt(v)}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${signo}$${_fmt(v)}K`;
  }
  // Menores a 1000: sin abreviatura
  return `${signo}$${abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2).replace('.', ',')}`;
}

/**
 * Igual que fmtMoneda pero sin el símbolo $.
 * Útil para cantidades, costos unitarios en contexto.
 */
export function fmtNum(valor) {
  return fmtMoneda(valor).replace('$', '');
}

/**
 * Formato completo con separador de miles, para tablas detalladas
 * donde el usuario necesita ver el número exacto.
 * Ej: $1.500.000,00
 */
export function fmtExacto(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace('ARS', '').replace(/\s/g, '').trim();
}

// ─── Helper interno ───────────────────────────────────────────────────────────
function _fmt(v) {
  // 2 decimales significativos para evitar pérdida de precisión
  // 1.555 → "1,55"  /  1.5 → "1,5"  /  2.0 → "2"
  if (v % 1 === 0) return v.toFixed(0);
  const str = v.toFixed(2).replace('.', ',');
  return str.replace(/,?0+$/, ''); // quitar ceros finales
}
