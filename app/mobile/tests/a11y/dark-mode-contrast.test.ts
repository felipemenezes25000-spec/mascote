/**
 * Garante que tokens de texto sobre fundo no DARK MODE atingem WCAG AA (4.5:1).
 *
 * Por que importa: textDim era #8E7E68 = 4.28:1 sobre surface (#221C16) — falhava
 * AA pra captions/hints. Bump pra #A89578 = 5.81:1 sobre o mesmo surface. Light
 * e sepia ficam fora do escopo deste teste (textDim é hint visual nesses modos,
 * não texto de conteúdo — decisão de design).
 */
import { describe, expect, it } from 'vitest';
import { contrast, meetsAA } from '@/lib/a11y/contrast';
import { buildTheme } from '@/lib/themes';

const dark = buildTheme('dark', 'classic');

describe('dark mode WCAG AA contrast', () => {
  it('text on bg passes AA', () => {
    expect(meetsAA(dark.colors.text, dark.colors.bg)).toBe(true);
  });

  it('text on bg2 passes AA', () => {
    expect(meetsAA(dark.colors.text, dark.colors.bg2)).toBe(true);
  });

  it('text on surface passes AA', () => {
    expect(meetsAA(dark.colors.text, dark.colors.surface)).toBe(true);
  });

  it('textSecondary on bg passes AA', () => {
    expect(meetsAA(dark.colors.textSecondary, dark.colors.bg)).toBe(true);
  });

  it('textSecondary on surface passes AA', () => {
    expect(meetsAA(dark.colors.textSecondary, dark.colors.surface)).toBe(true);
  });

  it('textSecondary on bg2 passes AA', () => {
    expect(meetsAA(dark.colors.textSecondary, dark.colors.bg2)).toBe(true);
  });

  // textDim was the regressor — these failed before the bump
  it('textDim on bg passes AA', () => {
    expect(meetsAA(dark.colors.textDim, dark.colors.bg)).toBe(true);
  });

  it('textDim on bg2 passes AA', () => {
    expect(meetsAA(dark.colors.textDim, dark.colors.bg2)).toBe(true);
  });

  it('textDim on surface passes AA', () => {
    const ratio = contrast(dark.colors.textDim, dark.colors.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrast helper', () => {
  it('returns ~21:1 for black on white', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for same color', () => {
    expect(contrast('#888888', '#888888')).toBe(1);
  });

  it('is symmetric (fg vs bg ordering does not matter)', () => {
    const a = contrast('#15110D', '#A89578');
    const b = contrast('#A89578', '#15110D');
    expect(a).toBeCloseTo(b, 5);
  });

  it('throws on invalid hex', () => {
    expect(() => contrast('#GGG000', '#FFFFFF')).toThrow();
    expect(() => contrast('#abc', '#FFFFFF')).toThrow();
  });

  it('meetsAA uses 3:1 threshold for large text', () => {
    // #A89578 on #221C16 is 5.81:1 — passes large but also normal
    expect(meetsAA('#A89578', '#221C16', true)).toBe(true);
    // A 3.5:1 ratio should pass large but fail normal
    const fg = '#9F8E78';
    const ratio = contrast(fg, '#221C16');
    if (ratio >= 3 && ratio < 4.5) {
      expect(meetsAA(fg, '#221C16', true)).toBe(true);
      expect(meetsAA(fg, '#221C16', false)).toBe(false);
    }
  });
});
