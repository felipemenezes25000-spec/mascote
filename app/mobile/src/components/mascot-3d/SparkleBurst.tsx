/**
 * SparkleBurst — 8 partículas orbitando em raio menor que a Aura.
 *
 * Aparece quando o mood é 'empolgado'. Caller renderiza condicional —
 * componente em si não checa mood (sempre desenha).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { glowHex, paletteFromGenome } from '@/lib/dna';

export function SparkleBurst({
  palette,
}: {
  palette: ReturnType<typeof paletteFromGenome>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const tStart = useRef(performance.now() / 1000);
  const count = 8;
  const orbits = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = 0.85 + Math.random() * 0.3;       // radius
      arr[i * 3 + 1] = 0.5 + Math.random() * 1.4;     // speed
      arr[i * 3 + 2] = (i / count) * Math.PI * 2;     // phase
    }
    return arr;
  }, [count]);

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

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
      const r = orbits[i * 3];
      const speed = orbits[i * 3 + 1];
      const phase = orbits[i * 3 + 2] + t * speed;
      pos[i * 3] = Math.cos(phase) * r;
      pos[i * 3 + 1] = Math.sin(t * 1.8 + i) * 0.4 + 0.3;
      pos[i * 3 + 2] = Math.sin(phase) * r;
    }
    attr.needsUpdate = true;
  });

  const color = glowHex(palette);
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
