/**
 * MascotRenderer — escolhe o renderer do mascote.
 *
 * Com DNA (caso normal — todo mascote tem genoma): desenha a CRIATURA
 * procedural (CreatureRenderer) — o ovo chocou em um bicho real, decidido
 * pelas ações. Sem DNA (previews legados, testes): cai pro Mascot2D (robô).
 *
 * O DNA vem do prop `dnaOverride` ou, na falta, do mascote no store — assim
 * telas que não threadam DNA explicitamente (Home, evolução, quarto) já
 * mostram a criatura automaticamente.
 */

import { memo } from 'react';
import { Mascot2D, type AccessoryId } from '@/components/Mascot2D';
import { CreatureRenderer } from '@/components/mascot/CreatureRenderer';
import { useStore } from '@/store';
import type { MascotCustomization, MascotMood, MascotPhase, Personality, MascotDNA, ProceduralGenome } from '@/types';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import type { JourneyVisuals } from '@/game/journey/visuals';

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
  /** Visual da Jornada (anel + adorno do mundo) — ver Mascot2D.journey. */
  journey?: JourneyVisuals | null;
}

function MascotRendererImpl({
  dnaOverride,
  ...rest
}: MascotRendererProps) {
  const storeDna = useStore(s => s.mascot?.dna);
  const dna = dnaOverride ?? storeDna;
  if (dna) {
    return (
      <CreatureRenderer
        dna={dna}
        mood={rest.mood}
        size={rest.size}
        reactTrigger={rest.reactTrigger}
        action={rest.action}
        phase={rest.phase}
        mutationIds={rest.mutationIds}
        reduceMotion={rest.reduceMotion}
        journey={rest.journey}
      />
    );
  }
  return <Mascot2D {...rest} dna={dnaOverride} />;
}

export const MascotRenderer = memo(MascotRendererImpl);
export default MascotRenderer;
