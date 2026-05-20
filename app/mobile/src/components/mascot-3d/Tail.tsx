/**
 * Tail — segmentos esféricos formando cauda ondulante.
 *
 * Quantidade e tamanho derivam do gene creativity. Onda viaja do corpo
 * pra ponta (offset por índice). reduceMotion congela em pose neutra.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { accentHex, morphologyFromGenome, paletteFromGenome } from '@/lib/dna';

export function Tail({
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
    const segs = groupRef.current.children;
    const len = morph.tailLength;
    for (let i = 0; i < segs.length; i++) {
      const t01 = i / morph.tailSegments;
      const wave = Math.sin(t * 1.5 - t01 * 4) * 0.3 * (0.5 + t01);
      const cx = -t01 * len * segs.length * 0.5;
      const cy = -0.3 - t01 * 0.3;
      const cz = -0.4 - t01 * len * segs.length * 0.5;
      segs[i].position.set(cx + wave * 0.2, cy + wave * 0.2, cz);
      segs[i].scale.setScalar(1 - t01 * 0.3);
    }
  });

  const color = accentHex(palette);
  const segments = [];
  for (let i = 0; i < morph.tailSegments; i++) {
    const t01 = i / morph.tailSegments;
    const size = 0.18 * (1 - t01 * 0.7);
    segments.push(
      <mesh key={i}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>,
    );
  }
  return <group ref={groupRef}>{segments}</group>;
}
