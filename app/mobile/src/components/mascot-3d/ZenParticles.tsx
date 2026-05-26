/**
 * ZenParticles — 12 partículas em órbita lenta.
 *
 * Renderizadas quando hábito meditação/respiração domina o fenótipo
 * (evolutionVisuals.zenParticles === true). Movimento intencionalmente
 * lento pra dar sensação calma.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { glowHex, paletteFromGenome } from '@/lib/dna';

export function ZenParticles({
  palette,
}: {
  palette: ReturnType<typeof paletteFromGenome>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const tStart = useRef(performance.now() / 1000);
  const count = 12;
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  // Dispose VBO no unmount — R3F não auto-dispõe geometry passada via prop.
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const t = performance.now() / 1000 - tStart.current;
    const attr = pointsRef.current.geometry.attributes.position;
    const pos = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2;
      pos[i * 3] = Math.cos(phase + t * 0.3) * (0.6 + i * 0.05);
      pos[i * 3 + 1] = Math.sin(t * 0.5 + i) * 0.5 + 0.2;
      pos[i * 3 + 2] = Math.sin(phase + t * 0.3) * (0.6 + i * 0.05);
    }
    attr.needsUpdate = true;
  });

  const color = glowHex(palette);
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.05}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
