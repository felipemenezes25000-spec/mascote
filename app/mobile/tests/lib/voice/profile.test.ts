/**
 * Testes do perfil de voz procedural derivado do DNA.
 *
 * Invariantes:
 *  - Determinístico: mesma genome → mesmo perfil
 *  - Faixas válidas: baseFreq em [140, 380], decay em [0.08, 0.45], etc.
 *  - DNA influencia params: socialEnergy↑ → freq↑; chaos↑ → vibrato↑
 *  - Escala muda com creativity/chaos
 *  - Dois usuários com DNA diferente têm vozes diferentes
 */

import { describe, expect, it } from 'vitest';
import {
  voiceProfileFromGenome,
  modifiersForKind,
} from '@/lib/voice/profile';
import { generateGenome, neutralGenome } from '@/lib/dna/genome';

describe('voiceProfileFromGenome — invariantes', () => {
  it('determinístico — mesma genome → mesmo profile', () => {
    const g = generateGenome(42);
    const a = voiceProfileFromGenome(g);
    const b = voiceProfileFromGenome(g);
    expect(a).toEqual(b);
  });

  it('baseFreq sempre em [140, 380] Hz', () => {
    for (let seed = 0; seed < 30; seed++) {
      const p = voiceProfileFromGenome(generateGenome(seed));
      expect(p.baseFreq).toBeGreaterThanOrEqual(140);
      expect(p.baseFreq).toBeLessThanOrEqual(380);
    }
  });

  it('decay sempre em [0.08, 0.45]s', () => {
    for (let seed = 0; seed < 30; seed++) {
      const p = voiceProfileFromGenome(generateGenome(seed));
      expect(p.decay).toBeGreaterThanOrEqual(0.08);
      expect(p.decay).toBeLessThanOrEqual(0.45);
    }
  });

  it('vibrato em [0, 0.9]', () => {
    for (let seed = 0; seed < 30; seed++) {
      const p = voiceProfileFromGenome(generateGenome(seed));
      expect(p.vibrato).toBeGreaterThanOrEqual(0);
      expect(p.vibrato).toBeLessThanOrEqual(0.9);
    }
  });

  it('brightness em [0, 1]', () => {
    for (let seed = 0; seed < 30; seed++) {
      const p = voiceProfileFromGenome(generateGenome(seed));
      expect(p.brightness).toBeGreaterThanOrEqual(0);
      expect(p.brightness).toBeLessThanOrEqual(1);
    }
  });

  it('syllables em [2, 5]', () => {
    for (let seed = 0; seed < 30; seed++) {
      const p = voiceProfileFromGenome(generateGenome(seed));
      expect(p.syllables).toBeGreaterThanOrEqual(2);
      expect(p.syllables).toBeLessThanOrEqual(5);
    }
  });

  it('socialEnergy alto → freq mais alta', () => {
    const lowSocial = voiceProfileFromGenome({ ...neutralGenome(), socialEnergy: 0.1 });
    const highSocial = voiceProfileFromGenome({ ...neutralGenome(), socialEnergy: 0.9 });
    expect(highSocial.baseFreq).toBeGreaterThan(lowSocial.baseFreq);
  });

  it('aggression alto → freq mais grave', () => {
    const lowAgg = voiceProfileFromGenome({ ...neutralGenome(), aggression: 0.1, socialEnergy: 0.5 });
    const highAgg = voiceProfileFromGenome({ ...neutralGenome(), aggression: 0.9, socialEnergy: 0.5 });
    expect(highAgg.baseFreq).toBeLessThan(lowAgg.baseFreq);
  });

  it('chaos alto → vibrato alto', () => {
    const lowChaos = voiceProfileFromGenome({ ...neutralGenome(), chaos: 0.1 });
    const highChaos = voiceProfileFromGenome({ ...neutralGenome(), chaos: 0.9 });
    expect(highChaos.vibrato).toBeGreaterThan(lowChaos.vibrato);
  });

  it('intelligence alto → syllables mais', () => {
    const lowInt = voiceProfileFromGenome({ ...neutralGenome(), intelligence: 0.1 });
    const highInt = voiceProfileFromGenome({ ...neutralGenome(), intelligence: 0.9 });
    expect(highInt.syllables).toBeGreaterThanOrEqual(lowInt.syllables);
  });

  it('creativity > 0.7 → escala blues', () => {
    const creative = voiceProfileFromGenome({ ...neutralGenome(), creativity: 0.8, chaos: 0.3 });
    // Pentatônica blues = [0, 3, 5, 7, 10, 12]
    expect(creative.scale).toEqual([0, 3, 5, 7, 10, 12]);
  });

  it('chaos > 0.75 → escala dissonante', () => {
    const chaotic = voiceProfileFromGenome({ ...neutralGenome(), chaos: 0.85 });
    expect(chaotic.scale).toEqual([0, 1, 4, 6, 9, 11]);
  });

  it('default → escala maior', () => {
    const g = voiceProfileFromGenome(neutralGenome());
    expect(g.scale).toEqual([0, 2, 4, 7, 9, 12]);
  });

  it('NaN/Infinity safely → values em range', () => {
    const bad = {
      ...neutralGenome(),
      socialEnergy: Number.NaN,
      aggression: Number.POSITIVE_INFINITY,
    };
    const p = voiceProfileFromGenome(bad as never);
    expect(Number.isFinite(p.baseFreq)).toBe(true);
    expect(p.baseFreq).toBeGreaterThanOrEqual(140);
    expect(p.baseFreq).toBeLessThanOrEqual(380);
  });

  it('dois DNAs distintos → vozes distintas (sample 200 pares)', () => {
    for (let i = 0; i < 200; i++) {
      const a = voiceProfileFromGenome(generateGenome(i * 2));
      const b = voiceProfileFromGenome(generateGenome(i * 2 + 1));
      // Pelo menos um parâmetro diferente
      const same =
        a.baseFreq === b.baseFreq &&
        a.vibrato === b.vibrato &&
        a.brightness === b.brightness &&
        a.decay === b.decay &&
        a.syllables === b.syllables;
      expect(same).toBe(false);
    }
  });
});

describe('modifiersForKind — variação por intent', () => {
  it('todos os 6 kinds têm modifiers', () => {
    const kinds = ['greet', 'react', 'curious', 'sleepy', 'celebrate', 'attention'] as const;
    for (const k of kinds) {
      const m = modifiersForKind(k);
      expect(m.freqMult).toBeGreaterThan(0);
      expect(m.decayMult).toBeGreaterThan(0);
      expect(typeof m.syllableDelta).toBe('number');
    }
  });

  it('attention é mais agudo que sleepy', () => {
    const att = modifiersForKind('attention');
    const sleep = modifiersForKind('sleepy');
    expect(att.freqMult).toBeGreaterThan(sleep.freqMult);
  });

  it('sleepy tem decay maior que react', () => {
    const sleep = modifiersForKind('sleepy');
    const react = modifiersForKind('react');
    expect(sleep.decayMult).toBeGreaterThan(react.decayMult);
  });

  it('attention reduz syllables (curta)', () => {
    expect(modifiersForKind('attention').syllableDelta).toBeLessThan(0);
  });

  it('curious aumenta syllables (exploratória)', () => {
    expect(modifiersForKind('curious').syllableDelta).toBeGreaterThan(0);
  });
});
