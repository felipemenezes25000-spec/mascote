/**
 * Eyes — par de olhos com pupil tracking, blink, e squint mood-driven.
 *
 * Cada olho:
 *  - Sclera esférica branca
 *  - Pupila (mesh menor) com tracking suave em direção a `look`
 *  - Highlight (specular fake)
 *
 * Comportamentos:
 *  - Pupil tracking: lerp em direção a `look` com fator amplificado por
 *    morph.trackingSpeed
 *  - Blink: a cada 2-6s, escala Y → 0.1 por 180ms
 *  - Squint mood-driven: scaleY ajusta para feliz/triste/exausto/empolgado
 *    com lerp 0.05 (transição visível mas natural)
 *
 * reduceMotion: snap direto, sem lerp ou blink.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MascotMood } from '@/types';
import { glowHex, morphologyFromGenome, paletteFromGenome } from '@/lib/dna';

/** Modulador de scale Y dos olhos baseado em mood — produz squint/wide. */
function moodEyeScaleY(mood: MascotMood | undefined): number {
  switch (mood) {
    case 'empolgado': return 1.10; // arregalados, alertas
    case 'feliz':     return 1.00;
    case 'ok':        return 1.00;
    case 'triste':    return 0.78; // levemente caídos
    case 'exausto':   return 0.55; // semicerrados
    default:          return 1.00;
  }
}

export function Eyes({
  morph,
  palette,
  look,
  reduceMotion,
  mood,
  eyeBrightness = 0,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  look: { x: number; y: number };
  reduceMotion: boolean;
  mood: MascotMood | undefined;
  eyeBrightness?: number;
}) {
  return (
    <group>
      <Eye
        side={-1}
        morph={morph}
        palette={palette}
        look={look}
        reduceMotion={reduceMotion}
        mood={mood}
        eyeBrightness={eyeBrightness}
      />
      <Eye
        side={1}
        morph={morph}
        palette={palette}
        look={look}
        reduceMotion={reduceMotion}
        mood={mood}
        eyeBrightness={eyeBrightness}
      />
    </group>
  );
}

function Eye({
  side,
  morph,
  palette,
  look,
  reduceMotion,
  mood,
  eyeBrightness = 0,
}: {
  side: -1 | 1;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  look: { x: number; y: number };
  reduceMotion: boolean;
  mood: MascotMood | undefined;
  eyeBrightness?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pupilRef = useRef<THREE.Mesh>(null);
  const tStart = useRef<number>(performance.now() / 1000 + side * 0.3);
  const blinkStateRef = useRef<{ next: number; remaining: number }>({
    next: 2 + Math.random() * 4,
    remaining: 0,
  });
  const scaleYRef = useRef(1);

  useFrame(() => {
    const g = groupRef.current;
    const p = pupilRef.current;
    if (!g || !p) return;
    // pupil tracking
    if (!reduceMotion) {
      const targetX = look.x * 0.06 * (1 + morph.trackingSpeed);
      const targetY = look.y * 0.06 * (1 + morph.trackingSpeed);
      p.position.x += (targetX - p.position.x) * 0.08;
      p.position.y += (targetY - p.position.y) * 0.08;
    } else {
      p.position.set(0, 0, morph.eyeSize * 0.6);
    }
    // Mood-driven scale Y target (squint/wide) — lerp em direção
    const moodTarget = moodEyeScaleY(mood);
    scaleYRef.current += (moodTarget - scaleYRef.current) * 0.05;
    // blink
    if (reduceMotion) {
      g.scale.y = moodTarget;
      return;
    }
    const st = blinkStateRef.current;
    let blinkFactor = 1;
    if (st.remaining > 0) {
      st.remaining = Math.max(0, st.remaining - 0.016);
      const k = Math.sin((1 - st.remaining / 0.18) * Math.PI);
      blinkFactor = 1 - k * 0.9;
    } else {
      st.next -= 0.016;
      if (st.next <= 0) {
        st.remaining = 0.18;
        st.next = 2 + Math.random() * 4;
      }
    }
    g.scale.y = scaleYRef.current * blinkFactor;
  });

  const sclera = 0xffffff;
  const pupilColor = new THREE.Color()
    .setHSL(palette.bodyHSL[0] / 360, 0.28, 0.22)
    .getHex();
  const pupilEmissive = glowHex(palette);

  // v2 (2026-05-22): sclera mais brilhante (low roughness + emissive sutil)
  // + 2 highlights (catch-light grande superior + sparkle pequeno inferior).
  // Resulta em "olho vivo" cartoon (Slime Rancher / Pixar / Bugsnax).
  const pupilRadius = morph.eyeSize * morph.pupilSize;
  return (
    <group ref={groupRef} position={[side * morph.eyeSpread, morph.eyeY, morph.eyeZ]}>
      <mesh>
        <sphereGeometry args={[morph.eyeSize, 32, 32]} />
        <meshStandardMaterial
          color={sclera}
          roughness={0.12}
          metalness={0.15}
          emissive={0xfff8f0}
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh ref={pupilRef} position={[0, 0, morph.eyeSize * 0.55]}>
        <sphereGeometry args={[pupilRadius, 24, 24]} />
        <meshStandardMaterial
          color={pupilColor}
          roughness={0.25}
          metalness={0.15}
          emissive={pupilEmissive}
          emissiveIntensity={morph.pupilEmissive + eyeBrightness * 0.25}
        />
      </mesh>
      {/* catch-light principal — sphere branco grande superior-esquerdo */}
      <mesh
        position={[
          -pupilRadius * 0.32,
          pupilRadius * 0.38,
          morph.eyeSize * 0.92,
        ]}
      >
        <sphereGeometry args={[pupilRadius * 0.42, 14, 14]} />
        <meshBasicMaterial color={0xffffff} />
      </mesh>
      {/* sparkle secundário — pequeno highlight inferior-direito ("vida") */}
      <mesh
        position={[
          pupilRadius * 0.35,
          -pupilRadius * 0.28,
          morph.eyeSize * 0.88,
        ]}
      >
        <sphereGeometry args={[pupilRadius * 0.18, 10, 10]} />
        <meshBasicMaterial color={0xffffff} />
      </mesh>
    </group>
  );
}
