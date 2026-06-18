/**
 * Regressão da auditoria 2026-06-18: três clusters de controles icon-only / de
 * baixa altura ficavam abaixo do alvo mínimo de toque de 44px (Apple HIG / RN
 * a11y), sem hitSlop pra compensar:
 *
 *  - chat.tsx: o ✕ que dispensa o banner de crise (Icon 14, sem padding → ~30px),
 *    crítico por estar no fluxo de segurança;
 *  - MorphSlider: o toggle de trava (icon-only ~28×20px) e o botão "reset";
 *  - RangeSlider: o botão "reset" (~20px de altura).
 *
 * A correção adiciona hitSlop a cada um. Como o tamanho efetivo de toque não é
 * computável de forma estável por análise estática (vem de padding + ícone +
 * layout), estes guards travam a PRESENÇA do hitSlop no source — onde o bug
 * realmente vivia — em vez de depender de medições de render frágeis.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('touch targets de controles icon-only/baixos têm hitSlop', () => {
  it('chat.tsx: o ✕ que dispensa o banner de crise tem hitSlop', () => {
    const src = read('app/(tabs)/chat.tsx');
    // âncora única do onPress do ✕ (só existe na JSX do banner de crise)
    const idx = src.indexOf('setShowCvvBanner(false)');
    expect(idx).toBeGreaterThan(-1);
    // janela em torno do Pressable que contém esse handler
    const window = src.slice(idx, idx + 400);
    expect(window).toMatch(/hitSlop/);
  });

  it('MorphSlider: toggle de trava e botão reset têm hitSlop', () => {
    const src = read('src/components/MorphSlider.tsx');
    expect(src).toMatch(/onToggleLock[\s\S]{0,200}hitSlop/);
    // o reset com rótulo "reset" também
    expect(src).toMatch(/handleReset[\s\S]{0,200}hitSlop/);
  });

  it('RangeSlider: botão reset tem hitSlop', () => {
    const src = read('src/components/RangeSlider.tsx');
    expect(src).toMatch(/handleReset[\s\S]{0,200}hitSlop/);
  });
});
