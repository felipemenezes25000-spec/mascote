import { describe, expect, it } from 'vitest';
import { generateWeeklyReport } from '@/lib/weeklyReportGenerator';
import type { Checkin, Mascot, Streak } from '@/types';

const mascot: Mascot = {
  id: 'm1',
  user_id: 'u1',
  name: 'Bipo',
  personality: 'calmo',
  phase: 'bebe',
  mood: 'feliz',
  xp: 50,
  level: 2,
  energy: 80,
  health: 100,
  dna_seed: 123,
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

function checkin(day: string, habit: Checkin['habit_kind']): Checkin {
  return {
    id: `c_${day}_${habit}`,
    user_id: 'u1',
    habit_kind: habit,
    value: 1,
    unit: null,
    xp_awarded: 10,
    occurred_at: `${day}T10:00:00.000Z`,
    occurred_on: day,
    idempotency_key: `k_${day}_${habit}`,
    created_at: `${day}T10:00:00.000Z`,
  };
}

describe('weeklyReportGenerator', () => {
  it('gera narrativa com nota de evolução', () => {
    const week = [checkin('2026-05-18', 'water'), checkin('2026-05-19', 'water')];
    const report = generateWeeklyReport({
      mascot,
      checkins: week,
      prevWeekCheckins: [],
      allCheckins: week,
      streak: {
        user_id: 'u1',
        current_streak: 2,
        longest_streak: 2,
        last_active_date: '2026-05-19',
        grace_days_left: 3,
        updated_at: '2026-05-19T10:00:00.000Z',
      },
    });

    expect(report.greeting.length).toBeGreaterThan(0);
    expect(report.evolutionNote.length).toBeGreaterThan(0);
    expect(report.dominantHabitLabel).toBe('água');
  });

  it('semana vazia retorna tom acolhedor', () => {
    const report = generateWeeklyReport({
      mascot,
      checkins: [],
      prevWeekCheckins: [],
      allCheckins: [],
      streak: null,
    });
    expect(report.evolutionNote).toContain('quieta');
  });
});
