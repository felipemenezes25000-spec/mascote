/**
 * Regressão da auditoria 2026-05-29: a célula "hoje" do DailyRewardStrip usa
 * `theme.colors.text` como FUNDO (creme claro no dark mode) e o texto/ícone
 * estavam hardcoded em `#fff`. No dark mode isso virava branco-sobre-creme —
 * praticamente ilegível. A correção troca `#fff` por `theme.colors.inkInverse`,
 * que é branco em light/sepia e escuro (#15110D) no dark, mantendo contraste em
 * todos os modos.
 *
 * Estes testes travam o token correto no nível de cor, onde o bug realmente
 * vivia, em vez de depender de snapshot frágil de render.
 */
import { describe, expect, it } from 'vitest';
import { contrast, meetsAA } from '@/lib/a11y/contrast';
import { buildTheme } from '@/lib/themes';

const dark = buildTheme('dark', 'classic');
const light = buildTheme('light', 'classic');

describe('DailyRewardStrip "hoje" cell contrast', () => {
  it('inkInverse sobre text passa AA no dark (a correção)', () => {
    expect(meetsAA(dark.colors.inkInverse, dark.colors.text)).toBe(true);
  });

  it('inkInverse sobre text passa AA no light também', () => {
    expect(meetsAA(light.colors.inkInverse, light.colors.text)).toBe(true);
  });

  it('o #fff hardcoded antigo FALHAVA AA sobre text no dark (o bug removido)', () => {
    expect(contrast('#ffffff', dark.colors.text)).toBeLessThan(4.5);
    expect(meetsAA('#ffffff', dark.colors.text)).toBe(false);
  });
});
