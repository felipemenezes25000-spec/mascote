/**
 * MascotRenderer — roteador three | unity | fallback2d.
 *
 * Default permanece `three` (Mascot.tsx / R3F). Unity é opt-in via env.
 * Cadeia de fallback: unity falha → three → 2d (via Mascot interno).
 */

import { memo, useMemo, useState } from 'react';
import { Mascot } from '@/components/Mascot';
import { Mascot2D, type AccessoryId } from '@/components/Mascot2D';
import { UnityMascotView } from '@/components/unity/UnityMascotView';
import {
  buildUnityMascotState,
  resolveRendererMode,
  type BuildUnityMascotStateContext,
} from '@/core/mascot-render-contract';
import type { UnityMascotState } from '@/core/mascot-render-contract';
import { useStore } from '@/store';
import type { MascotCustomization, MascotMood, MascotPhase, Personality, MascotDNA } from '@/types';
import type { MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { MascotAnimationKind } from '@/lib/animation-triggers';

export type { AccessoryId };

export interface MascotRendererProps {
  personality: Personality;
  phase: MascotPhase;
  mood: MascotMood;
  size?: number;
  customization?: MascotCustomization | null;
  mutationIds?: readonly string[];
  action?: { kind: MascotAnimationKind; key: number };
  reactTrigger?: number;
  accessory?:
    | AccessoryId
    | { emoji?: string; slot?: string; id?: AccessoryId }
    | null;
  reduceMotion?: boolean;
  force2D?: boolean;
  force3D?: boolean;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  evolutionVisuals?: MascotEvolutionVisuals | null;
  dnaOverride?: MascotDNA;
  seedOverride?: number;
  /** Estado Unity pré-montado (evita rebuild). */
  unityState?: UnityMascotState | null;
  /** Contexto extra pro builder quando unityState não é passado. */
  unityContext?: BuildUnityMascotStateContext;
  /** Rotas premium (/mascot-room): Unity quando EXPO_PUBLIC_UNITY_ENABLED=true. */
  preferUnity?: boolean;
}

function readSimulateUnityFailure(): boolean {
  const v = process.env.EXPO_PUBLIC_UNITY_SIMULATE_FAILURE;
  return v === 'true' || v === '1';
}

function MascotRendererImpl(props: MascotRendererProps) {
  const { unityState: unityStateProp, unityContext, preferUnity, size = 220 } = props;
  const mode = resolveRendererMode({ preferUnity });
  const mascot = useStore(s => s.mascot);
  const profile = useStore(s => s.profile);
  const settings = useStore(s => s.settings);
  const [unityFailed, setUnityFailed] = useState(false);

  // Skip Unity state build em modo three/fallback2d — operação não-trivial
  // (sanitizeGenome + materials + bones + morphology + accessories) que no
  // caminho dominante (Three.js default) seria computada e descartada.
  // Unity é opt-in via EXPO_PUBLIC_UNITY_ENABLED.
  const builtUnityState = useMemo(() => {
    if (mode !== 'unity') return null;
    if (unityStateProp !== undefined) return unityStateProp;
    if (!mascot) return null;
    const equipped =
      props.accessory && typeof props.accessory === 'string' && props.accessory !== 'none'
        ? [props.accessory]
        : props.accessory && typeof props.accessory === 'object' && props.accessory.id
          ? [props.accessory.id]
          : [];
    return buildUnityMascotState(mascot, {
      profile,
      reduceMotion: props.reduceMotion ?? settings?.reduce_motion,
      mutationIds: props.mutationIds,
      evolutionVisuals: props.evolutionVisuals,
      equippedAccessoryIds: equipped,
      unlockedAccessoryIds: equipped,
      ...unityContext,
    });
  }, [
    mode,
    unityStateProp,
    mascot,
    profile,
    settings?.reduce_motion,
    props.accessory,
    props.mutationIds,
    props.evolutionVisuals,
    props.reduceMotion,
    unityContext,
  ]);

  if (mode === 'fallback2d') {
    return <Mascot2D {...props} />;
  }

  if (mode === 'unity' && !unityFailed) {
    return (
      <UnityMascotView
        state={builtUnityState}
        size={size}
        simulateFailure={readSimulateUnityFailure()}
        onFallback={() => setUnityFailed(true)}
      />
    );
  }

  return <Mascot {...props} />;
}

export const MascotRenderer = memo(MascotRendererImpl);
export default MascotRenderer;
