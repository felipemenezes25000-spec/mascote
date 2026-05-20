/**
 * Antennae — 2 antenas com bulbo brilhante na ponta.
 *
 * Wiggle suave (sin wave) controlado por `morph.antennaWiggle` — derivado
 * de curiosity. reduceMotion congela na pose neutra.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { bodyHex, glowHex, morphologyFromGenome, paletteFromGenome } from '@/lib/dna';

export function Antennae({
  morph,
  palette,
  reduceMotion,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  reduceMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tStart = useRef(performance.now() / 1000);

  useFrame(() => {
    if (reduceMotion || !groupRef.current) return;
    const t = performance.now() / 1000 - tStart.current;
    groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
      child.rotation.x = -0.15 + Math.sin(t * 2 + i) * morph.antennaWiggle;
    });
  });

  const bodyColor = bodyHex(palette);
  const glowColor = glowHex(palette);
  return (
    <group ref={groupRef}>
      {[-1, 1].map(sign => (
        <group key={sign} position={[sign * 0.15, 0.85, 0.4]} rotation={[-0.15, 0, sign * 0.25]}>
          <mesh position={[0, morph.antennaLength / 2, 0]}>
            <cylinderGeometry args={[0.025, 0.04, morph.antennaLength, 8]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} />
          </mesh>
          <mesh position={[0, morph.antennaLength, 0]}>
            <sphereGeometry args={[0.07, 14, 14]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={0.9}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
