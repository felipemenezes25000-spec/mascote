import { describe, expect, it } from 'vitest';
import {
  MUTATION_CATALOG,
  evaluateCondition,
  findNewlyUnlockedMutations,
  type MutationContext,
} from '@/lib/dna/mutations';
import { neutralGenome } from '@/lib/dna/genome';

describe('MUTATION_CATALOG expandido', () => {
  it('tem 50 ou mais mutações', () => {
    expect(MUTATION_CATALOG.length).toBeGreaterThanOrEqual(50);
  });

  it('IDs únicos no catálogo completo', () => {
    const ids = MUTATION_CATALOG.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mutação de streak desbloqueia com contexto adequado', () => {
    const ctx: MutationContext = {
      genome: neutralGenome(),
      habitCheckinCounts: {},
      currentStreak: 7,
      daysSinceCreated: 10,
      alreadyUnlocked: new Set(),
    };
    const found = findNewlyUnlockedMutations(ctx);
    expect(found.some(m => m.id === 'mut.streak.7')).toBe(true);
  });

  it('mutação de hábito exige gene e check-ins (AND)', () => {
    const m = MUTATION_CATALOG.find(x => x.id === 'mut.habit.water.t1');
    expect(m).toBeDefined();
    const failGene: MutationContext = {
      genome: neutralGenome(),
      habitCheckinCounts: { water: 10 },
      currentStreak: 0,
      daysSinceCreated: 30,
      alreadyUnlocked: new Set(),
    };
    expect(evaluateCondition(m!.condition, failGene)).toBe(false);
  });
});
