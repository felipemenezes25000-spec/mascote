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
import type { MascotCustomization, MascotDNA, MascotMood } from '@/types';
import {
  aggregateVisualImpact,
  applyCustomization,
  applyMutationVisualImpact,
  paletteFromGenome,
  morphologyFromGenome,
  bodyHex,
  accentHex,
  glowHex,
  moodScore,
  type Genome,
  type Morphology,
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
  /**
   * Overrides Sims/Spore-like — sliders do usuário sobre morfologia.
   * Multiplicadores fora de [0.7, 1.3] são clampados. Null = sem override.
   */
  customization?: MascotCustomization | null;
  /**
   * IDs de mutations desbloqueadas — afeta morfologia e brilho via
   * `aggregateVisualImpact`. Lista vazia = sem efeito.
   */
  mutationIds?: readonly string[];
  /**
   * Humor atual — modula postura do corpo (tilt + scale) em runtime,
   * sem mexer no DNA. 'triste' inclina pra frente, 'empolgado' faz bounce.
   */
  mood?: MascotMood;
  /**
   * Action externo disparado por Behavior Engine ou outro driver (toast,
   * achievement). Ao mudar de valor, dispara a animação correspondente.
   * Mudança no `key` é o trigger — `kind` define qual animação.
   */
  action?: { kind: 'bounce' | 'celebrate' | 'wander' | 'rest' | 'observe'; key: number };
}

/**
 * Componente público — wrappa Canvas R3F com PanResponder pra capturar
 * toques e converter em offset de "olhar" da criatura.
 *
 * Bounce-on-tap: tap rápido (release com pouco delta) dispara `bouncePulse`
 * que é lido pelo `Creature` via useFrame pra escalar suavemente.
 */
