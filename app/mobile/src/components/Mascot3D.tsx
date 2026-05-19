/**
 * Mascot3D — renderer procedural usando React Three Fiber + expo-gl.
 *
 * Recebe um Genome (DNA) e renderiza a criatura ÚNICA derivada dele:
 * - Corpo procedural (icosahedron com deslocamento por DNA)
 * - Olhos com pupila e highlight, eye-tracking pelo toque
 * - Membros opcionais (criatividade + caos)
 * - Espinhos (agressividade)
 * - Antenas (curiosidade)
 * - Cauda (criatividade)
 * - Aura de partículas (energia social)
 *
 * **Princípio:** componente puro do DNA. Sem efeitos colaterais. Sem
 * acesso a storage/IA/safety. Apenas vê o Genome que recebe e desenha.
 */

import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, PanResponder, type PanResponderInstance, Platform } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MascotDNA } from '@/types';
import {
  paletteFromGenome,
  morphologyFromGenome,
  bodyHex,
  accentHex,
  glowHex,
  moodScore,
  type Genome,
} from '@/lib/dna';

interface Props {
  dna: MascotDNA;
  /** Seed para variação determinística entre criaturas com o mesmo DNA. */
  seed?: number;
  /** Tamanho do canvas em pixels (default ocupa o pai). */
  size?: number;
  /** Reduz animação pra acessibilidade. */
  reduceMotion?: boolean;
  /** Cor de fundo opcional (default transparente). */
  background?: string;
}

/**
 * Componente público — wrappa Canvas R3F com PanResponder pra capturar
 * toques e converter em offset de "olhar" da criatura.
 */
export function Mascot3D({ dna, seed = 0, size, reduceMotion, background }: Props) {
  const [look, setLook] = useState({ x: 0, y: 0 });
  const widthRef = useRef(1);
  const heightRef = useRef(1);

  const pan: PanResponderInstance = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_e, gesture) => {
          const cx = widthRef.current / 2;
          const cy = heightRef.current / 2;
          // x: -1..1 (esquerda/direita), y: -1..1 (cima/baixo)
          const nx = Math.max(-1, Math.min(1, (gesture.moveX - cx) / cx));
          const ny = Math.max(-1, Math.min(1, -(gesture.moveY - cy) / cy));
          setLook({ x: nx, y: ny });
        },
        onPanResponderRelease: () => {
          // Suavemente volta ao centro
          setLook({ x: 0, y: 0 });
        },
      }),
    [],
  );

  return (
    <View
      style={[styles.container, size != null && { width: size, height: size }]}
      onLayout={e => {
        widthRef.current = e.nativeEvent.layout.width || 1;
        heightRef.current = e.nativeEvent.layout.height || 1;
      }}
      {...pan.panHandlers}
    >
      <Canvas
        gl={{ antialias: true, alpha: !background }}
        camera={{ position: [0, 0.5, 5], fov: 45 }}
        onCreated={({ gl, scene }: { gl: any; scene: any }) => {
          gl.setClearColor(background ?? '#000000', background ? 1 : 0);
          scene.fog = new THREE.FogExp2(0x0a0e1a, 0.022);
        }}
      >
        <SceneLights />
        <Creature
          dna={dna}
          seed={seed}
          look={look}
          reduceMotion={reduceMotion ?? false}
        />
      </Canvas>
    </View>
  );
}

// ============================================================================
// Lights — chave + rim + fill (estilo Pixar)
// ============================================================================
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.55} color={0x4060a0} />
      <directionalLight position={[3, 4, 4]} intensity={0.9} color={0xffffff} />
      <directionalLight position={[-4, 2, -3]} intensity={0.55} color={0xff9bd0} />
      <pointLight position={[0, -2, 3]} intensity={0.45} color={0x7ab8ff} distance={12} />
    </>
  );
}

// ============================================================================
// Creature — composição completa
// ============================================================================
interface CreatureProps {
  dna: MascotDNA;
  seed: number;
  look: { x: number; y: number };
  reduceMotion: boolean;
}

