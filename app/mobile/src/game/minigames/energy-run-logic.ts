/**
 * Lógica pura do minigame "Corrida de Energia" (⚡) — separada da tela
 * pra ser testável e determinística (mulberry32, mesmo idioma do
 * MissionGeneratorAI). A tela só consome o cronograma e o score.
 */

import { mulberry32 } from '@/lib/dna/genome';

/** Duração total da partida. */
export const ROUND_MS = 30_000;
/** Total de itens spawnados numa partida. */
export const SPAWN_COUNT = 24;
/** Itens BONS por partida (~70% de 24). */
export const GOOD_COUNT = 17;
/** Quanto tempo cada item fica na tela antes de sumir sozinho. */
export const ITEM_LIFE_MS = 1600;
/** Respiro inicial antes do primeiro spawn (player se orienta). */
const FIRST_SPAWN_MS = 500;

export type SpawnKind =
  | 'gota'
  | 'estrela'
  | 'fruta'
  | 'energia'
  | 'desanimo'
  | 'cansaco';

export interface SpawnItem {
  id: number;
  /** Momento do spawn, em ms desde o início da partida. */
  atMs: number;
  /** Tempo de vida em ms — depois disso o item some sem punição. */
  lifeMs: number;
  good: boolean;
  kind: SpawnKind;
  emoji: string;
  /** Posição na área de jogo, em fração 0..1 (a tela converte pra px). */
  x: number;
  y: number;
}

const GOOD_KINDS: ReadonlyArray<{ kind: SpawnKind; emoji: string }> = [
  { kind: 'gota', emoji: '💧' },
  { kind: 'estrela', emoji: '⭐' },
  { kind: 'fruta', emoji: '🍎' },
  { kind: 'energia', emoji: '✨' },
];

const BAD_KINDS: ReadonlyArray<{ kind: SpawnKind; emoji: string }> = [
  { kind: 'desanimo', emoji: '🌫️' },
  { kind: 'cansaco', emoji: '😴' },
];

/**
 * Gera o cronograma completo da partida, determinístico por seed.
 *
 * - Proporção de bons é GARANTIDA (17/24), não probabilística: sortear
 *   `rng() < 0.7` por item podia render partida quase sem bons em seeds
 *   azarados, quebrando o denominador do score.
 * - Último item sempre some ANTES do fim dos 30s (atMs + lifeMs <= ROUND_MS),
 *   pra nenhum item "morrer" junto com o timer sem chance de tap.
 */
export function buildSpawnSchedule(seed: number): SpawnItem[] {
  const rng = mulberry32(seed);

  // 17 bons + 7 ruins embaralhados na ordem (Fisher-Yates determinístico).
  const flags: boolean[] = Array.from(
    { length: SPAWN_COUNT },
    (_, i) => i < GOOD_COUNT,
  );
  for (let i = flags.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [flags[i], flags[j]] = [flags[j]!, flags[i]!];
  }

  // Janela útil de spawn: cada item ganha um slot fixo + jitter de meio slot,
  // então a ordem temporal nunca inverte e o ritmo fica orgânico.
  const window = ROUND_MS - ITEM_LIFE_MS - FIRST_SPAWN_MS;
  const slot = window / SPAWN_COUNT;

  let prevX = 0.5;
  let prevY = 0.5;
  return flags.map((good, i) => {
    const atMs = Math.round(FIRST_SPAWN_MS + i * slot + rng() * slot * 0.5);
    const pool = good ? GOOD_KINDS : BAD_KINDS;
    const pick = pool[Math.floor(rng() * pool.length)]!;
    let x = rng();
    let y = rng();
    // Evita nascer colado no item anterior (tap fantasma em itens sobrepostos)
    // — um re-roll só, ainda função pura do seed.
    if (Math.abs(x - prevX) + Math.abs(y - prevY) < 0.18) {
      x = rng();
      y = rng();
    }
    prevX = x;
    prevY = y;
    return {
      id: i,
      atMs,
      lifeMs: ITEM_LIFE_MS,
      good,
      kind: pick.kind,
      emoji: pick.emoji,
      x,
      y,
    };
  });
}

/**
 * Score normalizado 0..1 pro completeMinigame: bons coletados / bons totais.
 * Defensivo contra NaN/Infinity e divisão por zero (total 0 → 0, sem poison).
 */
export function computeScore(goodCollected: number, goodTotal: number): number {
  if (!Number.isFinite(goodCollected) || !Number.isFinite(goodTotal)) return 0;
  if (goodTotal <= 0) return 0;
  return Math.max(0, Math.min(1, goodCollected / goodTotal));
}