export function Mascot3D({
  dna,
  seed = 0,
  size,
  reduceMotion,
  background,
  customization = null,
  mutationIds = [],
  mood,
  action,
}: Props) {
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [bouncePulse, setBouncePulse] = useState(0);
  const widthRef = useRef(1);
  const heightRef = useRef(1);
  const startPosRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const pan: PanResponderInstance = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_e, gesture) => {
          startPosRef.current = { x: gesture.x0, y: gesture.y0, t: Date.now() };
        },
        onPanResponderMove: (_e, gesture) => {
          const cx = widthRef.current / 2;
          const cy = heightRef.current / 2;
          // x: -1..1 (esquerda/direita), y: -1..1 (cima/baixo)
          const nx = Math.max(-1, Math.min(1, (gesture.moveX - cx) / cx));
          const ny = Math.max(-1, Math.min(1, -(gesture.moveY - cy) / cy));
          setLook({ x: nx, y: ny });
        },
        onPanResponderRelease: (_e, gesture) => {
          // Detecta tap rápido vs pan — se movimento foi pequeno, é tap → bounce
          const start = startPosRef.current;
          if (start) {
            const dx = gesture.moveX - start.x;
            const dy = gesture.moveY - start.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const elapsed = Date.now() - start.t;
            if (dist < 8 && elapsed < 250) {
              setBouncePulse(p => p + 1);
            }
          }
          startPosRef.current = null;
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
        onCreated={({ gl, scene }: { gl: THREE.WebGLRenderer; scene: THREE.Scene }) => {
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
          customization={customization}
          mutationIds={mutationIds}
          mood={mood}
          bouncePulse={bouncePulse}
          action={action}
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
// Creature — composição completa (mood-driven posture + bounce on tap)
// ============================================================================
interface CreatureProps {
  dna: MascotDNA;
  seed: number;
  look: { x: number; y: number };
  reduceMotion: boolean;
  customization?: MascotCustomization | null;
  mutationIds?: readonly string[];
  mood?: MascotMood;
  /** Contador que incrementa em tap — useFrame consome pra disparar bounce. */
  bouncePulse?: number;
  /** Action externo (Behavior Engine). Key novo = trigger. */
  action?: { kind: 'bounce' | 'celebrate' | 'wander' | 'rest' | 'observe'; key: number };
}

// Mapeia humor → modificadores de postura. Valores são lerp targets, não saltos.
// `feliz`/`empolgado` faz bounce; `triste`/`exausto` curva pra frente.
function moodPostureTarget(mood: MascotMood | undefined): {
  tiltX: number;
  scaleY: number;
  bounceAmp: number;
} {
  switch (mood) {
    case 'triste':    return { tiltX: -0.08, scaleY: 0.97, bounceAmp: 0 };
    case 'exausto':   return { tiltX: -0.14, scaleY: 0.94, bounceAmp: 0 };
    case 'feliz':     return { tiltX: 0.03, scaleY: 1.00, bounceAmp: 0.012 };
    case 'empolgado': return { tiltX: 0.06, scaleY: 1.02, bounceAmp: 0.025 };
    case 'ok':
    default:          return { tiltX: 0, scaleY: 1, bounceAmp: 0 };
  }
}

function Creature({
  dna,
  seed,
  look,
  reduceMotion,
  customization,
  mutationIds = [],
  mood,
  bouncePulse = 0,
  action,
}: CreatureProps) {
  const groupRef = useRef<THREE.Group>(null);
  // ============================================================================
  // Morphology pipeline — composta de:
  //   1. base = morphologyFromGenome(dna)
  //   2. + customization overrides (Sims-like)
  //   3. + mutation visual impact (marcos biológicos persistentes)
  //
  // **Transição gradual**: drift de hábito muda cada gene em incrementos
  // pequenos (~0.008-0.014 por checkin). Como morphology é função PURA
  // de DNA + custom + mutations, mudanças no DNA propagam organicamente
  // session-over-session — usuário vê o corpo evoluir aos poucos sem
  // precisar de tween artificial entre frames. Mood transitions (postura,
  // boca, olhos) sim usam lerp interno nos sub-componentes pra suavidade
  // imediata. Customization sliders aplicam-se instantaneamente (intent
  // direto do usuário; suavização atrapalha sensação de controle).
  // ============================================================================
  const morph: Morphology = useMemo(() => {
    const base = morphologyFromGenome(dna as Genome);
    const withCustom = applyCustomization(base, customization ?? null);
    const impact = aggregateVisualImpact(mutationIds);
    return applyMutationVisualImpact(withCustom, impact);
  }, [dna, customization, mutationIds]);
  const palette = useMemo(() => paletteFromGenome(dna as Genome), [dna]);
  const moodS = useMemo(() => moodScore(dna as Genome), [dna]);
  const tStart = useRef<number>(performance.now() / 1000);
  const postureTarget = useMemo(() => moodPostureTarget(mood), [mood]);

  // Bounce-on-tap state — tracked via ref pra useFrame (sem re-render).
  const bouncePulseSeen = useRef(0);
  const bouncePhase = useRef<{ active: boolean; t0: number }>({ active: false, t0: 0 });
  // Action externo (Behavior Engine) — detect key change e dispara fase.
  // Cada kind tem duração + curva próprias.
  const actionKeySeen = useRef<number | undefined>(undefined);
  const actionPhase = useRef<{
    kind: 'bounce' | 'celebrate' | 'wander' | 'rest' | 'observe' | null;
    t0: number;
  }>({ kind: null, t0: 0 });

  // Animação procedural — agora com:
  //  • idle figura-8 (já existente)
  //  • mood posture: tilt X + scale Y (lerp suave)
  //  • mood bounce: oscilação adicional pra empolgado/feliz
  //  • bounce-on-tap: pulse de 350ms quando bouncePulse incrementa
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const now = performance.now() / 1000;
    const t = now - tStart.current;
    if (reduceMotion) {
      g.position.set(0, 0.05, 0);
      g.rotation.set(postureTarget.tiltX, look.x * 0.25, 0);
      g.scale.set(1, postureTarget.scaleY, 1);
      return;
    }
    // Idle wobble figura-8
    g.position.x = Math.sin(t * 0.6) * morph.idleWobble;
    g.position.y = Math.cos(t * 0.4) * morph.idleWobble * 0.7 + 0.05;
    // Rotation: sway adaptativo + look-tracking + mood tilt (lerp)
    const swayY = Math.sin(t * 0.3) * morph.swayAmplitude;
    g.rotation.y = swayY + look.x * 0.25;
    // tilt X lerp: target = mood posture + look.y + user-customized posture_lean.
    // posture_lean é override do usuário em ±0.2 rad — soma no target final.
    const userPosture = customization?.posture_lean ?? 0;
    g.rotation.x += (postureTarget.tiltX + look.y * 0.1 + userPosture - g.rotation.x) * 0.05;
    g.rotation.z = Math.sin(t * 0.5) * 0.04;

    // Bounce-on-tap: detecta incremento e dispara fase de 350ms
    if (bouncePulse !== bouncePulseSeen.current) {
      bouncePulseSeen.current = bouncePulse;
      bouncePhase.current = { active: true, t0: now };
    }
    let bounceScale = 1;
    if (bouncePhase.current.active) {
      const elapsed = now - bouncePhase.current.t0;
      const dur = 0.35;
      if (elapsed < dur) {
        // Sine-wave pulse 1.0 → 1.08 → 1.0
        bounceScale = 1 + Math.sin((elapsed / dur) * Math.PI) * 0.08;
      } else {
        bouncePhase.current.active = false;
      }
    }

    // Action externo (Behavior Engine) — detect key change
    if (action && action.key !== actionKeySeen.current) {
      actionKeySeen.current = action.key;
      actionPhase.current = { kind: action.kind, t0: now };
    }
    // Aplicar action effects sobre o transform — composição com mood/bounce
    let actionScaleBoost = 1;
    let actionTiltZ = 0;
    let actionWobbleBoost = 0;
    if (actionPhase.current.kind) {
      const elapsed = now - actionPhase.current.t0;
      const ap = actionPhase.current;
      switch (ap.kind) {
        case 'bounce': {
          const dur = 0.35;
          if (elapsed < dur) {
            actionScaleBoost = 1 + Math.sin((elapsed / dur) * Math.PI) * 0.08;
          } else ap.kind = null;
          break;
        }
        case 'celebrate': {
          // 1.2s de bounce + leve giro
          const dur = 1.2;
          if (elapsed < dur) {
            actionScaleBoost = 1 + Math.sin((elapsed / dur) * Math.PI * 3) * 0.06;
            actionTiltZ = Math.sin((elapsed / dur) * Math.PI * 2) * 0.05;
          } else ap.kind = null;
          break;
        }
        case 'wander': {
          // 2s de wobble amplificado
          const dur = 2.0;
          if (elapsed < dur) {
            const fade = Math.sin((elapsed / dur) * Math.PI); // ease in/out
            actionWobbleBoost = fade * 0.4;
          } else ap.kind = null;
          break;
        }
        case 'rest':
        case 'observe': {
          // Mantém posture quieta por 3s — sem efeito ativo, é mais "freeze"
          const dur = 3.0;
          if (elapsed >= dur) ap.kind = null;
          break;
        }
      }
    }

    // Mood bounce contínuo (subtle, sustained)
    const moodBounce = postureTarget.bounceAmp > 0
      ? Math.sin(t * 2.4) * postureTarget.bounceAmp
      : 0;
    // Re-aplica wobble boost (amplifica idle figura-8)
    if (actionWobbleBoost > 0) {
      g.position.x += Math.sin(t * 2) * actionWobbleBoost * 0.1;
    }
    // tilt Z do celebrate compõe com o sway
    g.rotation.z += actionTiltZ;
    // Scale composto: bounce x action x mood scaleY x mood bounce
    const finalScale = bounceScale * actionScaleBoost;
    g.scale.set(finalScale, postureTarget.scaleY * finalScale + moodBounce, finalScale);
  });

  return (
    <group ref={groupRef}>
      <Body dna={dna} morph={morph} palette={palette} mood={moodS} reduceMotion={reduceMotion} />
      <Eyes morph={morph} palette={palette} look={look} reduceMotion={reduceMotion} mood={mood} />
      <Mouth morph={morph} palette={palette} mood={mood} reduceMotion={reduceMotion} />
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
      <Aura morph={morph} palette={palette} reduceMotion={reduceMotion} mood={mood} />
      {/* Sparkle burst — overlay condicional disparado em mood='empolgado'.
          Componente isolado pra não afetar Aura permanente. */}
      {mood === 'empolgado' && !reduceMotion && (
        <SparkleBurst palette={palette} />
      )}
    </group>
  );
}

// ============================================================================
// Mouth — boca expressiva, mood-driven
// ============================================================================
// Strategy: TorusGeometry parcial (arc) rotacionado:
//  - mood feliz/empolgado → arc voltado pra cima (sorriso); maior abertura
//    quando empolgado
//  - mood ok → arc quase imperceptível (linha sutil)
//  - mood triste → arc voltado pra baixo (frown)
//  - mood exausto → linha reta apertada com leve droop
// Tudo via lerp suave nas transições — sem snap de estado.

function moodMouthTarget(mood: MascotMood | undefined): {
  /** Rotation Z em radianos: positivo = sorriso, negativo = frown */
  arcSign: number;
  /** Escala — tamanho da boca */
  scale: number;
  /** Espessura visual via thickness do torus */
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

function Mouth({
  morph,
  palette,
  mood,
  reduceMotion,
}: {
  morph: Morphology;
  palette: ReturnType<typeof paletteFromGenome>;
  mood: MascotMood | undefined;
  reduceMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  // Lerped state pra transição entre moods (não snap)
  const stateRef = useRef({ arcSign: 0.1, scale: 0.85, thickness: 0.016 });
  const target = useMemo(() => moodMouthTarget(mood), [mood]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (reduceMotion) {
      // Snap direto sem lerp
      g.rotation.z = target.arcSign * 0.35;
      g.scale.set(target.scale, target.scale, target.scale);
      return;
    }
    // Lerp factor 0.06 — suave (~16 frames pra chegar a 95% do target)
    const s = stateRef.current;
    s.arcSign += (target.arcSign - s.arcSign) * 0.06;
    s.scale += (target.scale - s.scale) * 0.06;
    s.thickness += (target.thickness - s.thickness) * 0.06;
    g.rotation.z = s.arcSign * 0.35;
    g.scale.set(s.scale, s.scale, s.scale);
  });

  // Cor da boca: derivada da paleta accent — combina com o corpo
  const mouthColor = accentHex(palette);
  // Posição: abaixo dos olhos, levemente à frente (z = eyeZ - 0.05)
  const y = morph.eyeY - morph.eyeSize * 1.5;
  const z = morph.eyeZ - 0.05;
  // Arc do torus: 60% do círculo (Math.PI * 1.2)
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

// ============================================================================
// SparkleBurst — partículas condicionais (mood='empolgado')
// ============================================================================
// 8 sparkles orbitando rapidamente em raio menor que a aura. Aparecem só
// quando criatura está em mood empolgado; somem suavemente quando mood muda.

function SparkleBurst({ palette }: { palette: ReturnType<typeof paletteFromGenome> }) {
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

  // Pattern visual aplicado via material props — sem shader custom (mais
  // performante e sem precisar GLSL). Cada pattern produz um look distinto:
  //  • plain    — material padrão DNA-driven
  //  • spots    — metalness alto + roughness baixo (pinta brilhante)
  //  • stripes  — flatShading + roughness alto (facetado opaco)
  //  • fractal  — flatShading + emissive boost (caótico iluminado)
  //  • cells    — roughness máximo + metalness médio (casca dura)
  let mat_roughness = morph.bodyRoughness;
  let mat_metalness = morph.bodyMetalness;
  let mat_flatShading = morph.bodyFlatShading;
  let mat_emissiveIntensity = morph.bodyEmissiveIntensity + mood * 0.18;
  switch (morph.pattern) {
    case 'spots':
      mat_metalness = Math.min(1, mat_metalness + 0.45);
      mat_roughness = Math.max(0, mat_roughness - 0.25);
      break;
    case 'stripes':
      mat_flatShading = true;
      mat_roughness = Math.min(1, mat_roughness + 0.25);
      break;
    case 'fractal':
      mat_flatShading = true;
      mat_emissiveIntensity += 0.25;
      break;
    case 'cells':
      mat_roughness = Math.min(1, mat_roughness + 0.4);
      mat_metalness = Math.min(1, mat_metalness + 0.2);
      break;
    // 'plain' usa defaults DNA-driven
  }

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -0.05 + morph.bodyBottomBias * 0.1, 0]}>
      <meshStandardMaterial
        color={color}
        roughness={mat_roughness}
        metalness={mat_metalness}
        flatShading={mat_flatShading}
        emissive={emissive}
        emissiveIntensity={mat_emissiveIntensity}
      />
    </mesh>
  );
}

