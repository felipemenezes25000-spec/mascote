/**
 * Compatibilidade DNA × arquétipos.
 *
 * Cada arquétipo (lumina/terra/aqua/...) tem um perfil de pesos sobre os 11
 * genes. Calculamos o cosseno entre o vetor genoma e cada perfil, devolvendo
 * percentuais (somam 100%). Isso permite a UX de "DNA % por arquétipo" que
 * substitui a esteira fase-ovo→bebê.
 *
 * Não persiste nada — é puro cálculo. Idempotente.
 */
import type { Genome } from '@/lib/dna/genome';

export const ARCHETYPE_IDS = [
  'lumina', 'terra', 'aqua', 'vento', 'cosmos', 'flora', 'cristal', 'brasa',
] as const;

export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

export const ARCHETYPE_LABELS: Record<ArchetypeId, string> = {
  lumina: 'Lumina',
  terra: 'Terra',
  aqua: 'Aqua',
  vento: 'Vento',
  cosmos: 'Cosmos',
  flora: 'Flora',
  cristal: 'Cristal',
  brasa: 'Brasa',
};

export const ARCHETYPE_TAGLINES: Record<ArchetypeId, string> = {
  lumina: 'luz interna que floresce',
  terra: 'raízes firmes, calma sólida',
  aqua: 'fluxo gentil, adaptação',
  vento: 'leveza inquieta, curioso',
  cosmos: 'mistério, profundidade emocional',
  flora: 'cuidado vivo, ciclos',
  cristal: 'precisão, clareza',
  brasa: 'energia ativa, ímpeto',
};

/**
 * Pesos arbitrários, calibrados pra refletir a "vibe" do arquétipo. Total
 * por linha não precisa somar 1; o cosseno normaliza.
 */
const PROFILES: Record<ArchetypeId, Partial<Genome>> = {
  lumina:  { empathy: 0.9, emotionalDepth: 0.8, socialEnergy: 0.7, creativity: 0.5 },
  terra:   { resilience: 0.95, discipline: 0.85, empathy: 0.5 },
  aqua:    { adaptability: 0.9, emotionalDepth: 0.75, empathy: 0.6, chaos: 0.3 },
  vento:   { curiosity: 0.95, chaos: 0.6, socialEnergy: 0.6, adaptability: 0.4 },
  cosmos:  { intelligence: 0.9, emotionalDepth: 0.8, creativity: 0.7 },
  flora:   { empathy: 0.85, resilience: 0.7, emotionalDepth: 0.6, adaptability: 0.5 },
  cristal: { discipline: 0.9, intelligence: 0.85, creativity: 0.4 },
  brasa:   { aggression: 0.85, chaos: 0.7, socialEnergy: 0.6, resilience: 0.5 },
};

const GENOME_KEYS: ReadonlyArray<keyof Genome> = [
  'empathy', 'curiosity', 'creativity', 'discipline', 'chaos', 'aggression',
  'resilience', 'emotionalDepth', 'socialEnergy', 'adaptability', 'intelligence',
] as const;

function dot(a: number[], b: number[]): number {
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc += a[i]! * b[i]!;
  return acc;
}

function magnitude(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

function genomeVector(g: Genome): number[] {
  return GENOME_KEYS.map(k => Math.max(0, Math.min(1, g[k] ?? 0)));
}

function profileVector(p: Partial<Genome>): number[] {
  return GENOME_KEYS.map(k => p[k] ?? 0);
}

export interface ArchetypeAffinity {
  id: ArchetypeId;
  label: string;
  tagline: string;
  /** Percentual normalizado (0-1) — soma de todos os arquétipos = 1. */
  percent: number;
}

/**
 * Retorna afinidade ordenada do mais alto pro mais baixo. Top sempre é o
 * "arquétipo dominante" — usável como hero label.
 */
export function archetypeAffinities(genome: Genome): ArchetypeAffinity[] {
  const gv = genomeVector(genome);
  const gMag = magnitude(gv) || 1;
  const raw = ARCHETYPE_IDS.map(id => {
    const pv = profileVector(PROFILES[id]);
    const pMag = magnitude(pv) || 1;
    const cos = dot(gv, pv) / (gMag * pMag);
    return { id, score: Math.max(0, cos) };
  });
  const sum = raw.reduce((s, r) => s + r.score, 0) || 1;
  return raw
    .map(r => ({
      id: r.id,
      label: ARCHETYPE_LABELS[r.id],
      tagline: ARCHETYPE_TAGLINES[r.id],
      percent: r.score / sum,
    }))
    .sort((a, b) => b.percent - a.percent);
}

/**
 * Retorna apenas o arquétipo dominante. Útil pra "name livre da forma atual".
 */
export function dominantArchetype(genome: Genome): ArchetypeAffinity {
  return archetypeAffinities(genome)[0]!;
}
