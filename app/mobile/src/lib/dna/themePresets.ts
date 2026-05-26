/**
 * Theme presets — atalhos de customização visual estilo "Sims trait stamps".
 *
 * Cada preset é uma assinatura visual coerente (não só random). Aplicar um
 * preset escreve sobre o draft atual — usuário pode customizar depois.
 *
 * Princípio: presets respeitam o cap [0.7, 1.3] e nunca mutam DNA.
 * São templates de aparência, não personalidade.
 */

import type { MascotCustomization } from '@/types';

type DraftFields = Omit<MascotCustomization, 'user_id' | 'updated_at'>;

export interface ThemePreset {
  id: string;
  /** Label PT-BR amigável. */
  label: string;
  /** Emoji curto pra ilustrar. */
  emoji: string;
  /** Descrição one-liner. */
  description: string;
  /** Patch que `applyPreset` aplica sobre o draft atual. */
  patch: Partial<DraftFields>;
}

/**
 * Catálogo curado. Cada preset bate uma "vibe" diferente.
 * Manter ordem pq UI renderiza linearmente.
 */
export const THEME_PRESETS: ReadonlyArray<ThemePreset> = [
  {
    id: 'kawaii',
    label: 'Kawaii',
    emoji: '🥺',
    description: 'olhos grandes, corpo achatado, sem espinhos',
    patch: {
      eye_size: 1.25,
      eye_spread: 0.95,
      body_height: 0.85,
      body_width: 1.1,
      pattern_density: 0.85,
      aura_intensity: 1.0,
      preferred_pattern: 'plain',
      posture_lean: 0,
      force_hide_spikes: true,
      force_hide_tail: false,
      force_hide_antennae: false,
    },
  },
  {
    id: 'robust',
    label: 'Robusto',
    emoji: '💪',
    description: 'corpo largo e baixo, olhos pequenos, padrão denso',
    patch: {
      eye_size: 0.85,
      eye_spread: 1.15,
      body_height: 0.9,
      body_width: 1.25,
      pattern_density: 1.2,
      aura_intensity: 0.85,
      preferred_pattern: 'cells',
      posture_lean: 0.05,
      force_hide_spikes: false,
      force_hide_tail: false,
      force_hide_antennae: false,
    },
  },
  {
    id: 'mystic',
    label: 'Místico',
    emoji: '✨',
    description: 'aura máxima, padrão fractal, postura discreta',
    patch: {
      eye_size: 1.1,
      eye_spread: 1.0,
      body_height: 1.1,
      body_width: 0.9,
      pattern_density: 1.15,
      aura_intensity: 1.3,
      preferred_pattern: 'fractal',
      posture_lean: -0.05,
      force_hide_spikes: false,
      force_hide_tail: false,
      force_hide_antennae: false,
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    emoji: '◯',
    description: 'liso, sem aura, proporções neutras',
    patch: {
      eye_size: 1.0,
      eye_spread: 1.0,
      body_height: 1.0,
      body_width: 1.0,
      pattern_density: 0.7,
      aura_intensity: 0.7,
      preferred_pattern: 'plain',
      posture_lean: 0,
      force_hide_spikes: true,
      force_hide_tail: true,
      force_hide_antennae: true,
    },
  },
  {
    id: 'wild',
    label: 'Selvagem',
    emoji: '🔥',
    description: 'corpo alto, espinhos, padrão denso',
    patch: {
      eye_size: 0.95,
      eye_spread: 1.05,
      body_height: 1.25,
      body_width: 0.85,
      pattern_density: 1.3,
      aura_intensity: 1.1,
      preferred_pattern: 'spots',
      posture_lean: 0.08,
      force_hide_spikes: false,
      force_hide_tail: false,
      force_hide_antennae: false,
    },
  },
];

/**
 * Aplica um preset sobre o draft existente. Preset patch override total
 * dos campos definidos — não merge parcial. Isso garante coerência visual.
 */
export function applyPreset(draft: DraftFields, preset: ThemePreset): DraftFields {
  return { ...draft, ...preset.patch };
}

/**
 * Acha preset por id. Util pra serialização.
 */
export function findPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find(p => p.id === id);
}

const DEFAULT_DRAFT: DraftFields = {
  eye_size: 1,
  eye_spread: 1,
  body_height: 1,
  body_width: 1,
  aura_intensity: 1,
  pattern_density: 1,
  preferred_pattern: 'plain',
  posture_lean: 0,
  force_hide_tail: false,
  force_hide_antennae: false,
  force_hide_spikes: false,
};

/**
 * Combina 2 presets via lerp do delta em relação ao default.
 *
 * Por que NÃO média direta dos multipliers:
 *   média(1.25, 0.75) = 1.0 → preset blend "neutraliza" tudo.
 *
 * Por que lerp do delta:
 *   delta_a = 1.25 - 1 = +0.25
 *   delta_b = 0.75 - 1 = -0.25
 *   blend_50 = 1 + lerp(0.25, -0.25, 0.5) = 1 + 0 = 1.0 (esperado: neutralizou)
 *
 *   delta_a = 1.25, delta_b = 1.15
 *   blend_50 = 1 + lerp(0.25, 0.15, 0.5) = 1.20 (média dos deltas)
 *
 * `t` em [0, 1]: 0 = só preset A, 1 = só preset B, 0.5 = mix igual.
 *
 * Pattern + booleans: t < 0.5 → A vence, t >= 0.5 → B vence (escolha binária).
 */
