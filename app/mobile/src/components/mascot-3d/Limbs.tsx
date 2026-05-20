/**
 * Limbs — pares de membros cilíndricos balançando em sin wave.
 *
 * Quantidade derivada de chaos+creativity. Cada par tem ângulos distintos
 * por PRNG seedada do uid. Sway controlado por `morph.limbSwayAmplitude`.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { accentHex, morphologyFromGenome, paletteFromGenome } from '@/lib/dna';

export function Limbs({
  seed,
  morph,
  palette,
  reduceMotion,
}: {
  seed: number;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  reduceMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tStart = useRef<number>(performance.now() / 1000);

  const limbs = useMemo(() => {
    const out: Array<{
      sign: -1 | 1;
      length: number;
      thick: number;
      heightOffset: number;
      rotZ: number;
      rotX: number;
      phase: number;
    }> = [];
    let seedAccum = seed || 1;
    const rng = () => {
      seedAccum = (seedAccum * 1103515245 + 12345) & 0x7fffffff;
      return (seedAccum >>> 16) / 32768;
    };
    for (let i = 0; i < morph.limbCount; i++) {
      for (const sign of [-1, 1] as const) {
        const length = morph.limbLength + rng() * 0.5;
        const heightOffset = -0.2 + (i / (morph.limbCount + 1)) * 0.9;
        out.push({
          sign,
          length,
          thick: morph.limbThickness,
          heightOffset,
          rotZ: sign * (Math.PI / 3 + rng() * 0.3),
          rotX: -Math.PI / 6 + rng() * 0.3,
          phase: rng() * Math.PI * 2,
        });
      }
    }
    return out;
  }, [seed, morph.limbCount, morph.limbLength, morph.limbThickness]);

  useFrame(() => {
    if (reduceMotion || !groupRef.current) return;
    const t = performance.now() / 1000 - tStart.current;
    groupRef.current.children.forEach((child: THREE.Object3D, idx: number) => {
      const data = limbs[idx];
      if (!data) return;
      child.rotation.x = data.rotX + Math.sin(t * 1.2 + data.phase) * morph.limbSwayAmplitude;
    });
  });

  const color = accentHex(palette);
  return (
    <group ref={groupRef}>
      {limbs.map((l, i) => (
        <mesh
          key={i}
          position={[l.sign * 0.55, l.heightOffset, 0]}
          rotation={[l.rotX, 0, l.rotZ]}
        >
          <cylinderGeometry args={[l.thick * 0.6, l.thick, l.length, 10]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
