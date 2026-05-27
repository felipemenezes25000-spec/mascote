import { describe, expect, it } from 'vitest';
import { plural, daysToNextMilestone } from '@/lib/format/plural';

describe('plural', () => {
  it('uses singular for n=1', () => expect(plural(1, 'dia', 'dias')).toBe('1 dia'));
  it('uses plural for n=0', () => expect(plural(0, 'dia', 'dias')).toBe('0 dias'));
  it('uses plural for n=2', () => expect(plural(2, 'dia', 'dias')).toBe('2 dias'));
  it('uses singular for n=-1 (abs)', () => expect(plural(-1, 'dia', 'dias')).toBe('-1 dia'));
});

describe('daysToNextMilestone', () => {
  it('formats singular', () => expect(daysToNextMilestone(1)).toBe('Falta 1 dia pro próximo marco'));
  it('formats plural', () => expect(daysToNextMilestone(7)).toBe('Faltam 7 dias pro próximo marco'));
  it('handles zero', () => expect(daysToNextMilestone(0)).toBe('Próximo marco já alcançável'));
  it('handles negative', () => expect(daysToNextMilestone(-1)).toBe('Próximo marco já alcançável'));
});
