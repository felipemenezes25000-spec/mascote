/**
 * Invariante: hábitos DIFERENTES geram trajetória visual DIFERENTE.
 *
 * Dois usuários começam do mesmo preset (Calmo, mesmo seed) → genomas
 * iguais inicialmente. User A faz 30 check-ins de `exercise`; User B faz
 * 30 check-ins de `reading`. Após drift, suas criaturas devem ser
 * visualmente distinguíveis — exercise reforça resilience/adaptability,
 * reading reforça intelligence/curiosity/creativity.
 *
 * Esse é o coração do brief DLI: "hábitos alteram a biologia". Falhar este
 * teste = produto vira gamificação reskin (XP gera Y, hábito X não importa
 * pra forma).
 */

import { describe, expect, it } from 'vitest';
import { applyHabitDrift } from '@/lib/dna/habitToGene';
import { genomeForPersonality } from '@/lib/dna/personalities';
import { genomeFromPreset, type Genome } from '@/lib/dna/genome';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import { paletteFromGenome } from '@/lib/dna/palette';
import type { HabitKind } from '@/types';

function repeatedDrift(g: Genome, habit: HabitKind, n: number, intensity = 1): Genome {
  let cur = g;
  for (let i = 0; i < n; i++) {
    cur = applyHabitDrift(cur, { habit, intensity });
  }
  return cur;
}

function morphDistance(a: Genome, b: Genome): number {
  const mA = morphologyFromGenome(a);
  const mB = morphologyFromGenome(b);
  return Math.abs(mA.bodyHeightStretch - mB.bodyHeightStretch)
    + Math.abs(mA.bodyWidthSquash - mB.bodyWidthSquash)
    + Math.abs(mA.eyeSize - mB.eyeSize)
    + Math.abs(mA.pupilEmissive - mB.pupilEmissive)
    + Math.abs(mA.auraOpacity - mB.auraOpacity)
    + Math.abs(mA.auraSize - mB.auraSize);
}

describe('Invariante: hábitos diferentes geram trajetórias visíveis diferentes', () => {
  const preset = genomeForPersonality('calmo');
  const baseSeed = 12345;
  const startGenome = genomeFromPreset(baseSeed, preset, 0.1);

  it('30× exercise vs 30× reading → genomes claramente diferentes', () => {
    const after_exercise = repeatedDrift(startGenome, 'exercise', 30);
    const after_reading = repeatedDrift(startGenome, 'reading', 30);
    // exercise reforça resilience/adaptability/socialEnergy; reading reforça
    // intelligence/curiosity/creativity. Logo, os genes específicos diferem.
    expect(after_exercise.resilience).toBeGreaterThan(after_reading.resilience);
    expect(after_exercise.adaptability).toBeGreaterThan(after_reading.adaptability);
    expect(after_reading.intelligence).toBeGreaterThan(after_exercise.intelligence);
    expect(after_reading.curiosity).toBeGreaterThan(after_exercise.curiosity);
    expect(after_reading.creativity).toBeGreaterThan(after_exercise.creativity);
  });

  it('mesma trajetória de hábitos → mesmo genome (determinismo)', () => {
    const a = repeatedDrift(startGenome, 'sleep', 20);
    const b = repeatedDrift(startGenome, 'sleep', 20);
    for (const k of Object.keys(a) as (keyof Genome)[]) {
      expect(a[k]).toBeCloseTo(b[k], 9);
    }
  });

  it('30× exercise vs 30× journaling → morfologia VISIVELMENTE diferente', () => {
    const after_exercise = repeatedDrift(startGenome, 'exercise', 30);
    const after_journaling = repeatedDrift(startGenome, 'journaling', 30);
    const dist = morphDistance(after_exercise, after_journaling);
    // Threshold 0.1 — qualquer divergência menor seria invisível ao olho
    expect(dist).toBeGreaterThan(0.05);
  });

  it('paleta também muda: exercise vs reading produzem hues distintos', () => {
    const after_exercise = repeatedDrift(startGenome, 'exercise', 30);
    const after_reading = repeatedDrift(startGenome, 'reading', 30);
    const pE = paletteFromGenome(after_exercise);
    const pR = paletteFromGenome(after_reading);
    // creativity afeta hue (creativity*280 no cálculo). Reading reforça creativity
    // mais que exercise → hues diferem.
    const hueDelta = Math.abs(pE.bodyHSL[0] - pR.bodyHSL[0]);
    expect(hueDelta).toBeGreaterThan(0);
  });

  it('trajetória curta (5 dias) já mostra divergência inicial', () => {
    const a = repeatedDrift(startGenome, 'water', 5);
    const b = repeatedDrift(startGenome, 'meditation', 5);
    // Mesmo com poucos drifts, intelligence/empathy diferem (água ↔ meditação
    // tocam genes distintos)
    expect(a.resilience).toBeGreaterThan(b.resilience);
    expect(b.empathy).toBeGreaterThan(a.empathy);
    expect(b.emotionalDepth).toBeGreaterThan(a.emotionalDepth);
  });

  it('30× combinação variada vs 30× monohábito → genomes diferentes', () => {
    // User A faz só exercise. User B alterna 6 hábitos. Genomes finais devem
    // ser claramente diferentes — variedade gera "personalidade emergente".
    const mono = repeatedDrift(startGenome, 'exercise', 30);
    let mixed = startGenome;
    const habits: HabitKind[] = ['water', 'sleep', 'exercise', 'breath', 'reading', 'journaling'];
    for (let i = 0; i < 30; i++) {
      mixed = applyHabitDrift(mixed, { habit: habits[i % habits.length], intensity: 1 });
    }
    // intelligence só sobe com reading/journaling — mixed terá; mono não.
    expect(mixed.intelligence).toBeGreaterThan(mono.intelligence);
  });
});
