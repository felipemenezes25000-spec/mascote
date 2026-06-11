/**
 * Cosmos de Criaturas — o ovo choca em qualquer bicho, decidido pelas ações.
 *
 * Invariantes:
 * - >10.000 modelos COERENTES (na real, milhões) — prova combinatória.
 * - Derivação é função PURA do genoma (mesmo DNA → mesma criatura).
 * - Todo traço escolhido pertence ao pool do arquétipo (coerência garantida).
 * - Ações importam: genomas diferentes produzem espécies diferentes; drift de
 *   hábito muda a espécie ao longo do tempo.
 * - NaN/genoma ausente → gosminha neutra, sem crash.
 * - Renderiza sem erro pra qualquer arquétipo.
 */

import { describe, expect, it } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import {
  ARCHETYPES, ARCHETYPE_IDS,
  archetypeFromGenome, countCoherentCreatures, creatureFingerprint,
  creatureGenomeFromDNA,
} from '@/game/creatures';
import { CreatureRenderer } from '@/components/mascot/CreatureRenderer';
import { applyHabitDrift } from '@/lib/dna/habitToGene';
import { genomeFromPreset, genomeForPersonality } from '@/lib/dna';
import type { Genome } from '@/lib/dna/genome';
import type { MascotDNA } from '@/types';

const neutral: Genome = {
  empathy: 0.5, curiosity: 0.5, creativity: 0.5, discipline: 0.5, chaos: 0.5,
  aggression: 0.5, resilience: 0.5, emotionalDepth: 0.5, socialEnergy: 0.5,
  adaptability: 0.5, intelligence: 0.5,
};

function gene(over: Partial<Genome>): Genome {
  return { ...neutral, ...over };
}

describe('contagem — o cosmos tem MUITO mais que 10 mil', () => {
  it('countCoherentCreatures > 10000 (com folga enorme)', () => {
    const total = countCoherentCreatures();
    expect(total).toBeGreaterThan(10_000);
    // Sanidade: na casa das centenas de milhares pra cima.
    expect(total).toBeGreaterThan(100_000);
  });
});

describe('coerência — todo traço pertence ao pool do arquétipo', () => {
  it('1000 genomas aleatórios produzem criaturas 100% coerentes', () => {
    for (let i = 0; i < 1000; i++) {
      const g = genomeFromPreset(i * 101 + 7, genomeForPersonality(['calmo', 'motivador', 'fofo', 'sabio'][i % 4] as never), 0.4) as Genome;
      const c = creatureGenomeFromDNA(g);
      const spec = ARCHETYPES[c.archetype];
      expect(spec.bodyPlans).toContain(c.bodyPlan);
      expect(spec.ears).toContain(c.ears);
      expect(spec.eyes).toContain(c.eyes);
      expect(spec.snouts).toContain(c.snout);
      expect(spec.tails).toContain(c.tail);
      expect(spec.wings).toContain(c.wings);
      expect(spec.crowns).toContain(c.crown);
      expect(spec.patterns).toContain(c.pattern);
      expect(spec.limbs).toContain(c.limbs);
      expect(spec.sizes).toContain(c.size);
      expect(c.speciesName.length).toBeGreaterThan(2);
      expect(c.palette.body).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('pureza e determinismo', () => {
  it('mesmo genoma → criatura idêntica', () => {
    const g = gene({ empathy: 0.7, curiosity: 0.3 });
    const a = creatureFingerprint(creatureGenomeFromDNA(g));
    const b = creatureFingerprint(creatureGenomeFromDNA({ ...g }));
    expect(a).toBe(b);
  });

  it('genoma ausente/NaN → gosminha neutra, sem crash', () => {
    expect(creatureGenomeFromDNA(null).speciesName.length).toBeGreaterThan(2);
    expect(creatureGenomeFromDNA(undefined).archetype).toBeTruthy();
    const corrupt = gene({ empathy: NaN, chaos: Infinity });
    const c = creatureGenomeFromDNA(corrupt);
    expect(ARCHETYPE_IDS).toContain(c.archetype);
  });
});

describe('as AÇÕES decidem a espécie', () => {
  it('perfis de gene distintos puxam arquétipos distintos', () => {
    expect(archetypeFromGenome(gene({ aggression: 0.95, resilience: 0.9, chaos: 0.8 }))).toBe('draconic');
    expect(archetypeFromGenome(gene({ adaptability: 0.95, aggression: 0.1, emotionalDepth: 0.8 }))).toBe('aquatic');
    expect(archetypeFromGenome(gene({ intelligence: 0.95, discipline: 0.9, chaos: 0.1 }))).toBe('crystalline');
    expect(archetypeFromGenome(gene({ creativity: 0.95, curiosity: 0.9, chaos: 0.5 }))).toBe('insectoid');
    // Genoma equilibrado/indiferenciado (recém-choco) → gosminha.
    expect(archetypeFromGenome(neutral)).toBe('slime');
  });

  it('drift de hábito ao longo do tempo PODE mudar a espécie', () => {
    // Começa equilibrado (gosma). 120 dias de exercício/água puxam resiliência
    // + adaptabilidade → migra pra outro arquétipo.
    let g = neutral;
    for (let d = 0; d < 120; d++) {
      g = applyHabitDrift(g, { habit: 'exercise', intensity: 1 });
      g = applyHabitDrift(g, { habit: 'water', intensity: 1 });
    }
    const after = archetypeFromGenome(g);
    expect(after).not.toBe('slime');
  });

  it('cobre vários arquétipos numa amostra ampla (diversidade real)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const g = genomeFromPreset(i * 37 + 1, genomeForPersonality(['calmo', 'motivador', 'fofo', 'sabio'][i % 4] as never), 0.6) as Genome;
      seen.add(creatureGenomeFromDNA(g).archetype);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});

describe('renderiza qualquer criatura sem crashar', () => {
  it('um de cada arquétipo monta árvore SVG válida', () => {
    for (const id of ARCHETYPE_IDS) {
      const c = creatureGenomeFromDNA(neutral, { forceArchetype: id });
      const tree = TestRenderer.create(
        <CreatureRenderer creature={c} mood="feliz" size={160} reduceMotion />,
      );
      const json = JSON.stringify(tree.toJSON());
      expect(json.length).toBeGreaterThan(200);
      tree.unmount();
    }
  });

  it('renders distintos por arquétipo (não é o mesmo desenho)', () => {
    const cat = creatureGenomeFromDNA(neutral, { forceArchetype: 'feline' });
    const bird = creatureGenomeFromDNA(neutral, { forceArchetype: 'avian' });
    const a = JSON.stringify(TestRenderer.create(<CreatureRenderer creature={cat} reduceMotion />).toJSON());
    const b = JSON.stringify(TestRenderer.create(<CreatureRenderer creature={bird} reduceMotion />).toJSON());
    expect(a).not.toBe(b);
  });
});