export function blendPresets(a: ThemePreset, b: ThemePreset, t: number): DraftFields {
  const tClamped = Math.max(0, Math.min(1, t));

  const lerpField = (key: keyof DraftFields): number => {
    const dft = DEFAULT_DRAFT[key] as number;
    const aVal = (a.patch[key] as number | undefined) ?? dft;
    const bVal = (b.patch[key] as number | undefined) ?? dft;
    const deltaA = aVal - dft;
    const deltaB = bVal - dft;
    const blendedDelta = deltaA + (deltaB - deltaA) * tClamped;
    return dft + blendedDelta;
  };

  const pickCategorical = <T>(av: T | undefined, bv: T | undefined, dft: T): T => {
    if (tClamped < 0.5) return av ?? dft;
    return bv ?? dft;
  };

  return {
    eye_size: lerpField('eye_size'),
    eye_spread: lerpField('eye_spread'),
    body_height: lerpField('body_height'),
    body_width: lerpField('body_width'),
    aura_intensity: lerpField('aura_intensity'),
    pattern_density: lerpField('pattern_density'),
    preferred_pattern: pickCategorical(
      a.patch.preferred_pattern,
      b.patch.preferred_pattern,
      DEFAULT_DRAFT.preferred_pattern,
    ),
    posture_lean: lerpField('posture_lean'),
    force_hide_tail: pickCategorical(
      a.patch.force_hide_tail,
      b.patch.force_hide_tail,
      DEFAULT_DRAFT.force_hide_tail,
    ),
    force_hide_antennae: pickCategorical(
      a.patch.force_hide_antennae,
      b.patch.force_hide_antennae,
      DEFAULT_DRAFT.force_hide_antennae,
    ),
    force_hide_spikes: pickCategorical(
      a.patch.force_hide_spikes,
      b.patch.force_hide_spikes,
      DEFAULT_DRAFT.force_hide_spikes,
    ),
  };
}

/**
 * Detecta se draft atual bate exatamente com algum preset (pra highlight).
 * Tolerância de 0.005 em multiplicadores.
 */
export function matchPreset(draft: DraftFields): ThemePreset | undefined {
  return THEME_PRESETS.find(p => {
    const patch = p.patch;
    const eq = (a: number | undefined, b: number | undefined): boolean => {
      if (a === undefined || b === undefined) return false;
      return Math.abs(a - b) < 0.005;
    };
    return (
      eq(draft.eye_size, patch.eye_size) &&
      eq(draft.eye_spread, patch.eye_spread) &&
      eq(draft.body_height, patch.body_height) &&
      eq(draft.body_width, patch.body_width) &&
      eq(draft.pattern_density, patch.pattern_density) &&
      eq(draft.aura_intensity, patch.aura_intensity) &&
      draft.preferred_pattern === patch.preferred_pattern &&
      eq(draft.posture_lean, patch.posture_lean) &&
      draft.force_hide_tail === patch.force_hide_tail &&
      draft.force_hide_antennae === patch.force_hide_antennae &&
      draft.force_hide_spikes === patch.force_hide_spikes
    );
  });
}

/**
 * Compose N presets with arbitrary weights.
 *
 * Why a separate helper from blendPresets:
 *   blendPresets handles the 2-preset case with a single `t` knob.
 *   blendN generalizes to N>=1 with per-slot weights, normalized so they
 *   always sum to 1. UI surfaces "3 vibes mixed" without re-running
 *   pairwise blends.
 *
 * Strategy:
 *   - Filter zero/negative weights.
 *   - Normalize weights so they sum to 1.
 *   - Numeric fields: weighted sum of delta-from-default.
 *   - Categorical fields (pattern, hide_*): top-weight slot wins.
 *
 * Invariants:
 *   - N=0 (or all weights = 0) -> DEFAULT_DRAFT.
 *   - N=1 -> applyPreset(default, preset).
 */
export interface WeightedPreset {
  preset: ThemePreset;
  weight: number;
}

export function blendN(slots: ReadonlyArray<WeightedPreset>): DraftFields {
  const dft: DraftFields = {
    eye_size: 1,
    eye_spread: 1,
    body_height: 1,
    body_width: 1,
    aura_intensity: 1,
    pattern_density: 1,
    preferred_pattern: 'plain',
    posture_lean: 0,
    force_hide_tail: false,
    force_hide_antennae: false,
    force_hide_spikes: false,
  };

  const active = slots.filter(s => s.weight > 0 && s.preset);
  const total = active.reduce((acc, s) => acc + s.weight, 0);
  if (active.length === 0 || total <= 0) return dft;

  const normalized = active.map(s => ({ preset: s.preset, weight: s.weight / total }));

  const numericFields: Array<keyof DraftFields> = [
    'eye_size',
    'eye_spread',
    'body_height',
    'body_width',
    'aura_intensity',
    'pattern_density',
    'posture_lean',
  ];

  const numericOut: Partial<DraftFields> = {};
  for (const key of numericFields) {
    const baseline = dft[key] as number;
    let sumDelta = 0;
    for (const { preset, weight } of normalized) {
      const v = (preset.patch[key] as number | undefined) ?? baseline;
      sumDelta += (v - baseline) * weight;
    }
    (numericOut as Record<string, number>)[key as string] = baseline + sumDelta;
  }

  const top = [...normalized].sort((a, b) => b.weight - a.weight)[0];

  return {
    ...dft,
    ...numericOut,
    preferred_pattern: top.preset.patch.preferred_pattern ?? dft.preferred_pattern,
    force_hide_tail: top.preset.patch.force_hide_tail ?? dft.force_hide_tail,
    force_hide_antennae: top.preset.patch.force_hide_antennae ?? dft.force_hide_antennae,
    force_hide_spikes: top.preset.patch.force_hide_spikes ?? dft.force_hide_spikes,
  };
}
