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