function Creature({ dna, seed, look, reduceMotion }: CreatureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const morph = useMemo(() => morphologyFromGenome(dna as Genome), [dna]);
  const palette = useMemo(() => paletteFromGenome(dna as Genome), [dna]);
  const mood = useMemo(() => moodScore(dna as Genome), [dna]);
  const tStart = useRef<number>(performance.now() / 1000);

  // Animação procedural
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const t = performance.now() / 1000 - tStart.current;
    if (reduceMotion) {
      g.position.set(0, 0.05, 0);
      g.rotation.set(0, look.x * 0.25, 0);
      return;
    }
    // Idle wobble figura-8
    g.position.x = Math.sin(t * 0.6) * morph.idleWobble;
    g.position.y = Math.cos(t * 0.4) * morph.idleWobble * 0.7 + 0.05;
    // Rotation: sway adaptativo + look-tracking
    g.rotation.y = Math.sin(t * 0.3) * morph.swayAmplitude + look.x * 0.25;
    g.rotation.x = look.y * 0.1;
    g.rotation.z = Math.sin(t * 0.5) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <Body dna={dna} morph={morph} palette={palette} mood={mood} reduceMotion={reduceMotion} />
      <Eyes morph={morph} palette={palette} look={look} reduceMotion={reduceMotion} />
      {morph.limbCount > 0 && (
        <Limbs seed={seed} morph={morph} palette={palette} reduceMotion={reduceMotion} />
      )}
      {morph.hasSpikes && <Spikes seed={seed} morph={morph} palette={palette} />}
      {morph.hasAntennae && (
        <Antennae morph={morph} palette={palette} reduceMotion={reduceMotion} />
      )}
      {morph.hasTail && (
        <Tail morph={morph} palette={palette} reduceMotion={reduceMotion} />
      )}
      <Aura morph={morph} palette={palette} reduceMotion={reduceMotion} />
    </group>
  );
}

// ============================================================================
// Body
// ============================================================================
interface BodyProps {
  dna: MascotDNA;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  mood: number;
  reduceMotion: boolean;
}

function Body({ dna, morph, palette, mood, reduceMotion }: BodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tStart = useRef<number>(performance.now() / 1000);

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position;
    // displace por DNA + ruído seedado
    let seedAccum = (dna.empathy + dna.chaos * 100 + dna.creativity * 17) * 1000;
    const pseudoRng = () => {
      seedAccum = (seedAccum * 9301 + 49297) % 233280;
      return seedAccum / 233280;
    };
    const offsets: number[] = [];
    for (let i = 0; i < pos.count; i++) offsets.push(pseudoRng() - 0.5);

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
      const lump = offsets[i] * morph.bodyChaosBumps;
      x += x * lump * 0.4;
      z += z * lump * 0.4;
      const protrude =
        Math.sin(x * 4 + offsets[i]) * Math.cos(z * 3.5 - offsets[i]) * morph.bodyCreativityBumps;
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len > 0) {
        x += (x / len) * protrude;
        y += (y / len) * protrude * 0.5;
        z += (z / len) * protrude;
      }
      pos.setXYZ(i, x, y, z);
    }
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
    m.scale.set(breath, breath * (1 + morph.breathAmp * 0.3), breath);
  });

  const color = bodyHex(palette);
  const emissive = glowHex(palette);

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -0.05 + morph.bodyBottomBias * 0.1, 0]}>
      <meshStandardMaterial
        color={color}
        roughness={morph.bodyRoughness}
        metalness={morph.bodyMetalness}
        flatShading={morph.bodyFlatShading}
        emissive={emissive}
        emissiveIntensity={morph.bodyEmissiveIntensity + mood * 0.18}
      />
    </mesh>
  );
}

// ============================================================================
// Eyes
// ============================================================================
function Eyes({
  morph,
  palette,
  look,
  reduceMotion,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  look: { x: number; y: number };
  reduceMotion: boolean;
}) {
  return (
    <group>
      <Eye side={-1} morph={morph} palette={palette} look={look} reduceMotion={reduceMotion} />
      <Eye side={1} morph={morph} palette={palette} look={look} reduceMotion={reduceMotion} />
    </group>
  );
}

