/**
 * Testes da ponte evolução — nudges não-punitivos de ausência e hábitos.
 */

import { describe, expect, it } from 'vitest';
import { neutralGenome } from '@/lib/dna/genome';
import {
  mergeGenomeNudges,
  nudgeGenomeFromAbsence,
  nudgeGenomeFromHabits,
} from '@/sim/evolutionBridge';

describe('nudgeGenomeFromHabits', () => {
  it('null sem hábitos regulares', () => {
    expect(nudgeGenomeFromHabits({ genome: neutralGenome(), regularHabits: [] })).toBeNull();
  });

  it('exercise regular aumenta discipline', () => {
    const genome = neutralGenome();
    const nudged = nudgeGenomeFromHabits({
      genome,
      regularHabits: ['exercise'],
    });
    expect(nudged).not.toBeNull();
    expect(nudged!.discipline).toBeGreaterThan(genome.discipline);
  });

  it('múltiplos hábitos nunca regridem genes', () => {
    const genome = neutralGenome();
    const nudged = nudgeGenomeFromHabits({
      genome,
      regularHabits: ['exercise', 'sleep', 'meditation'],
    });
    expect(nudged).not.toBeNull();
    for (const key of Object.keys(genome) as (keyof typeof genome)[]) {
      expect(nudged![key]).toBeGreaterThanOrEqual(genome[key]);
    }
  });
});

describe('mergeGenomeNudges', () => {
  it('combina ausência + hábitos tomando máximo por gene', () => {
    const genome = neutralGenome();
    const merged = mergeGenomeNudges(
      genome,
      nudgeGenomeFromAbsence({ genome, absenceHours: 80, mood: 'ok' }),
      nudgeGenomeFromHabits({ genome, regularHabits: ['exercise'] }),
    );
    expect(merged).not.toBeNull();
    expect(merged!.adaptability).toBeGreaterThan(genome.adaptability);
    expect(merged!.discipline).toBeGreaterThan(genome.discipline);
  });

  it('null quando nenhum nudge aplica', () => {
    expect(mergeGenomeNudges(neutralGenome(), null, null)).toBeNull();
  });
});
