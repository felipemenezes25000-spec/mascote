/**
 * Creature — composição completa do mascote 3D.
 *
 * Responsabilidades:
 *  - Aplica pipeline morfológico: base DNA → customization → mutations
 *  - Anima posture mood-driven (tilt + scale + bounce) via useFrame
 *  - Detecta bouncePulse e action externos (Behavior Engine)
 *  - Compõe subcomponentes (Body, Eyes, Mouth, Limbs, Spikes, Antennae, Tail,
 *    Aura, e particles condicionais ZenParticles + SparkleBurst)
 *
 * Princípio: TODO o estado animado vive em refs (não re-render). Lerp suave
 * (~5% por frame) garante transições naturais sem jank.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MascotCustomization, MascotDNA, MascotMood } from '@/types';
import type { MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import {
  aggregateVisualImpact,
  applyCustomization,
  applyMutationVisualImpact,
  paletteFromGenome,
  morphologyFromGenome,
  moodScore,
  type Genome,
  type Morphology,
} from '@/lib/dna';
import { Body } from './Body';
import { Eyes } from './Eyes';
import { Mouth } from './Mouth';
import { Limbs } from './Limbs';
import { Spikes } from './Spikes';
import { Antennae } from './Antennae';
import { Tail } from './Tail';
import { Aura } from './Aura';
import { SparkleBurst } from './SparkleBurst';
import { ZenParticles } from './ZenParticles';

export interface CreatureProps {
  dna: MascotDNA;
  seed: number;
  look: { x: number; y: number };
  reduceMotion: boolean;
  customization?: MascotCustomization | null;
  mutationIds?: readonly string[];
  mood?: MascotMood;
  /** Contador que incrementa em tap — useFrame consome pra disparar bounce. */
  bouncePulse?: number;
  /** Action externo (Behavior Engine). Key novo = trigger. */
  action?: { kind: MascotAnimationKind; key: number };
  evolutionVisuals?: MascotEvolutionVisuals | null;
}

// Mapeia humor → modificadores de postura. Valores são lerp targets, não saltos.
// `feliz`/`empolgado` faz bounce; `triste`/`exausto` curva pra frente.
function moodPostureTarget(mood: MascotMood | undefined): {
  tiltX: number;
  scaleY: number;
  bounceAmp: number;
} {
  switch (mood) {
    case 'triste':    return { tiltX: -0.08, scaleY: 0.97, bounceAmp: 0 };
    case 'exausto':   return { tiltX: -0.14, scaleY: 0.94, bounceAmp: 0 };
    case 'feliz':     return { tiltX: 0.03, scaleY: 1.00, bounceAmp: 0.012 };
    case 'empolgado': return { tiltX: 0.06, scaleY: 1.02, bounceAmp: 0.025 };
    case 'ok':
    default:          return { tiltX: 0, scaleY: 1, bounceAmp: 0 };
  }
}

