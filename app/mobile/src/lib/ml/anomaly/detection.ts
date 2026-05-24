/**
 * Anomaly detection univariada e multivariada.
 *
 * Aplicação: detectar dias atípicos — mudança brusca de padrão (queda
 * abrupta de check-ins, vibe muito fora da média, etc).
 *
 * Z-score: simples, assume distribuição ~normal.
 * MAD (Median Absolute Deviation): robusto a outliers no histórico.
 * IQR (Interquartile Range): detecta outliers sem assumir distribuição.
 */

export interface SeriesStats {
  mean: number;
  std: number;
  median: number;
  mad: number;
  q1: number;
  q3: number;
  iqr: number;
  n: number;
}

/**
 * Quantil linear-interpolado (estilo numpy "linear"). Para n par, mediana é
 * a média dos dois centrais — `Math.floor(n/2)` sozinho dava o índice errado
 * e enviesava IQR/MAD em amostras pequenas (que é o caso típico aqui).
 */
function quantileSorted(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const idx = (n - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export function summarize(series: number[]): SeriesStats {
  if (series.length === 0) {
    return { mean: 0, std: 0, median: 0, mad: 0, q1: 0, q3: 0, iqr: 0, n: 0 };
  }
  const sorted = [...series].sort((a, b) => a - b);
  const n = series.length;
  const mean = series.reduce((s, x) => s + x, 0) / n;
  const variance = series.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const median = quantileSorted(sorted, 0.5);
  const absDev = series.map(x => Math.abs(x - median)).sort((a, b) => a - b);
  // `|| 1e-6` mantido pra evitar divisão por zero em robustZScore quando a
  // amostra é constante.
  const mad = quantileSorted(absDev, 0.5) || 1e-6;
  const q1 = quantileSorted(sorted, 0.25);
  const q3 = quantileSorted(sorted, 0.75);
  return { mean, std, median, mad, q1, q3, iqr: q3 - q1, n };
}

/** Z-score robusto: usa MAD (mais resistente a outliers que std). */
export function robustZScore(value: number, stats: SeriesStats): number {
  if (stats.mad === 0) return 0;
  return (0.6745 * (value - stats.median)) / stats.mad;
}

/** Classifica um valor: |z| > 2.5 ⇒ outlier; > 3.5 ⇒ outlier forte. */
export function anomalyLevel(value: number, stats: SeriesStats): 'normal' | 'mild' | 'strong' {
  if (stats.n < 5) return 'normal'; // amostra insuficiente
  const z = Math.abs(robustZScore(value, stats));
  if (z > 3.5) return 'strong';
  if (z > 2.5) return 'mild';
  return 'normal';
}

/** IQR-based: classic outlier rule (1.5×IQR fences). */
export function iqrOutlier(value: number, stats: SeriesStats): 'normal' | 'low' | 'high' {
  if (stats.n < 4) return 'normal';
  const low = stats.q1 - 1.5 * stats.iqr;
  const high = stats.q3 + 1.5 * stats.iqr;
  if (value < low) return 'low';
  if (value > high) return 'high';
  return 'normal';
}

/**
 * Detecção em série temporal: retorna índices dos pontos anômalos.
 * Usa janela móvel pra evitar mascarar drift gradual como anomalia.
 */
export function detectAnomaliesInSeries(
  series: number[],
  windowSize = 7
): Array<{ index: number; value: number; level: 'mild' | 'strong' }> {
  const out: Array<{ index: number; value: number; level: 'mild' | 'strong' }> = [];
  for (let i = windowSize; i < series.length; i++) {
    const window = series.slice(Math.max(0, i - windowSize), i);
    const stats = summarize(window);
    const level = anomalyLevel(series[i], stats);
    if (level !== 'normal') out.push({ index: i, value: series[i], level });
  }
  return out;
}
