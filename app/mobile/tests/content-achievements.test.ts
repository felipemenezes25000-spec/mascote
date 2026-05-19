/**
 * Achievements catalog: cada conquista é um critério atômico.
 *
 * Garantia: cada `check` é puro e satisfaz seu próprio critério.
 */

import { describe, expect, it } from 'vitest';
import { achievementCatalog, getAchievement, type AchievementContext } from '@/content/achievements';

const baseCtx: AchievementContext = {
  level: 0,
  totalXp: 0,
  totalCheckins: 0,
  currentStreak: 0,
  longestStreak: 0,
  daysSinceCreated: 0,
  messagesSent: 0,
  missionsCompleted: 0,
  habitVariety: 0,
};

describe('achievementCatalog', () => {
  it('catálogo não-vazio', () => {
    expect(achievementCatalog.length).toBeGreaterThan(0);
  });

  it('ids únicos', () => {
    const ids = achievementCatalog.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos têm emoji, title, description', () => {
    for (const a of achievementCatalog) {
      expect(a.emoji.length).toBeGreaterThan(0);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  it('catálogo cobre familias: check-ins, streaks, níveis, variedade, vida', () => {
    const ids = achievementCatalog.map(a => a.id).join(' ');
    expect(ids).toMatch(/primeiro-passo/);
    expect(ids).toMatch(/streak-/);
    expect(ids).toMatch(/nivel-/);
    expect(ids).toMatch(/variedade/);
    expect(ids).toMatch(/conversador|mes-de-vida|ano-de-vida|missionario/);
  });
});

describe('getAchievement', () => {
  it('retorna conquista existente', () => {
    expect(getAchievement('primeiro-passo')?.id).toBe('primeiro-passo');
  });
  it('undefined em id desconhecido', () => {
    expect(getAchievement('xyz123')).toBeUndefined();
  });
});

describe('check functions — sanity bounds', () => {
  it('contexto zero: NENHUMA conquista exceto talvez primeiro-passo c/ 1+ checkin', () => {
    const ach = achievementCatalog.filter(a => a.check(baseCtx));
    expect(ach).toEqual([]);
  });

  it('1 check-in → primeiro-passo unlocked', () => {
    const ctx = { ...baseCtx, totalCheckins: 1 };
    expect(getAchievement('primeiro-passo')!.check(ctx)).toBe(true);
  });

  it('10 check-ins → rotina-leve unlocked', () => {
    const ctx = { ...baseCtx, totalCheckins: 10 };
    expect(getAchievement('rotina-leve')!.check(ctx)).toBe(true);
  });

  it('longestStreak 7 → streak-7 unlocked', () => {
    const ctx = { ...baseCtx, longestStreak: 7 };
    expect(getAchievement('streak-7')!.check(ctx)).toBe(true);
  });

  it('habitVariety 9 → variedade-total unlocked', () => {
    const ctx = { ...baseCtx, habitVariety: 9 };
    expect(getAchievement('variedade-total')!.check(ctx)).toBe(true);
    expect(getAchievement('variedade')!.check(ctx)).toBe(true); // 5+ também
  });

  it('habitVariety 4 → NEM variedade nem variedade-total', () => {
    const ctx = { ...baseCtx, habitVariety: 4 };
    expect(getAchievement('variedade')!.check(ctx)).toBe(false);
    expect(getAchievement('variedade-total')!.check(ctx)).toBe(false);
  });

  it('nivel-5 → level 5+', () => {
    expect(getAchievement('nivel-5')!.check({ ...baseCtx, level: 5 })).toBe(true);
    expect(getAchievement('nivel-5')!.check({ ...baseCtx, level: 4 })).toBe(false);
  });

  it('mes-de-vida → 30 dias', () => {
    expect(getAchievement('mes-de-vida')!.check({ ...baseCtx, daysSinceCreated: 30 })).toBe(true);
    expect(getAchievement('mes-de-vida')!.check({ ...baseCtx, daysSinceCreated: 29 })).toBe(false);
  });

  it('ano-de-vida → 365 dias', () => {
    expect(getAchievement('ano-de-vida')!.check({ ...baseCtx, daysSinceCreated: 365 })).toBe(true);
  });

  it('todos os checks executam para um contexto maximizado (smoke)', () => {
    const max: AchievementContext = {
      level: 999, totalXp: 99999, totalCheckins: 9999,
      currentStreak: 999, longestStreak: 999, daysSinceCreated: 99999,
      messagesSent: 9999, missionsCompleted: 9999, habitVariety: 99,
    };
    for (const a of achievementCatalog) {
      expect(a.check(max)).toBe(true);
    }
  });
});
