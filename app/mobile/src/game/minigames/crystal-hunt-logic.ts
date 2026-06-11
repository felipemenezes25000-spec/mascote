/**
 * Lógica pura do Caça aos Cristais 💎 (jogo de memória).
 *
 * Separada da tela (app/minigames/crystal-hunt.tsx) pra ser testável sem
 * renderizar nada: deck determinístico por seed + curva de score.
 *
 * Invariantes:
 *  - buildDeck: SEMPRE 12 cartas = 6 pares; mesma seed → mesma ordem
 *    (mulberry32 + Fisher-Yates, mesmo idioma do MissionGeneratorAI).
 *  - computeScore: 1.0 com ≤6 movimentos (perfeito), 0 com ≥24, linear no
 *    meio; NaN/Infinity/negativo → 0 (estado corrompido nunca vira exploit).
 */

import { mulberry32 } from '@/lib/dna/genome';

/** Os 6 cristais do jogo — cada um aparece exatamente 2x no deck. */
export const CRYSTAL_EMOJIS = ['💎', '🔮', '💠', '🟢', '🔷', '🌟'] as const;

/** Pares no tabuleiro (grade 3×4 = 12 cartas). */
export const TOTAL_PAIRS = CRYSTAL_EMOJIS.length;

/** Movimentos do jogo perfeito (1 acerto por par) → score 1.0. */
export const PERFECT_MOVES = 6;

/** A partir daqui o score encosta no piso 0. */
export const FLOOR_MOVES = 24;

/**
 * Monta o deck embaralhado deterministicamente a partir da seed.
 * Seed inválida (NaN/Infinity) é normalizada pelo próprio mulberry32 → 0.
 */
export function buildDeck(seed: number): string[] {
  const deck: string[] = [...CRYSTAL_EMOJIS, ...CRYSTAL_EMOJIS];
  const rng = mulberry32(seed);
  // Fisher-Yates clássico, de trás pra frente — uniforme e O(n).
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = tmp;
  }
  return deck;
}

/**
 * Score normalizado 0..1 a partir do número de movimentos (pares tentados).
 * ≤6 → 1.0 · ≥24 → 0 · linear no intervalo. Entrada corrompida
 * (NaN/Infinity/negativo) → 0, espelhando a sanitização do service.
 */
export function computeScore(moves: number): number {
  if (!Number.isFinite(moves) || moves < 0) return 0;
  const m = Math.floor(moves);
  if (m <= PERFECT_MOVES) return 1;
  if (m >= FLOOR_MOVES) return 0;
  return (FLOOR_MOVES - m) / (FLOOR_MOVES - PERFECT_MOVES);
}
