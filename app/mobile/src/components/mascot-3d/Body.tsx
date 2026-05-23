/**
 * Body — icosaedro com deslocamento procedural por DNA.
 *
 * Geometria é gerada UMA VEZ por mudança de DNA/morph (useMemo). Cada
 * vértice é deslocado com:
 *   - stretching X/Y/Z baseado em morph (bodyHeightStretch / bodyWidthSquash)
 *   - bottom bias (criaturas-pera vs ovais)
 *   - chaos bumps (ruído pseudo-random seedado pela DNA)
 *   - creativity protrusions (sin/cos surface displacement)
 *
 * Material respeita pattern selecionado em morph.pattern — sem shader custom
 * (mais portável + performance). Patterns alteram metalness/roughness/emissive
 * sem novo render pass.
 *
 * Breath cycle em useFrame: scale modulado por sin com freq DNA-driven.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MascotDNA } from '@/types';
import {
  bodyHex,
  glowHex,
  morphologyFromGenome,
  paletteFromGenome,
} from '@/lib/dna';

export interface BodyProps {
  dna: MascotDNA;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  mood: number;
  reduceMotion: boolean;
  glowMultiplier?: number;
  bodyFirmness?: number;
}

export function Body({
  dna,
  morph,
  palette,
  mood,
  reduceMotion,
  glowMultiplier = 1,
  bodyFirmness = 0,
}: BodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tStart = useRef<number>(performance.now() / 1000);

  const geometry = useMemo(() => {
    // v3 (2026-05-22): SphereGeometry 64×48 em vez de IcosahedronGeometry(1, 5).
    // Por quê: icosa subdivide em triângulos com normais distintas por face —
    // mesmo com smooth shading, displacement procedural cria pequenas diferenças
    // de altura entre faces adjacentes que ambient occlusion natural sombreia,
    // gerando aparência "laminada/geode". Sphere usa subdivisão lat/long
    // uniforme com vértices densos: 3072 quads pequenos com inclinações suaves.
    const geo = new THREE.SphereGeometry(1, 64, 48);
    const pos = geo.attributes.position;
    const seed = (dna.empathy + dna.chaos * 100 + dna.creativity * 17) * 1000;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      y *= morph.bodyHeightStretch;
      x *= morph.bodyWidthSquash;
      z *= morph.bodyWidthSquash;
      if (y < 0) {
        x *= 1 + morph.bodyBottomBias * 0.3;
        z *= 1 + morph.bodyBottomBias * 0.3;
        y *= 1 + morph.bodyBottomBias * 0.2;
      }
      // Smooth low-freq bumps via trilinear sin/cos (não per-vertex random).
      // Resulta em ondulações suaves grandes em vez de ruído pixelado per-face.
      const smoothLump =
        Math.sin(x * 2.1 + seed * 0.001) *
        Math.cos(y * 1.7 + seed * 0.0017) *
        Math.sin(z * 2.3 - seed * 0.0011) *
        morph.bodyChaosBumps;
      x += x * smoothLump * 0.5;
      z += z * smoothLump * 0.5;
      const protrude =
        Math.sin(x * 3.2 + seed) * Math.cos(z * 2.8 - seed) * morph.bodyCreativityBumps * 0.45;
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len > 0) {
        x += (x / len) * protrude;
        y += (y / len) * protrude * 0.5;
        z += (z / len) * protrude;
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [dna, morph]);

  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    if (reduceMotion) {
      m.scale.set(1, 1, 1);
      return;
    }
    const t = performance.now() / 1000 - tStart.current;
    const breath = 1 + Math.sin(t * morph.breathFreq * 2) * morph.breathAmp;
    const firmScale = 1 + bodyFirmness * 0.04;
    // SQUASH-STRETCH JELLY volume-preserving — quando Y estica, XZ comprime.
    // Frequência 1.6× do breath cycle pra criar polirritmia. Amplitude
    // modulada por chaos + socialEnergy (DNA mais "explosivo" wobble maior).
    const jellyAmp = 0.022 + morph.idleWobble * 0.5;
    const jelly = Math.sin(t * morph.breathFreq * 3.2) * jellyAmp;
    const jellyXZ = 1 - jelly * 0.55;
    const jellyY = 1 + jelly;
    m.scale.set(
      breath * firmScale * jellyXZ,
      breath * (1 + morph.breathAmp * 0.3) * firmScale * jellyY,
      breath * firmScale * jellyXZ,
    );
  });

  const color = bodyHex(palette);
  const emissive = glowHex(palette);

  let mat_roughness = morph.bodyRoughness;
  let mat_metalness = morph.bodyMetalness;
  let mat_flatShading = morph.bodyFlatShading;
  let mat_emissiveIntensity = (morph.bodyEmissiveIntensity + mood * 0.18) * glowMultiplier;
  switch (morph.pattern) {
    case 'spots':
      mat_metalness = Math.min(1, mat_metalness + 0.45);
      mat_roughness = Math.max(0, mat_roughness - 0.25);
      break;
    case 'stripes':
      mat_roughness = Math.min(1, mat_roughness + 0.12);
      break;
    case 'fractal':
      mat_emissiveIntensity += 0.12;
      break;
    case 'cells':
      mat_roughness = Math.min(1, mat_roughness + 0.4);
      mat_metalness = Math.min(1, mat_metalness + 0.2);
      break;
    // 'plain' usa defaults DNA-driven
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, -0.05 + morph.bodyBottomBias * 0.1, 0]}
    >
      <meshStandardMaterial
        color={color}
        roughness={mat_roughness}
        metalness={mat_metalness}
        flatShading={mat_flatShading && morph.pattern !== 'plain'}
        emissive={emissive}
        emissiveIntensity={mat_emissiveIntensity}
      />
    </mesh>
  );
}
