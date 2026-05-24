/**
 * Contrato RN ↔ Unity — UnityMascotState v1.
 *
 * JSON serializável enviado ao runtime Unity. Campos em inglês para o lado C#.
 * Mapeamento PT→EN fica em `mappings.ts` e `buildUnityMascotState.ts`.
 */

import type { GeneKey } from '@/lib/dna/genome';

// ---------------------------------------------------------------------------
// Enums / unions base
// ---------------------------------------------------------------------------

export type MascotRendererMode = 'three' | 'unity' | 'fallback2d';

export type UnityMascotMood = 'sad' | 'neutral' | 'happy' | 'excited' | 'exhausted';

export type UnityMascotPhase = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'evolved';

export type UnityHabitKind =
  | 'water'
  | 'sleep'
  | 'exercise'
  | 'meditation'
  | 'reading'
  | 'journaling'
  | 'breath'
  | 'outdoor'
  | 'sun';

export type UnityPersonality = 'calm' | 'motivator' | 'cute' | 'wise';

export type UnityQualityPreset = 'auto' | 'low' | 'medium' | 'high';

export type UnityMorphPattern = 'plain' | 'stripes' | 'spots' | 'fractal' | 'cells';

export type UnityAnimationName =
  | 'idle'
  | 'blink'
  | 'smile'
  | 'sad'
  | 'excited'
  | 'sleep'
  | 'wave'
  | 'hatch'
  | 'celebrate'
  | 'rest'
  | 'observe'
  | 'stretch';

// ---------------------------------------------------------------------------
// Sub-estruturas do estado
// ---------------------------------------------------------------------------

export type UnityDnaGenes = Record<GeneKey, number>;

export interface UnityMascotIdentity {
  id: string;
  name: string;
  personality: UnityPersonality;
  /** Seed procedural imutável (dna_seed). */
  seed: number;
  /** Modelo base Unity/GLB: bipo | zip | lulu | aro */
  baseModel: string;
}

export interface UnityMascotProgression {
  phase: UnityMascotPhase;
  level: number;
  xp: number;
  energy: number;
  health: number;
  streakDays?: number;
}

export interface UnityAnimationBlend {
  name: UnityAnimationName;
  weight: number;
}

export interface UnityAnimationState {
  primary: UnityAnimationName;
  blend?: UnityAnimationBlend;
  speed: number;
}

export interface UnityMascotLiveState {
  mood: UnityMascotMood;
  animation: UnityAnimationState;
  reduceMotion: boolean;
  /** ISO timestamp — última vez que o usuário interagiu. */
  lastSeenAt: string;
}

export interface UnityMaterialVisuals {
  bodyTint: number;
  accentTint: number;
  glowTint: number;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  pattern: UnityMorphPattern;
}

export interface UnityEvolutionVisuals {
  glowMultiplier: number;
  auraParticleBoost: number;
  postureBias: number;
  eyeBrightness: number;
  bodyFirmness: number;
  calmAura: boolean;
  zenParticles: boolean;
  environmentTint: string;
  idleAnimation: string;
  bodyScaleMultiplier: number;
}

export interface UnityMascotVisuals extends UnityMaterialVisuals {
  evolution?: UnityEvolutionVisuals;
  phaseScale: number;
}

export interface UnityBoneScales {
  head: number;
  neck: number;
  body: number;
  arm_L: number;
  arm_R: number;
  leg_L: number;
  leg_R: number;
  eye_L: number;
  eye_R: number;
  jaw: number;
}

export interface UnityMorphologyParams {
  boneScales: UnityBoneScales;
  limbCount: number;
  eyeSize: number;
  hasTail: boolean;
  hasSpikes: boolean;
  pattern: UnityMorphPattern;
}

export interface UnityAccessorySlot {
  id: string;
  slot: 'hat' | 'glasses' | 'neck' | 'back' | 'ear' | 'body' | 'aura';
  bone: string;
  assetKey: string;
  scale?: number;
}

export interface UnityMutationSlot {
  id: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UnityEnvironmentState {
  sceneId: string;
  tint: string;
  quality: UnityQualityPreset;
}

// ---------------------------------------------------------------------------
// Eventos pendentes (moments → Unity)
// ---------------------------------------------------------------------------

export interface UnityHabitEvent {
  kind: 'habit';
  habit: UnityHabitKind;
  intensity?: number;
}

export interface UnityPhaseAdvancedEvent {
  kind: 'phase.advanced';
  from: UnityMascotPhase;
  to: UnityMascotPhase;
}

export interface UnityMutationUnlockedEvent {
  kind: 'mutation.unlocked';
  mutationId: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UnityCheckinEvent {
  kind: 'checkin.completed';
  habit: UnityHabitKind;
  xpGained: number;
}

export interface UnityGestureEvent {
  kind: 'gesture';
  gesture: 'pet' | 'tap' | 'poke';
}

export interface UnityCustomEvent {
  kind: 'custom';
  name: string;
  payload?: Record<string, unknown>;
}

export type UnityMascotEvent =
  | UnityHabitEvent
  | UnityPhaseAdvancedEvent
  | UnityMutationUnlockedEvent
  | UnityCheckinEvent
  | UnityGestureEvent
  | UnityCustomEvent;

// ---------------------------------------------------------------------------
// Estado raiz v1
// ---------------------------------------------------------------------------

export interface UnityMascotState {
  schemaVersion: 1;
  identity: UnityMascotIdentity;
  progression: UnityMascotProgression;
  state: UnityMascotLiveState;
  dna: UnityDnaGenes;
  visuals: UnityMascotVisuals;
  morphology: UnityMorphologyParams;
  accessories: UnityAccessorySlot[];
  mutations: UnityMutationSlot[];
  environment: UnityEnvironmentState;
  pendingEvent?: UnityMascotEvent;
}

// ---------------------------------------------------------------------------
// Bridge messages
// ---------------------------------------------------------------------------

export interface RNStateUpdateMessage {
  type: 'state.update';
  state: UnityMascotState;
  seq: number;
}

export interface RNEventPlayMessage {
  type: 'event.play';
  event: UnityMascotEvent;
  seq: number;
}

export interface RNGestureMessage {
  type: 'gesture';
  gesture: 'pet' | 'tap' | 'poke';
}

export interface RNQualityMessage {
  type: 'quality.set';
  quality: UnityQualityPreset;
}

export interface RNDebugMessage {
  type: 'debug.simulateFailure';
  enabled: boolean;
}

export type RNToUnityMessage =
  | RNStateUpdateMessage
  | RNEventPlayMessage
  | RNGestureMessage
  | RNQualityMessage
  | RNDebugMessage;

export interface UnityReadyMessage {
  type: 'ready';
  version: string;
  capabilities?: string[];
}

export interface UnityErrorMessage {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
}

export interface UnityAnimationCompleteMessage {
  type: 'animation.complete';
  name: UnityAnimationName;
}

export interface UnityGestureReceivedMessage {
  type: 'gesture.received';
  gesture: string;
}

export interface UnityAckMessage {
  type: 'ack';
  seq: number;
  originalType: 'state.update' | 'event.play';
}

export type UnityToRNMessage =
  | UnityReadyMessage
  | UnityErrorMessage
  | UnityAnimationCompleteMessage
  | UnityGestureReceivedMessage
  | UnityAckMessage;
