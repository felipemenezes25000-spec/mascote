import { describe, it, expect } from 'vitest';
import { validateProceduralGenome, ProceduralGenomeValidationError } from '@/lib/procedural/schema';
import { fallbackGenome } from '@/lib/procedural/generate';

function baseGenome() {
  return fallbackGenome({
    personality: 'calmo',
    trigger: 'evolution:bebe',
    userId: 'u1',
    streak: 7,
    phase: 'bebe',
    mascotName: 'Pip',
  });
}

describe('validateProceduralGenome — happy path', () => {
  it('aceita genome do fallback', () => {
    const g = baseGenome();
    const out = validateProceduralGenome(JSON.parse(JSON.stringify(g)));
    expect(out.version).toBe(1);
    expect(out.trigger).toBe(g.trigger);
    expect(out.palette.body).toHaveLength(3);
    expect(out.marks.length).toBeLessThanOrEqual(5);
  });

  it('aceita 5 marks (limite)', () => {
    const g = baseGenome();
    g.marks = Array.from({ length: 5 }, (_, i) => ({
      kind: 'spot' as const, placement: 'cheek' as const, color: 'accent' as const, seed: i,
    }));
    const out = validateProceduralGenome(JSON.parse(JSON.stringify(g)));
    expect(out.marks).toHaveLength(5);
  });

  it('aceita userOverrides', () => {
    const g = baseGenome();
    g.userOverrides = { bodyHue: 180, markCount: 2 };
    const out = validateProceduralGenome(JSON.parse(JSON.stringify(g)));
    expect(out.userOverrides?.bodyHue).toBe(180);
  });
});

describe('validateProceduralGenome — rejeita inválidos', () => {
  it('rejeita version != 1', () => {
    expect(() => validateProceduralGenome({ ...baseGenome(), version: 2 })).toThrow(ProceduralGenomeValidationError);
  });

  it('rejeita generatedAt não-ISO', () => {
    expect(() => validateProceduralGenome({ ...baseGenome(), generatedAt: 'ontem' })).toThrow(/ISO/);
  });

  it('rejeita trigger inválido', () => {
    expect(() => validateProceduralGenome({ ...baseGenome(), trigger: 'inventado:x' })).toThrow(/trigger/);
  });

  it('rejeita HSL com h > 360', () => {
    const g = baseGenome();
    g.palette.body = [400, 50, 50];
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).toThrow(/0-360/);
  });

  it('rejeita > 5 marks', () => {
    const g = baseGenome();
    g.marks = Array.from({ length: 6 }, (_, i) => ({
      kind: 'spot' as const, placement: 'cheek' as const, color: 'accent' as const, seed: i,
    }));
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).toThrow(/máximo 5/);
  });

  it('rejeita mark.kind inválido', () => {
    const g = baseGenome();
    g.marks = [{ kind: 'invalido' as never, placement: 'cheek', color: 'accent', seed: 1 }];
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).toThrow(/kind/);
  });

  it('rejeita customSvg malicioso em accessory', () => {
    const g = baseGenome();
    g.accessories = [{ id: 'x', customSvg: '<svg><script>x</script></svg>', origin: 'evil' }];
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).toThrow(/script|SVG/);
  });

  it('rejeita story > 280 chars', () => {
    const g = baseGenome();
    g.story = 'a'.repeat(281);
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).toThrow(/280|chars/);
  });

  it('rejeita expression.mouthCurve fora de range', () => {
    const g = baseGenome();
    g.expression.mouthCurve = 5;
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).toThrow(/mouthCurve/);
  });

  it('rejeita silhouette.headRx fora de range', () => {
    const g = baseGenome();
    g.silhouette.headRx = 100;
    expect(() => validateProceduralGenome(JSON.parse(JSON.stringify(g)))).toThrow(/headRx/);
  });
});
