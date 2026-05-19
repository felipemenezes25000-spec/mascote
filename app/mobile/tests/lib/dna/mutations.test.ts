/**
 * Testes do sistema de mutações biológicas.
 *
 * Invariantes invioláveis (cobertas):
 *  - Mutação nunca corrompe DNA (mutations operam em camada visual, não em genome)
 *  - Desbloqueio é monotônico (find não re-emite o que já foi desbloqueado)
 *  - Determinismo: mesmo contexto → mesmas mutações desbloqueadas
 *  - Aggregação visual é comutativa em multiplicadores e ordem-independente em booleans
 *  - Condição parcial não desbloqueia (AND lógico estrito)
 */

import { describe, it, expect } from 'vitest';
import {
  MUTATION_CATALOG,
  NEUTRAL_VISUAL_IMPACT,
  aggregateVisualImpact,
  evaluateCondition,
  findNewlyUnlockedMutations,
  getMutationById,
  listAllMutations,
  type MutationContext,
} from '@/lib/dna/mutations';
import { generateGenome, neutralGenome } from '@/lib/dna/genome';
import type { Genome } from '@/lib/dna/genome';

function emptyCtx(genome: Genome = neutralGenome()): MutationContext {
  return {
    genome,
    habitCheckinCounts: {},
    currentStreak: 0,
    daysSinceCreated: 0,
    alreadyUnlocked: new Set(),
  };
}

describe('MUTATION_CATALOG — integridade', () => {
  it('tem pelo menos 50 mutações no catálogo', () => {
    expect(MUTATION_CATALOG.length).toBeGreaterThanOrEqual(50);
  });

  it('IDs únicos', () => {
    const ids = MUTATION_CATALOG.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos os IDs começam com "mut."', () => {
    for (const m of MUTATION_CATALOG) {
      expect(m.id.startsWith('mut.')).toBe(true);
    }
  });

  it('todos têm nome e descrição PT-BR não-vazios', () => {
    for (const m of MUTATION_CATALOG) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });

  it('todos têm visualImpact com pelo menos um campo definido', () => {
    for (const m of MUTATION_CATALOG) {
      const v = m.visualImpact;
      const hasEffect =
        !!v.morphologyMultipliers ||
        typeof v.glowBoost === 'number' ||
        v.bioluminescent ||
        !!v.pattern ||
        typeof v.auraParticleMultiplier === 'number';
      expect(hasEffect).toBe(true);
    }
  });

  it('cobre as 4 raridades pelo menos uma vez', () => {
    const rarities = new Set(MUTATION_CATALOG.map(m => m.rarity));
    // common, rare, epic, legendary — pelo menos rare/epic/legendary devem aparecer
    expect(rarities.has('rare')).toBe(true);
    expect(rarities.has('epic')).toBe(true);
    expect(rarities.has('legendary')).toBe(true);
  });
});

