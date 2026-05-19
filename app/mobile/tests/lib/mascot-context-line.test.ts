import { describe, expect, it } from 'vitest';
import { hoursAway, returnLoopKind } from '@/lib/mascot-context-line';

describe('return loop', () => {
  it('não pune retorno rápido', () => {
    expect(returnLoopKind(12)).toBe('none');
  });

  it('saudade após 2 dias', () => {
    expect(returnLoopKind(50)).toBe('saudade');
  });

  it('retorno após uma semana', () => {
    expect(returnLoopKind(200)).toBe('retorno');
  });

  it('hoursAway calcula corretamente', () => {
    const past = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(hoursAway(past)).toBeCloseTo(3, 0);
  });
});
