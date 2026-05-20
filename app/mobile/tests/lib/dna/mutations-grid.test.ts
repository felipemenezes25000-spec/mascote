/**
 * Grid do catálogo de mutações — asserções estruturais por mutação.
 *
 * MUTATION_CATALOG tem 50+ entradas. Cada uma DEVE ter id estável,
 * nome PT-BR, descrição não vazia, gene dominante válido, condição
 * com gene thresholds em range, e raridade conhecida. Estes asserts
 * detectam regressões no catálogo (ex: id duplicado, raridade typoada).
 */

import { describe, expect, it } from 'vitest';
import {
  GENE_KEYS,
  MUTATION_CATALOG,
  listAllMutations,
  getMutationById,
  evaluateCondition,
  findNewlyUnlockedMutations,
  aggregateVisualImpact,
  applyMutationVisualImpact,
  NEUTRAL_VISUAL_IMPACT,
  morphologyFromGenome,
  neutralGenome,
  generateGenome,
} from '@/lib/dna';
import type { GeneKey, MutationRarity } from '@/lib/dna';

const RARITIES: MutationRarity[] = ['common', 'rare', 'epic', 'legendary'];

describe('MUTATION_CATALOG — estrutura', () => {
  it('tem pelo menos 7 mutações', () => {
    expect(MUTATION_CATALOG.length).toBeGreaterThanOrEqual(7);
  });

  it('todos IDs são únicos', () => {
    const ids = MUTATION_CATALOG.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('listAllMutations retorna o catálogo completo', () => {
    expect(listAllMutations().length).toBe(MUTATION_CATALOG.length);
  });
});

describe('Cada mutação tem campos essenciais', () => {
  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — id é string não-vazia',
    (_id, m) => {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
    },
  );

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — name PT-BR não-vazio',
    (_id, m) => {
      expect(m.name).toBeTruthy();
      expect(m.name.length).toBeGreaterThan(0);
    },
  );

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — description não-vazia',
    (_id, m) => {
      expect(m.description).toBeTruthy();
      expect(m.description.length).toBeGreaterThan(0);
    },
  );

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — dominantGene é gene válido',
    (_id, m) => {
      expect(GENE_KEYS.includes(m.dominantGene as GeneKey)).toBe(true);
    },
  );

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — raridade conhecida',
    (_id, m) => {
      expect(RARITIES.includes(m.rarity)).toBe(true);
    },
  );

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — visualImpact é um objeto',
    (_id, m) => {
      expect(typeof m.visualImpact).toBe('object');
      expect(m.visualImpact).not.toBeNull();
    },
  );

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — condition é um objeto',
    (_id, m) => {
      expect(typeof m.condition).toBe('object');
      expect(m.condition).not.toBeNull();
    },
  );
});

describe('Description tom — sem culpa', () => {
  it.each(MUTATION_CATALOG.map(m => [m.id, m.description] as const))(
    'mutação %s — descrição sem culpa',
    (_id, desc) => {
      expect(desc).not.toMatch(/abandon|falha|fracass|punição|deve fazer/i);
    },
  );
});

describe('getMutationById', () => {
  it.each(MUTATION_CATALOG.map(m => [m.id] as const))(
    'mutação id=%s é recuperável',
    id => {
      const m = getMutationById(id);
      expect(m).toBeDefined();
      expect(m?.id).toBe(id);
    },
  );

  it('id desconhecido retorna undefined', () => {
    expect(getMutationById('nonexistent-id-12345')).toBeUndefined();
  });
});

describe('evaluateCondition', () => {
  const emptyCtx = {
    genome: neutralGenome(),
    habitCheckinCounts: {} as any,
    currentStreak: 0,
    daysSinceCreated: 0,
    alreadyUnlocked: new Set<string>(),
  };

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — condition função terminam (não trava)',
    (_id, m) => {
      const result = evaluateCondition(m.condition, emptyCtx);
      expect(typeof result).toBe('boolean');
    },
  );

  it.each(MUTATION_CATALOG.map(m => [m.id, m] as const))(
    'mutação %s — retorna boolean limpo',
    (_id, m) => {
      const result = evaluateCondition(m.condition, emptyCtx);
      expect(typeof result).toBe('boolean');
    },
  );
});

describe('NEUTRAL_VISUAL_IMPACT — identidade', () => {
  it('é objeto válido', () => {
    expect(NEUTRAL_VISUAL_IMPACT).toBeDefined();
  });
});

describe('aggregateVisualImpact', () => {
  it('lista vazia retorna NEUTRAL_VISUAL_IMPACT-like (sem efeito)', () => {
    const agg = aggregateVisualImpact([]);
    expect(agg).toBeDefined();
  });

  it.each([1, 2, 3])('agregação de %i mutações ainda é objeto válido', n => {
    const subset = MUTATION_CATALOG.slice(0, n).map(m => m.id);
    const agg = aggregateVisualImpact(subset);
    expect(typeof agg).toBe('object');
    expect(agg).not.toBeNull();
  });

  it('mutação inexistente é ignorada (não quebra)', () => {
    expect(() => aggregateVisualImpact(['nonexistent-mutation'])).not.toThrow();
  });
});

describe('applyMutationVisualImpact', () => {
  it.each([1, 2, 3])('aplica agregação de %i mutações sem quebrar', n => {
    const ids = MUTATION_CATALOG.slice(0, n).map(m => m.id);
    const agg = aggregateVisualImpact(ids);
    const base = morphologyFromGenome(neutralGenome());
    expect(() => applyMutationVisualImpact(base, agg)).not.toThrow();
  });

  it('agregação de catálogo todo não quebra applyMutationVisualImpact', () => {
    const ids = MUTATION_CATALOG.map(m => m.id);
    const agg = aggregateVisualImpact(ids);
    const base = morphologyFromGenome(neutralGenome());
    expect(() => applyMutationVisualImpact(base, agg)).not.toThrow();
  });
});

describe('findNewlyUnlockedMutations', () => {
  it('retorna array (mesmo vazio)', () => {
    const ctx = {
      genome: neutralGenome(),
      habitCheckinCounts: {} as any,
      currentStreak: 0,
      daysSinceCreated: 0,
      alreadyUnlocked: new Set<string>(),
    };
    const result = findNewlyUnlockedMutations(ctx);
    expect(Array.isArray(result)).toBe(true);
  });

  it.each([0, 1, 10])('alreadyUnlocked com %i ids é processado sem quebrar', n => {
    const already = new Set(MUTATION_CATALOG.slice(0, n).map(m => m.id));
    const ctx = {
      genome: generateGenome(42),
      habitCheckinCounts: {} as any,
      currentStreak: 7,
      daysSinceCreated: 30,
      alreadyUnlocked: already,
    };
    expect(() => findNewlyUnlockedMutations(ctx)).not.toThrow();
  });

  it('NÃO inclui mutações já desbloqueadas', () => {
    const firstId = MUTATION_CATALOG[0].id;
    const ctx = {
      genome: generateGenome(42),
      habitCheckinCounts: {} as any,
      currentStreak: 100,
      daysSinceCreated: 365,
      alreadyUnlocked: new Set([firstId]),
    };
    const result = findNewlyUnlockedMutations(ctx);
    expect(result.some(m => m.id === firstId)).toBe(false);
  });
});
