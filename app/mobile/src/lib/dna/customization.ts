/**
 * Aplicação dos overrides de customização do usuário (Sims/Spore-like) sobre
 * a morfologia derivada do DNA.
 *
 * **Princípio inviolável**: customization NUNCA muta o Genome — só aplica
 * multiplicadores clampados em runtime. DNA permanece intocável.
 *
 * **Cap obrigatório**: cada multiplicador é forçado em [MIN_MULT, MAX_MULT]
 * = [0.7, 1.3]. Sem isso, usuário poderia destruir identidade visual da
 * criatura (eye_size = 0 deixaria criatura cega; pattern_density = 10 viraria
 * pelúcia disforme).
 */

import type { MascotCustomization } from '@/types';
import type { Morphology } from './morphology';

export const MIN_MULT = 0.7;
export const MAX_MULT = 1.3;
/** Range absoluto da inclinação postural em radianos. ±0.2 ≈ ±11.5°. */
export const MIN_POSTURE = -0.2;
export const MAX_POSTURE = 0.2;

/**
 * Força um multiplicador em [MIN_MULT, MAX_MULT]. NaN/Infinity vira 1.
 */
export function clampMultiplier(v: number): number {
  if (!Number.isFinite(v)) return 1;
  if (v < MIN_MULT) return MIN_MULT;
  if (v > MAX_MULT) return MAX_MULT;
  return v;
}

/**
 * Clampa inclinação postural em [MIN_POSTURE, MAX_POSTURE]. NaN/Infinity → 0.
 */
export function clampPosture(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < MIN_POSTURE) return MIN_POSTURE;
  if (v > MAX_POSTURE) return MAX_POSTURE;
  return v;
}

/**
 * Aplica overrides do usuário sobre morfologia DNA-derivada.
 * Retorna nova Morphology — não muta input.
 *
 * Se `custom` for null/undefined, retorna `morph` inalterada (defensive copy).
 *
 * Multiplicadores fora de [0.7, 1.3] são silenciosamente clampados — isso
 * cobre dados persistidos antes do cap virar lei (defensive).
 */
export function applyCustomization(
  morph: Morphology,
  custom: MascotCustomization | null | undefined,
): Morphology {
  if (!custom) return { ...morph };
  const eye = clampMultiplier(custom.eye_size);
  const spread = clampMultiplier(custom.eye_spread);
  const height = clampMultiplier(custom.body_height);
  const width = clampMultiplier(custom.body_width);
  const aura = clampMultiplier(custom.aura_intensity);
  const pattern = clampMultiplier(custom.pattern_density);
  // Force-hide overrides: usuário pode esconder parts que DNA habilita
  // (não pode mostrar parts que DNA desabilita — preserva identidade)
  const hasTail = custom.force_hide_tail ? false : morph.hasTail;
  const hasAntennae = custom.force_hide_antennae ? false : morph.hasAntennae;
  const hasSpikes = custom.force_hide_spikes ? false : morph.hasSpikes;
  return {
    ...morph,
    eyeSize: morph.eyeSize * eye,
    eyeSpread: morph.eyeSpread * spread,
    bodyHeightStretch: morph.bodyHeightStretch * height,
    bodyWidthSquash: morph.bodyWidthSquash * width,
    auraOpacity: Math.min(1, morph.auraOpacity * aura),
    auraSize: morph.auraSize * aura,
    auraParticleCount: Math.floor(morph.auraParticleCount * aura),
    bodyChaosBumps: morph.bodyChaosBumps * pattern,
    bodyCreativityBumps: morph.bodyCreativityBumps * pattern,
    hasTail,
    hasAntennae,
    hasSpikes,
  };
}

/**
 * Sanitiza um payload qualquer em MascotCustomization válido.
 * Usado na fronteira de persistência (load do AsyncStorage potencialmente
 * com dados antigos/corruptos). NUNCA lança.
 */
export function sanitizeCustomization(
  input: Partial<MascotCustomization> & { user_id: string },
): MascotCustomization {
  return {
    user_id: input.user_id,
    eye_size: clampMultiplier(input.eye_size ?? 1),
    eye_spread: clampMultiplier(input.eye_spread ?? 1),
    body_height: clampMultiplier(input.body_height ?? 1),
    body_width: clampMultiplier(input.body_width ?? 1),
    aura_intensity: clampMultiplier(input.aura_intensity ?? 1),
    pattern_density: clampMultiplier(input.pattern_density ?? 1),
    preferred_pattern: input.preferred_pattern ?? 'plain',
    posture_lean: clampPosture(input.posture_lean ?? 0),
    force_hide_tail: Boolean(input.force_hide_tail ?? false),
    force_hide_antennae: Boolean(input.force_hide_antennae ?? false),
    force_hide_spikes: Boolean(input.force_hide_spikes ?? false),
    updated_at: input.updated_at ?? new Date().toISOString(),
  };
}
