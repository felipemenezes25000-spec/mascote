/**
 * Aura — partículas orbitando ao redor da criatura, mood-reactive.
 *
 * Em 'empolgado'/'feliz': aura mais ampla, velocidade maior, opacity boost.
 * Em 'exausto'/'triste': aura contraída, mais lenta, opacity reduzida.
 * Lerp suave (0.04) nas transições.
 *
 * Quantidade de partículas multiplicada por `particleBoost` (de evolução).
 * `calmAura` aplica leve atenuação na opacity (modo zen).
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MascotMood } from '@/types';
import { glowHex, morphologyFromGenome, paletteFromGenome } from '@/lib/dna';

function moodAuraModifiers(mood: MascotMood | undefined): {
  radiusMult: number;
  speedMult: number;
  opacityMult: number;
} {
  switch (mood) {
    case 'empolgado': return { radiusMult: 1.15, speedMult: 1.6, opacityMult: 1.3 };
    case 'feliz':     return { radiusMult: 1.05, speedMult: 1.2, opacityMult: 1.1 };
    case 'ok':        return { radiusMult: 1.00, speedMult: 1.0, opacityMult: 1.0 };
    case 'triste':    return { radiusMult: 0.85, speedMult: 0.7, opacityMult: 0.75 };
    case 'exausto':   return { radiusMult: 0.75, speedMult: 0.5, opacityMult: 0.55 };
    default:          return { radiusMult: 1.00, speedMult: 1.0, opacityMult: 1.0 };
  }
}

export function Aura({
  morph,
  palette,
  reduceMotion,
  mood,
  particleBoost = 0,
  calmAura = false,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  reduceMotion: boolean;
  mood: MascotMood | undefined;
  particleBoost?: number;
  calmAura?: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const tStart = useRef(performance.now() / 1000);
  const modRef = useRef({ radiusMult: 1.0, speedMult: 1.0, opacityMult: 1.0 });

  const { geometry, orbits } = useMemo(() => {
    const count = Math.round(morph.auraParticleCount * (1 + particleBoost * 2));
    const pos = new Float32Array(count * 3);
    const orb = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.3 + Math.random() * 0.6;
      const phase = Math.random() * Math.PI * 2;
      orb[i * 3] = r;
      orb[i * 3 + 1] = 0.3 + Math.random() * 0.5;
      orb[i * 3 + 2] = phase;
      pos[i * 3] = Math.cos(phase) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 2] = Math.sin(phase) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geometry: geo, orbits: orb };
  }, [morph.auraParticleCount, particleBoost]);

  useFrame(() => {
    if (reduceMotion || !pointsRef.current) return;
    const target = moodAuraModifiers(mood);
    const m = modRef.current;
    m.radiusMult += (target.radiusMult - m.radiusMult) * 0.04;
    m.speedMult += (target.speedMult - m.speedMult) * 0.04;
    m.opacityMult += (target.opacityMult - m.opacityMult) * 0.04;
    if (materialRef.current) {
      const calmMult = calmAura ? 0.85 : 1;
      materialRef.current.opacity = Math.max(
        0,
        Math.min(1, morph.auraOpacity * m.opacityMult * calmMult),
      );
    }
    const t = performance.now() / 1000 - tStart.current;
    const attr = pointsRef.current.geometry.attributes.position;
    const pos = attr.array as Float32Array;
    for (let i = 0; i < pos.length / 3; i++) {
      const r = orbits[i * 3] * m.radiusMult;
      const speed = orbits[i * 3 + 1] * m.speedMult;
      const phase = orbits[i * 3 + 2] + t * speed;
      pos[i * 3] = Math.cos(phase) * r;
      pos[i * 3 + 2] = Math.sin(phase) * r;
      pos[i * 3 + 1] += Math.sin(t * 2 + i) * 0.001 * m.speedMult;
      if (pos[i * 3 + 1] > 1.2) pos[i * 3 + 1] = -1.2;
    }
    attr.needsUpdate = true;
  });

  const color = glowHex(palette);
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={morph.auraSize}
        transparent
        opacity={morph.auraOpacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
