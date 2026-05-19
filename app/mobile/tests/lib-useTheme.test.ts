/**
 * Testes do `useTheme` — apenas as funções puras exportadas que não dependem
 * de React/DOM. As funções `useTheme()`/`useStyles()` são hooks que requerem
 * react-test-renderer; aqui cobrimos `resolveTextScale` e `getStaticTheme`.
 */

import { describe, expect, it } from 'vitest';
import { getStaticTheme, resolveTextScale } from '@/lib/useTheme';

describe('resolveTextScale', () => {
  it('dynamicText OFF → sempre 1.0 (ignora osScale)', () => {
    expect(resolveTextScale(false, 1.5)).toBe(1);
    expect(resolveTextScale(false, 0.7)).toBe(1);
  });

  it('dynamicText ON → segue osScale', () => {
    expect(resolveTextScale(true, 1.5)).toBe(1.5);
    expect(resolveTextScale(true, 0.85)).toBe(0.85);
  });

  it('omitted osScale → 1.0', () => {
    expect(resolveTextScale(false)).toBe(1);
    expect(resolveTextScale(true)).toBe(1);
  });
});

describe('getStaticTheme', () => {
  it('retorna theme com mode=light/palette=classic', () => {
    const theme = getStaticTheme();
    expect(theme.mode).toBe('light');
    expect(theme.palette).toBe('classic');
    expect(theme.colors).toBeDefined();
    expect(theme.text).toBeDefined();
    expect(theme.spacing).toBeDefined();
  });

  it('theme tem colors fundamentais', () => {
    const theme = getStaticTheme();
    expect(theme.colors.primary).toBeTruthy();
    expect(theme.colors.bg).toBeTruthy();
    expect(theme.colors.text).toBeTruthy();
  });
});
