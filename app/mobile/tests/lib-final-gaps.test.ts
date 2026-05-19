/**
 * Tests finais cobrindo edge cases pra fechar branches/uncovered paths
 * residuais (após lib-db-full, lib-mood, lib-themes, etc).
 *
 * Foco em paths defensivos: Bayes custom, classifier branches, evolution-stories,
 * insights pequenos casos.
 */

import { describe, expect, it } from 'vitest';
import { __resetSeedModel, classifySafetyEnsemble } from '@/lib/ml/safety/classifier';
import { createBayes, learn } from '@/lib/ml/text/bayes';
import { getEvolutionStory } from '@/lib/evolution-stories';
import { buildDailyVibes, computeInsights, type InsightContext } from '@/lib/insights';
import type { Checkin, Message } from '@/types';

function chk(kind: Checkin['habit_kind'], dateOffset: number, value = 1): Checkin {
  const d = new Date(Date.now() - dateOffset * 86400000);
  return {
    id: 'c' + Math.random(), user_id: 'u1', habit_kind: kind, value, unit: null,
    occurred_on: d.toISOString().slice(0, 10),
    occurred_at: d.toISOString(), xp_awarded: 10,
    idempotency_key: 'k' + Math.random(),
    created_at: d.toISOString(),
  };
}

describe('classifier: branches restantes', () => {
  it('aceita bayesModel customizado >=20 docs', () => {
    const model = createBayes<'safe' | 'high'>(1);
    // Treina com >= 20 docs pra ativar
    for (let i = 0; i < 12; i++) learn(model, 'feliz tranquilo bom dia', 'safe');
    for (let i = 0; i < 12; i++) learn(model, 'angústia pânico crise', 'high');
    const r = classifySafetyEnsemble('feliz tranquilo bom dia', model);
    expect(r.flag).toBeDefined();
    expect(r.sources.bayes).toBeDefined();
  });

  it('bayesModel com poucos docs (<20) é ignorado', () => {
    const small = createBayes<'safe' | 'high'>(1);
    learn(small, 'olá', 'safe');
    const r = classifySafetyEnsemble('texto neutro qualquer', small);
    // sem bayes (pq totalDocs < 20): bayesFlag indefinido
    expect(r.sources.bayes).toBeUndefined();
  });

  it('seed model é re-criado após __resetSeedModel', () => {
    const r1 = classifySafetyEnsemble('texto random');
    __resetSeedModel();
    const r2 = classifySafetyEnsemble('texto random');
    // Mesma decisão (modelo determinístico do mesmo corpus)
    expect(r1.flag).toBe(r2.flag);
  });
});

describe('evolution-stories', () => {
  const transitions: Array<readonly ['ovo' | 'bebe' | 'crianca' | 'adolescente' | 'adulto' | 'evoluido', 'ovo' | 'bebe' | 'crianca' | 'adolescente' | 'adulto' | 'evoluido']> = [
    ['ovo', 'bebe'],
    ['bebe', 'crianca'],
    ['crianca', 'adolescente'],
    ['adolescente', 'adulto'],
    ['adulto', 'evoluido'],
  ];

  it('retorna story para cada transição conhecida', () => {
    for (const [from, to] of transitions) {
      const s = getEvolutionStory({
        mascotName: 'Lumi',
        personality: 'calmo',
        fromPhase: from,
        toPhase: to,
        totalCheckins: 12,
        daysSinceCreated: 7,
        currentStreak: 3,
      });
      expect(s).toBeTruthy();
      expect(s.title.length).toBeGreaterThan(0);
    }
  });

  it('aceita personalidade variadas sem quebrar', () => {
    const persons = ['calmo', 'motivador', 'fofo', 'sabio'] as const;
    for (const p of persons) {
      const s = getEvolutionStory({
        mascotName: 'Lumi',
        personality: p,
        fromPhase: 'bebe',
        toPhase: 'crianca',
        totalCheckins: 10,
        daysSinceCreated: 5,
        currentStreak: 2,
      });
      expect(s.body.length).toBeGreaterThan(0);
    }
  });
});

describe('insights: edge cases', () => {
  const baseCtx = (overrides: Partial<InsightContext> = {}): InsightContext => ({
    checkins: [],
    messages: [],
    ...overrides,
  });

  it('computeInsights com contexto vazio retorna array', () => {
    const r = computeInsights(baseCtx());
    expect(Array.isArray(r)).toBe(true);
  });

  it('buildDailyVibes com checkins consecutivos', () => {
    const cs = [chk('water', 0), chk('water', 1), chk('water', 2)];
    const v = buildDailyVibes(baseCtx({ checkins: cs }));
    expect(Array.isArray(v)).toBe(true);
  });

  it('computeInsights com 7d de variedade', () => {
    const cs = [
      chk('water', 0), chk('sleep', 1), chk('exercise', 2),
      chk('breath', 3), chk('reading', 4),
    ];
    const r = computeInsights(baseCtx({ checkins: cs }));
    expect(Array.isArray(r)).toBe(true);
  });
});
