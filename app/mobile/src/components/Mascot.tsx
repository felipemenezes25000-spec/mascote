/**
 * Mascot — wrapper de compat sobre Mascot2D.
 */

import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Mascot2D, type AccessoryId } from '@/components/Mascot2D';
import { CreatureRenderer } from '@/components/mascot/CreatureRenderer';
import type {
  MascotCustomization,
  MascotDNA,
  MascotMood,
  MascotPhase,
  Personality,
  ProceduralGenome,
} from '@/types';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import type { JourneyVisuals } from '@/game/journey/visuals';
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
  style?: StyleProp<ViewStyle>;
  /** Override de DNA pra preview/onboarding. */
  dnaOverride?: MascotDNA;
  /** Genome IA-procedural. Passado direto pro Mascot2D. */
  proceduralGenome?: ProceduralGenome | null;
  /** Visual da Jornada (forma corporal + adornos) — ver Mascot2D.journey. */
  journey?: JourneyVisuals | null;
}

function MascotImpl(props: Props) {
  const storeMascot = useStore(s => s.mascot);
  const dna = props.dnaOverride ?? storeMascot?.dna;

  // Com DNA → a CRIATURA procedural (o ovo virou bicho). Sem → robô legado.
  if (dna) {
    return (
      <CreatureRenderer
        dna={dna}
        mood={props.mood}
        size={props.size}
        reactTrigger={props.reactTrigger}
        action={props.action}
        phase={props.phase}
        mutationIds={props.mutationIds}
        reduceMotion={props.reduceMotion}
        journey={props.journey}
      />
    );
  }

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
      journey={props.journey}
    />
  );
}

export const Mascot = memo(MascotImpl);
export default Mascot;
