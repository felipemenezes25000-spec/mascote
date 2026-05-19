/**
 * Testes do módulo de customização Sims/Spore-like.
 *
 * Invariantes invioláveis (cobertas):
 *  - Multiplicador fora de [0.7, 1.3] é SEMPRE clampado
 *  - DNA bruto NUNCA é mutado pela aplicação de customization
 *  - sanitizeCustomization é defensivo (NaN/Infinity → 1)
 *  - Customization = null/undefined → morphology inalterada
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_MULT,
  MIN_MULT,
  applyCustomization,
  clampMultiplier,
  sanitizeCustomization,
} from '@/lib/dna/customization';
import { generateGenome } from '@/lib/dna/genome';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import type { MascotCustomization } from '@/types';

function defaults(user_id = 'u_1'): MascotCustomization {
  return {
    user_id,
    eye_size: 1,
    eye_spread: 1,
    body_height: 1,
    body_width: 1,
    aura_intensity: 1,
    pattern_density: 1,
    preferred_pattern: 'plain',
    updated_at: new Date().toISOString(),
  };
}

describe('clampMultiplier — invariantes', () => {
  it('NaN → 1', () => expect(clampMultiplier(Number.NaN)).toBe(1));
  it('Infinity → 1', () => expect(clampMultiplier(Number.POSITIVE_INFINITY)).toBe(1));
  it('valor < MIN_MULT → MIN_MULT', () => expect(clampMultiplier(0.5)).toBe(MIN_MULT));
  it('valor > MAX_MULT → MAX_MULT', () => expect(clampMultiplier(2.0)).toBe(MAX_MULT));
  it('valor dentro do range → idêntico', () => expect(clampMultiplier(1.1)).toBeCloseTo(1.1));
  it('extremos exatos preservados', () => {
    expect(clampMultiplier(MIN_MULT)).toBe(MIN_MULT);
    expect(clampMultiplier(MAX_MULT)).toBe(MAX_MULT);
    expect(clampMultiplier(1)).toBe(1);
  });
});

describe('applyCustomization — não-destrutivo', () => {
  it('custom null → morph inalterada (defensive copy)', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const out = applyCustomization(morph, null);
    expect(out).toEqual(morph);
    // Mas é cópia, não referência
    expect(out).not.toBe(morph);
  });

  it('custom undefined → morph inalterada', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const out = applyCustomization(morph, undefined);
    expect(out).toEqual(morph);
  });

  it('custom todos = 1 → morph idêntica', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const out = applyCustomization(morph, defaults());
    expect(out).toEqual(morph);
  });

  it('eye_size 1.3 → eyeSize multiplicado por 1.3', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const custom = { ...defaults(), eye_size: 1.3 };
    const out = applyCustomization(morph, custom);
    expect(out.eyeSize).toBeCloseTo(morph.eyeSize * 1.3, 5);
  });

  it('eye_size FORA de range é clampado antes de aplicar', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const custom = { ...defaults(), eye_size: 5.0 }; // outside cap
    const out = applyCustomization(morph, custom);
    // Deve aplicar MAX_MULT, não 5.0
    expect(out.eyeSize).toBeCloseTo(morph.eyeSize * MAX_MULT, 5);
  });

  it('body_height 0.7 reduz altura', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const custom = { ...defaults(), body_height: 0.7 };
    const out = applyCustomization(morph, custom);
    expect(out.bodyHeightStretch).toBeCloseTo(morph.bodyHeightStretch * 0.7, 5);
  });

  it('aura_intensity afeta opacity + size + particleCount', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const custom = { ...defaults(), aura_intensity: 1.3 };
    const out = applyCustomization(morph, custom);
    expect(out.auraOpacity).toBeLessThanOrEqual(1); // cap em 1
    expect(out.auraSize).toBeCloseTo(morph.auraSize * 1.3, 5);
    expect(out.auraParticleCount).toBe(Math.floor(morph.auraParticleCount * 1.3));
  });

  it('NÃO muta input morph', () => {
    const morph = morphologyFromGenome(generateGenome(42));
    const snapshot = { ...morph };
    applyCustomization(morph, { ...defaults(), eye_size: 1.3 });
    expect(morph).toEqual(snapshot);
  });

  it('NÃO muta DNA — só aplica em morphology', () => {
    // Sanity check: applyCustomization recebe morphology, não genome.
    // Garantir que o resultado NÃO inclui campos de genome (empathy, etc.)
    const morph = morphologyFromGenome(generateGenome(42));
    const out = applyCustomization(morph, defaults());
    expect((out as unknown as Record<string, unknown>).empathy).toBeUndefined();
    expect((out as unknown as Record<string, unknown>).curiosity).toBeUndefined();
  });
});

describe('sanitizeCustomization — saneador da fronteira', () => {
  it('valores ausentes vira 1', () => {
    const out = sanitizeCustomization({ user_id: 'u_1' });
    expect(out.eye_size).toBe(1);
    expect(out.body_height).toBe(1);
    expect(out.aura_intensity).toBe(1);
  });

  it('NaN → 1', () => {
    const out = sanitizeCustomization({ user_id: 'u_1', eye_size: Number.NaN });
    expect(out.eye_size).toBe(1);
  });

  it('valores fora de range são clampados', () => {
    const out = sanitizeCustomization({
      user_id: 'u_1',
      eye_size: 999,
      body_width: -2,
    });
    expect(out.eye_size).toBe(MAX_MULT);
    expect(out.body_width).toBe(MIN_MULT);
  });

  it('preferred_pattern default = plain', () => {
    const out = sanitizeCustomization({ user_id: 'u_1' });
    expect(out.preferred_pattern).toBe('plain');
  });

  it('preferred_pattern preservado se válido', () => {
    const out = sanitizeCustomization({ user_id: 'u_1', preferred_pattern: 'fractal' });
    expect(out.preferred_pattern).toBe('fractal');
  });

  it('user_id é obrigatório (não vem de default)', () => {
    const out = sanitizeCustomization({ user_id: 'specific_user' });
    expect(out.user_id).toBe('specific_user');
  });

  it('updated_at default = ISO now válido', () => {
    const out = sanitizeCustomization({ user_id: 'u_1' });
    expect(new Date(out.updated_at).getTime()).not.toBeNaN();
  });
});

describe('integração: usuário com customização extrema NÃO destrói criatura', () => {
  it('todos sliders no extremo MAX → morphology ainda válida', () => {
    const morph = morphologyFromGenome(generateGenome(1));
    const extreme: MascotCustomization = {
      ...defaults(),
      eye_size: MAX_MULT,
      eye_spread: MAX_MULT,
      body_height: MAX_MULT,
      body_width: MAX_MULT,
      aura_intensity: MAX_MULT,
      pattern_density: MAX_MULT,
    };
    const out = applyCustomization(morph, extreme);
    expect(out.eyeSize).toBeGreaterThan(0);
    expect(out.bodyHeightStretch).toBeGreaterThan(0);
    expect(out.auraParticleCount).toBeGreaterThan(0);
  });

  it('todos sliders no extremo MIN → morphology ainda válida', () => {
    const morph = morphologyFromGenome(generateGenome(1));
    const extreme: MascotCustomization = {
      ...defaults(),
      eye_size: MIN_MULT,
      eye_spread: MIN_MULT,
      body_height: MIN_MULT,
      body_width: MIN_MULT,
      aura_intensity: MIN_MULT,
      pattern_density: MIN_MULT,
    };
    const out = applyCustomization(morph, extreme);
    // Ainda renderizável (positivo, finito)
    expect(out.eyeSize).toBeGreaterThan(0);
    expect(Number.isFinite(out.bodyHeightStretch)).toBe(true);
  });
});
