/**
 * Testes do Behavior Engine — seletor utility AI.
 *
 * Invariantes cobertas:
 *  - Seleciona maior score, tie-break = first wins
 *  - Cooldown filtra sem competir
 *  - Pontuações inválidas (NaN, Infinity, negativo) viram 0
 *  - selectBehavior é PURO (não muta input)
 *  - computeCooldownSet detecta corretamente quem está em cooldown
 */

import { describe, expect, it } from 'vitest';
import {
  computeCooldownSet,
  executeBehavior,
  selectBehavior,
  DEFAULT_BEHAVIORS,
  idleBreath,
  reactToReturn,
  streakMilestone,
  quietObservation,
  sleepAtNight,
  wakeMorning,
  yawnIdle,
  observeUser,
  type Behavior,
  type BehaviorContext,
} from '@/lib/behavior';
import { neutralGenome } from '@/lib/dna/genome';
import type { Mascot } from '@/types';

function makeCtx(partial: Partial<BehaviorContext> = {}): BehaviorContext {
  const mascot: Mascot = {
    id: 'm_1',
    user_id: 'u_1',
    name: 'Test',
    personality: 'calmo',
    phase: 'bebe',
    mood: 'ok',
    xp: 0,
    level: 1,
    energy: 80,
    health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  return {
    mascot,
    genome: neutralGenome(),
    mood: 'ok',
    hoursSinceLastInteraction: 0,
    streakCurrent: 0,
    hour: 12,
    reduceMotion: false,
    cooldownActive: new Set(),
    lastRanAt: new Map(),
    ...partial,
  };
}

describe('selectBehavior — utility AI scoring', () => {
  it('lista vazia → behavior null, score 0', () => {
    const sel = selectBehavior([], makeCtx());
    expect(sel.behavior).toBeNull();
    expect(sel.score).toBe(0);
  });

  it('só idleBreath disponível → seleciona idle', () => {
    const sel = selectBehavior([idleBreath], makeCtx());
    expect(sel.behavior?.id).toBe(idleBreath.id);
    expect(sel.score).toBeCloseTo(0.1);
  });

  it('streak milestone vence idle quando dispara', () => {
    const ctx = makeCtx({ streakCurrent: 7 });
    const sel = selectBehavior(DEFAULT_BEHAVIORS, ctx);
    expect(sel.behavior?.id).toBe(streakMilestone.id);
    expect(sel.score).toBe(1);
  });

  it('react_to_return vence idle quando ausência longa', () => {
    const ctx = makeCtx({ hoursSinceLastInteraction: 48 });
    const sel = selectBehavior(DEFAULT_BEHAVIORS, ctx);
    expect(sel.behavior?.id).toBe(reactToReturn.id);
    expect(sel.score).toBeGreaterThan(0.7);
  });

  it('quiet_observation dispara durante noite', () => {
    const ctx = makeCtx({ hour: 23 });
    const sel = selectBehavior([quietObservation, idleBreath], ctx);
    expect(sel.behavior?.id).toBe(quietObservation.id);
  });

  it('quiet_observation NÃO dispara durante o dia', () => {
    const ctx = makeCtx({ hour: 14 });
    const sel = selectBehavior([quietObservation, idleBreath], ctx);
    expect(sel.behavior?.id).toBe(idleBreath.id);
  });

  it('sleep_at_night dispara de madrugada com energia baixa', () => {
    const ctx = makeCtx({ hour: 1, mascot: { ...makeCtx().mascot, energy: 22 }, mood: 'exausto' });
    const sel = selectBehavior([sleepAtNight, idleBreath], ctx);
    expect(sel.behavior?.id).toBe(sleepAtNight.id);
  });

  it('wake_morning dispara na manhã', () => {
    const ctx = makeCtx({ hour: 8 });
    const sel = selectBehavior([wakeMorning, idleBreath], ctx);
    expect(sel.behavior?.id).toBe(wakeMorning.id);
  });

  it('yawn idle respeita reduce motion fallback', () => {
    const ctx = makeCtx({
      hour: 23,
      mascot: { ...makeCtx().mascot, energy: 20 },
      reduceMotion: true,
    });
    const eff = executeBehavior(yawnIdle, ctx);
    expect(eff.animation).toBe('breath_deep');
  });

  it('observe_user ganha prioridade com pet recente', () => {
    const sel = selectBehavior(
      [observeUser, idleBreath],
      makeCtx({ hoursSinceLastInteraction: 1, reactiveFlags: { pet: true } }),
    );
    expect(sel.behavior?.id).toBe(observeUser.id);
  });

  it('cooldown filtra behavior — não compete', () => {
    const ctx = makeCtx({
      hour: 23,
      cooldownActive: new Set([quietObservation.id]),
    });
    const sel = selectBehavior([quietObservation, idleBreath], ctx);
    expect(sel.behavior?.id).toBe(idleBreath.id);
    // quiet score deve ter sido marcado como 0
    expect(sel.scoresById[quietObservation.id]).toBe(0);
  });

  it('múltiplos triggers — milestone tem prioridade (score 1.0)', () => {
    const ctx = makeCtx({
      streakCurrent: 7,
      hoursSinceLastInteraction: 48,
      hour: 23,
    });
    const sel = selectBehavior(DEFAULT_BEHAVIORS, ctx);
    expect(sel.behavior?.id).toBe(streakMilestone.id);
  });

  it('score NaN/Infinity/negativo é tratado como 0', () => {
    const badBehavior: Behavior = {
      id: 'test.bad',
      kind: 'idle',
      cooldownSeconds: 0,
      score: () => Number.NaN,
      execute: () => ({}),
    };
    const sel = selectBehavior([badBehavior], makeCtx());
    expect(sel.behavior).toBeNull();
    expect(sel.score).toBe(0);
  });

  it('score > 1 é clampado em 1', () => {
    const cheater: Behavior = {
      id: 'test.cheater',
      kind: 'idle',
      cooldownSeconds: 0,
      score: () => 999,
      execute: () => ({}),
    };
    const sel = selectBehavior([cheater, streakMilestone], makeCtx({ streakCurrent: 7 }));
    // Cheater clampado em 1, streakMilestone também 1 → tie → first wins
    expect(sel.score).toBe(1);
    expect(sel.behavior?.id).toBe(cheater.id);
  });

  it('NUNCA muta o array de behaviors passado', () => {
    const list = [...DEFAULT_BEHAVIORS];
    const snapshot = [...list];
    selectBehavior(list, makeCtx({ streakCurrent: 7 }));
    expect(list).toEqual(snapshot);
  });

  it('determinístico — mesmo ctx → mesma seleção', () => {
    const ctx = makeCtx({ hoursSinceLastInteraction: 30 });
    const a = selectBehavior(DEFAULT_BEHAVIORS, ctx);
    const b = selectBehavior(DEFAULT_BEHAVIORS, ctx);
    expect(a.behavior?.id).toBe(b.behavior?.id);
    expect(a.score).toBe(b.score);
  });
});

describe('executeBehavior — efeitos puros', () => {
  it('idleBreath emite breath_deep', () => {
    const eff = executeBehavior(idleBreath, makeCtx());
    expect(eff.animation).toBe('breath_deep');
  });

  it('streakMilestone gera message com contagem de dias', () => {
    const eff = executeBehavior(streakMilestone, makeCtx({ streakCurrent: 14 }));
    expect(eff.animation).toBe('celebrate');
    expect(eff.message).toContain('14');
  });

  it('streakMilestone semana 1 tem tom calmo (sem número grande)', () => {
    const eff = executeBehavior(streakMilestone, makeCtx({ streakCurrent: 7 }));
    expect(eff.message).toContain('Sete');
  });

  it('reactToReturn varia message com tempo de ausência', () => {
    const short = executeBehavior(reactToReturn, makeCtx({ hoursSinceLastInteraction: 24 }));
    const long = executeBehavior(reactToReturn, makeCtx({ hoursSinceLastInteraction: 80 }));
    expect(short.message).not.toEqual(long.message);
  });

  it('reactToReturn NUNCA usa tom de cobrança', () => {
    for (const hours of [24, 48, 72, 96]) {
      const eff = executeBehavior(reactToReturn, makeCtx({ hoursSinceLastInteraction: hours }));
      const msg = eff.message?.toLowerCase() ?? '';
      // Sem palavras de culpa/cobrança
      expect(msg).not.toMatch(/sumiu|abandonou|cadê|onde|culpa|esqueceu/);
    }
  });
});

describe('computeCooldownSet — detecção temporal', () => {
  it('vazio quando nenhum behavior já rodou', () => {
    const out = computeCooldownSet(DEFAULT_BEHAVIORS, new Map(), Date.now());
    expect(out.size).toBe(0);
  });

  it('detecta behavior em cooldown', () => {
    const now = Date.now();
    // idleBreath: cooldown 12s. Rodou 5s atrás → em cooldown.
    const lastRan = new Map([[idleBreath.id, now - 5000]]);
    const out = computeCooldownSet(DEFAULT_BEHAVIORS, lastRan, now);
    expect(out.has(idleBreath.id)).toBe(true);
  });

  it('cooldown expira após cooldownSeconds', () => {
    const now = Date.now();
    // idleBreath rodou 20s atrás (cooldown 12s) → NÃO em cooldown
    const lastRan = new Map([[idleBreath.id, now - 20000]]);
    const out = computeCooldownSet(DEFAULT_BEHAVIORS, lastRan, now);
    expect(out.has(idleBreath.id)).toBe(false);
  });

  it('streakMilestone cooldown de 24h respeitado', () => {
    const now = Date.now();
    const lastRan = new Map([[streakMilestone.id, now - 6 * 60 * 60 * 1000]]);
    const out = computeCooldownSet([streakMilestone], lastRan, now);
    expect(out.has(streakMilestone.id)).toBe(true);
  });
});

describe('Behaviors — princípios invioláveis', () => {
  it('NENHUM behavior tem cooldown negativo', () => {
    for (const b of DEFAULT_BEHAVIORS) {
      expect(b.cooldownSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it('TODOS retornam score em [0, 1] (após selectBehavior clamp)', () => {
    const ctxes = [
      makeCtx({}),
      makeCtx({ streakCurrent: 7, hour: 23, hoursSinceLastInteraction: 100 }),
      makeCtx({ streakCurrent: 21, hour: 3 }),
    ];
    for (const ctx of ctxes) {
      const sel = selectBehavior(DEFAULT_BEHAVIORS, ctx);
      expect(sel.score).toBeGreaterThanOrEqual(0);
      expect(sel.score).toBeLessThanOrEqual(1);
    }
  });

  it('IDs estáveis com prefixo namespaced', () => {
    for (const b of DEFAULT_BEHAVIORS) {
      // Prefixes válidos: kind (idle/reactive/milestone/temporal) ou
      // 'dna' (behaviors DNA-driven que escalam score com genoma)
      expect(b.id).toMatch(/^(idle|reactive|milestone|temporal|dna)\./);
    }
  });
});
