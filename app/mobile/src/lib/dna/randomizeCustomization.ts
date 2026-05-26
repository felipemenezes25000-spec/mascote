/**
 * Gera uma customização random "fofa" — variações estilísticas, não deformações.
 *
 * Estratégia: triangular distribution centrada em 1.0 pros multiplicadores
 * (e em 0 pra posture). Distribuição triangular = soma de duas uniformes /2,
 * favorece o centro, tail probabilidade de extremos.
 *
 * Mascote random nunca vai ficar com olho microscópico (0.7) E cabeça
 * gigante (1.3) ao mesmo tempo — o triangular reduz probabilidade conjunta.
 *
 * Pattern e toggles são uniformes (escolha categórica).
 *
 * Determinismo: aceita seed opcional pra testes; default usa Math.random.
 */

import type { MascotCustomization } from '@/types';
import {
  clampMultiplier,
  clampPosture,
  MAX_MULT,
  MAX_POSTURE,
  MIN_MULT,
  MIN_POSTURE,
} from './customization';

const PATTERNS: ReadonlyArray<MascotCustomization['preferred_pattern']> = [
  'plain',
  'stripes',
  'spots',
  'fractal',
  'cells',
];

/**
 * PRNG mulberry32 — mesmo usado pra DNA generation. Determinístico.
 * Sem seed: cai pra Math.random.
 */
function makeRandom(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let state = (seed >>> 0) || 1;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Triangular distribution em [min, max] centrada em `mode`.
 * Resultado: média dos extremos = `mode`, variância menor que uniforme.
 */
function triangular(rnd: () => number, min: number, max: number, mode: number): number {
  const u = (rnd() + rnd()) / 2;
  // u é uniforme em [0,1] com bias pro centro 0.5.
  // Mapeia pro range pivotando no mode.
  if (u < 0.5) {
    return min + (mode - min) * (u * 2);
  }
  return mode + (max - mode) * ((u - 0.5) * 2);
}

/**
 * Pega 1 elemento aleatório com prob uniforme.
 */
function pickUniform<T>(rnd: () => number, items: ReadonlyArray<T>): T {
  const idx = Math.floor(rnd() * items.length);
  return items[Math.min(idx, items.length - 1)];
}

/**
 * Coin flip com probabilidade `p` de retornar true (default 0.5).
 */
function coinFlip(rnd: () => number, p = 0.5): boolean {
  return rnd() < p;
}

export interface RandomizeOptions {
  /** Seed opcional pra reproducibilidade em testes. */
  seed?: number;
  /** Probabilidade de cada hide-toggle. Default 0.15 (raro esconder coisa). */
  hideProbability?: number;
}

/**
 * Gera customização random pronta pra `customization.update()`.
 * Todos os valores já vêm clampados conforme regras de `customization.ts`.
 */
export function randomizeCustomization(
  user_id: string,
  options: RandomizeOptions = {},
): MascotCustomization {
  const rnd = makeRandom(options.seed);
  const hideP = options.hideProbability ?? 0.15;

  return {
    user_id,
    eye_size: clampMultiplier(triangular(rnd, MIN_MULT, MAX_MULT, 1)),
    eye_spread: clampMultiplier(triangular(rnd, MIN_MULT, MAX_MULT, 1)),
    body_height: clampMultiplier(triangular(rnd, MIN_MULT, MAX_MULT, 1)),
    body_width: clampMultiplier(triangular(rnd, MIN_MULT, MAX_MULT, 1)),
    aura_intensity: clampMultiplier(triangular(rnd, MIN_MULT, MAX_MULT, 1)),
    pattern_density: clampMultiplier(triangular(rnd, MIN_MULT, MAX_MULT, 1)),
    preferred_pattern: pickUniform(rnd, PATTERNS),
    posture_lean: clampPosture(triangular(rnd, MIN_POSTURE, MAX_POSTURE, 0)),
    force_hide_tail: coinFlip(rnd, hideP),
    force_hide_antennae: coinFlip(rnd, hideP),
    force_hide_spikes: coinFlip(rnd, hideP),
    updated_at: new Date().toISOString(),
  };
}
