import { describe, expect, it } from 'vitest';
import {
  animationForTrigger,
  animationTriggerForHabitKind,
  createAnimationAction,
} from '@/lib/animation-triggers';

describe('animation-triggers', () => {
  it('mission_complete usa animação do hábito', () => {
    expect(animationForTrigger('mission_complete', 'sleep')).toBe('rest');
    expect(animationForTrigger('mission_complete', 'exercise')).toBe('stretch');
    expect(animationForTrigger('habit_train')).toBe('stretch');
    expect(animationForTrigger('miss_user')).toBe('observe');
  });

  it('animationTriggerForHabitKind mapeia água e meditação', () => {
    expect(animationTriggerForHabitKind('water')).toBe('habit_water');
    expect(animationTriggerForHabitKind('meditation')).toBe('habit_meditate');
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