// ============================================================================
// Eyes — agora também leva mood pra modular squint (olhos meio-fechados em
// 'triste'/'exausto'; arregalados em 'empolgado'). Lerp suave entre estados.
// ============================================================================
function Eyes({
  morph,
  palette,
  look,
  reduceMotion,
  mood,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  look: { x: number; y: number };
  reduceMotion: boolean;
  mood: MascotMood | undefined;
}) {
  return (
    <group>
      <Eye side={-1} morph={morph} palette={palette} look={look} reduceMotion={reduceMotion} mood={mood} />
      <Eye side={1} morph={morph} palette={palette} look={look} reduceMotion={reduceMotion} mood={mood} />
    </group>
  );
}

/** Modulador de scale Y dos olhos baseado em mood — produz squint/wide. */
function moodEyeScaleY(mood: MascotMood | undefined): number {
  switch (mood) {
    case 'empolgado': return 1.10; // arregalados, alertas
    case 'feliz':     return 1.00;
    case 'ok':        return 1.00;
    case 'triste':    return 0.78; // levemente caídos
    case 'exausto':   return 0.55; // semicerrados
    default:          return 1.00;
  }
}

function Eye({
  side,
  morph,
  palette,
  look,
  reduceMotion,
  mood,
}: {
  side: -1 | 1;
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  look: { x: number; y: number };
  reduceMotion: boolean;
  mood: MascotMood | undefined;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pupilRef = useRef<THREE.Mesh>(null);
  const tStart = useRef<number>(performance.now() / 1000 + side * 0.3);
  const blinkStateRef = useRef<{ next: number; remaining: number }>({
    next: 2 + Math.random() * 4,
    remaining: 0,
  });
  // Lerped scale Y baseado em mood — squint/wide com transição suave
  const scaleYRef = useRef(1);

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
    // Mood-driven scale Y target (squint/wide) — lerp em direção
    const moodTarget = moodEyeScaleY(mood);
    scaleYRef.current += (moodTarget - scaleYRef.current) * 0.05;
    // blink
    if (reduceMotion) {
      g.scale.y = moodTarget;
      return;
    }
    const st = blinkStateRef.current;
    let blinkFactor = 1;
    if (st.remaining > 0) {
      st.remaining = Math.max(0, st.remaining - 0.016);
      const k = Math.sin((1 - st.remaining / 0.18) * Math.PI);
      blinkFactor = 1 - k * 0.9;
    } else {
      st.next -= 0.016;
      if (st.next <= 0) {
        st.remaining = 0.18;
        st.next = 2 + Math.random() * 4;
      }
    }
    // Composto: blink × mood (multiplicativo — blink supera mood quando ativo)
    g.scale.y = scaleYRef.current * blinkFactor;
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
// Aura — partículas orbitando, agora MOOD-REACTIVE
// ============================================================================
// Em 'empolgado'/'feliz': aura mais ampla, velocidade maior, opacity boost.
// Em 'exausto'/'triste': aura contraída, mais lenta, opacity reduzida.
// Lerp suave nas transições (fator 0.04).

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

function Aura({
  morph,
  palette,
  reduceMotion,
  mood,
}: {
  morph: ReturnType<typeof morphologyFromGenome>;
  palette: ReturnType<typeof paletteFromGenome>;
  reduceMotion: boolean;
  mood: MascotMood | undefined;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const tStart = useRef(performance.now() / 1000);
  // Lerped modifiers — transição suave entre moods
  const modRef = useRef({ radiusMult: 1.0, speedMult: 1.0, opacityMult: 1.0 });

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
    // Lerp dos modifiers em direção ao target do mood (transição visível mas natural)
    const target = moodAuraModifiers(mood);
    const m = modRef.current;
    m.radiusMult += (target.radiusMult - m.radiusMult) * 0.04;
    m.speedMult += (target.speedMult - m.speedMult) * 0.04;
    m.opacityMult += (target.opacityMult - m.opacityMult) * 0.04;
    // Aplica opacity no material (clamp em [0, 1])
    if (materialRef.current) {
      materialRef.current.opacity = Math.max(0, Math.min(1, morph.auraOpacity * m.opacityMult));
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
});

export default Mascot3D;
