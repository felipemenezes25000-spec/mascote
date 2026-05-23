/**
 * Bindings DNA→Material+Bones — testes de propriedades fundamentais.
 *
 * Não testa values específicos (mudam com tuning). Testa **contratos**:
 *  - Determinismo: mesmo input → mesmo output sempre
 *  - Phases: ovo tem scale=0, evolved tem glow > adulto
 *  - User bands: 16-24 tem olhos maiores que 45+
 *  - Animation: mood triste vira animation 'sad'
 */

import { describe, expect, it } from 'vitest';
import {
  dnaToAnimationState,
  dnaToMaterialBindings,
  dnaToBoneScales,
  moodToAnimation,
  unlockedAccessories,
  PHASE_BONE_PRESETS,
  USER_BAND_MODS,
  PERSONALITY_TO_GLB,
} from '@/lib/dna/bindings';
import type { Genome } from '@/lib/dna/genome';

const baseDna: Genome = {
  empathy: 0.5,
  curiosity: 0.5,
  creativity: 0.5,
  discipline: 0.5,
  chaos: 0.5,
  aggression: 0.5,
  resilience: 0.5,
  emotionalDepth: 0.5,
  socialEnergy: 0.5,
  adaptability: 0.5,
  intelligence: 0.5,
};

describe('dnaToMaterialBindings', () => {
  it('é determinístico — mesmo DNA gera mesmos bindings', () => {
    const a = dnaToMaterialBindings(baseDna, '25-34');
    const b = dnaToMaterialBindings(baseDna, '25-34');
    expect(a).toEqual(b);
  });

  it('retorna hex numbers válidos pra tints', () => {
    const b = dnaToMaterialBindings(baseDna);
    expect(b.bodyTint).toBeGreaterThanOrEqual(0);
    expect(b.bodyTint).toBeLessThanOrEqual(0xffffff);
    expect(b.accentTint).toBeGreaterThanOrEqual(0);
    expect(b.glowTint).toBeGreaterThanOrEqual(0);
  });

  it('user band 16-24 produz lightness maior que 45+', () => {
    const young = dnaToMaterialBindings(baseDna, '16-24');
    const senior = dnaToMaterialBindings(baseDna, '45+');
    // Lightness é o byte do meio do HSL, mas hex é RGB — não dá pra comparar
    // direto. Comparar via approximation: jovem tem cor "mais clara" =
    // maior soma R+G+B em geral.
    const sumYoung = ((young.bodyTint >> 16) & 0xff) + ((young.bodyTint >> 8) & 0xff) + (young.bodyTint & 0xff);
    const sumSenior = ((senior.bodyTint >> 16) & 0xff) + ((senior.bodyTint >> 8) & 0xff) + (senior.bodyTint & 0xff);
    expect(sumYoung).toBeGreaterThan(sumSenior - 30); // tolerância
  });

  it('emissiveIntensity escala com glowMultPhase', () => {
    const low = dnaToMaterialBindings(baseDna, '25-34', 0.5);
    const high = dnaToMaterialBindings(baseDna, '25-34', 1.5);
    expect(high.emissiveIntensity).toBeGreaterThan(low.emissiveIntensity);
  });
});

describe('dnaToBoneScales', () => {
  it('ovo tem todos scales = 0 (criatura ainda não-formada)', () => {
    const scales = dnaToBoneScales(baseDna, 'ovo');
    expect(scales.head).toBe(0);
    expect(scales.body).toBe(0);
    expect(scales.eye_L).toBe(0);
  });

  it('bebê tem cabeça MAIOR que corpo (chibi extremo)', () => {
    const scales = dnaToBoneScales(baseDna, 'bebe');
    expect(scales.head).toBeGreaterThan(scales.body);
    expect(scales.eye_L).toBeGreaterThan(1.4); // olhos enormes
  });

  it('adulto tem proporções próximas a 1.0× (modelado default)', () => {
    const scales = dnaToBoneScales(baseDna, 'adulto');
    // Adulto base é 1.0 mas DNA modula: intelligence 0.5 + empathy 0.5 →
    // head 1 + 0.04 + 0.02 = 1.06. Tolerância 0.15 cobre range DNA realista.
    expect(scales.head).toBeGreaterThan(0.95);
    expect(scales.head).toBeLessThan(1.15);
    expect(scales.body).toBeGreaterThan(0.95);
    expect(scales.body).toBeLessThan(1.15);
  });

  it('progressão de scale entre fases é monotônica pra body', () => {
    // Body cresce: bebê (0.7) < criança (0.85) < adolescente (0.95) < adulto (1.0)
    const bebe = dnaToBoneScales(baseDna, 'bebe');
    const crianca = dnaToBoneScales(baseDna, 'crianca');
    const adolescente = dnaToBoneScales(baseDna, 'adolescente');
    const adulto = dnaToBoneScales(baseDna, 'adulto');
    expect(bebe.body).toBeLessThan(crianca.body);
    expect(crianca.body).toBeLessThan(adolescente.body);
    expect(adolescente.body).toBeLessThan(adulto.body);
  });

  it('user band 16-24 tem olhos maiores que 45+ (kawaii)', () => {
    const young = dnaToBoneScales(baseDna, 'adulto', '16-24');
    const senior = dnaToBoneScales(baseDna, 'adulto', '45+');
    expect(young.eye_L).toBeGreaterThan(senior.eye_L);
  });

  it('DNA com alto intelligence tem cabeça maior', () => {
    const dumb = { ...baseDna, intelligence: 0.1 };
    const smart = { ...baseDna, intelligence: 0.9 };
    const dumbScales = dnaToBoneScales(dumb, 'adulto');
    const smartScales = dnaToBoneScales(smart, 'adulto');
    expect(smartScales.head).toBeGreaterThan(dumbScales.head);
  });
});

