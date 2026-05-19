import { describe, expect, it, vi } from 'vitest';
import {
  DYNAMIC_TEXT_RANGE,
  buildTheme,
  clampDynamicScale,
  makeShadow,
} from '@/lib/themes';

describe('themes: clampDynamicScale', () => {
  it('valores dentro do range passam intactos', () => {
    expect(clampDynamicScale(1)).toBe(1);
    expect(clampDynamicScale(1.2)).toBe(1.2);
    expect(clampDynamicScale(0.9)).toBe(0.9);
  });
  it('clamp inferior em 0.85', () => {
    expect(clampDynamicScale(0.5)).toBe(DYNAMIC_TEXT_RANGE.min);
    expect(clampDynamicScale(-2)).toBe(DYNAMIC_TEXT_RANGE.min);
  });
  it('clamp superior em 1.5', () => {
    expect(clampDynamicScale(2)).toBe(DYNAMIC_TEXT_RANGE.max);
    expect(clampDynamicScale(99)).toBe(DYNAMIC_TEXT_RANGE.max);
  });
  it('NaN/Infinity volta pra 1', () => {
    expect(clampDynamicScale(NaN)).toBe(1);
    expect(clampDynamicScale(Infinity)).toBe(1);
  });
});

describe('themes: buildTheme dynamic text', () => {
  it('textScale default = 1 mantém tamanhos originais', () => {
    const t = buildTheme('light', 'classic');
    expect(t.textScale).toBe(1);
    expect(t.text.h1.fontSize).toBe(32);
  });
  it('textScale aumenta proporcionalmente', () => {
    const t = buildTheme('light', 'classic', { textScale: 1.25 });
    expect(t.textScale).toBe(1.25);
    expect(t.text.h1.fontSize).toBe(40);
    expect(t.text.body.fontSize).toBe(Math.round(14.5 * 1.25 * 100) / 100);
  });
  it('textScale fora do range é clampado', () => {
    const t = buildTheme('light', 'classic', { textScale: 5 });
    expect(t.textScale).toBe(DYNAMIC_TEXT_RANGE.max);
    expect(t.text.h1.fontSize).toBeLessThanOrEqual(32 * DYNAMIC_TEXT_RANGE.max);
  });
});

describe('themes: buildTheme modes/palettes', () => {
  it('system mode resolve pra light por default', () => {
    const t = buildTheme('system', 'classic');
    expect(t.mode).toBe('light');
  });
  it('cada palette muda a cor primária', () => {
    expect(buildTheme('light', 'classic').colors.primary).not.toBe(
      buildTheme('light', 'coral').colors.primary
    );
  });
  it('dark mode tem bgs escuros', () => {
    const t = buildTheme('dark', 'classic');
    expect(t.mode).toBe('dark');
    expect(t.colors.bg).toBe('#15110D');
  });
  it('sepia mode tem bg específico', () => {
    const t = buildTheme('sepia', 'classic');
    expect(t.colors.bg).toBe('#F1E6D3');
  });
});

describe('themes: makeShadow cross-platform', () => {
  it('em web retorna boxShadow CSS', () => {
    const s = makeShadow('#000000', 0, 4, 12, 0.2, 4) as { boxShadow: string };
    expect(s.boxShadow).toContain('rgba(0, 0, 0, 0.2)');
    expect(s.boxShadow).toMatch(/0px 4px 12px/);
  });
  it('aceita hex de 3 chars', () => {
    const s = makeShadow('#abc', 0, 2, 6, 0.4, 2) as { boxShadow: string };
    expect(s.boxShadow).toMatch(/rgba\(/);
  });
  it('aceita rgba puro sem reprocessar', () => {
    const s = makeShadow('rgba(10,20,30,0.5)', 0, 0, 4, 0.5, 1) as { boxShadow: string };
    expect(s.boxShadow).toContain('rgba(10,20,30,0.5)');
  });
  it('aceita hex de 8 chars (com alpha) e descarta o alpha', () => {
    const s = makeShadow('#FF8030FF', 0, 4, 12, 0.5, 4) as { boxShadow: string };
    expect(s.boxShadow).toMatch(/rgba\(255, 128, 48/);
  });
});

describe('themes: makeShadow native fallback', () => {
  it('em ambiente não-web retorna estilo nativo', async () => {
    // Re-importa o módulo com Platform = ios
    vi.resetModules();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'ios', select: <T,>(opts: { ios?: T; default?: T }) => opts.ios ?? opts.default },
      StyleSheet: { create: <T,>(x: T) => x, absoluteFill: {}, absoluteFillObject: {} },
      PixelRatio: { getFontScale: () => 1, get: () => 1, roundToNearestPixel: (n: number) => Math.round(n) },
    }));
    const themes = await import('@/lib/themes');
    const s = themes.makeShadow('#000000', 0, 4, 12, 0.2, 4) as {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    expect(s.shadowColor).toBe('#000000');
    expect(s.shadowOffset).toEqual({ width: 0, height: 4 });
    expect(s.shadowOpacity).toBe(0.2);
    expect(s.shadowRadius).toBe(12);
    expect(s.elevation).toBe(4);
    vi.doUnmock('react-native');
    vi.resetModules();
  });
});
