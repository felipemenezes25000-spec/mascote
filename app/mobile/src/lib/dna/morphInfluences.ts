/**
 * morphInfluences — mapeia Morphology pra dict de blend shape weights [0, 1].
 *
 * Cada multiplicador morphology vira um par positivo/negativo de blend shapes.
 * Ex: body_height = 1.2 → { body_tall: 0.67 } (0.2/0.3 = 0.67)
 *     body_height = 0.85 → { body_short: 0.5 }
 *
 * Pra Unity: weights são 0-1 aqui; lá viram 0-100 no SetBlendShapeWeight.
 * Pra Three.js: weights 0-1 batem com `morphTargetInfluences` direto.
 *
 * **GLBs precisam ter blend shapes nomeados conforme o protocolo abaixo.**
 * Se não tiverem, controllers ignoram silenciosamente — não quebra render.
 */

import type { Morphology } from './morphology';

/**
 * Catálogo oficial de blend shapes esperados nos GLBs/Unity prefabs.
 * Nomeação convencional Mascote (NÃO usar nomes do Blender exportado direto):
 *
 *   eye_big        — olho maior
 *   eye_small      — olho menor
 *   body_tall      — corpo alongado
 *   body_short     — corpo achatado
 *   body_wide      — corpo alargado
 *   body_narrow    — corpo afinado
 *   posture_forward — postura inclinada pra frente
 *   posture_back   — postura inclinada pra trás
 *   aura_strong    — aura intensa (visual; partículas via outro controller)
 *   pattern_dense  — padrão denso na pele
 */
export const MORPH_INFLUENCE_KEYS = [
  'eye_big',
  'eye_small',
  'body_tall',
  'body_short',
  'body_wide',
  'body_narrow',
  'posture_forward',
  'posture_back',
  'aura_strong',
  'pattern_dense',
] as const;

export type MorphInfluenceKey = (typeof MORPH_INFLUENCE_KEYS)[number];

export type MorphInfluences = Partial<Record<MorphInfluenceKey, number>>;

/** Multiplier range — match com customization.ts [0.7, 1.3]. */
const MULT_RANGE = 0.3;

/**
 * Converte um multiplicador [0.7, 1.3] em um par (positivo, negativo) de
 * weights normalizados [0, 1]. Apenas um lado por par é ativo (o outro = 0).
 */
function multiplierToPair(
  value: number,
  pivot = 1,
): { positive: number; negative: number } {
  const delta = value - pivot;
  if (delta > 0) {
    return { positive: Math.min(1, delta / MULT_RANGE), negative: 0 };
  }
  if (delta < 0) {
    return { positive: 0, negative: Math.min(1, -delta / MULT_RANGE) };
  }
  return { positive: 0, negative: 0 };
}

/**
 * Posture range é [-0.2, 0.2] rad. Converte pra par forward/back [0, 1].
 */
function postureToPair(rad: number): { positive: number; negative: number } {
  const POSTURE_MAX = 0.2;
  if (rad > 0) return { positive: Math.min(1, rad / POSTURE_MAX), negative: 0 };
  if (rad < 0) return { positive: 0, negative: Math.min(1, -rad / POSTURE_MAX) };
  return { positive: 0, negative: 0 };
}

/**
 * Deriva morphInfluences a partir de Morphology final (pós-customização +
 * mutações). Só inclui keys com weight > 0 — reduz payload e simplifica
 * checagem `if (key in influences)` no controller.
 */
export function morphInfluencesFromMorphology(morph: Morphology): MorphInfluences {
  const out: MorphInfluences = {};

  // Eye size (eyeSize já é valor absoluto pós-multiplier, não delta)
  // Pivot ≈ valor neutro. Usamos 1.0 como referência (DNA gera ~0.85-1.15).
  const eye = multiplierToPair(morph.eyeSize, 1);
  if (eye.positive > 0) out.eye_big = eye.positive;
  if (eye.negative > 0) out.eye_small = eye.negative;

  const height = multiplierToPair(morph.bodyHeightStretch, 1);
  if (height.positive > 0) out.body_tall = height.positive;
  if (height.negative > 0) out.body_short = height.negative;

  const width = multiplierToPair(morph.bodyWidthSquash, 1);
  if (width.positive > 0) out.body_wide = width.positive;
  if (width.negative > 0) out.body_narrow = width.negative;

  // Posture lean — se morphology incluir (DLI futuro)
  const postureLean = (morph as Morphology & { postureLean?: number }).postureLean ?? 0;
  if (postureLean !== 0) {
    const posture = postureToPair(postureLean);
    if (posture.positive > 0) out.posture_forward = posture.positive;
    if (posture.negative > 0) out.posture_back = posture.negative;
  }

  // Aura — opacity é proxy de "força visual" da aura
  if (morph.auraOpacity > 0.5) {
    out.aura_strong = Math.min(1, (morph.auraOpacity - 0.5) / 0.5);
  }

  // Pattern density via bodyChaosBumps + bodyCreativityBumps
  const patternDensity = (morph.bodyChaosBumps + morph.bodyCreativityBumps) / 2;
  if (patternDensity > 0.5) {
    out.pattern_dense = Math.min(1, (patternDensity - 0.5) / 0.5);
  }

  return out;
}

/**
 * Soma boosts aditivos (de mutations, personality, etc) sobre influences base.
 * Boosts > 0 EMPURRAM key. Boosts < 0 REDUZEM. Resultado clamped [0, 1].
 *
 * Importante: se boost cria key inexistente em base, ela é adicionada.
 * Se boost zera uma key, ela é REMOVIDA (payload mínimo preservado).
 */
export function mergeMorphInfluences(
  base: MorphInfluences,
  boosts: Record<string, number> | undefined,
): MorphInfluences {
  if (!boosts || Object.keys(boosts).length === 0) return { ...base };
  const out: MorphInfluences = { ...base };
  for (const [key, boost] of Object.entries(boosts)) {
    if (typeof boost !== 'number' || !Number.isFinite(boost)) continue;
    const current = (out[key as MorphInfluenceKey] ?? 0) as number;
    const merged = Math.max(0, Math.min(1, current + boost));
    if (merged > 0) {
      out[key as MorphInfluenceKey] = merged;
    } else {
      delete out[key as MorphInfluenceKey];
    }
  }
  return out;
}
