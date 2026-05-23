/**
 * DNA → Material/Bones bindings.
 *
 * Centraliza o mapping entre o Genome procedural e os parâmetros que o
 * Mascot3D vai aplicar nos GLBs modelados em Blender. Pure functions —
 * zero side effects, fácil de testar.
 *
 * Quando os assets GLB chegarem (ver `docs/design/MASCOT_3D_ASSETS_BRIEF.md`),
 * o Mascot3D.tsx vai:
 *   1. `useGLTF()` carrega o GLB (depende da personality do mascote)
 *   2. `dnaToMaterialBindings(dna)` retorna tints + intensities
 *   3. Aplica em `body_material.color.setHex(bindings.bodyTint)` etc
 *   4. `dnaToBoneScales(dna, phase, userBand)` retorna scales por bone
 *   5. Aplica em `bones.head.scale.set(scales.head, ...)` etc
 *   6. `dnaToAnimationState(dna, mood, action)` retorna animation a tocar
 *   7. `useAnimations(actions)` faz blend
 *
 * Substitui o sistema antigo de vertex displacement procedural, que
 * inerentemente gerava blobs alienígenas. Agora o DNA tinta + escala
 * proporcionalmente assets feitos por artista — Pokemon-tier visual real.
 */

import { paletteFromGenome } from './palette';
import { morphologyFromGenome, type Morphology } from './morphology';
import { moodScore } from './mood';
import type { Genome } from './genome';
import type { MascotMood, MascotPhase, Personality } from '@/types';

/**
 * Bindings que o renderer aplica diretamente no GLB carregado.
 * Tudo numérico ou hex — sem objetos Three.js (lib pura, testável headless).
 */
export interface MaterialBindings {
  /** Cor do body_material (hex number) — `mesh.material.color.setHex(this)` */
  bodyTint: number;
  /** Cor do accent_material (cauda, bracinhos, pézinhos) */
  accentTint: number;
  /** Cor do glow_material (olhos, aura, padrões emissivos) */
  glowTint: number;
  /** Intensidade do emissive (0-1 multiplier) */
  emissiveIntensity: number;
  /** Roughness override no shader (0-1) */
  roughness: number;
  /** Metalness override no shader (0-1) */
  metalness: number;
  /** Clearcoat (0-1) — se shader suporta MeshPhysicalMaterial */
  clearcoat: number;
  /** Padrão de superfície desbloqueado pelo DNA */
  pattern: Morphology['pattern'];
}

/**
 * Bone scales por bone — aplica em `skeleton.bones[name].scale.setScalar(value)`.
 * Valores são MULTIPLICADORES do base 1.0 — chibi proportions vêm daqui.
 */
