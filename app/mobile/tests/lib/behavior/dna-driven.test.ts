/**
 * Invariante: Behavior Engine escolhe comportamentos diferentes por DNA.
 *
 * O brief DLI exige que criaturas com personalidades genéticas distintas
 * SE COMPORTEM diferente — não só visualmente. Comportamentos como
 * `expressSocialBurst` e `quietContemplation` têm score function DNA-driven
 * que produz seleções distintas pro engine.
 *
 * Esse teste prova que infraestrutura suporta diferenciação. Os behaviors
 * concretos podem ser expandidos no futuro — o engine já lê DNA do contexto.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BEHAVIORS,
  expressSocialBurst,
  quietContemplation,
  selectBehavior,
  type BehaviorContext,
} from '@/lib/behavior';
import { neutralGenome, type Genome } from '@/lib/dna/genome';
import type { Mascot } from '@/types';

function makeMascot(): Mascot {
  return {
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
}

function makeCtx(genome: Genome): BehaviorContext {
  return {
    mascot: makeMascot(),
    genome,
    mood: 'ok',
    hoursSinceLastInteraction: 1,
    streakCurrent: 3,
    hour: 14, // tarde — quietObservation não dispara
    cooldownActive: new Set(),
    lastRanAt: new Map(),
  };
}

describe('Invariante: behavior engine escolhe diferente por DNA', () => {
  it('socialEnergy alto → expressSocialBurst score > 0', () => {
    const ctx = makeCtx({ ...neutralGenome(), socialEnergy: 0.9 });
    const score = expressSocialBurst.score(ctx);
    expect(score).toBeGreaterThan(0);
  });

  it('socialEnergy baixo → expressSocialBurst score baixo', () => {
    const ctx = makeCtx({ ...neutralGenome(), socialEnergy: 0.1 });
    const score = expressSocialBurst.score(ctx);
    expect(score).toBeLessThan(0.1);
  });

  it('socialEnergy alto SUPERA idleBreath na seleção', () => {
    const ctx = makeCtx({ ...neutralGenome(), socialEnergy: 0.95 });
    const sel = selectBehavior(DEFAULT_BEHAVIORS, ctx);
    // Não deve ser idleBreath (que vale 0.1) — algum DNA-driven deve vencer
    expect(sel.behavior?.id).not.toBe('idle.breath');
    expect(sel.score).toBeGreaterThan(0.3);
  });

  it('intelligence + discipline altos → quietContemplation score > 0', () => {
    const ctx = makeCtx({
      ...neutralGenome(),
      intelligence: 0.85,
      discipline: 0.85,
    });
    expect(quietContemplation.score(ctx)).toBeGreaterThan(0);
  });

  it('só um dos dois alto → quietContemplation NÃO dispara (precisa AMBOS)', () => {
    const ctx = makeCtx({
      ...neutralGenome(),
      intelligence: 0.95,
      discipline: 0.3, // só intelligence — combined < 0.6 threshold
    });
    expect(quietContemplation.score(ctx)).toBe(0);
  });

  it('2 criaturas diferentes no MESMO contexto temporal → seleções diferentes', () => {
    // Criatura A: social alta
    const ctxA = makeCtx({ ...neutralGenome(), socialEnergy: 0.95 });
    const selA = selectBehavior(DEFAULT_BEHAVIORS, ctxA);
    // Criatura B: intelligence + discipline altos
    const ctxB = makeCtx({
      ...neutralGenome(),
      socialEnergy: 0.2, // baixo
      intelligence: 0.9,
      discipline: 0.9,
    });
    const selB = selectBehavior(DEFAULT_BEHAVIORS, ctxB);
    // Devem selecionar behaviors DIFERENTES
    expect(selA.behavior?.id).not.toBe(selB.behavior?.id);
  });

  it('determinístico — mesmo DNA → mesma seleção sempre', () => {
    const genome = { ...neutralGenome(), socialEnergy: 0.9 };
    const ctx1 = makeCtx(genome);
    const ctx2 = makeCtx(genome);
    const sel1 = selectBehavior(DEFAULT_BEHAVIORS, ctx1);
    const sel2 = selectBehavior(DEFAULT_BEHAVIORS, ctx2);
    expect(sel1.behavior?.id).toBe(sel2.behavior?.id);
  });

  it('behaviors DNA-driven respeitam cooldown como qualquer outro', () => {
    const ctx = makeCtx({ ...neutralGenome(), socialEnergy: 0.95 });
    const ctxWithCooldown: BehaviorContext = {
      ...ctx,
      cooldownActive: new Set([expressSocialBurst.id]),
    };
    const sel = selectBehavior(DEFAULT_BEHAVIORS, ctxWithCooldown);
    expect(sel.behavior?.id).not.toBe(expressSocialBurst.id);
  });

  it('execute() retorna efeito esperado por behavior DNA-driven', () => {
    const ctx = makeCtx({ ...neutralGenome(), socialEnergy: 0.9 });
    const eff = expressSocialBurst.execute(ctx);
    expect(eff.animation).toBeDefined();
    expect(eff.message).toBeDefined();
  });
});
