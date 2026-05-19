/**
 * Testes das features de inteligência: memória, mood-espelho, proactive,
 * narrative, evolution-stories, insights.
 *
 * Esses testes garantem que a "revolução de Tamagotchi/Pou" mantém
 * comportamento esperado em cenários comuns.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearMemories,
  extractMemories,
  formatMemoriesForPrompt,
  listMemories,
  recall,
  rememberFromMessage,
} from '@/lib/memory';
import { deriveReflectiveMood } from '@/lib/mood';
import { generateWeeklyNarrative } from '@/lib/narrative';
import { computeInsights, buildDailyVibes } from '@/lib/insights';
import { getEvolutionStory } from '@/lib/evolution-stories';
import { todayLocal, addDays } from '@/lib/db';
import type { Checkin, Mascot, Message } from '@/types';

function reset() {
  (globalThis as any).__asyncStorageReset?.();
}

function mockMascot(): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Bipo',
    personality: 'calmo',
    phase: 'crianca',
    mood: 'feliz',
    xp: 600,
    level: 4,
    energy: 70,
    health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  };
}

function mockCheckin(habit_kind: Checkin['habit_kind'], daysAgo = 0, value = 1): Checkin {
  const date = addDays(todayLocal(), -daysAgo);
  return {
    id: `c_${Math.random()}`,
    user_id: 'u1',
    habit_kind,
    value,
    unit: '',
    occurred_on: date,
    occurred_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    xp_awarded: 10,
    idempotency_key: `k_${Math.random()}`,
    created_at: new Date().toISOString(),
  };
}

function mockMessage(content: string, role: 'user' | 'mascot' = 'user', minutesAgo = 0): Message {
  return {
    id: `msg_${Math.random()}`,
    conversation_id: 'u1',
    role,
    content,
    safety_flag: 'safe',
    cached: false,
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  };
}

// ============= MEMORY =============
describe('memory — extração de fatos', () => {
  it('detecta evento futuro', () => {
    const m = extractMemories('u1', 'tenho prova quarta');
    expect(m.length).toBeGreaterThan(0);
    expect(m[0].kind).toBe('event');
    expect(m[0].summary).toContain('prova');
  });

  it('detecta menção a pessoa', () => {
    const m = extractMemories('u1', 'minha mãe veio almoçar hoje');
    expect(m.find(x => x.kind === 'person')).toBeDefined();
  });

  it('detecta sentimento recorrente', () => {
    const m = extractMemories('u1', 'tô ansiosa de novo');
    expect(m.find(x => x.kind === 'feeling')).toBeDefined();
  });

  it('mensagem sem padrões retorna []', () => {
    const m = extractMemories('u1', 'ok');
    expect(m).toEqual([]);
  });
});

describe('memory — recall por keywords', () => {
  beforeEach(reset);

  it('recupera memória relevante por overlap de keywords', async () => {
    await rememberFromMessage('u1', 'tenho prova quarta');
    const recalled = await recall('u1', 'amanhã é minha prova', 3);
    expect(recalled.length).toBeGreaterThan(0);
    expect(recalled[0].summary).toContain('prova');
  });

  it('não recupera memória sem overlap', async () => {
    await rememberFromMessage('u1', 'tenho prova quarta');
    const recalled = await recall('u1', 'que filme assistir?', 3);
    expect(recalled.length).toBe(0);
  });

  it('dedupe de memórias idênticas em < 24h', async () => {
    await rememberFromMessage('u1', 'tô ansiosa de novo');
    await rememberFromMessage('u1', 'tô ansiosa de novo');
    const all = await listMemories('u1');
    expect(all.length).toBe(1);
  });

  it('clearMemories limpa tudo', async () => {
    await rememberFromMessage('u1', 'tenho prova quarta');
    await clearMemories('u1');
    expect((await listMemories('u1')).length).toBe(0);
  });

  it('formatMemoriesForPrompt produz bullets legíveis', () => {
    const memories = extractMemories('u1', 'tenho prova quarta');
    const formatted = formatMemoriesForPrompt(memories);
    expect(formatted).toContain('-');
    expect(formatted).toContain('prova');
  });
});

// ============= MOOD-ESPELHO =============
describe('mood-espelho — humor reflete usuário', () => {
  it('vibe triste recente sobrepõe baseMood feliz', () => {
    const recent = [
      mockMessage('tô bem triste hoje'),
      mockMessage('tô bem triste hoje'),
      mockMessage('me sinto deprimida'),
    ];
    const mood = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: recent,
      recentCheckins: [],
      hoursSinceLastCheckin: 5,
    });
    expect(mood).toBe('triste');
  });

  it('vibe alegre puxa pra empolgado', () => {
    const recent = [
      mockMessage('que dia feliz!'),
      mockMessage('estou empolgada'),
      mockMessage('muito feliz'),
    ];
    const mood = deriveReflectiveMood({
      baseMood: 'ok',
      recentMessages: recent,
      recentCheckins: [],
      hoursSinceLastCheckin: 1,
    });
    expect(['empolgado', 'feliz']).toContain(mood);
  });

  it('72h sem check-in vira exausto', () => {
    const mood = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [],
      recentCheckins: [],
      hoursSinceLastCheckin: 80,
    });
    expect(mood).toBe('exausto');
  });

  it('sem dados, cai para baseMood', () => {
    const mood = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [],
      recentCheckins: [],
      hoursSinceLastCheckin: 2,
    });
    expect(mood).toBe('feliz');
  });
});

// ============= NARRATIVE =============
describe('narrative — carta semanal', () => {
  it('gera 5 blocos sempre', () => {
    const n = generateWeeklyNarrative({
      mascot: mockMascot(),
      checkins: [mockCheckin('water', 0), mockCheckin('sleep', 1)],
      prevWeekCheckins: [],
      currentStreak: 2,
      longestStreak: 2,
      xpThisWeek: 50,
    });
    expect(n.greeting).toBeTruthy();
    expect(n.highlight).toBeTruthy();
    expect(n.observation).toBeTruthy();
    expect(n.nudge).toBeTruthy();
    expect(n.closing).toBeTruthy();
  });

  it('detecta hábito que SUMIU vs semana anterior', () => {
    const n = generateWeeklyNarrative({
      mascot: mockMascot(),
      checkins: [mockCheckin('water', 0), mockCheckin('water', 1)],
      prevWeekCheckins: [mockCheckin('sleep', 7), mockCheckin('sleep', 8)],
      currentStreak: 1,
      longestStreak: 5,
      xpThisWeek: 20,
    });
    // observation deve mencionar sono (ou estar genérico)
    expect(n.observation.toLowerCase()).toMatch(/sono|sumiu|quieto|atenção|nada/i);
  });

  it('trend up quando esta semana > prev semana * 1.15', () => {
    const n = generateWeeklyNarrative({
      mascot: mockMascot(),
      checkins: Array.from({ length: 10 }, (_, i) => mockCheckin('water', i % 7)),
      prevWeekCheckins: [mockCheckin('water', 7)],
      currentStreak: 7,
      longestStreak: 7,
      xpThisWeek: 100,
    });
    expect(n.stats.trend).toBe('up');
  });

  it('zero checkins ainda gera narrativa digna (não vazio)', () => {
    const n = generateWeeklyNarrative({
      mascot: mockMascot(),
      checkins: [],
      prevWeekCheckins: [],
      currentStreak: 0,
      longestStreak: 0,
      xpThisWeek: 0,
    });
    expect(n.highlight.length).toBeGreaterThan(10);
  });
});

// ============= EVOLUTION STORIES =============
describe('evolution-stories — narrativa por transição × personalidade', () => {
  it('ovo → bebe tem story específica por personalidade', () => {
    const calmo = getEvolutionStory({
      mascotName: 'Bipo',
      personality: 'calmo',
      fromPhase: 'ovo',
      toPhase: 'bebe',
      totalCheckins: 5,
      daysSinceCreated: 7,
      currentStreak: 5,
    });
    const fofo = getEvolutionStory({
      mascotName: 'Lulu',
      personality: 'fofo',
      fromPhase: 'ovo',
      toPhase: 'bebe',
      totalCheckins: 5,
      daysSinceCreated: 7,
      currentStreak: 5,
    });
    expect(calmo.title).not.toBe(fofo.title);
    expect(calmo.body).toContain('Bipo');
    expect(fofo.body).toContain('Lulu');
  });

  it('interpola números corretos', () => {
    const story = getEvolutionStory({
      mascotName: 'Zip',
      personality: 'motivador',
      fromPhase: 'bebe',
      toPhase: 'crianca',
      totalCheckins: 42,
      daysSinceCreated: 14,
      currentStreak: 10,
    });
    expect(story.body).toMatch(/42|10|14/);
  });

  it('transição não-mapeada cai pra story default digna', () => {
    const story = getEvolutionStory({
      mascotName: 'Bipo',
      personality: 'calmo',
      fromPhase: 'ovo',
      toPhase: 'evoluido', // salto absurdo
      totalCheckins: 999,
      daysSinceCreated: 100,
      currentStreak: 50,
    });
    expect(story.title).toBeTruthy();
    expect(story.body).toBeTruthy();
    expect(story.quote).toBeTruthy();
  });
});

// ============= INSIGHTS =============
describe('insights — correlação hábito × vibe', () => {
  it('amostra < 7 dias retorna []', () => {
    const insights = computeInsights({
      checkins: [mockCheckin('water', 0)],
      messages: [mockMessage('oi', 'user')],
    });
    expect(insights).toEqual([]);
  });

  it('detecta correlação positiva: water + alegria', () => {
    const checkins: Checkin[] = [];
    const messages: Message[] = [];
    // 7 dias COM water + msg alegre
    for (let d = 0; d < 7; d++) {
      checkins.push(mockCheckin('water', d));
      messages.push({
        ...mockMessage('que dia feliz!', 'user'),
        created_at: new Date(Date.now() - d * 86_400_000).toISOString(),
      });
    }
    // 7 dias SEM water + msg triste
    for (let d = 7; d < 14; d++) {
      messages.push({
        ...mockMessage('estou triste', 'user'),
        created_at: new Date(Date.now() - d * 86_400_000).toISOString(),
      });
    }
    const insights = computeInsights({ checkins, messages });
    // Deve achar pelo menos 1 correlação positiva
    expect(insights.find(i => i.kind === 'positive')).toBeDefined();
  });

  it('pattern: streak de check-ins consecutivos', () => {
    const checkins: Checkin[] = [];
    const messages: Message[] = [];
    for (let d = 0; d < 10; d++) {
      checkins.push(mockCheckin('water', d));
      messages.push({
        ...mockMessage('oi', 'user'),
        created_at: new Date(Date.now() - d * 86_400_000).toISOString(),
      });
    }
    const insights = computeInsights({ checkins, messages });
    expect(insights.find(i => i.kind === 'pattern' && i.text.includes('seguidos'))).toBeDefined();
  });
});

describe('buildDailyVibes — agregação por dia local', () => {
  it('agrega checkins e vibes por dia', () => {
    const today = todayLocal();
    const checkins = [
      mockCheckin('water', 0),
      mockCheckin('sleep', 0),
    ];
    const messages = [
      { ...mockMessage('feliz!', 'user'), created_at: `${today}T10:00:00.000Z` },
    ];
    const vibes = buildDailyVibes({ checkins, messages });
    const todayVibe = vibes.find(v => v.date === today);
    expect(todayVibe).toBeDefined();
    expect(todayVibe!.habits.size).toBe(2);
    expect(todayVibe!.hasChat).toBe(true);
  });
});