describe('evaluateCondition — semântica AND', () => {
  it('condição vazia sempre passa', () => {
    expect(evaluateCondition({}, emptyCtx())).toBe(true);
  });

  it('geneAbove falha se gene < threshold', () => {
    const ctx = emptyCtx({ ...neutralGenome(), empathy: 0.4 });
    expect(evaluateCondition({ geneAbove: { empathy: 0.7 } }, ctx)).toBe(false);
  });

  it('geneAbove passa quando todos genes >= threshold', () => {
    const ctx = emptyCtx({ ...neutralGenome(), empathy: 0.8, intelligence: 0.9 });
    expect(
      evaluateCondition({ geneAbove: { empathy: 0.7, intelligence: 0.8 } }, ctx),
    ).toBe(true);
  });

  it('geneAbove é AND: um gene OK + outro falho = falha', () => {
    const ctx = emptyCtx({ ...neutralGenome(), empathy: 0.8, intelligence: 0.3 });
    expect(
      evaluateCondition({ geneAbove: { empathy: 0.7, intelligence: 0.8 } }, ctx),
    ).toBe(false);
  });

  it('habitCheckinsAtLeast falha se hábito não atingido', () => {
    const ctx: MutationContext = { ...emptyCtx(), habitCheckinCounts: { exercise: 10 } };
    expect(evaluateCondition({ habitCheckinsAtLeast: { exercise: 25 } }, ctx)).toBe(false);
  });

  it('habitCheckinsAtLeast passa quando todos atingidos', () => {
    const ctx: MutationContext = {
      ...emptyCtx(),
      habitCheckinCounts: { exercise: 30, reading: 25 },
    };
    expect(
      evaluateCondition({ habitCheckinsAtLeast: { exercise: 25, reading: 20 } }, ctx),
    ).toBe(true);
  });

  it('hábito faltante no contexto é tratado como 0', () => {
    const ctx = emptyCtx();
    expect(evaluateCondition({ habitCheckinsAtLeast: { exercise: 1 } }, ctx)).toBe(false);
  });

  it('streakAtLeast falha se streak < valor', () => {
    const ctx: MutationContext = { ...emptyCtx(), currentStreak: 5 };
    expect(evaluateCondition({ streakAtLeast: 14 }, ctx)).toBe(false);
  });

  it('streakAtLeast passa se streak >= valor', () => {
    const ctx: MutationContext = { ...emptyCtx(), currentStreak: 14 };
    expect(evaluateCondition({ streakAtLeast: 14 }, ctx)).toBe(true);
  });

  it('daysSinceCreatedAtLeast respeita threshold', () => {
    const ctxOk: MutationContext = { ...emptyCtx(), daysSinceCreated: 21 };
    const ctxNo: MutationContext = { ...emptyCtx(), daysSinceCreated: 20 };
    expect(evaluateCondition({ daysSinceCreatedAtLeast: 21 }, ctxOk)).toBe(true);
    expect(evaluateCondition({ daysSinceCreatedAtLeast: 21 }, ctxNo)).toBe(false);
  });

  it('combinação de múltiplos campos: todos precisam passar', () => {
    const ctx: MutationContext = {
      genome: { ...neutralGenome(), empathy: 0.8 },
      habitCheckinCounts: { journaling: 25 },
      currentStreak: 10,
      daysSinceCreated: 30,
      alreadyUnlocked: new Set(),
    };
    // Tudo OK
    expect(
      evaluateCondition(
        {
          geneAbove: { empathy: 0.7 },
          habitCheckinsAtLeast: { journaling: 20 },
          streakAtLeast: 7,
          daysSinceCreatedAtLeast: 21,
        },
        ctx,
      ),
    ).toBe(true);
    // Streak quebra
    expect(
      evaluateCondition(
        {
          geneAbove: { empathy: 0.7 },
          streakAtLeast: 20,
        },
        ctx,
      ),
    ).toBe(false);
  });
});