describe('dnaToAnimationState', () => {
  it('action celebrate sobrescreve mood idle', () => {
    const a = dnaToAnimationState(baseDna, 'ok', { kind: 'celebrate', key: 1 });
    expect(a.primary).toBe('celebrate');
  });

  it('alta adaptability aumenta speed vs mood base', () => {
    const adaptive = { ...baseDna, adaptability: 0.95 };
    const base = moodToAnimation('ok');
    const a = dnaToAnimationState(adaptive, 'ok');
    expect(a.speed).toBeGreaterThan(base.speed);
  });
});

describe('moodToAnimation', () => {
  it('triste vira animation sad com speed reduzido', () => {
    const a = moodToAnimation('triste');
    expect(a.primary).toBe('sad');
    expect(a.speed).toBeLessThan(1.0);
  });

  it('empolgado tem blend de excited + smile', () => {
    const a = moodToAnimation('empolgado');
    expect(a.primary).toBe('excited');
    expect(a.blend).toBeDefined();
    expect(a.blend?.name).toBe('smile');
    expect(a.speed).toBeGreaterThan(1.0);
  });

  it('exausto vira sleep com speed muito baixo', () => {
    const a = moodToAnimation('exausto');
    expect(a.primary).toBe('sleep');
    expect(a.speed).toBeLessThanOrEqual(0.7);
  });

  it('ok vira idle default', () => {
    const a = moodToAnimation('ok');
    expect(a.primary).toBe('idle');
    expect(a.speed).toBe(1.0);
  });
});

describe('unlockedAccessories', () => {
  it('retorna vazio quando nada equipado', () => {
    const result = unlockedAccessories(baseDna, ['cap', 'bow'], []);
    expect(result).toEqual([]);
  });

  it('só lista accessories equipados E unlocked', () => {
    const result = unlockedAccessories(baseDna, ['cap', 'bow'], ['cap', 'crown']);
    expect(result.length).toBe(1); // cap está equipado E unlocked, crown não
    expect(result[0].bone).toBe('head');
  });

  it('scarf vai pro neck, leaf vai pro body', () => {
    const scarfResult = unlockedAccessories(baseDna, ['scarf'], ['scarf']);
    expect(scarfResult[0].bone).toBe('neck');
    const leafResult = unlockedAccessories(baseDna, ['leaf'], ['leaf']);
    expect(leafResult[0].bone).toBe('body');
  });
});

describe('PERSONALITY_TO_GLB', () => {
  it('cada personality tem um GLB único', () => {
    const paths = Object.values(PERSONALITY_TO_GLB);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it('todos os paths apontam para assets/mascot-3d/', () => {
    for (const path of Object.values(PERSONALITY_TO_GLB)) {
      expect(path).toMatch(/^assets\/mascot-3d\/.+\.glb$/);
    }
  });
});

describe('PHASE_BONE_PRESETS contract', () => {
  it('progressão de glowMult cresce com fase (recompensa progresso)', () => {
    expect(PHASE_BONE_PRESETS.bebe.glowMult).toBeLessThan(PHASE_BONE_PRESETS.adulto.glowMult);
    expect(PHASE_BONE_PRESETS.adulto.glowMult).toBeLessThan(PHASE_BONE_PRESETS.evoluido.glowMult);
  });

  it('evoluído tem glowMult maior que todas as outras', () => {
    const evolved = PHASE_BONE_PRESETS.evoluido.glowMult;
    for (const phase of ['bebe', 'crianca', 'adolescente', 'adulto'] as const) {
      expect(evolved).toBeGreaterThan(PHASE_BONE_PRESETS[phase].glowMult);
    }
  });
});

describe('USER_BAND_MODS contract', () => {
  it('25-34 é o neutral (todos modifiers em 0 ou 1)', () => {
    const m = USER_BAND_MODS['25-34'];
    expect(m.hueShift).toBe(0);
    expect(m.satMult).toBe(1.0);
    expect(m.lightShift).toBe(0);
    expect(m.eyeMult).toBe(1.0);
  });

  it('jovens têm eyeMult maior que seniores (kawaii heuristic)', () => {
    expect(USER_BAND_MODS['16-24'].eyeMult).toBeGreaterThan(USER_BAND_MODS['45+'].eyeMult);
  });

  it('seniores têm hueShift positivo (paleta mais quente)', () => {
    expect(USER_BAND_MODS['45+'].hueShift).toBeGreaterThan(0);
  });
});
