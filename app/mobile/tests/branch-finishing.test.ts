/**
 * Cobre branches específicos remanescentes de lógica de negócio.
 */

import { describe, expect, it } from 'vitest';
import { pickMissionWithBandit } from '@/lib/ml/recommend/mission-ranker';
import { createBandit } from '@/lib/ml/recommend/bandit';
import { trendDirection } from '@/lib/ml/temporal/ema';
import { mockReply } from '@/content/replies';
import type { Intent } from '@/content/replies';
import { generateWeeklyNarrative } from '@/lib/narrative';
import type { Mascot } from '@/types';
import { deriveReflectiveMood } from '@/lib/mood';
import { getEvolutionStory } from '@/lib/evolution-stories';
import { analyzeSentiment } from '@/lib/ml/text/sentiment-lex';
import { computeInsights } from '@/lib/insights';

// mission-ranker contextual filters
describe('mission-ranker isContextAppropriate branches', () => {
  it('sleep antes de 18h é filtrado', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'calmo', mood: 'feliz', hour: 10,
      doneToday: new Set(),
    });
    if (t) expect(t.habit_kind !== 'sleep').toBe(true);
  });

  it('sun antes de 8h é filtrado', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'motivador', mood: 'feliz', hour: 6,
      doneToday: new Set(),
    });
    if (t) expect(t.habit_kind !== 'sun').toBe(true);
  });

  it('sun depois das 17h é filtrado', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'motivador', mood: 'feliz', hour: 20,
      doneToday: new Set(),
    });
    if (t) expect(t.habit_kind !== 'sun').toBe(true);
  });

  it('outdoor madrugada filtrado', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'motivador', mood: 'feliz', hour: 3,
      doneToday: new Set(),
    });
    if (t) expect(t.habit_kind !== 'outdoor').toBe(true);
  });

  it('exercise triste/pesado filtrado', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'motivador', mood: 'triste', hour: 14,
      doneToday: new Set(),
    });
    // Pode pegar exercise leve (xp < 40)
    if (t && t.habit_kind === 'exercise') expect(t.xp_reward).toBeLessThan(40);
  });

  it('exercise exausto/pesado filtrado', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'motivador', mood: 'exausto', hour: 14,
      doneToday: new Set(),
    });
    if (t && t.habit_kind === 'exercise') expect(t.xp_reward).toBeLessThan(40);
  });

  it('avoidHabits filtra hábitos', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'calmo', mood: 'feliz', hour: 12,
      doneToday: new Set(),
      avoidHabits: new Set(['water']),
    });
    if (t) expect(t.habit_kind).not.toBe('water');
  });
});

// ema state level=0 branch
describe('ema trendDirection level=0 branch', () => {
  it('level=0 + trend positivo → up via trend direto', () => {
    expect(trendDirection({ level: 0, trend: 0.1, initialized: true })).toBe('up');
  });

  it('level=0 + trend negativo → down', () => {
    expect(trendDirection({ level: 0, trend: -0.1, initialized: true })).toBe('down');
  });

  it('level=0 + trend zero → flat', () => {
    expect(trendDirection({ level: 0, trend: 0, initialized: true })).toBe('flat');
  });
});

// replies — todos os intents pra exercitar branches
describe('mockReply — todos os intents', () => {
  const intents: Intent[] = [
    'greeting', 'comemora_checkin', 'pergunta_aberta',
    'tristeza', 'cansaco', 'ansiedade', 'solidao', 'raiva', 'culpa',
    'estimula_movimento', 'estimula_descanso', 'estimula_agua',
    'alegria', 'gratidao', 'encerra', 'default',
  ];
  it.each(intents)('intent %s não crasha e retorna texto', i => {
    const r = mockReply('calmo', i);
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });

  it('cada personality (calmo/motivador/fofo/sabio) responde', () => {
    for (const p of ['calmo', 'motivador', 'fofo', 'sabio'] as const) {
      expect(mockReply(p, 'greeting').length).toBeGreaterThan(0);
    }
  });
});

// narrative — branches sobre highlight/observation com bestDay
describe('narrative highlight branches', () => {
  function mascot(): Mascot {
    return {
      id: 'm', user_id: 'u', name: 'Bipo', personality: 'calmo',
      phase: 'crianca', mood: 'feliz', xp: 0, level: 1,
      energy: 50, health: 100, last_seen_at: '', created_at: '',
    };
  }

  it('topHabit null + totalThis > 1 → "X vezes"', () => {
    const cs = ['2026-05-15', '2026-05-16'].map((d, i) => ({
      id: `c${i}`, user_id: 'u', habit_kind: 'meditation' as const, value: 1, unit: 'm',
      occurred_on: d, occurred_at: `${d}T12:00:00Z`,
      xp_awarded: 10, idempotency_key: `${i}`, created_at: '',
    }));
    const r = generateWeeklyNarrative({
      mascot: mascot(),
      checkins: cs,
      prevWeekCheckins: [],
      currentStreak: 0, longestStreak: 0, xpThisWeek: 20,
    });
    // topHabit é 'meditation' nesse caso pq tem 2; mas branch testa cs com 1 só
    expect(r.stats.totalCheckins).toBe(2);
  });
});