export function Creature({
  dna,
  seed,
  look,
  reduceMotion,
  customization,
  mutationIds = [],
  mood,
  bouncePulse = 0,
  action,
  evolutionVisuals = null,
}: CreatureProps) {
  const groupRef = useRef<THREE.Group>(null);
  // Morphology pipeline: base DNA → customization → mutations. Mudanças no DNA
  // propagam organicamente session-over-session. Mood transitions usam lerp
  // interno nos sub-componentes; customization sliders aplicam-se instantaneamente.
  const morph: Morphology = useMemo(() => {
    const base = morphologyFromGenome(dna as Genome);
    const withCustom = applyCustomization(base, customization ?? null);
    const impact = aggregateVisualImpact(mutationIds);
    return applyMutationVisualImpact(withCustom, impact);
  }, [dna, customization, mutationIds]);
  const palette = useMemo(() => paletteFromGenome(dna as Genome), [dna]);
  const moodS = useMemo(() => moodScore(dna as Genome), [dna]);
  const tStart = useRef<number>(performance.now() / 1000);
  const postureTarget = useMemo(() => {
    const base = moodPostureTarget(mood);
    const bias = evolutionVisuals?.postureBias ?? 0;
    return {
      tiltX: base.tiltX + bias * 0.06,
      scaleY: base.scaleY * (evolutionVisuals?.bodyScaleMultiplier ?? 1),
      bounceAmp: base.bounceAmp + (evolutionVisuals?.activeEnergy ? 0.008 : 0),
    };
  }, [mood, evolutionVisuals]);

  // Bounce-on-tap state — tracked via ref pra useFrame (sem re-render).
  const bouncePulseSeen = useRef(0);
  const bouncePhase = useRef<{ active: boolean; t0: number }>({ active: false, t0: 0 });
  // Action externo (Behavior Engine) — detect key change e dispara fase.
  const actionKeySeen = useRef<number | undefined>(undefined);
  const actionPhase = useRef<{
    kind: MascotAnimationKind | null;
    t0: number;
  }>({ kind: null, t0: 0 });

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const now = performance.now() / 1000;
    const t = now - tStart.current;
    if (reduceMotion) {
      g.position.set(0, 0.05, 0);
      g.rotation.set(postureTarget.tiltX, look.x * 0.25, 0);
      g.scale.set(1, postureTarget.scaleY, 1);
      return;
    }
    // Idle wobble figura-8 — modulado por idleAnimation do fenótipo
    const idleBoost = evolutionVisuals?.idleAnimation === 'active' ? 1.4
      : evolutionVisuals?.idleAnimation === 'zen' ? 0.55
      : evolutionVisuals?.idleAnimation === 'wander' ? 1.2
      : 1;
    g.position.x = Math.sin(t * 0.6 * idleBoost) * morph.idleWobble * idleBoost;
    g.position.y = Math.cos(t * 0.4 * idleBoost) * morph.idleWobble * 0.7 + 0.05;
    // Rotation: sway adaptativo + look-tracking + mood tilt (lerp)
    const swayY = Math.sin(t * 0.3) * morph.swayAmplitude;
    g.rotation.y = swayY + look.x * 0.25;
    // tilt X lerp: target = mood posture + look.y + user-customized posture_lean.
    const userPosture = customization?.posture_lean ?? 0;
    g.rotation.x += (postureTarget.tiltX + look.y * 0.1 + userPosture - g.rotation.x) * 0.05;
    g.rotation.z = Math.sin(t * 0.5) * 0.04;

    // Bounce-on-tap: detecta incremento e dispara fase de 350ms
    if (bouncePulse !== bouncePulseSeen.current) {
      bouncePulseSeen.current = bouncePulse;
      bouncePhase.current = { active: true, t0: now };
    }
    let bounceScale = 1;
    if (bouncePhase.current.active) {
      const elapsed = now - bouncePhase.current.t0;
      const dur = 0.35;
      if (elapsed < dur) {
        bounceScale = 1 + Math.sin((elapsed / dur) * Math.PI) * 0.08;
      } else {
        bouncePhase.current.active = false;
      }
    }

    // Action externo (Behavior Engine) — detect key change
    if (action && action.key !== actionKeySeen.current) {
      actionKeySeen.current = action.key;
      actionPhase.current = { kind: action.kind, t0: now };
    }
    let actionScaleBoost = 1;
    let actionTiltZ = 0;
    let actionWobbleBoost = 0;
    if (actionPhase.current.kind) {
      const elapsed = now - actionPhase.current.t0;
      const ap = actionPhase.current;
      switch (ap.kind) {
        case 'bounce': {
          const dur = 0.35;
          if (elapsed < dur) {
            actionScaleBoost = 1 + Math.sin((elapsed / dur) * Math.PI) * 0.08;
          } else ap.kind = null;
          break;
        }
        case 'celebrate': {
          const dur = 1.2;
          if (elapsed < dur) {
            actionScaleBoost = 1 + Math.sin((elapsed / dur) * Math.PI * 3) * 0.06;
            actionTiltZ = Math.sin((elapsed / dur) * Math.PI * 2) * 0.05;
          } else ap.kind = null;
          break;
        }
        case 'wander': {
          const dur = 2.0;
          if (elapsed < dur) {
            const fade = Math.sin((elapsed / dur) * Math.PI);
            actionWobbleBoost = fade * 0.4;
          } else ap.kind = null;
          break;
        }
        case 'rest':
        case 'observe': {
          const dur = 3.0;
          if (elapsed >= dur) ap.kind = null;
          break;
        }
        case 'stretch': {
          const dur = 1.0;
          if (elapsed < dur) {
            actionScaleBoost = 1 + Math.sin((elapsed / dur) * Math.PI) * 0.05;
            actionTiltZ = Math.sin((elapsed / dur) * Math.PI) * 0.08;
          } else ap.kind = null;
          break;
        }
        case 'pulse': {
          const dur = 0.8;
          if (elapsed < dur) {
            actionScaleBoost = 1 + Math.sin((elapsed / dur) * Math.PI * 2) * 0.04;
          } else ap.kind = null;
          break;
        }
      }
    }

    // Mood bounce contínuo (subtle, sustained)
    const moodBounce = postureTarget.bounceAmp > 0
      ? Math.sin(t * 2.4) * postureTarget.bounceAmp
      : 0;
    if (actionWobbleBoost > 0) {
      g.position.x += Math.sin(t * 2) * actionWobbleBoost * 0.1;
    }
    g.rotation.z += actionTiltZ;
    const finalScale = bounceScale * actionScaleBoost;
    g.scale.set(finalScale, postureTarget.scaleY * finalScale + moodBounce, finalScale);
  });

  return (
    <group ref={groupRef}>
      <Body
        dna={dna}
        morph={morph}
        palette={palette}
        mood={moodS}
        reduceMotion={reduceMotion}
        glowMultiplier={evolutionVisuals?.glowMultiplier ?? 1}
        bodyFirmness={evolutionVisuals?.bodyFirmness ?? 0}
      />
      <Eyes
        morph={morph}
        palette={palette}
        look={look}
        reduceMotion={reduceMotion}
        mood={mood}
        eyeBrightness={evolutionVisuals?.eyeBrightness ?? 0}
      />
      <Mouth morph={morph} palette={palette} mood={mood} reduceMotion={reduceMotion} />
      {morph.limbCount > 0 && (
        <Limbs seed={seed} morph={morph} palette={palette} reduceMotion={reduceMotion} />
      )}
      {morph.hasSpikes && <Spikes seed={seed} morph={morph} palette={palette} />}
      {morph.hasAntennae && (
        <Antennae morph={morph} palette={palette} reduceMotion={reduceMotion} />
      )}
      {morph.hasTail && (
        <Tail morph={morph} palette={palette} reduceMotion={reduceMotion} />
      )}
      <Aura
        morph={morph}
        palette={palette}
        reduceMotion={reduceMotion}
        mood={mood}
        particleBoost={evolutionVisuals?.auraParticleBoost ?? 0}
        calmAura={evolutionVisuals?.calmAura ?? false}
      />
      {evolutionVisuals?.zenParticles && !reduceMotion && (
        <ZenParticles palette={palette} />
      )}
      {mood === 'empolgado' && !reduceMotion && (
        <SparkleBurst palette={palette} />
      )}
    </group>
  );
}
