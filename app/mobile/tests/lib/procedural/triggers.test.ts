import { describe, it, expect } from 'vitest';
import {
  onPhaseChange,
  onStreakDay,
  onAchievementUnlock,
  onMessageCount,
  onOnboardingComplete,
} from '@/lib/procedural/triggers';

describe('triggers', () => {
  it('phase change emite trigger correto', () => {
    expect(onPhaseChange('ovo', 'bebe')).toBe('evolution:bebe');
    expect(onPhaseChange('adulto', 'evoluido')).toBe('evolution:evoluido');
  });

  it('phase change igual retorna null', () => {
    expect(onPhaseChange('bebe', 'bebe')).toBeNull();
  });

  it('phase prev null vira primeira evolução visível', () => {
    expect(onPhaseChange(null, 'crianca')).toBe('evolution:crianca');
  });

  it('streak nos milestones (7, 30, 100, 365)', () => {
    expect(onStreakDay(7)).toBe('streak:7d');
    expect(onStreakDay(30)).toBe('streak:30d');
    expect(onStreakDay(100)).toBe('streak:100d');
    expect(onStreakDay(365)).toBe('streak:365d');
  });

  it('streak fora dos milestones retorna null', () => {
    expect(onStreakDay(1)).toBeNull();
    expect(onStreakDay(50)).toBeNull();
    expect(onStreakDay(0)).toBeNull();
    expect(onStreakDay(-5)).toBeNull();
  });

  it('achievement rare+ emite', () => {
    expect(onAchievementUnlock('first_legendary', 'legendary')).toBe('achievement:first_legendary');
    expect(onAchievementUnlock('epic_x', 'epic')).toBe('achievement:epic_x');
    expect(onAchievementUnlock('rare_y', 'rare')).toBe('achievement:rare_y');
  });

  it('achievement common não emite', () => {
    expect(onAchievementUnlock('common_x', 'common')).toBeNull();
  });

  it('messages nos milestones', () => {
    expect(onMessageCount(100)).toBe('messages:100');
    expect(onMessageCount(1000)).toBe('messages:1000');
    expect(onMessageCount(10000)).toBe('messages:10000');
  });

  it('messages fora dos milestones', () => {
    expect(onMessageCount(99)).toBeNull();
    expect(onMessageCount(500)).toBeNull();
  });

  it('onboarding', () => {
    expect(onOnboardingComplete()).toBe('onboarding');
  });
});
