/**
 * Mapeamento puro de ação→gesto do CreatureRenderer. A DECISÃO (qual gesto cada
 * kind dispara) é pura e testável; o MECANISMO (sequências reanimated) vive no
 * componente e é verificado visualmente. Feature: action-prop de animação
 * (auditoria 2026-06-18 — antes era dead-wiring).
 */
import { describe, expect, it } from 'vitest';
import {
  actionGesture,
  type ActionGesture,
} from '@/components/mascot/creatureAnimation';
import type { MascotAnimationKind } from '@/lib/animation-triggers';

const ALL_KINDS: MascotAnimationKind[] = [
  'bounce',
  'celebrate',
  'wander',
  'rest',
  'observe',
  'stretch',
  'pulse',
];

const NEUTRAL: ActionGesture = { y: 0, scale: 1, x: 0, rot: 0 };

function isNeutral(g: ActionGesture): boolean {
  return g.y === NEUTRAL.y && g.scale === NEUTRAL.scale && g.x === NEUTRAL.x && g.rot === NEUTRAL.rot;
}

describe('actionGesture', () => {
  it('todo kind produz um gesto NÃO-neutro (animação visível)', () => {
    for (const kind of ALL_KINDS) {
      expect(isNeutral(actionGesture(kind)), `${kind} deveria animar`).toBe(false);
    }
  });

  it('bounce sobe (y negativo) sem escalar', () => {
    const g = actionGesture('bounce');
    expect(g.y).toBeLessThan(0);
    expect(g.scale).toBe(1);
  });

  it('celebrate combina salto + pop de escala', () => {
    const g = actionGesture('celebrate');
    expect(g.y).toBeLessThan(0);
    expect(g.scale).toBeGreaterThan(1);
  });

  it('stretch e pulse escalam sem saltar', () => {
    expect(actionGesture('stretch').scale).toBeGreaterThan(1);
    expect(actionGesture('stretch').y).toBe(0);
    expect(actionGesture('pulse').scale).toBeGreaterThan(1);
  });

  it('observe gira (rot ≠ 0) e wander desloca na horizontal (x ≠ 0)', () => {
    expect(actionGesture('observe').rot).not.toBe(0);
    expect(actionGesture('wander').x).not.toBe(0);
  });

  it('rest assenta pra baixo (y positivo, pequeno)', () => {
    expect(actionGesture('rest').y).toBeGreaterThan(0);
  });

  it('kind desconhecido → fallback bounce (nunca neutro)', () => {
    const g = actionGesture('explode' as MascotAnimationKind);
    expect(g).toEqual(actionGesture('bounce'));
  });
});
