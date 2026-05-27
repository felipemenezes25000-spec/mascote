import { describe, it, expect } from 'vitest';
import { hslToHex, applyUserOverrides } from '@/lib/procedural/palette';
import { fallbackGenome } from '@/lib/procedural/generate';

describe('hslToHex', () => {
  it('converte vermelho puro', () => {
    expect(hslToHex([0, 100, 50])).toBe('#ff0000');
  });

  it('converte verde puro', () => {
    expect(hslToHex([120, 100, 50])).toBe('#00ff00');
  });

  it('converte azul puro', () => {
    expect(hslToHex([240, 100, 50])).toBe('#0000ff');
  });

  it('converte branco (l=100)', () => {
    expect(hslToHex([0, 0, 100])).toBe('#ffffff');
  });

  it('converte preto (l=0)', () => {
    expect(hslToHex([0, 0, 0])).toBe('#000000');
  });
});

describe('applyUserOverrides', () => {
  it('sem overrides, retorna idêntico', () => {
    const g = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe' });
    expect(applyUserOverrides(g)).toEqual(g);
  });

  it('override bodyHue sobrescreve só hue', () => {
    const g = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe' });
    g.userOverrides = { bodyHue: 180 };
    const out = applyUserOverrides(g);
    expect(out.palette.body[0]).toBe(180);
    expect(out.palette.body[1]).toBe(g.palette.body[1]);
  });

  it('override markCount trunca marks', () => {
    const g = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe', streak: 200 });
    g.userOverrides = { markCount: 1 };
    const out = applyUserOverrides(g);
    expect(out.marks).toHaveLength(Math.min(1, g.marks.length));
  });

  it('disabledAccessories filtra', () => {
    const g = fallbackGenome({ personality: 'calmo', trigger: 'evolution:bebe' });
    g.accessories = [
      { id: 'cap', origin: 'x' },
      { id: 'crown', origin: 'y' },
    ];
    g.userOverrides = { disabledAccessories: ['cap'] };
    const out = applyUserOverrides(g);
    expect(out.accessories.map(a => a.id)).toEqual(['crown']);
  });
});