export interface BoneScales {
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

/**
 * Animation state que o renderer toca via `useAnimations`. Lista de actions
 * com peso pra blend cross-fade entre estados.
 */
export interface AnimationState {
  primary: AnimationName;
  /** Secondary action mixed at weight (pra blend feliz+falar, etc) */
  blend?: { name: AnimationName; weight: number };
  /** Override de speed (1.0 = normal, 0.5 = devagar exausto, 1.5 = excited) */
  speed: number;
}

export type AnimationName =
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

/**
 * Modificadores por user age band — espelha USER_BANDS do prototipo.
 * Aplicado no DNA→bindings pra que mesmo a mesma criatura veja-se
 * diferente em users diferentes (sem retreinar DNA).
 */
export type UserAgeBand = '16-24' | '25-34' | '35-44' | '45+';

export const USER_BAND_MODS: Record<
  UserAgeBand,
  {
    hueShift: number;
    satMult: number;
    lightShift: number;
    eyeMult: number;
    bodyRound: number;
    label: string;
  }
> = {
  '16-24': {
    hueShift: -8,
    satMult: 1.08,
    lightShift: 4,
    eyeMult: 1.12,
    bodyRound: 1.05,
    label: '16–24 (jovem · kawaii)',
  },
  '25-34': {
    hueShift: 0,
    satMult: 1.0,
    lightShift: 0,
    eyeMult: 1.0,
    bodyRound: 1.0,
    label: '25–34 (default)',
  },
  '35-44': {
    hueShift: 8,
    satMult: 0.95,
    lightShift: -3,
    eyeMult: 0.94,
    bodyRound: 0.98,
    label: '35–44 (contemplativo)',
  },
  '45+': {
    hueShift: 15,
    satMult: 0.9,
    lightShift: -5,
    eyeMult: 0.9,
    bodyRound: 0.96,
    label: '45+ (sereno)',
  },
};

/**
 * Phase → bone scale preset. Cabeça e corpo escalam INDEPENDENTEMENTE pra dar
 * proporções chibi/criança/adulto/evoluído sem precisar de modelos separados.
 *
 * Bebê: cabeça 1.4× corpo 0.7× olhos 1.5× (proporção "infantil" extrema)
 * Adulto: 1.0× (proporção default modelada)
 * Evoluído: cabeça 0.95× + glow boost (silhueta mais matura + brilho)
 */
export const PHASE_BONE_PRESETS: Record<
  MascotPhase,
  { head: number; body: number; eye: number; limb: number; glowMult: number }
> = {
  ovo: { head: 0, body: 0, eye: 0, limb: 0, glowMult: 0.4 }, // hidden, egg shell substitui
  bebe: { head: 1.4, body: 0.7, eye: 1.5, limb: 0.5, glowMult: 0.7 },
  crianca: { head: 1.2, body: 0.85, eye: 1.25, limb: 0.8, glowMult: 0.85 },
  adolescente: { head: 1.05, body: 0.95, eye: 1.05, limb: 0.95, glowMult: 1.0 },
  adulto: { head: 1.0, body: 1.0, eye: 1.0, limb: 1.0, glowMult: 1.15 },
  evoluido: { head: 0.95, body: 1.0, eye: 1.0, limb: 1.05, glowMult: 1.5 },
};

/** Personality → GLB path. Cada base é um asset separado. */
export const PERSONALITY_TO_GLB: Record<Personality, string> = {
  calmo: 'assets/mascot-3d/bipo.glb',
  motivador: 'assets/mascot-3d/zip.glb',
  fofo: 'assets/mascot-3d/lulu.glb',
  sabio: 'assets/mascot-3d/aro.glb',
};

/**
 * Mood → animation state. Cada mood mapeia pra primary animation;
 * `excited` é blend de excited+smile a 60/40 pra dar variedade.
 */
export function moodToAnimation(mood: MascotMood): AnimationState {
  switch (mood) {
    case 'triste':
      return { primary: 'sad', speed: 0.85 };
    case 'exausto':
      return { primary: 'sleep', speed: 0.6 };
    case 'feliz':
      return { primary: 'smile', speed: 1.0 };
    case 'empolgado':
      return {
        primary: 'excited',
        blend: { name: 'smile', weight: 0.4 },
        speed: 1.25,
      };
    case 'ok':
    default:
      return { primary: 'idle', speed: 1.0 };
  }
}

/**
 * DNA → MaterialBindings. Substitui o que o Body.tsx procedural fazia em
 * useFrame (tint cor, ajustar roughness por pattern). Pure function.
 */
export function dnaToMaterialBindings(
  dna: Genome,
  userBand: UserAgeBand = '25-34',
  glowMultPhase: number = 1.0,
): MaterialBindings {
  const userMod = USER_BAND_MODS[userBand];
  const morph = morphologyFromGenome(dna);
  const mood = moodScore(dna);

  // Palette com user band adjust (hue shift + sat mult + light shift)
  // Reusa paletteFromGenome mas aplica modifiers em cima
  const basePal = paletteFromGenome(dna);
  // hslToHex helper inline pra não criar dep
  const [h, s, l] = basePal.bodyHSL;
  const finalH = (h + userMod.hueShift + 360) % 360;
  const finalS = Math.min(95, s * userMod.satMult);
  const finalL = Math.max(48, Math.min(72, l + userMod.lightShift));
  const bodyTint = hslToHex(finalH, finalS, finalL);

  const [aH, aS, aL] = basePal.accentHSL;
  const accentTint = hslToHex(
    (aH + userMod.hueShift + 360) % 360,
    Math.min(95, aS * userMod.satMult),
    Math.max(48, Math.min(78, aL + userMod.lightShift)),
  );

  const [gH, gS, gL] = basePal.glowHSL;
  const glowTint = hslToHex((gH + userMod.hueShift + 360) % 360, gS, gL);

  // Ajuste por pattern (espelha o switch antigo em Body.tsx)
  let roughness = morph.bodyRoughness;
  let metalness = morph.bodyMetalness;
  let clearcoat = 0.85;
  switch (morph.pattern) {
    case 'spots':
      metalness = Math.min(1, metalness + 0.45);
      roughness = Math.max(0, roughness - 0.25);
      break;
    case 'stripes':
      roughness = Math.min(1, roughness + 0.12);
      break;
    case 'fractal':
      clearcoat = 1.0;
      break;
    case 'cells':
      roughness = Math.min(1, roughness + 0.4);
      metalness = Math.min(1, metalness + 0.2);
      break;
    // plain: defaults
  }

  return {
    bodyTint,
    accentTint,
    glowTint,
    emissiveIntensity: (morph.bodyEmissiveIntensity + mood * 0.18) * glowMultPhase,
    roughness,
    metalness,
    clearcoat,
    pattern: morph.pattern,
  };
}

/**
 * DNA + phase + userBand → BoneScales. Aplica em runtime via
 * `skeleton.bones[name].scale.setScalar(value)`.
 */
export function dnaToBoneScales(
  dna: Genome,
  phase: MascotPhase,
  userBand: UserAgeBand = '25-34',
): BoneScales {
  const phasePreset = PHASE_BONE_PRESETS[phase];
  const userMod = USER_BAND_MODS[userBand];

  // DNA modula proporções: alto intelligence → cabeça maior; alto resilience
  // → corpo mais robusto; alto empathy → olhos maiores.
  const headDna = 1 + dna.intelligence * 0.08 + dna.empathy * 0.04;
  const bodyDna = 1 + dna.resilience * 0.08 - dna.discipline * 0.04;
  const eyeDna = 1 + dna.empathy * 0.10 + dna.curiosity * 0.05;
  const limbDna = 1 + dna.creativity * 0.06;
  const jawDna = 1 + dna.socialEnergy * 0.05;

  return {
    head: phasePreset.head * headDna * userMod.bodyRound,
    neck: phasePreset.body * 0.9,
    body: phasePreset.body * bodyDna,
    arm_L: phasePreset.limb * limbDna,
    arm_R: phasePreset.limb * limbDna,
    leg_L: phasePreset.limb * 0.85,
    leg_R: phasePreset.limb * 0.85,
    eye_L: phasePreset.eye * eyeDna * userMod.eyeMult,
    eye_R: phasePreset.eye * eyeDna * userMod.eyeMult,
    jaw: jawDna,
  };
}

/**
 * Acessórios desbloqueados por DNA + hábitos. Lista de bone-name → GLB path
 * pra carregar GLBs adicionais e attachar ao mascote base.
 */
export interface AccessoryAttachment {
  /** Bone do mascote base onde anexa (head, neck, body) */
  bone: string;
  /** Path do GLB do acessório */
  glbPath: string;
  /** Multiplicador de escala opcional */
  scale?: number;
}

export function unlockedAccessories(
  dna: Genome,
  unlockedIds: readonly string[],
  equippedIds: readonly string[],
): AccessoryAttachment[] {
  // unlockedIds vem do estado do app (achievements). Equipped é o subset
  // que o user escolheu equipar. Aqui só converte equipped em attachments.
  const ACCESSORY_BONES: Record<string, { bone: string; scale?: number }> = {
    cap: { bone: 'head', scale: 1.0 },
    bow: { bone: 'head', scale: 0.8 },
    glasses: { bone: 'head', scale: 1.1 },
    crown: { bone: 'head', scale: 1.0 },
    flower: { bone: 'head', scale: 0.7 },
    headphones: { bone: 'head', scale: 1.05 },
    halo: { bone: 'head', scale: 1.0 },
    horn: { bone: 'head', scale: 0.6 },
    monocle: { bone: 'head', scale: 0.5 },
    mask: { bone: 'head', scale: 1.0 },
    scarf: { bone: 'neck', scale: 1.0 },
    cape: { bone: 'neck', scale: 1.2 },
    leaf: { bone: 'body', scale: 0.6 },
    cookie: { bone: 'body', scale: 0.5 },
    star: { bone: 'body', scale: 0.4 },
  };
  return equippedIds
    .filter(id => unlockedIds.includes(id))
    .filter(id => ACCESSORY_BONES[id])
    .map(id => ({
      bone: ACCESSORY_BONES[id].bone,
      glbPath: `assets/mascot-3d/accessories/${id}.glb`,
      scale: ACCESSORY_BONES[id].scale,
    }));
}

// ----------------------------------------------------------------------------
// Helper: HSL → hex (Three.js < r150 não parseia 'hsl()' strings)
// ----------------------------------------------------------------------------
function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toByte = (v: number) => Math.round(255 * v);
  return (toByte(f(0)) << 16) | (toByte(f(8)) << 8) | toByte(f(4));
}
