/**
 * K-means clustering — variante K-means++ pra init mais estável.
 *
 * Aplicação: clusterizar os DIAS do user em "tipos" (e.g. "dia produtivo",
 * "dia de pausa", "dia ansioso") com features [variety, vibe, count, hour].
 *
 * Determinístico via seed; converge em ≤30 iter pra k ≤ 8.
 */

export interface KMeansResult {
  centroids: number[][];
  /** Cluster index para cada ponto. */
  labels: number[];
  /** Inércia (soma de distâncias ao centróide) — menor = melhor. */
  inertia: number;
}

function euclid(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** K-means++ init: escolhe centróides com probabilidade ∝ distância². */
function kppInit(points: number[][], k: number, rng: () => number): number[][] {
  /* v8 ignore next — caller já filtra points.length === 0 antes de chamar
     kppInit; este guard é defensivo pra reuso futuro. */
  if (points.length === 0) return [];
  const centroids: number[][] = [];
  // primeiro: aleatório
  const first = Math.floor(rng() * points.length);
  centroids.push([...points[first]]);
  while (centroids.length < k) {
    const dists = points.map(p => {
      let min = Infinity;
      for (const c of centroids) {
        const d = euclid(p, c);
        if (d < min) min = d;
      }
      return min;
    });
    const sum = dists.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      centroids.push([...points[Math.floor(rng() * points.length)]]);
      continue;
    }
    let r = rng() * sum;
    let idx = 0;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) { idx = i; break; }
    }
    centroids.push([...points[idx]]);
  }
  return centroids;
}

export interface KMeansOptions {
  k: number;
  maxIter?: number;
  seed?: number;
}

export function kmeans(points: number[][], opts: KMeansOptions): KMeansResult {
  const { k, maxIter = 30, seed = 42 } = opts;
  if (points.length === 0 || k <= 0) {
    return { centroids: [], labels: [], inertia: 0 };
  }
  if (points.length <= k) {
    // cada ponto vira um cluster
    return {
      centroids: points.map(p => [...p]),
      labels: points.map((_, i) => i),
      inertia: 0,
    };
  }
  const rng = mulberry32(seed);
  let centroids = kppInit(points, k, rng);
  let labels = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // assign
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = euclid(points[i], centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }
    // recompute
    const dim = points[0].length;
    const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < points.length; i++) {
      const c = labels[i];
      counts[c] += 1;
      for (let d = 0; d < dim; d++) sums[c][d] += points[i][d];
    }
    const newCentroids: number[][] = [];
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) {
        // cluster vazio: re-inicializa com ponto aleatório
        newCentroids.push([...points[Math.floor(rng() * points.length)]]);
      } else {
        newCentroids.push(sums[c].map(v => v / counts[c]));
      }
    }
    centroids = newCentroids;
    if (!changed) break;
  }

  // inertia final
  let inertia = 0;
  for (let i = 0; i < points.length; i++) {
    inertia += euclid(points[i], centroids[labels[i]]);
  }
  return { centroids, labels, inertia };
}

/**
 * Escolhe k ótimo via elbow method (procura "joelho" da curva de inércia).
 * Roda kmeans pra k=2..maxK e retorna o k onde a melhoria fica < threshold.
 */
export function autoK(points: number[][], maxK = 6): number {
  if (points.length <= 2) return Math.max(1, points.length);
  const inertias: number[] = [];
  for (let k = 1; k <= Math.min(maxK, points.length); k++) {
    inertias.push(kmeans(points, { k }).inertia);
  }
  // elbow: maior queda relativa
  let bestK = 1;
  let bestDelta = 0;
  for (let k = 1; k < inertias.length; k++) {
    const delta = inertias[k - 1] - inertias[k];
    const rel = inertias[k - 1] > 0 ? delta / inertias[k - 1] : 0;
    if (rel > bestDelta) { bestDelta = rel; bestK = k + 1; }
  }
  return bestK;
}
