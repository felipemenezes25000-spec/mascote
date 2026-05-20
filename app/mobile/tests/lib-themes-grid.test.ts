/**
 * Grid de buildTheme — 4 modes × 5 paletas × tokens × shadows.
 *
 * Garante que CADA combinação produz um Theme válido com TODOS os tokens
 * esperados. Sem isto, mudanças em PALETTES ou SURFACES podem deixar
 * algum componente referenciando token inexistente em tempo de render.
 */

import { describe, expect, it } from 'vitest';
import { buildTheme, PALETTES } from '@/lib/themes';

const MODES = ['light', 'sepia', 'dark', 'system'] as const;
const PALETTE_IDS = Object.keys(PALETTES) as Array<keyof typeof PALETTES>;
const SCALES = [0.85, 1, 1.15, 1.3];

const COMBOS = MODES.flatMap(mode => PALETTE_IDS.map(p => [mode, p] as const));

describe('buildTheme produz tokens essenciais', () => {
  it.each(COMBOS)('mode=%s palette=%s — colors essenciais presentes', (mode, palette) => {
    const t = buildTheme(mode, palette);
    const required = [
      'bg', 'bg2', 'surface', 'border', 'text', 'textSecondary', 'textDim',
      'primary', 'primaryDeep', 'primarySoft', 'primaryTint',
    ];
    for (const key of required) {
      expect(t.colors).toHaveProperty(key);
      expect(typeof (t.colors as any)[key]).toBe('string');
    }
  });

  it.each(COMBOS)('mode=%s palette=%s — spacing tem 6 níveis', (mode, palette) => {
    const t = buildTheme(mode, palette);
    expect(t.spacing.xs).toBeGreaterThan(0);
    expect(t.spacing.sm).toBeGreaterThan(t.spacing.xs);
    expect(t.spacing.md).toBeGreaterThan(t.spacing.sm);
    expect(t.spacing.lg).toBeGreaterThan(t.spacing.md);
    expect(t.spacing.xl).toBeGreaterThan(t.spacing.lg);
    expect(t.spacing.xxl).toBeGreaterThan(t.spacing.xl);
  });

  it.each(COMBOS)('mode=%s palette=%s — radius monotonicamente crescente', (mode, palette) => {
    const t = buildTheme(mode, palette);
    expect(t.radius.sm).toBeLessThan(t.radius.md);
    expect(t.radius.md).toBeLessThan(t.radius.lg);
    expect(t.radius.lg).toBeLessThan(t.radius.xl);
    expect(t.radius.pill).toBeGreaterThan(t.radius.xl);
  });

  it.each(COMBOS)('mode=%s palette=%s — text styles têm fontSize positivo', (mode, palette) => {
    const t = buildTheme(mode, palette);
    expect(t.text.h1.fontSize).toBeGreaterThan(0);
    expect(t.text.h2.fontSize).toBeGreaterThan(0);
    expect(t.text.h3.fontSize).toBeGreaterThan(0);
    expect(t.text.body.fontSize).toBeGreaterThan(0);
    expect(t.text.sm.fontSize).toBeGreaterThan(0);
    expect(t.text.xs.fontSize).toBeGreaterThan(0);
  });

  it.each(COMBOS)('mode=%s palette=%s — tokens semânticos populados', (mode, palette) => {
    const t = buildTheme(mode, palette);
    expect(t.tokens.emotion).toBeDefined();
    expect(t.tokens.rarity).toBeDefined();
    expect(t.tokens.archetype).toBeDefined();
    expect(t.tokens.phase).toBeDefined();
    expect(t.tokens.gamification).toBeDefined();
    expect(t.tokens.semantic).toBeDefined();
  });

  it.each(COMBOS)('mode=%s palette=%s — shadow sm/md/glass presentes', (mode, palette) => {
    const t = buildTheme(mode, palette);
    expect(t.shadow.sm).toBeDefined();
    expect(t.shadow.md).toBeDefined();
    expect(t.shadow.glass).toBeDefined();
  });
});

describe('Hierarquia de texto monotônica', () => {
  it.each(COMBOS)('mode=%s palette=%s — h1 > h2 > h3 > body > sm > xs', (mode, palette) => {
    const t = buildTheme(mode, palette);
    expect(t.text.h1.fontSize).toBeGreaterThanOrEqual(t.text.h2.fontSize);
    expect(t.text.h2.fontSize).toBeGreaterThanOrEqual(t.text.h3.fontSize);
    expect(t.text.body.fontSize).toBeGreaterThanOrEqual(t.text.sm.fontSize);
    expect(t.text.sm.fontSize).toBeGreaterThanOrEqual(t.text.xs.fontSize);
  });
});

describe('Modo system resolve para light por padrão', () => {
  it.each(PALETTE_IDS)('palette=%s, mode=system → mode=light', palette => {
    const t = buildTheme('system', palette);
    expect(t.mode).toBe('light');
  });
});

describe('textScale — clamp', () => {
  it.each(SCALES)('scale=%s aplicado dentro do range esperado', scale => {
    const t = buildTheme('light', 'classic', { textScale: scale });
    expect(t.textScale).toBeGreaterThanOrEqual(0.85);
    expect(t.textScale).toBeLessThanOrEqual(1.5);
  });

  it.each([1, 1.15, 1.3])('scale=%s — h1.fontSize escala proporcionalmente', scale => {
    const baseline = buildTheme('light', 'classic').text.h1.fontSize;
    const scaled = buildTheme('light', 'classic', { textScale: scale }).text.h1.fontSize;
    expect(scaled).toBeCloseTo(baseline * scale, 0);
  });

  it.each([NaN, Infinity, -Infinity])('valor não-finito (%s) cai para 1', bad => {
    const t = buildTheme('light', 'classic', { textScale: bad as number });
    expect(t.textScale).toBe(1);
  });

  it.each([-1, 0.5, 5, 100])('valor fora do range (%s) é clamped', bad => {
    const t = buildTheme('light', 'classic', { textScale: bad as number });
    expect(t.textScale).toBeGreaterThanOrEqual(0.85);
    expect(t.textScale).toBeLessThanOrEqual(1.5);
  });
});

describe('PALETTES — estrutura', () => {
  it.each(PALETTE_IDS)('palette %s tem brand/soft/deep/tint', palette => {
    const p = PALETTES[palette];
    expect(p.brand).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(p.soft).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(p.deep).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(p.tint).toBeTruthy();
  });
});
