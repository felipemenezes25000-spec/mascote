/**
 * Tests for blendN — composição de N presets com pesos.
 */

import { describe, expect, it } from 'vitest';
import { THEME_PRESETS, blendN } from '@/lib/dna/themePresets';

describe('blendN', () => {
  it('zero slots devolve default neutro', () => {
    const out = blendN([]);
    expect(out.eye_size).toBe(1);
    expect(out.aura_intensity).toBe(1);
    expect(out.preferred_pattern).toBe('plain');
  });

  it('1 slot devolve patch do preset', () => {
    const robust = THEME_PRESETS.find(p => p.id === 'robust');
    expect(robust).toBeDefined();
    if (!robust) return;
    const out = blendN([{ preset: robust, weight: 1 }]);
    expect(out.eye_size).toBeCloseTo(robust.patch.eye_size ?? 1, 5);
    expect(out.preferred_pattern).toBe(robust.patch.preferred_pattern);
  });

  it('pesos > 1 sao normalizados', () => {
    const robust = THEME_PRESETS.find(p => p.id === 'robust')!;
    const mystic = THEME_PRESETS.find(p => p.id === 'mystic')!;
    const aOut = blendN([
      { preset: robust, weight: 2 },
      { preset: mystic, weight: 2 },
    ]);
    const bOut = blendN([
      { preset: robust, weight: 0.5 },
      { preset: mystic, weight: 0.5 },
    ]);
    expect(aOut.eye_size).toBeCloseTo(bOut.eye_size, 5);
    expect(aOut.aura_intensity).toBeCloseTo(bOut.aura_intensity, 5);
  });

  it('peso zero remove slot do mix', () => {
    const robust = THEME_PRESETS.find(p => p.id === 'robust')!;
    const mystic = THEME_PRESETS.find(p => p.id === 'mystic')!;
    const onlyRobust = blendN([
      { preset: robust, weight: 1 },
      { preset: mystic, weight: 0 },
    ]);
    expect(onlyRobust.eye_size).toBeCloseTo(robust.patch.eye_size ?? 1, 5);
  });

  it('eh deterministico', () => {
    const slots = THEME_PRESETS.slice(0, 3).map((p, i) => ({
      preset: p,
      weight: 0.3 + i * 0.1,
    }));
    const a = blendN(slots);
    const b = blendN(slots);
    expect(a).toEqual(b);
  });

  it('categorico vai pro slot de maior peso', () => {
    const robust = THEME_PRESETS.find(p => p.id === 'robust')!;
    const mystic = THEME_PRESETS.find(p => p.id === 'mystic')!;
    const out = blendN([
      { preset: robust, weight: 0.1 },
      { preset: mystic, weight: 0.9 },
    ]);
    expect(out.preferred_pattern).toBe(mystic.patch.preferred_pattern);
  });

  it('3 presets nao explode', () => {
    const first3 = THEME_PRESETS.slice(0, 3);
    const out = blendN(first3.map(p => ({ preset: p, weight: 1 / 3 })));
    expect(out.eye_size).toBeGreaterThan(0);
    expect(out.eye_size).toBeLessThan(2);
  });

  it('5 slots dentro de bounds razoaveis', () => {
    const slots = THEME_PRESETS.slice(0, 5).map(p => ({
      preset: p,
      weight: 0.2,
    }));
    const out = blendN(slots);
    expect(out.eye_size).toBeGreaterThan(0);
    expect(out.eye_size).toBeLessThan(3);
    expect(out.body_width).toBeGreaterThan(0);
    expect(out.body_width).toBeLessThan(3);
  });
});