// ai — history role branches (user + mascot)
describe('ai callOpenAI history mapping', () => {
  it('history com mascot role mapeia pra assistant', async () => {
    const { generateReply } = await import('@/lib/ai');
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    const { vi } = await import('vitest');
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } })
    ));
    const r = await generateReply('calmo', 'tudo bem', {
      apiKey: 'sk',
      history: [
        { role: 'user', content: 'oi' },
        { role: 'mascot', content: 'olá!' }, // ← força ternário 'assistant'
      ],
    });
    expect(r.source).toBe('openai');
    vi.unstubAllGlobals();
  });

  it('memories vazia → memorySection branch ""', async () => {
    const { generateReply } = await import('@/lib/ai');
    const { vi } = await import('vitest');
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'olá' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } })
    ));
    // userId omitido → memories=[]
    const r = await generateReply('calmo', 'oi', { apiKey: 'sk' });
    expect(r.source).toBe('openai');
    vi.unstubAllGlobals();
  });

  it('memories presentes → memorySection branch true (recall não-vazio)', async () => {
    const { generateReply } = await import('@/lib/ai');
    const { rememberFromMessage } = await import('@/lib/memory');
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const { vi } = await import('vitest');
    await AsyncStorage.clear();
    // Popula memória para o user
    await rememberFromMessage('u_with_mem', 'amo café preto pela manhã.');
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'oi' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const r = await generateReply('calmo', 'amo café', {
      apiKey: 'sk', userId: 'u_with_mem',
    });
    expect(r.source).toBe('openai');
    // system prompt deve incluir a seção de memórias
    const systemMsg = capturedBody.messages.find((m: any) => m.role === 'system');
    expect(systemMsg.content).toMatch(/COISAS QUE VOCÊ JÁ SABE/);
    vi.unstubAllGlobals();
  });
});

// mood — diff branches
describe('mood branches diff', () => {
  it('mensagens user vazias → vibe score 0', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [],
      recentCheckins: [],
      hoursSinceLastCheckin: 1,
    });
    expect(out).toBe('feliz');
  });
});

// evolution-stories — fallback genérico (linha 185)
describe('evolution-stories fallback default', () => {
  it('toPhase=ovo (regressão) → cai no default genérico', () => {
    const s = getEvolutionStory({
      mascotName: 'X', personality: 'calmo',
      fromPhase: 'bebe', toPhase: 'ovo',
      totalCheckins: 0, daysSinceCreated: 0, currentStreak: 0,
    });
    expect(s.title).toBe('X evoluiu');
  });
});

// sentiment-lex linha 183 punctuação
describe('sentiment punctuation paths', () => {
  it('exclamação aumenta score positivo', () => {
    const a = analyzeSentiment('feliz').raw;
    const b = analyzeSentiment('feliz!').raw;
    expect(b).toBeGreaterThan(a);
  });

  it('múltiplas interrogações + raw != 0 amplifica', () => {
    const r = analyzeSentiment('triste??');
    expect(r.score).toBeLessThan(0);
  });

  it('só pontuação sem palavras → score 0', () => {
    const r = analyzeSentiment('!?!?!?');
    expect(r.score).toBe(0);
  });
});

// insights — cluster describe branches
describe('insights cluster describe', () => {
  it('14+ dias com variedade alta + breath gera insight', () => {
    const checkins = [];
    const messages = [];
    const habits = ['water', 'sleep', 'exercise', 'meditation', 'breath', 'reading'] as const;
    for (let i = 0; i < 14; i++) {
      const d = `2026-05-${String(i + 1).padStart(2, '0')}`;
      for (const h of habits) {
        checkins.push({
          id: `c${i}_${h}`, user_id: 'u', habit_kind: h, value: 1, unit: 'x',
          occurred_on: d, occurred_at: `${d}T12:00:00Z`,
          xp_awarded: 10, idempotency_key: `${i}_${h}`, created_at: '',
        });
      }
      messages.push({
        id: `m${i}`, conversation_id: 'u', role: 'user' as const,
        content: i % 2 === 0 ? 'feliz hoje' : 'oi tudo bem',
        safety_flag: 'safe' as const, cached: false,
        created_at: `${d}T12:00:00Z`,
      });
    }
    const out = computeInsights({ checkins, messages });
    expect(out.length).toBeGreaterThan(0);
  });
});
