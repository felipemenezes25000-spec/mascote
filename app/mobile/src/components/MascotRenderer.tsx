/**
 * MascotRenderer — passthrough pro Mascot2D.
 *
 * Mantém a API legada (props como `preferUnity`, `unityState`, `unityContext`)
 * pra zero quebra nas 10 telas consumidoras. Tudo isso é ignorado — o renderer
 * é 100% Mascot2D após o cleanup big-bang 2026-05-27.
 *
 * Ver `docs/superpowers/specs/2026-05-27-mascote-2d-procedural-ia-design.md`.
 */

import { memo } from 'react';
import { Mascot2D, type AccessoryId } from '@/components/Mascot2D';
import type { MascotCustomization, MascotMood, MascotPhase, Personality, MascotDNA, ProceduralGenome } from '@/types';
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
  force3D?: boolean;  // ignorado — kept for backwards compat
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  evolutionVisuals?: MascotEvolutionVisuals | null;
  dnaOverride?: MascotDNA;
  seedOverride?: number;
  /** ProceduralGenome opcional — quando presente, sobrescreve render via IA-procedural. */
  proceduralGenome?: ProceduralGenome | null;
  /** Legacy props (Unity descontinuado). Aceitos pra evitar quebra de imports. */
  unityState?: unknown;
  unityContext?: unknown;
  preferUnity?: boolean;
}

function MascotRendererImpl(props: MascotRendererProps) {
  // Discarda props legadas (unityState/unityContext/preferUnity/force3D)
  const { unityState: _u1, unityContext: _u2, preferUnity: _u3, force3D: _u4, ...mascot2dProps } = props;
  void _u1; void _u2; void _u3; void _u4;
  return <Mascot2D {...mascot2dProps} />;
}

export const MascotRenderer = memo(MascotRendererImpl);
export default MascotRenderer;
