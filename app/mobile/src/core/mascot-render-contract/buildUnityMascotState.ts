/**
 * Monta UnityMascotState v1 a partir do estado RN (store + contexto opcional).
 */

import {
  dnaToAnimationState,
  dnaToBoneScales,
  dnaToMaterialBindings,
  unlockedAccessories,
  type UserAgeBand,
} from '@/lib/dna/bindings';
import { morphologyFromGenome, type MorphPattern } from '@/lib/dna/morphology';
import { morphInfluencesFromMorphology, mergeMorphInfluences } from '@/lib/dna/morphInfluences';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import { aggregateVisualImpact } from '@/lib/dna/mutations';
import { sanitizeGenome, type Genome } from '@/lib/dna';
import type { MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { Checkin, Mascot, MascotPhase, Profile, HabitKind } from '@/types';
import {
  ACCESSORY_ID_TO_UNITY,
  HABIT_TO_UNITY,
  mapAccessoryId,
  mapMood,
  mapPersonality,
  mapPhase,
  PERSONALITY_TO_BASE_MODEL,
  UNITY_GLB_ACCESSORIES,
  type UnityGlbAccessoryKey,
} from './mappings';
import type {
  UnityAccessorySlot,
  UnityHabitEvent,
  UnityMascotEvent,
  UnityMascotState,
  UnityMorphPattern,
  UnityQualityPreset,
} from './types';

const PHASE_UI_SCALE: Record<MascotPhase, number> = {
  ovo: 0.55,
  bebe: 0.72,
  crianca: 0.88,
  adolescente: 1.0,
  adulto: 1.12,
  evoluido: 1.25,
};

/** Slot fallback se o GLB não está no catálogo (não deveria acontecer). */
const DEFAULT_SLOT: UnityAccessorySlot['slot'] = 'hat';

/** Deriva slot do catálogo único `UNITY_GLB_ACCESSORIES` (source of truth). */
function resolveSlot(unityKey: string): UnityAccessorySlot['slot'] {
  if (unityKey in UNITY_GLB_ACCESSORIES) {
    return UNITY_GLB_ACCESSORIES[unityKey as UnityGlbAccessoryKey].slot;
  }
  return DEFAULT_SLOT;
}

export interface BuildUnityMascotStateContext {
  profile?: Profile | null;
  recentCheckins?: readonly Checkin[];
  pendingEvent?: UnityMascotEvent;
  equippedAccessoryIds?: readonly string[];
  unlockedAccessoryIds?: readonly string[];
  mutationIds?: readonly string[];
  evolutionVisuals?: MascotEvolutionVisuals | null;
  sceneId?: string;
  reduceMotion?: boolean;
  quality?: UnityQualityPreset;
  /** Hora local para tint do cenário (habitat vivo). */
  sceneHour?: number;
  /** Energia da simulação (0–100) — override visual quando disponível. */
  simEnergy?: number;
  /** Mood da simulação — override emocional quando disponível. */
  simMood?: import('@/types').MascotMood;
  streakDays?: number;
  userBand?: UserAgeBand;
}

function toMorphPattern(pattern: MorphPattern): UnityMorphPattern {
  return pattern;
}

function ageBandFromProfile(profile: Profile | null | undefined): UserAgeBand {
  const band = profile?.age_band;
  if (band === '16-24' || band === '25-34' || band === '35-44' || band === '45+') {
    return band;
  }
  return '25-34';
}

function buildAccessories(
  dna: Genome,
  equipped: readonly string[],
  unlocked: readonly string[],
): UnityAccessorySlot[] {
  const attachments = unlockedAccessories(dna, unlocked, equipped);
  return attachments.map(att => {
    const rawId = att.glbPath.split('/').pop()?.replace('.glb', '') ?? '';
    const unityId = mapAccessoryId(rawId);
    return {
      id: unityId,
      slot: resolveSlot(unityId),
      bone: att.bone,
      assetKey: unityId,
      scale: att.scale,
    };
  });
}

function buildPendingFromCheckin(checkin: Checkin): UnityHabitEvent {
  return {
    kind: 'habit',
    habit: HABIT_TO_UNITY[checkin.habit_kind],
    intensity: checkin.value ?? undefined,
  };
}

export interface BuildMomentOptions {
  habitKind?: HabitKind;
  xpGained?: number;
  phaseFrom?: MascotPhase;
  phaseTo?: MascotPhase;
  mutationId?: string;
  mutationRarity?: 'common' | 'rare' | 'epic' | 'legendary';
  gesture?: 'pet' | 'tap' | 'poke';
}

/** Converte momentos de gameplay em pendingEvent para Unity. */
export function buildMomentPendingEvent(options: BuildMomentOptions): UnityMascotEvent | undefined {
  if (options.gesture) {
    return { kind: 'gesture', gesture: options.gesture };
  }
  if (options.phaseFrom && options.phaseTo) {
    return {
      kind: 'phase.advanced',
      from: mapPhase(options.phaseFrom),
      to: mapPhase(options.phaseTo),
    };
  }
  if (options.mutationId) {
    return {
      kind: 'mutation.unlocked',
      mutationId: options.mutationId,
      rarity: options.mutationRarity ?? 'common',
    };
  }
  if (options.habitKind && options.xpGained != null) {
    return {
      kind: 'checkin.completed',
      habit: HABIT_TO_UNITY[options.habitKind],
      xpGained: options.xpGained,
    };
  }
  if (options.habitKind) {
    return { kind: 'habit', habit: HABIT_TO_UNITY[options.habitKind] };
  }
  return undefined;
}

export function buildUnityMascotState(
  mascot: Mascot,
  context: BuildUnityMascotStateContext = {},
): UnityMascotState {
  const dna = sanitizeGenome(mascot.dna ?? {});
  const userBand = context.userBand ?? ageBandFromProfile(context.profile);
  const phase = mascot.phase;
  const effectiveMood = context.simMood ?? mascot.mood;
  const effectiveEnergy = context.simEnergy ?? mascot.energy;
  const phasePreset = mapPhase(phase);
  const glowMult = phase === 'evoluido' ? 1.5 : phase === 'ovo' ? 0.4 : 1.0;
  const materials = dnaToMaterialBindings(dna, userBand, glowMult);
  const bones = dnaToBoneScales(dna, phase, userBand);
  const morph = morphologyFromGenome(dna);
  const animation = dnaToAnimationState(dna, effectiveMood);

  const equipped = context.equippedAccessoryIds ?? [];
  const unlocked = context.unlockedAccessoryIds ?? equipped;
  const mutationIds = context.mutationIds ?? [];
  const evo = context.evolutionVisuals;

  let pendingEvent = context.pendingEvent;
  if (!pendingEvent && context.recentCheckins?.length) {
    const last = context.recentCheckins[context.recentCheckins.length - 1];
    if (last) pendingEvent = buildPendingFromCheckin(last);
  }

  const state: UnityMascotState = {
    schemaVersion: 1,
    identity: {
      id: mascot.id,
      name: mascot.name,
      personality: mapPersonality(mascot.personality),
      seed: mascot.dna_seed ?? 0,
      baseModel: PERSONALITY_TO_BASE_MODEL[mascot.personality],
    },
    progression: {
      phase: phasePreset,
      level: mascot.level,
      xp: mascot.xp,
      energy: effectiveEnergy,
      health: mascot.health,
      streakDays: context.streakDays,
    },
    state: {
      mood: mapMood(effectiveMood),
      animation: {
        primary: animation.primary,
        blend: animation.blend
          ? { name: animation.blend.name, weight: animation.blend.weight }
          : undefined,
        speed: animation.speed,
      },
      reduceMotion: context.reduceMotion ?? false,
      lastSeenAt: mascot.last_seen_at,
    },
    dna: { ...dna },
    visuals: {
      bodyTint: materials.bodyTint,
      accentTint: materials.accentTint,
      glowTint: materials.glowTint,
      emissiveIntensity: materials.emissiveIntensity,
      roughness: materials.roughness,
      metalness: materials.metalness,
      clearcoat: materials.clearcoat,
      pattern: toMorphPattern(materials.pattern),
      phaseScale: PHASE_UI_SCALE[phase] ?? 1,
      evolution: evo
        ? {
            glowMultiplier: evo.glowMultiplier,
            auraParticleBoost: evo.auraParticleBoost,
            postureBias: evo.postureBias,
            eyeBrightness: evo.eyeBrightness,
            bodyFirmness: evo.bodyFirmness,
            calmAura: evo.calmAura,
            zenParticles: evo.zenParticles,
            environmentTint: evo.environmentTint,
            idleAnimation: evo.idleAnimation,
            bodyScaleMultiplier: evo.bodyScaleMultiplier,
          }
        : undefined,
    },
    morphology: {
      boneScales: { ...bones },
      limbCount: morph.limbCount,
      eyeSize: morph.eyeSize,
      hasTail: morph.hasTail,
      hasSpikes: morph.hasSpikes,
      pattern: toMorphPattern(morph.pattern),
      // Influences derivadas + boosts agregados (mutations + personality).
      // mergeMorphInfluences clamps final em [0, 1].
      // Personality bias é APLICADO POR ÚLTIMO — assina visualmente mas com
      // peso pequeno, não destrói customização forte do usuário.
      morphInfluences: mergeMorphInfluences(
        mergeMorphInfluences(
          morphInfluencesFromMorphology(morph),
          aggregateVisualImpact(mutationIds).morphInfluenceBoosts,
        ),
        personalityMorphBias(mascot.personality),
      ),
    },
    accessories: buildAccessories(dna, equipped, unlocked),
    mutations: mutationIds.map(id => ({ id })),
    environment: {
      sceneId: context.sceneId ?? 'room',
      tint: evo?.environmentTint ?? '#0a0e1a',
      quality: context.quality ?? 'auto',
    },
    pendingEvent,
  };

  return state;
}

/** Re-export para testes de tabela de acessórios. */
export { ACCESSORY_ID_TO_UNITY };
