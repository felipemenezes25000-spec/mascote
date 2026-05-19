/**
 * Tests para as funções puras exportadas por useTheme.
 * O hook React em si (`useTheme()`) é coberto indireto via componentes;
 * aqui isolamos `resolveTextScale` que é a parte testável sem React.
 */

import { describe, expect, it } from 'vitest';
import { resolveTextScale } from '@/lib/useTheme';

describe('resolveTextScale', () => {
  it('dynamic_text OFF sempre retorna 1', () => {
    expect(resolveTextScale(false, 1.5)).toBe(1);
    expect(resolveTextScale(false, 0.5)).toBe(1);
    expect(resolveTextScale(false)).toBe(1);
  });

  it('dynamic_text ON retorna a escala do OS', () => {
    expect(resolveTextScale(true, 1.3)).toBe(1.3);
    expect(resolveTextScale(true, 0.9)).toBe(0.9);
  });

  it('osFontScale default = 1', () => {
    expect(resolveTextScale(true)).toBe(1);
  });
});