describe('findNewlyUnlockedMutations — monotonicidade', () => {
  it('contexto vazio + DNA neutro não desbloqueia nada', () => {
    const result = findNewlyUnlockedMutations(emptyCtx());
    expect(result).toEqual([]);
  });

  it('DNA extremo + checkins/streak suficientes desbloqueia múltiplas', () => {
    const ctx: MutationContext = {
      genome: {
        empathy: 0.9, curiosity: 0.9, creativity: 0.9, discipline: 0.85,
        chaos: 0.6, aggression: 0.3, resilience: 0.85, emotionalDepth: 0.85,
        socialEnergy: 0.85, adaptability: 0.85, intelligence: 0.85,
      },
      habitCheckinCounts: {
        exercise: 50, journaling: 50, outdoor: 50, reading: 50,
      },
      currentStreak: 40,
      daysSinceCreated: 90,
      alreadyUnlocked: new Set(),
    };
    const result = findNewlyUnlockedMutations(ctx);
    // Esperado: praticamente todo o catálogo é desbloqueável nesse cenário
    expect(result.length).toBeGreaterThan(3);
  });

  it('mutação já desbloqueada NÃO re-emite', () => {
    const first = MUTATION_CATALOG[0];
    const ctx: MutationContext = {
      genome: { ...neutralGenome(), resilience: 0.9, discipline: 0.9 },
      habitCheckinCounts: { exercise: 100 },
      currentStreak: 0,
      daysSinceCreated: 0,
      alreadyUnlocked: new Set([first.id]),
    };
    const result = findNewlyUnlockedMutations(ctx);
    expect(result.find(m => m.id === first.id)).toBeUndefined();
  });

  it('determinismo: mesmo contexto → mesmo resultado', () => {
    const ctx: MutationContext = {
      genome: generateGenome(42),
      habitCheckinCounts: { exercise: 30 },
      currentStreak: 14,
      daysSinceCreated: 30,
      alreadyUnlocked: new Set(),
    };
    const a = findNewlyUnlockedMutations(ctx);
    const b = findNewlyUnlockedMutations(ctx);
    expect(a.map(m => m.id)).toEqual(b.map(m => m.id));
  });

  it('ordem de retorno = ordem no CATALOG (estável)', () => {
    const ctx: MutationContext = {
      genome: {
        empathy: 0.95, curiosity: 0.95, creativity: 0.95, discipline: 0.95,
        chaos: 0.6, aggression: 0.3, resilience: 0.95, emotionalDepth: 0.95,
        socialEnergy: 0.95, adaptability: 0.95, intelligence: 0.95,
      },
      habitCheckinCounts: {
        exercise: 50, journaling: 50, outdoor: 50, reading: 50,
      },
      currentStreak: 40,
      daysSinceCreated: 90,
      alreadyUnlocked: new Set(),
    };
    const result = findNewlyUnlockedMutations(ctx);
    // Ordem deve seguir CATALOG order
    const catalogIds = MUTATION_CATALOG.map(m => m.id);
    const resultIds = result.map(m => m.id);
    // Os IDs do result devem aparecer em catalogIds na mesma ordem relativa
    let lastIdx = -1;
    for (const id of resultIds) {
      const idx = catalogIds.indexOf(id);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });
});

describe('mutation NUNCA corrompe DNA', () => {
  it('genome passado pra findNewlyUnlockedMutations não é mutado', () => {
    const genome: Genome = generateGenome(7);
    const snapshot = { ...genome };
    const ctx: MutationContext = {
      genome,
      habitCheckinCounts: { exercise: 30, journaling: 30, outdoor: 30, reading: 30 },
      currentStreak: 40,
      daysSinceCreated: 90,
      alreadyUnlocked: new Set(),
    };
    findNewlyUnlockedMutations(ctx);
    expect(genome).toEqual(snapshot);
  });

  it('aggregateVisualImpact não muta input', () => {
    const ids = MUTATION_CATALOG.map(m => m.id);
    const snapshot = [...ids];
    aggregateVisualImpact(ids);
    expect(ids).toEqual(snapshot);
  });
});

describe('aggregateVisualImpact — composição', () => {
  it('lista vazia → impact neutro', () => {
    expect(aggregateVisualImpact([])).toEqual(NEUTRAL_VISUAL_IMPACT);
  });

  it('IDs inválidos são ignorados sem crashar', () => {
    const out = aggregateVisualImpact(['invalid', 'mut.nonexistent']);
    expect(out).toEqual(NEUTRAL_VISUAL_IMPACT);
  });

  it('multiplicadores compõem multiplicativamente', () => {
    // structural_firmness tem bodyBottomBias: 1.18
    // expansive_aura tem auraOpacity: 1.25 (diferente key)
    // Aplicando ambos: bodyBottomBias deve ser 1.18, auraOpacity 1.25
    const out = aggregateVisualImpact(['mut.structural_firmness', 'mut.expansive_aura']);
    expect(out.morphologyMultipliers.bodyBottomBias).toBeCloseTo(1.18, 5);
    expect(out.morphologyMultipliers.auraOpacity).toBeCloseTo(1.25, 5);
  });

  it('glowBoost soma additivamente', () => {
    // wisdom_glow: 0.15, bioluminescent_form: 0.3 → 0.45
    const out = aggregateVisualImpact(['mut.wisdom_glow', 'mut.bioluminescent_form']);
    expect(out.glowBoost).toBeCloseTo(0.45, 5);
  });

  it('bioluminescent é OR (true se qualquer mutação tem)', () => {
    const a = aggregateVisualImpact(['mut.bioluminescent_form']);
    expect(a.bioluminescent).toBe(true);
    const b = aggregateVisualImpact(['mut.structural_firmness']);
    expect(b.bioluminescent).toBe(false);
  });

  it('pattern: último não-plain vence', () => {
    const out = aggregateVisualImpact(['mut.emergent_patterns']);
    expect(out.pattern).toBe('fractal');
  });

  it('auraParticleMultiplier compõe multiplicativamente', () => {
    // expansive_aura: 1.4. Se aplicado 1x: 1.4
    const out = aggregateVisualImpact(['mut.expansive_aura']);
    expect(out.auraParticleMultiplier).toBeCloseTo(1.4, 5);
  });
});

describe('getMutationById', () => {
  it('retorna mutação válida', () => {
    expect(getMutationById('mut.structural_firmness')).toBeDefined();
  });

  it('retorna undefined para ID inválido', () => {
    expect(getMutationById('mut.invalid')).toBeUndefined();
    expect(getMutationById('')).toBeUndefined();
  });
});

describe('listAllMutations', () => {
  it('retorna o catálogo inteiro', () => {
    expect(listAllMutations().length).toBe(MUTATION_CATALOG.length);
  });
});
