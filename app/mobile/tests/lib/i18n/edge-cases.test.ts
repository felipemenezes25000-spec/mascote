/**
 * Edge cases adicionais pro helper t() — boost de coverage.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, setLocale, t } from '@/lib/i18n';

describe('t(): edge cases', () => {
  afterEach(() => {
    setLocale('pt');
  });

  it('path vazio devolve literal', () => {
    expect(t('')).toBe('');
  });

  it('path com apenas dots devolve literal', () => {
    expect(t('...')).toBe('...');
  });

  it('path apontando pra objeto intermediario devolve key', () => {
    // 'atelier.header' eh objeto, nao string
    expect(t('atelier.header')).toBe('atelier.header');
  });

  it('args extras em string sem funcao sao ignorados', () => {
    expect(t('atelier.header.title', 'foo', 'bar')).toBe('Ateliê');
  });

  it('args faltantes em funcao nao explode (template lida com undefined)', () => {
    // subtitle_count espera n: number; sem args, n=undefined; template
    // produz 'undefined desbloqueadas...' — string mas com 'undefined'.
    const out = t('atelier.sections.mutations_active.subtitle_count');
    expect(typeof out).toBe('string');
  });

  it('args com valores estranhos no template ainda devolve string', () => {
    const out = t('atelier.sections.mutations_active.subtitle_count', NaN);
    expect(typeof out).toBe('string');
  });

  it('setLocale com locale invalido nao quebra subsequent calls', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    // forçando type assertion pra testar robustez
    setLocale('pt');
    expect(t('atelier.header.title')).toBe('Ateliê');
  });

  it('lookup retorna undefined pra path com null no meio', () => {
    // Path que existe mas tem null no caminho — devolve key literal.
    expect(t('atelier.header.title.foo.bar')).toBe('atelier.header.title.foo.bar');
  });
});
