/**
 * Mascot3D — renderer procedural usando React Three Fiber + expo-gl.
 *
 * Recebe um Genome (DNA) e renderiza a criatura ÚNICA derivada dele. O
 * desenho da criatura está fatorado em `./mascot-3d/` — este arquivo é só
 * o container: Canvas + PanResponder (toque) + Creature.
 *
 * **Princípio:** componente puro do DNA. Sem efeitos colaterais. Sem acesso a
 * storage/IA/safety. Apenas vê o Genome que recebe e desenha.
 *
 * **Estrutura modular** (extraída de monolito de 1226 linhas em mai/2026):
 *  - mascot-3d/SceneLights — 4-light Pixar-style rig
 *  - mascot-3d/Creature    — composição + animation pipeline
 *  - mascot-3d/Body, Eyes, Mouth, Limbs, Spikes, Antennae, Tail — render leaves
 *  - mascot-3d/Aura, SparkleBurst, ZenParticles — particle systems
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type PanResponderInstance,
} from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { MascotCustomization, MascotDNA, MascotMood } from '@/types';
import type { MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import { SceneLights } from './mascot-3d/SceneLights';
import { Creature } from './mascot-3d/Creature';
import {
  morphInfluencesFromMorphology,
  mergeMorphInfluences,
} from '@/lib/dna/morphInfluences';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import { applyCustomization } from '@/lib/dna/customization';
import {
  aggregateVisualImpact,
  applyMutationVisualImpact,
} from '@/lib/dna/mutations';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import { sanitizeGenome, type Genome } from '@/lib/dna/genome';
import type { Personality } from '@/types';

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
  action?: { kind: MascotAnimationKind; key: number };
  /** Modificadores visuais do fenótipo (hábitos + microevoluções). */
  evolutionVisuals?: MascotEvolutionVisuals | null;
  /**
   * Personalidade ativa do mascote — usado pelo personalityMorphBias
   * pra adicionar um boost sutil (<=0.20) nos morphInfluences.
   * Quando omitido, biases ficam neutros.
   */
  personality?: Personality;
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
  evolutionVisuals = null,
  personality,
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

  // morphInfluences eh o "blend shape dict" usado pelos renderers Asset
  // (GLB morphTargetInfluences) e Unity (SetBlendShapeWeight). Aqui no
  // procedural R3F nao ha mesh com shape keys, mas a Creature usa as
  // mesmas chaves pra modular escala de leaves selecionados (Body),
  // mantendo paridade visual entre as 3 trilhas de render.
  const safeDna = useMemo(() => sanitizeGenome(dna), [dna]);

  const morphInfluences = useMemo(() => {
    const base = morphologyFromGenome(safeDna);
    const withCustom = applyCustomization(base, customization ?? null);
    const impact = aggregateVisualImpact(mutationIds);
    const withMut = applyMutationVisualImpact(withCustom, impact);
    const baseInf = morphInfluencesFromMorphology(withMut);
    return personality
      ? mergeMorphInfluences(baseInf, personalityMorphBias(personality))
      : baseInf;
  }, [dna, customization, mutationIds, personality]);

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
          const tint = evolutionVisuals?.environmentTint ?? '#0a0e1a';
          gl.setClearColor(background ?? '#000000', background ? 1 : 0);
          scene.fog = new THREE.FogExp2(parseInt(tint.replace('#', ''), 16), 0.022);
        }}
      >
        <SceneLights />
        <Creature
          dna={safeDna}
          seed={seed}
          look={look}
          reduceMotion={reduceMotion ?? false}
          customization={customization}
          mutationIds={mutationIds}
          mood={mood}
          bouncePulse={bouncePulse}
          action={action}
          evolutionVisuals={evolutionVisuals}
          morphInfluences={morphInfluences}
        />
      </Canvas>
    </View>
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
