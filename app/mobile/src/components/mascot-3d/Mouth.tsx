/**
 * Mouth — boca expressiva via TorusGeometry parcial (arc).
 *
 * Strategy:
 *  - mood feliz/empolgado → arc voltado pra cima (sorriso), maior em empolgado
 *  - mood ok → arc quase imperceptível (linha sutil)
 *  - mood triste → arc voltado pra baixo (frown)
 *  - mood exausto → linha quase reta com leve droop
 *
 * Lerp suave (0.06) nas transições entre moods. reduceMotion = snap direto.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MascotMood } from '@/types';
import { accentHex, morphologyFromGenome, paletteFromGenome } from '@/lib/dna';

function moodMouthTarget(mood: MascotMood | undefined): {
  arcSign: number;
  scale: number;
  thickness: number;
} {
  switch (mood) {
    case 'empolgado': return { arcSign:  1.0, scale: 1.30, thickness: 0.022 };
    case 'feliz':     return { arcSign:  0.7, scale: 1.10, thickness: 0.018 };
    case 'ok':        return { arcSign:  0.1, scale: 0.85, thickness: 0.016 };
    case 'triste':    return { arcSign: -0.6, scale: 0.90, thickness: 0.018 };
    case 'exausto':   return { arcSign: -0.3, scale: 0.70, thickness: 0.014 };
    default:          return { arcSign:  0.1, scale: 0.85, thickness: 0.016 };
  }
}

export function Mouth({
  morph,
  palette,
  mood,
  reduceMotion,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  mood: MascotMood | undefined;
  reduceMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({ arcSign: 0.1, scale: 0.85, thickness: 0.016 });
  const target = useMemo(() => moodMouthTarget(mood), [mood]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (reduceMotion) {
      g.rotation.z = target.arcSign * 0.35;
      g.scale.set(target.scale, target.scale, target.scale);
      return;
    }
    const s = stateRef.current;
    s.arcSign += (target.arcSign - s.arcSign) * 0.06;
    s.scale += (target.scale - s.scale) * 0.06;
    s.thickness += (target.thickness - s.thickness) * 0.06;
    g.rotation.z = s.arcSign * 0.35;
    g.scale.set(s.scale, s.scale, s.scale);
  });

  const mouthColor = accentHex(palette);
  const y = morph.eyeY - morph.eyeSize * 1.5;
  const z = morph.eyeZ - 0.05;
  return (
    <group ref={groupRef} position={[0, y, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.09, 0.016, 6, 18, Math.PI * 1.2]} />
        <meshStandardMaterial
          color={mouthColor}
          roughness={0.5}
          emissive={mouthColor}
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  );
}
