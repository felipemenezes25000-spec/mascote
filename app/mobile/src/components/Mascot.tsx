/**
 * Mascot — wrapper de compat sobre Mascot2D.
 *
 * Mantém API legada (force2D, force3D, dnaOverride, seedOverride, evolutionVisuals)
 * pra zero quebra nas 45+ telas que importavam `Mascot` antes do cleanup 2026-05-27.
 * Props descartadas (force3D, evolutionVisuals) são ignoradas silenciosamente.
 *
 * Ver `docs/superpowers/specs/2026-05-27-mascote-2d-procedural-ia-design.md`.
 */

import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Mascot2D, type AccessoryId } from '@/components/Mascot2D';
import type {
  MascotCustomization,
  MascotDNA,
  MascotMood,
  MascotPhase,
  Personality,
  ProceduralGenome,
} from '@/types';
import type { MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import { useStore } from '@/store';

export type { AccessoryId };

interface Props {
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
  /** Descontinuado (sempre 2D agora). Aceito pra evitar quebra de imports. */
  force2D?: boolean;
  /** Descontinuado. Ignorado. */
  force3D?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Descontinuado (3D-only). Ignorado. */
  evolutionVisuals?: MascotEvolutionVisuals | null;
  /** Override de DNA pra preview/onboarding. */
  dnaOverride?: MascotDNA;
  seedOverride?: number;
  /** Genome IA-procedural. Passado direto pro Mascot2D. */
  proceduralGenome?: ProceduralGenome | null;
}

function MascotImpl(props: Props) {
  const storeMascot = useStore(s => s.mascot);
  // dnaOverride > store.mascot.dna (preview de onboarding)
  const dna = props.dnaOverride ?? storeMascot?.dna;

  return (
    <Mascot2D
      personality={props.personality}
      phase={props.phase}
      mood={props.mood}
      size={props.size}
      customization={props.customization}
      mutationIds={props.mutationIds}
      reactTrigger={props.reactTrigger}
      accessory={props.accessory}
      reduceMotion={props.reduceMotion}
      dna={dna}
      proceduralGenome={props.proceduralGenome ?? storeMascot?.procedural_genome ?? null}
    />
  );
}

export const Mascot = memo(MascotImpl);
export default Mascot;
