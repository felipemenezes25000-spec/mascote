import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from './helpers/renderHook';
import { useStore } from '@/store';
import { resolveTextScale, useStyles, useTheme } from '@/lib/useTheme';
import type { Settings } from '@/types';
import type { Theme } from '@/lib/themes';

beforeEach(() => {
  useStore.setState({ settings: null });
});

const baseSettings: Settings = {
  user_id: 'u1',
  theme_mode: 'light',
  brand_palette: 'classic',
  dynamic_text: false,
  reduce_motion: false,
  high_contrast: false,
  push_enabled: true,
  quiet_start: '22:00',
  quiet_end: '08:00',
  paused_until: null,
  language: 'pt',
  consent_analytics: false,
  tour_completed: true,
};

describe('useTheme — hook', () => {
  it('settings null → light/classic, scale 1', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
    expect(result.current.palette).toBe('classic');
    expect(result.current.textScale).toBe(1);
  });

  it('dark mode aplicado', () => {
    useStore.setState({ settings: { ...baseSettings, theme_mode: 'dark' } });
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('dark');
  });

  it('sepia mode aplicado', () => {
    useStore.setState({ settings: { ...baseSettings, theme_mode: 'sepia' } });
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('sepia');
  });

  it('system mode resolve via useColorScheme (mock=light)', () => {
    useStore.setState({ settings: { ...baseSettings, theme_mode: 'system' } });
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
  });

  it('paleta diferente muda primary', () => {
    useStore.setState({ settings: { ...baseSettings, brand_palette: 'coral' } });
    const { result: r1 } = renderHook(() => useTheme());
    // r1.current é referência viva — capturamos o valor agora antes do setState.
    const coralPrimary = r1.current.colors.primary;
    useStore.setState({ settings: { ...baseSettings, brand_palette: 'sun' } });
    const { result: r2 } = renderHook(() => useTheme());
    expect(coralPrimary).not.toBe(r2.current.colors.primary);
  });

  it('high_contrast iguala textSecondary a text', () => {
    useStore.setState({ settings: { ...baseSettings, high_contrast: true } });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors.textSecondary).toBe(result.current.colors.text);
  });

  it('dynamic_text=true aplica scale (mock OS=1 → textScale=1)', () => {
    useStore.setState({ settings: { ...baseSettings, dynamic_text: true } });
    const { result } = renderHook(() => useTheme());
    expect(result.current.textScale).toBe(1);
  });

  it('rerender propaga mudança de settings', () => {
    const { result, rerender } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
    useStore.setState({ settings: { ...baseSettings, theme_mode: 'dark' } });
    rerender();
    expect(result.current.mode).toBe('dark');
  });
});

describe('useStyles', () => {
  it('aplica maker e retorna stylesheet', () => {
    const maker = (t: Theme) => ({ box: { backgroundColor: t.colors.primary } });
    const { result } = renderHook(() => useStyles(maker));
    expect(result.current.box.backgroundColor).toBeTruthy();
  });

  it('memoiza por theme', () => {
    const maker = (t: Theme) => ({ box: { backgroundColor: t.colors.primary } });
    const { result, rerender } = renderHook(() => useStyles(maker));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('resolveTextScale (re-test)', () => {
  it('OFF retorna 1', () => expect(resolveTextScale(false, 1.5)).toBe(1));
  it('ON usa scale do OS', () => expect(resolveTextScale(true, 1.3)).toBe(1.3));
  it('default scale = 1', () => expect(resolveTextScale(true)).toBe(1));
});
