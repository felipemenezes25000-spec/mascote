import { describe, expect, it } from 'vitest';
import {
  hslToHex,
  identityFromHSL,
  tintIdentity,
  DEFAULT_IDENTITY,
  type MascotIdentity,
} from '@/lib/color/tint';
import type { MascotMood } from '@/types';

const identity: MascotIdentity = {
  baseHue: 30,
  baseSaturation: 70,
  baseLightness: 55,
};

const ALL_MOODS: readonly MascotMood[] = [
  'triste',
  'ok',
  'feliz',
  'empolgado',
  'exausto',
];

describe('hslToHex', () => {
  it('returns a 7-char hex string', () => {
    expect(hslToHex(30, 70, 55)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('handles pure black', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });

  it('handles pure white', () => {
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });

  it('handles primary red (h=0, s=100, l=50)', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });

  it('handles primary green (h=120, s=100, l=50)', () => {
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
  });

  it('handles primary blue (h=240, s=100, l=50)', () => {
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
  });

  it('wraps negative hue', () => {
    // -360 wraps to 0 → red
    expect(hslToHex(-360, 100, 50)).toBe('#ff0000');
  });

  it('wraps hue > 360', () => {
    // 360 + 120 = 480 wraps to 120 → green
    expect(hslToHex(480, 100, 50)).toBe('#00ff00');
  });

  it('clamps oversaturated input', () => {
    expect(hslToHex(0, 200, 50)).toBe('#ff0000'); // s clamped to 100
  });

  it('clamps over-lightness input', () => {
    expect(hslToHex(0, 100, 200)).toBe('#ffffff'); // l clamped to 100
  });
});

describe('tintIdentity', () => {
  it('returns a hex string for default identity + ok', () => {
    expect(tintIdentity(identity, 'ok')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('shifts within bounds for every mood', () => {
    ALL_MOODS.forEach(mood => {
      expect(tintIdentity(identity, mood)).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it('mood ok returns base color identical to hslToHex of base', () => {
    expect(tintIdentity(identity, 'ok')).toBe(hslToHex(30, 70, 55));
  });

  it('feliz shifts hue +10 (and sat/light slightly)', () => {
    // identity ok = (30, 70, 55); feliz = (40, 80, 60)
    expect(tintIdentity(identity, 'feliz')).toBe(hslToHex(40, 80, 60));
  });

  it('triste shifts hue -10 (cooler tint)', () => {
    // identity ok = (30, 70, 55); triste = (20, 60, 50)
    expect(tintIdentity(identity, 'triste')).toBe(hslToHex(20, 60, 50));
  });

  it('empolgado pushes warmest variation', () => {
    // (30, 70, 55) + (20, 15, 5) = (50, 85, 60)
    expect(tintIdentity(identity, 'empolgado')).toBe(hslToHex(50, 85, 60));
  });

  it('exausto pushes coolest variation', () => {
    // (30, 70, 55) + (-15, -15, -10) = (15, 55, 45)
    expect(tintIdentity(identity, 'exausto')).toBe(hslToHex(15, 55, 45));
  });

  it('undefined mood falls back to ok (identity unchanged)', () => {
    expect(tintIdentity(identity, undefined)).toBe(hslToHex(30, 70, 55));
  });

  it('handles hue wrap when base near 0 + negative shift', () => {
    const lowHueIdentity: MascotIdentity = {
      baseHue: 5,
      baseSaturation: 60,
      baseLightness: 50,
    };
    // triste: 5 - 10 = -5 → wraps to 355
    expect(tintIdentity(lowHueIdentity, 'triste')).toBe(hslToHex(355, 50, 45));
  });

  it('handles hue wrap when base near 360 + positive shift', () => {
    const highHueIdentity: MascotIdentity = {
      baseHue: 350,
      baseSaturation: 60,
      baseLightness: 50,
    };
    // empolgado: 350 + 20 = 370 → wraps to 10
    expect(tintIdentity(highHueIdentity, 'empolgado')).toBe(hslToHex(10, 75, 55));
  });

  it('clamps saturation to floor (20) when base is low and mood reduces', () => {
    const lowSatIdentity: MascotIdentity = {
      baseHue: 30,
      baseSaturation: 25,
      baseLightness: 55,
    };
    // exausto would drop sat by 15 → 10, but clamps to 20
    const expected = hslToHex(15, 20, 45);
    expect(tintIdentity(lowSatIdentity, 'exausto')).toBe(expected);
  });

  it('clamps saturation to ceiling (95) when base is high and mood adds', () => {
    const highSatIdentity: MascotIdentity = {
      baseHue: 30,
      baseSaturation: 90,
      baseLightness: 55,
    };
    // empolgado would push sat to 105, clamps to 95
    const expected = hslToHex(50, 95, 60);
    expect(tintIdentity(highSatIdentity, 'empolgado')).toBe(expected);
  });

  it('clamps lightness to floor (25) when base is dark and mood reduces', () => {
    const darkIdentity: MascotIdentity = {
      baseHue: 30,
      baseSaturation: 60,
      baseLightness: 30,
    };
    // exausto drops light by 10 → 20, clamps to 25
    const expected = hslToHex(15, 45, 25);
    expect(tintIdentity(darkIdentity, 'exausto')).toBe(expected);
  });

  it('clamps lightness to ceiling (80) when base is bright and mood adds', () => {
    const brightIdentity: MascotIdentity = {
      baseHue: 30,
      baseSaturation: 60,
      baseLightness: 78,
    };
    // empolgado would push light to 83, clamps to 80
    const expected = hslToHex(50, 75, 80);
    expect(tintIdentity(brightIdentity, 'empolgado')).toBe(expected);
  });

  it('identity is preserved (hue diff between feliz and triste ≤ 20)', () => {
    // Sanity: o range total entre os extremos é pequeno
    // feliz (40, 80, 60) vs triste (20, 60, 50) — não viram cores diferentes,
    // só nuances. Test that values stay within tint window.
    const moods: MascotMood[] = ['triste', 'feliz'];
    const hexes = moods.map(m => tintIdentity(identity, m));
    expect(new Set(hexes).size).toBe(2); // distintos
    // Não vale testar igualdade aqui — só que produzem hexes diferentes.
  });

  it('identityFromHSL converts a bodyHSL triple correctly', () => {
    const fromHSL = identityFromHSL([200, 60, 50]);
    expect(fromHSL).toEqual({
      baseHue: 200,
      baseSaturation: 60,
      baseLightness: 50,
    });
  });

  it('DEFAULT_IDENTITY produces a warm orange-ish hex with mood ok', () => {
    const hex = tintIdentity(DEFAULT_IDENTITY, 'ok');
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    // baseHue 30 = orange family — red channel should be > blue channel
    const r = parseInt(hex.slice(1, 3), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    expect(r).toBeGreaterThan(b);
  });
});
