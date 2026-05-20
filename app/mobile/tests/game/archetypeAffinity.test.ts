import { describe, expect, it } from 'vitest';
import {
  archetypeAffinities,
  ARCHETYPE_IDS,
  dominantArchetype,
} from '@/game/evolution/archetypeAffinity';
import { GENE_KEYS, type Genome } from '@/lib/dna/genome';

function genome(partial: Partial<Genome>): Genome {
  const out = {} as Genome;
  for (const k of GENE_KEYS) {
    out[k] = partial[k] ?? 0.5;
  }
  return out;
}

describe('archetypeAffinity', () => {
  it('soma percentuais ≈ 1', () => {
    const g = genome({ empathy: 0.9, emotionalDepth: 0.8 });
    const list = archetypeAffinities(g);
    const sum = list.reduce((s, a) => s + a.percent, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it('inclui todos os arquétipos', () => {
    const g = genome({});
    const list = archetypeAffinities(g);
    expect(list).toHaveLength(ARCHETYPE_IDS.length);
    const ids = new Set(list.map(a => a.id));
    for (const id of ARCHETYPE_IDS) expect(ids.has(id)).toBe(true);
  });

  it('mascote empático/emocional é mais Lumina/Flora', () => {
    const g = genome({ empathy: 0.95, emotionalDepth: 0.9, socialEnergy: 0.8 });
    const top = dominantArchetype(g);
    expect(['lumina', 'flora']).toContain(top.id);
  });

  it('mascote disciplinado/inteligente é mais Cristal/Cosmos', () => {
    const g = genome({ discipline: 0.95, intelligence: 0.9, creativity: 0.6 });
    const top = dominantArchetype(g);
    expect(['cristal', 'cosmos']).toContain(top.id);
  });

  it('determinístico — mesmo input → mesmo output', () => {
    const g = genome({ curiosity: 0.85, chaos: 0.6 });
    const a = archetypeAffinities(g);
    const b = archetypeAffinities(g);
    expect(a).toEqual(b);
  });

  it('ordena do maior pro menor percent', () => {
    const g = genome({ resilience: 0.95, discipline: 0.9 });
    const list = archetypeAffinities(g);
    for (let i = 0; i < list.length - 1; i++) {
      expect(list[i].percent).toBeGreaterThanOrEqual(list[i + 1].percent);
    }
  });
});