function Eye({
  side,
  morph,
  palette,
  look,
  reduceMotion,
}: {
  side: -1 | 1;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  look: { x: number; y: number };
  reduceMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pupilRef = useRef<THREE.Mesh>(null);
  const tStart = useRef<number>(performance.now() / 1000 + side * 0.3);
  const blinkStateRef = useRef<{ next: number; remaining: number }>({
    next: 2 + Math.random() * 4,
    remaining: 0,
  });

  useFrame(() => {
    const g = groupRef.current;
    const p = pupilRef.current;
    if (!g || !p) return;
    const t = performance.now() / 1000 - tStart.current;
    // pupil tracking
    if (!reduceMotion) {
      const targetX = look.x * 0.06 * (1 + morph.trackingSpeed);
      const targetY = look.y * 0.06 * (1 + morph.trackingSpeed);
      p.position.x += (targetX - p.position.x) * 0.08;
      p.position.y += (targetY - p.position.y) * 0.08;
    } else {
      p.position.set(0, 0, morph.eyeSize * 0.6);
    }
    // blink
    if (reduceMotion) {
      g.scale.y = 1;
      return;
    }
    const st = blinkStateRef.current;
    if (st.remaining > 0) {
      st.remaining = Math.max(0, st.remaining - 0.016);
      const k = Math.sin((1 - st.remaining / 0.18) * Math.PI);
      g.scale.y = 1 - k * 0.9;
    } else {
      g.scale.y = 1;
      st.next -= 0.016;
      if (st.next <= 0) {
        st.remaining = 0.18;
        st.next = 2 + Math.random() * 4;
      }
    }
  });

  const sclera = 0xffffff;
  const pupilColor = new THREE.Color().setHSL(palette.bodyHSL[0] / 360, 0.35, 0.12).getHex();
  const pupilEmissive = glowHex(palette);

  return (
    <group ref={groupRef} position={[side * morph.eyeSpread, morph.eyeY, morph.eyeZ]}>
      <mesh>
        <sphereGeometry args={[morph.eyeSize, 24, 24]} />
        <meshStandardMaterial color={sclera} roughness={0.15} emissive={sclera} emissiveIntensity={0.12} />
      </mesh>
      <mesh ref={pupilRef} position={[0, 0, morph.eyeSize * 0.6]}>
        <sphereGeometry args={[morph.eyeSize * morph.pupilSize, 18, 18]} />
        <meshStandardMaterial
          color={pupilColor}
          roughness={0.3}
          metalness={0.2}
          emissive={pupilEmissive}
          emissiveIntensity={morph.pupilEmissive}
        />
      </mesh>
      {/* highlight */}
      <mesh
        position={[
          morph.eyeSize * morph.pupilSize * 0.4,
          morph.eyeSize * morph.pupilSize * 0.3,
          morph.eyeSize * 0.85,
        ]}
      >
        <sphereGeometry args={[morph.eyeSize * morph.pupilSize * 0.3, 10, 10]} />
        <meshBasicMaterial color={0xffffff} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Limbs
// ============================================================================
function Limbs({
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
    groupRef.current.children.forEach((child: any, idx: number) => {
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

// ============================================================================
// Spikes
// ============================================================================
function Spikes({
  seed,
  morph,
  palette,
}: {
  seed: number;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
}) {
  const spikes = useMemo(() => {
    const out: Array<{ x: number; y: number; z: number; rot: [number, number, number]; len: number }> = [];
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

// ============================================================================
// Antennae
// ============================================================================
function Antennae({
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
    groupRef.current.children.forEach((child: any, i: number) => {
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

// ============================================================================
// Tail
// ============================================================================
function Tail({
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

// ============================================================================
// Aura — partículas orbitando
// ============================================================================
function Aura({
  morph,
  palette,
  reduceMotion,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  reduceMotion: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const tStart = useRef(performance.now() / 1000);

  const { geometry, orbits } = useMemo(() => {
    const count = morph.auraParticleCount;
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
  }, [morph.auraParticleCount]);

  useFrame(() => {
    if (reduceMotion || !pointsRef.current) return;
    const t = performance.now() / 1000 - tStart.current;
    const attr = pointsRef.current.geometry.attributes.position;
    const pos = attr.array as Float32Array;
    for (let i = 0; i < pos.length / 3; i++) {
      const r = orbits[i * 3];
      const speed = orbits[i * 3 + 1];
      const phase = orbits[i * 3 + 2] + t * speed;
      pos[i * 3] = Math.cos(phase) * r;
      pos[i * 3 + 2] = Math.sin(phase) * r;
      pos[i * 3 + 1] += Math.sin(t * 2 + i) * 0.001;
      if (pos[i * 3 + 1] > 1.2) pos[i * 3 + 1] = -1.2;
    }
    attr.needsUpdate = true;
  });

  const color = glowHex(palette);
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
});

export default Mascot3D;
