/**
 * Spikes — conjunto de espinhos cônicos distribuídos pseudo-aleatoriamente
 * sobre a metade superior do corpo. Quantidade e tamanho derivam do gene
 * aggression via `morph.spikeCount` / `morph.spikeLength`. PRNG seedado
 * pelo uid do mascote — espinhos são estáveis entre runs.
 */

import React, { useMemo } from 'react';
import { accentHex, morphologyFromGenome, paletteFromGenome } from '@/lib/dna';

export function Spikes({
  seed,
  morph,
  palette,
}: {
  seed: number;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
}) {
  const spikes = useMemo(() => {
    const out: Array<{
      x: number;
      y: number;
      z: number;
      rot: [number, number, number];
      len: number;
    }> = [];
    let seedAccum = (seed || 1) ^ 0xab;
    const rng = () => {
      seedAccum = (seedAccum * 1103515245 + 12345) & 0x7fffffff;
      return (seedAccum >>> 16) / 32768;
    };
    for (let i = 0; i < morph.spikeCount; i++) {
      const len = morph.spikeLength + rng() * 0.1;
      const theta = rng() * Math.PI * 2;
      const phi = (0.2 + rng() * 0.5) * Math.PI;
      const r = 0.95;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      out.push({ x, y: y + 0.1, z, rot: [phi, theta, 0], len });
    }
    return out;
  }, [seed, morph.spikeCount, morph.spikeLength]);

  const color = accentHex(palette);
  return (
    <group>
      {spikes.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation={s.rot as [number, number, number]}>
          <coneGeometry args={[0.08, s.len, 8]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
