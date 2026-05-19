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

export function summarize(series: number[]): SeriesStats {
  if (series.length === 0) {
    return { mean: 0, std: 0, median: 0, mad: 0, q1: 0, q3: 0, iqr: 0, n: 0 };
  }
  const sorted = [...series].sort((a, b) => a - b);
  const n = series.length;
  const mean = series.reduce((s, x) => s + x, 0) / n;
  const variance = series.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const median = sorted[Math.floor(n / 2)];
  const absDev = series.map(x => Math.abs(x - median)).sort((a, b) => a - b);
  const mad = absDev[Math.floor(n / 2)] || 1e-6;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
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
