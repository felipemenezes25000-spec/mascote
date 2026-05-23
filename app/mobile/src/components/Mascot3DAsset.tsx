/**
 * Mascot3DAsset — renderer que carrega GLB pré-modelado (Blender) em vez de
 * geometry procedural.
 *
 * Substitui o pipeline procedural (IcosahedronGeometry deformada) por
 * **assets reais** modelados em Blender via `scripts/blender/generate_mascot.py`.
 *
 * **Por que GLB > procedural**: o Felipe pediu "design normal bonito". Vertex
 * displacement de uma esfera inerentemente vira "blob alien". Modelado em
 * Blender com composição de primitivas (cabeça + corpo + olhos + bochechas +
 * sorriso + bracinhos + pezinhos) tem proporções chibi reconhecíveis tipo
 * Pou/Tamagotchi/Pokemon.
 *
 * **Customização DNA preservada**: cor/proporções/animations aplicadas em
 * runtime via `bindings.ts` helpers. DNA continua único por usuário.
 *
 * **Phase system**: bone scale (head/body) muda por fase (ovo, bebê, etc).
 * Sem rigging real, escalamos meshes individuais.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import type {
  MascotCustomization,
  MascotDNA,
  MascotMood,
  MascotPhase,
  Personality,
} from '@/types';
import {
  dnaToMaterialBindings,
  dnaToBoneScales,
  PERSONALITY_TO_GLB,
  type UserAgeBand,
} from '@/lib/dna/bindings';

interface Props {
  personality: Personality;
  dna: MascotDNA;
  seed: number;
  phase: MascotPhase;
  mood: MascotMood;
  userBand?: UserAgeBand;
  reduceMotion?: boolean;
  customization?: MascotCustomization | null;
  mutationIds?: readonly string[];
}

/**
 * Resolve URL do GLB pra personality. No app real, asset bundling via
 * expo-asset; aqui usa caminho relativo que Metro resolve.
 */
function glbPathForPersonality(personality: Personality): string {
  // PERSONALITY_TO_GLB retorna 'assets/mascot-3d/bipo.glb' etc.
  // Metro bundler em React Native resolve via require() string interpolation.
  return PERSONALITY_TO_GLB[personality];
}

export function Mascot3DAsset({
  personality,
  dna,
  phase,
  mood,
  userBand = '25-34',
  reduceMotion,
  customization,
  mutationIds = [],
}: Props) {
  const glbPath = glbPathForPersonality(personality);
  const { scene, animations } = useGLTF(glbPath);

  // Clone scene pra cada instância ter próprio transform (evita compartilhar)
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // DNA → material bindings (tints, emissive, etc)
  const bindings = useMemo(
    () => dnaToMaterialBindings(dna, userBand),
    [dna, userBand],
  );

  // DNA + phase → bone/mesh scales
  const boneScales = useMemo(
    () => dnaToBoneScales(dna, phase, userBand),
    [dna, phase, userBand],
  );

  // Aplica material tints + scales na cena clonada
  useEffect(() => {
    clonedScene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material;
      if (!mat || Array.isArray(mat)) return;

      // Material tint por slot semântico — GLB tem material name
      // 'body_material' e 'accent_material' (ver MASCOT_3D_ASSETS_BRIEF.md)
      const matName = mat.name?.toLowerCase() || '';
      if ('color' in mat && mat.color instanceof THREE.Color) {
        if (matName.includes('body')) {
          mat.color.setHex(bindings.bodyTint);
        } else if (matName.includes('accent')) {
          mat.color.setHex(bindings.accentTint);
        }
      }
      // Emissive intensity por fase (evoluído brilha mais)
      if ('emissiveIntensity' in mat) {
        const m = mat as THREE.MeshStandardMaterial;
        m.emissiveIntensity = bindings.emissiveIntensity;
        if (m.emissive instanceof THREE.Color) {
          m.emissive.setHex(bindings.glowTint);
        }
      }
    });

    // Aplica scale por nome (sem rigging real, escala mesh direto)
    const meshes: Record<string, THREE.Mesh> = {};
    clonedScene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        meshes[obj.name] = obj;
      }
    });
    // 'head' mesh + 'body' mesh são criados pelo generate_mascot.py
    if (meshes.head) meshes.head.scale.setScalar(boneScales.head);
    if (meshes.body) meshes.body.scale.setScalar(boneScales.body);
  }, [clonedScene, bindings, boneScales]);

  // Animation mixer pro idle (breath + blink embedded no GLB)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  useEffect(() => {
    if (animations.length === 0 || reduceMotion) return;
    const mixer = new THREE.AnimationMixer(clonedScene);
    animations.forEach(clip => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    });
    mixerRef.current = mixer;
    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [animations, clonedScene, reduceMotion]);

  useFrame((_state, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return <primitive object={clonedScene} />;
}

// Pre-load todos os 4 GLBs pra não ter delay quando user troca personality
// (call no app init: import { preloadMascots } from '@/components/Mascot3DAsset')
export function preloadMascots() {
  Object.values(PERSONALITY_TO_GLB).forEach(path => useGLTF.preload(path));
}
