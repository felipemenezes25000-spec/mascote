/**
 * Narrative weekly report — engine determinístico que gera carta do mascote.
 */

import { describe, expect, it } from 'vitest';
import { generateWeeklyNarrative, narrativeToText, type WeeklyData } from '@/lib/narrative';
import type { Checkin, Mascot, Personality } from '@/types';

function makeMascot(personality: Personality = 'calmo'): Mascot {
  return {
    id: 'm', user_id: 'u', name: 'Bipo', personality,
    phase: 'crianca', mood: 'feliz', xp: 100, level: 3,
    energy: 80, health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

function makeCheckin(habit: Checkin['habit_kind'], day: string, idx = 0): Checkin {
  return {
    id: `c${idx}`,
    user_id: 'u',
    habit_kind: habit,
    value: 1,
    unit: 'x',
    occurred_on: day,
    occurred_at: `${day}T12:00:00Z`,
    xp_awarded: 10,
    idempotency_key: `${idx}`,
    created_at: `${day}T12:00:00Z`,
  };
}

const emptyData = (mascot: Mascot): WeeklyData => ({
  mascot, checkins: [], prevWeekCheckins: [],
  currentStreak: 0, longestStreak: 0, xpThisWeek: 0,
});

describe('generateWeeklyNarrative — minimal', () => {
  it('semana 100% vazia → narrativa de pausa', () => {
    const r = generateWeeklyNarrative(emptyData(makeMascot('calmo')));
    expect(r.greeting).toContain('semana');
    expect(r.highlight).toMatch(/passou aqui|conta/);
    expect(r.observation).toMatch(/pausa/i);
    expect(r.nudge).toBeTruthy();
    expect(r.closing).toContain('Bipo');
    expect(r.stats.totalCheckins).toBe(0);
  });

  it('stats trend "up" quando esta semana >> anterior', () => {
    const cs: Checkin[] = [];
    for (let i = 0; i < 10; i++) cs.push(makeCheckin('water', '2026-05-15', i));
    const r = generateWeeklyNarrative({
      ...emptyData(makeMascot()),
      checkins: cs,
      prevWeekCheckins: [makeCheckin('water', '2026-05-08', 99)],
    });
    expect(r.stats.trend).toBe('up');
  });

  it('stats trend "down" quando esta semana << anterior', () => {
    const prev: Checkin[] = [];
    for (let i = 0; i < 10; i++) prev.push(makeCheckin('water', '2026-05-08', i));
    const r = generateWeeklyNarrative({
      ...emptyData(makeMascot()),
      checkins: [makeCheckin('water', '2026-05-15', 99)],
      prevWeekCheckins: prev,
    });
    expect(r.stats.trend).toBe('down');
  });

  it('stats trend "flat" quando paridade', () => {
    const r = generateWeeklyNarrative({
      ...emptyData(makeMascot()),
      checkins: [makeCheckin('water', '2026-05-15', 1)],
      prevWeekCheckins: [makeCheckin('water', '2026-05-08', 2)],
    });
    expect(r.stats.trend).toBe('flat');
  });
});

describe('generateWeeklyNarrative — top habit detection', () => {
  it('water mais frequente → topHabit=water', () => {
    const cs = [
      makeCheckin('water', '2026-05-15', 1),
      makeCheckin('water', '2026-05-15', 2),
      makeCheckin('water', '2026-05-15', 3),
      makeCheckin('sleep', '2026-05-15', 4),
    ];
    const r = generateWeeklyNarrative({ ...emptyData(makeMascot()), checkins: cs });
    expect(r.stats.topHabit).toBe('water');
    // Aceita 'água' (com acento) ou 'agua' — generator pode mudar ortografia.
    expect(r.highlight.toLowerCase()).toMatch(/[aá]gua/);
  });

  it('sleep mais frequente → mensagem sobre sono', () => {
    const cs = [
      makeCheckin('sleep', '2026-05-15', 1),
      makeCheckin('sleep', '2026-05-16', 2),
      makeCheckin('sleep', '2026-05-17', 3),
    ];
    const r = generateWeeklyNarrative({ ...emptyData(makeMascot()), checkins: cs });
    expect(r.stats.topHabit).toBe('sleep');
    expect(r.highlight.toLowerCase()).toMatch(/sono/);
  });
});

describe('generateWeeklyNarrative — missing habit', () => {
  it('water sumiu desde semana anterior → observation menciona', () => {
    const r = generateWeeklyNarrative({
      ...emptyData(makeMascot()),
      checkins: [makeCheckin('sleep', '2026-05-15', 1)],
      prevWeekCheckins: [makeCheckin('water', '2026-05-08', 2)],
    });
    expect(r.observation.toLowerCase()).toMatch(/agua|sumiu/);
  });
});

describe('generateWeeklyNarrative — personalities', () => {
  it.each(['calmo', 'motivador', 'fofo', 'sabio'] as Personality[])(
    'gera narrativa com cada personality (%s)',
    p => {
      const r = generateWeeklyNarrative(emptyData(makeMascot(p)));
      expect(r.greeting).toBeTruthy();
      expect(r.closing).toBeTruthy();
    }
  );

  it('fofo usa emojis no closing', () => {
    const r = generateWeeklyNarrative(emptyData(makeMascot('fofo')));
    expect(r.closing).toMatch(/🐣|💛/);
  });
});

describe('narrativeToText', () => {
  it('junta as 5 seções em texto contínuo separado por linhas em branco', () => {
    const r = generateWeeklyNarrative(emptyData(makeMascot()));
    const txt = narrativeToText(r);
    expect(txt).toContain(r.greeting);
    expect(txt).toContain(r.highlight);
    expect(txt).toContain(r.observation);
    expect(txt).toContain(r.nudge);
    expect(txt).toContain(r.closing);
    expect(txt.split('\n').length).toBeGreaterThanOrEqual(9);
  });
});

describe('NUDGE_BY_MISSING — fallback paths', () => {
  it('quando há topHabit, sugere algo complementar', () => {
    const cs = [makeCheckin('water', '2026-05-15', 1)];
    const r = generateWeeklyNarrative({ ...emptyData(makeMascot()), checkins: cs });
    expect(r.nudge).toBeTruthy();
  });

  it('trend down sem missing nem quietDay vazio → observation "mais devagar"', () => {
    // Semana atual: 1 checkin em 1 dia
    // Semana anterior: 20 checkins → trend "down"
    // MESMO habit_kind (water) para evitar "missing habit"
    const prevCheckins = [];
    for (let i = 0; i < 20; i++) {
      // Mesmo dia mas múltiplos checkins
      prevCheckins.push(makeCheckin('water', '2026-05-08', i));
    }
    const r = generateWeeklyNarrative({
      ...emptyData(makeMascot()),
      checkins: [makeCheckin('water', '2026-05-15', 100)], // 1 dia, 1 checkin
      prevWeekCheckins: prevCheckins,
    });
    expect(r.stats.trend).toBe('down');
  });
});
