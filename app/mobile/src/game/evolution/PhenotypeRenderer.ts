/**
 * Mapeia fenótipo + displayModifiers → props visuais do Mascot2D.
 * Camada pura — testável, sem React.
 */

import type { Phenotype, PhenotypeDisplayModifiers } from './EvolutionTypes';

export type IdleAnimationKind = 'calm' | 'active' | 'zen' | 'bounce' | 'wander' | 'observe' | 'rest';

export interface MascotEvolutionVisuals {
  glowMultiplier: number;
  auraParticleBoost: number;
  postureBias: number;
  eyeBrightness: number;
  bodyFirmness: number;
  calmAura: boolean;
  activeEnergy: boolean;
  zenParticles: boolean;
  missedYouTone: boolean;
  environmentTint: string;
  idleAnimation: IdleAnimationKind;
  /** Multiplicador de escala do corpo (posture + firmness). */
  bodyScaleMultiplier: number;
}

const ENVIRONMENT_TINTS = [
  '#0a0e1a',
  '#0f1a12',
  '#1a1428',
  '#1a2030',
  '#281a10',
  '#101828',
  '#1a1020',
  '#0a1818',
] as const;

const IDLE_BY_ANIMATION_SET: readonly IdleAnimationKind[] = [
  'calm', 'active', 'zen', 'bounce', 'wander',
  'observe', 'rest', 'calm', 'active', 'zen',
  'bounce', 'wander', 'observe', 'rest', 'calm',
  'active', 'zen', 'bounce', 'wander', 'observe',
];

function environmentTint(environmentId: number, modifiers: PhenotypeDisplayModifiers): string {
  const base = ENVIRONMENT_TINTS[environmentId % ENVIRONMENT_TINTS.length]!;
  if (modifiers.calmAura) return blendHex(base, '#1a2840', 0.25);
  if (modifiers.activeEnergy) return blendHex(base, '#281810', 0.2);
  if (modifiers.zenParticles) return blendHex(base, '#102818', 0.22);
  if (modifiers.missedYouTone) return blendHex(base, '#201828', 0.18);
  return base;
}

function blendHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(ar, br))}${toHex(mix(ag, bg))}${toHex(mix(ab, bb))}`;
}

function resolveIdleAnimation(
  animationSet: number,
  modifiers: PhenotypeDisplayModifiers,
): IdleAnimationKind {
  if (modifiers.activeEnergy) return 'active';
  if (modifiers.zenParticles) return 'zen';
  if (modifiers.calmAura) return 'calm';
  if (modifiers.missedYouTone) return 'observe';
  return IDLE_BY_ANIMATION_SET[animationSet % IDLE_BY_ANIMATION_SET.length] ?? 'calm';
}

/** Converte fenótipo completo em props visuais para o renderer. */
export function phenotypeToMascotVisuals(phenotype: Phenotype): MascotEvolutionVisuals {
  const m = phenotype.displayModifiers;
  const bodyScaleMultiplier = 1 + m.postureBias * 0.08 + m.bodyFirmness * 0.06;

  return {
    glowMultiplier: m.glowMultiplier,
    auraParticleBoost: m.auraParticleBoost,
    postureBias: m.postureBias,
    eyeBrightness: m.eyeBrightness,
    bodyFirmness: m.bodyFirmness,
    calmAura: m.calmAura,
    activeEnergy: m.activeEnergy,
    zenParticles: m.zenParticles,
    missedYouTone: m.missedYouTone,
    environmentTint: environmentTint(phenotype.slots.environmentId, m),
    idleAnimation: resolveIdleAnimation(phenotype.slots.animationSet, m),
    bodyScaleMultiplier,
  };
}

/** Mescla displayModifiers parciais (útil em preview/onboarding). */
export function modifiersToVisuals(
  modifiers: PhenotypeDisplayModifiers,
  animationSet = 0,
  environmentId = 0,
): MascotEvolutionVisuals {
  return phenotypeToMascotVisuals({
    slots: {
      bodyType: 0, bodyScale: 0, posture: 0, expression: 0, eyeType: 0,
      mouthType: 0, auraType: 0, textureType: 0, colorPalette: 0,
      bodyPattern: 0, accessorySet: 0, particleStyle: 0,
      environmentId, animationSet, personalityFlavor: 0, rarityTier: 0,
    },
    morphology: {} as Phenotype['morphology'],
    palette: {} as Phenotype['palette'],
    macroPhase: 'ovo',
    microEvolutionLevel: 0,
    activeMutations: [],
    mood: 'ok',
    displayModifiers: modifiers,
  });
}
