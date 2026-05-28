/**
 * MascotRenderer — passthrough pro Mascot2D.
 */

import { memo } from 'react';
import { Mascot2D, type AccessoryId } from '@/components/Mascot2D';
import type { MascotCustomization, MascotMood, MascotPhase, Personality, MascotDNA, ProceduralGenome } from '@/types';
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
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  dnaOverride?: MascotDNA;
  /** ProceduralGenome opcional — quando presente, sobrescreve render via IA-procedural. */
  proceduralGenome?: ProceduralGenome | null;
}

function MascotRendererImpl({
  dnaOverride,
  ...rest
}: MascotRendererProps) {
  return <Mascot2D {...rest} dna={dnaOverride} />;
}

export const MascotRenderer = memo(MascotRendererImpl);
export default MascotRenderer;
