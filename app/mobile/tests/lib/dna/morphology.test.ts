/**
 * Testes da derivação DNA → morfologia → paleta → mood.
 * Garante que parâmetros visuais ficam em ranges físicos sensatos
 * para qualquer DNA válido.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  bodyHex,
  accentHex,
  glowHex,
  generateGenome,
  hslToHex,
  moodLabel,
  moodScore,
  moodToLegacy,
  morphologyFromGenome,
  morphologySummary,
  paletteFromGenome,
} from '@/lib/dna';

describe('morphology — ranges físicos sensatos', () => {
  it('limbCount nunca negativo', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const m = morphologyFromGenome(generateGenome(seed));
        expect(m.limbCount).toBeGreaterThanOrEqual(0);
        expect(m.limbCount).toBeLessThanOrEqual(6);
      }),
      { numRuns: 100 },
    );
  });

  it('breathFreq sempre positivo', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const m = morphologyFromGenome(generateGenome(seed));
        expect(m.breathFreq).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('bodyHeightStretch razoável (0.5 a 2.5)', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const m = morphologyFromGenome(generateGenome(seed));
        expect(m.bodyHeightStretch).toBeGreaterThan(0.5);
        expect(m.bodyHeightStretch).toBeLessThan(2.5);
      }),
      { numRuns: 100 },
    );
  });

  it('summary não-vazio', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const s = morphologySummary(generateGenome(seed));
        expect(s.length).toBeGreaterThan(0);
        for (const item of s) expect(item.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 },
    );
  });

  it('determinismo total', () => {
    const g = generateGenome(42);
    expect(morphologyFromGenome(g)).toEqual(morphologyFromGenome(g));
  });
});

describe('palette', () => {
  it('HSL em ranges válidos', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const p = paletteFromGenome(generateGenome(seed));
        for (const [h, s, l] of [p.bodyHSL, p.accentHSL, p.glowHSL]) {
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThan(360);
          expect(s).toBeGreaterThanOrEqual(0);
          expect(s).toBeLessThanOrEqual(100);
          expect(l).toBeGreaterThanOrEqual(0);
          expect(l).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('hex conversion 24-bit', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const p = paletteFromGenome(generateGenome(seed));
        for (const fn of [bodyHex, accentHex, glowHex]) {
          const h = fn(p);
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThanOrEqual(0xffffff);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('hslToHex casos limites', () => {
    expect(hslToHex(0, 0, 0)).toBe(0x000000);
    expect(hslToHex(0, 0, 100)).toBe(0xffffff);
    expect(hslToHex(120, 100, 50)).toBe(0x00ff00);
  });
});

describe('mood', () => {
  it('score sempre em [0, 1]', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const s = moodScore(generateGenome(seed));
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });

  it('label retorna string não-vazia', () => {
    fc.assert(
      fc.property(fc.integer(), seed => {
        const l = moodLabel(generateGenome(seed));
        expect(typeof l).toBe('string');
        expect(l.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 },
    );
  });

  it('moodToLegacy retorna um dos MascotMood válidos', () => {
    const valid = ['triste','ok','feliz','empolgado','exausto'];
    fc.assert(
      fc.property(fc.integer(), seed => {
        expect(valid).toContain(moodToLegacy(generateGenome(seed)));
      }),
      { numRuns: 100 },
    );
  });
});
