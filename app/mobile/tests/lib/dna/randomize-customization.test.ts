/**
 * randomizeCustomization — gera customização aleatória "fofa".
 *
 * Invariantes obrigatórias:
 *  - Determinismo com seed
 *  - Multiplicadores SEMPRE em [MIN_MULT, MAX_MULT] = [0.7, 1.3]
 *  - Posture SEMPRE em [MIN_POSTURE, MAX_POSTURE] = [-0.2, 0.2]
 *  - preferred_pattern SEMPRE em whitelist
 *  - user_id preservado
 *  - Triangular dist: média de N runs próxima do mode (1 pros multiplicadores)
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_MULT,
  MAX_POSTURE,
  MIN_MULT,
  MIN_POSTURE,
} from '@/lib/dna/customization';
import { randomizeCustomization } from '@/lib/dna/randomizeCustomization';
import type { MascotCustomization } from '@/types';

const PATTERN_WHITELIST: ReadonlyArray<MascotCustomization['preferred_pattern']> = [
  'plain',
  'stripes',
  'spots',
  'fractal',
  'cells',
];

describe('randomizeCustomization', () => {
  it('é determinístico com a mesma seed', () => {
    const a = randomizeCustomization('user-A', { seed: 42 });
    const b = randomizeCustomization('user-A', { seed: 42 });
    // updated_at usa Date.now — diferente. Resto deve bater.
    expect(a.eye_size).toBe(b.eye_size);
    expect(a.eye_spread).toBe(b.eye_spread);
    expect(a.body_height).toBe(b.body_height);
    expect(a.body_width).toBe(b.body_width);
    expect(a.aura_intensity).toBe(b.aura_intensity);
    expect(a.pattern_density).toBe(b.pattern_density);
    expect(a.preferred_pattern).toBe(b.preferred_pattern);
    expect(a.posture_lean).toBe(b.posture_lean);
    expect(a.force_hide_tail).toBe(b.force_hide_tail);
    expect(a.force_hide_antennae).toBe(b.force_hide_antennae);
    expect(a.force_hide_spikes).toBe(b.force_hide_spikes);
  });

  it('seeds diferentes produzem outputs diferentes', () => {
    const a = randomizeCustomization('user-A', { seed: 1 });
    const b = randomizeCustomization('user-A', { seed: 2 });
    // Pelo menos 1 valor numérico tem que diferir (probabilidade ~1 com 6 valores).
    const numericsDiffer =
      a.eye_size !== b.eye_size ||
      a.body_height !== b.body_height ||
      a.aura_intensity !== b.aura_intensity ||
      a.pattern_density !== b.pattern_density;
    expect(numericsDiffer).toBe(true);
  });

  it('preserva o user_id passado', () => {
    const out = randomizeCustomization('felipe-123', { seed: 7 });
    expect(out.user_id).toBe('felipe-123');
  });

  it('multiplicadores SEMPRE em [0.7, 1.3]', () => {
    // 200 seeds diferentes — qualquer leak no clamp explode aqui.
    for (let seed = 0; seed < 200; seed++) {
      const c = randomizeCustomization('u', { seed });
      const fields = [
        c.eye_size,
        c.eye_spread,
        c.body_height,
        c.body_width,
        c.aura_intensity,
        c.pattern_density,
      ];
      for (const v of fields) {
        expect(v).toBeGreaterThanOrEqual(MIN_MULT);
        expect(v).toBeLessThanOrEqual(MAX_MULT);
      }
    }
  });

  it('posture_lean SEMPRE em [-0.2, 0.2]', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = randomizeCustomization('u', { seed });
      expect(c.posture_lean).toBeGreaterThanOrEqual(MIN_POSTURE);
      expect(c.posture_lean).toBeLessThanOrEqual(MAX_POSTURE);
    }
  });

  it('preferred_pattern SEMPRE em whitelist', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = randomizeCustomization('u', { seed });
      expect(PATTERN_WHITELIST).toContain(c.preferred_pattern);
    }
  });

  it('updated_at é uma string ISO válida', () => {
    const c = randomizeCustomization('u', { seed: 1 });
    expect(typeof c.updated_at).toBe('string');
    const parsed = new Date(c.updated_at);
    expect(parsed.toString()).not.toBe('Invalid Date');
  });

  it('triangular dist: média de eye_size ≈ 1.0 em N=500 runs', () => {
    // Triangular centrada em 1.0 deve ter média próxima de 1.0.
    // Tolerância generosa: ±0.05 (suficiente pra detectar bias real).
    const N = 500;
    let sum = 0;
    for (let seed = 0; seed < N; seed++) {
      const c = randomizeCustomization('u', { seed });
      sum += c.eye_size;
    }
    const avg = sum / N;
    expect(avg).toBeGreaterThan(0.95);
    expect(avg).toBeLessThan(1.05);
  });

  it('triangular dist: posture média ≈ 0 em N=500 runs', () => {
    const N = 500;
    let sum = 0;
    for (let seed = 0; seed < N; seed++) {
      const c = randomizeCustomization('u', { seed });
      sum += c.posture_lean;
    }
    const avg = sum / N;
    expect(Math.abs(avg)).toBeLessThan(0.03);
  });

  it('hideProbability=0 nunca esconde apêndices', () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = randomizeCustomization('u', { seed, hideProbability: 0 });
      expect(c.force_hide_tail).toBe(false);
      expect(c.force_hide_antennae).toBe(false);
      expect(c.force_hide_spikes).toBe(false);
    }
  });

  it('hideProbability=1 sempre esconde apêndices', () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = randomizeCustomization('u', { seed, hideProbability: 1 });
      expect(c.force_hide_tail).toBe(true);
      expect(c.force_hide_antennae).toBe(true);
      expect(c.force_hide_spikes).toBe(true);
    }
  });

  it('sem seed: cai pra Math.random (não-determinístico) mas mantém bounds', () => {
    // Sem seed, valores podem variar entre runs — mas bounds têm que valer.
    for (let i = 0; i < 50; i++) {
      const c = randomizeCustomization('u');
      expect(c.eye_size).toBeGreaterThanOrEqual(MIN_MULT);
      expect(c.eye_size).toBeLessThanOrEqual(MAX_MULT);
      expect(PATTERN_WHITELIST).toContain(c.preferred_pattern);
    }
  });
});
