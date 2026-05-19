import { describe, expect, it } from 'vitest';
import { animationForTrigger, createAnimationAction } from '@/lib/animation-triggers';

describe('animation-triggers', () => {
  it('mission_complete usa animação do hábito', () => {
    expect(animationForTrigger('mission_complete', 'sleep')).toBe('rest');
    expect(animationForTrigger('mission_complete', 'exercise')).toBe('celebrate');
  });

  it('micro_evolution dispara celebrate', () => {
    expect(animationForTrigger('micro_evolution')).toBe('celebrate');
  });

  it('createAnimationAction gera key único', () => {
    const a = createAnimationAction('touch');
    expect(a.kind).toBe('bounce');
    expect(a.key).toBeGreaterThan(0);
  });
});
