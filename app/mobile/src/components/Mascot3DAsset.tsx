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
import { morphologyFromGenome } from '@/lib/dna/morphology';
import { applyCustomization } from '@/lib/dna/customization';
import { morphInfluencesFromMorphology, mergeMorphInfluences } from '@/lib/dna/morphInfluences';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import { aggregateVisualImpact } from '@/lib/dna/mutations';

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

  // DNA + customization → morph influences (blend shape weights [0, 1]).
  // Aplicado em meshes que tenham morphTargetDictionary (definido no GLB).
  // GLBs atuais NÃO têm blend shapes → influences é computado mas NO-OP no apply.
  // Quando artista 3D adicionar shape keys conforme docs/MORPH_TARGETS_DESIGN.md,
  // mascote vira fisicamente único sem mexer nesse arquivo.
  const morphInfluences = useMemo(() => {
    const baseMorph = morphologyFromGenome(dna);
    const withCustom = applyCustomization(baseMorph, customization ?? null);
    const baseInfluences = morphInfluencesFromMorphology(withCustom);
    const withMutBoosts = mergeMorphInfluences(
      baseInfluences,
      aggregateVisualImpact(mutationIds).morphInfluenceBoosts,
    );
    return mergeMorphInfluences(withMutBoosts, personalityMorphBias(personality));
  }, [dna, customization, mutationIds, personality]);

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

    // Aplica morphTargetInfluences se mesh tiver morphTargetDictionary.
    // Defensive: GLBs sem blend shapes têm dictionary undefined → skip silent.
    // Quando shape keys forem adicionadas (catálogo em morphInfluences.ts),
    // weights são aplicados automaticamente sem mudança aqui.
    clonedScene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      const dict = obj.morphTargetDictionary;
      const influences = obj.morphTargetInfluences;
      if (!dict || !influences) return;

      // Zera weights primeiro pra evitar resíduo de update anterior.
      for (let i = 0; i < influences.length; i++) {
        influences[i] = 0;
      }

      // Aplica apenas keys que existem no dictionary do mesh.
      for (const [key, weight] of Object.entries(morphInfluences)) {
        const idx = dict[key];
        if (idx !== undefined && idx >= 0 && idx < influences.length) {
          influences[idx] = Math.max(0, Math.min(1, weight));
        }
      }
    });
  }, [clonedScene, bindings, boneScales, morphInfluences]);

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
