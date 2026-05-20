/**
 * Mascot — wrapper inteligente.
 *
 * Decide automaticamente entre Mascot3D (R3F, criatura procedural)
 * e Mascot2D (SVG legado) baseado em:
 *  1. Capacidade do device (deviceCapabilities)
 *  2. Override do usuário (settings)
 *  3. Presença de DNA no mascot atual
 *
 * MANTÉM 100% DA API LEGADA — esta é a Props que as 45+ telas consomem.
 * Drop-in completo: nenhuma tela precisa ser modificada.
 *
 * **Princípio:** zero quebra. Se algo falha, cai pro 2D sem aviso.
 */

import { memo, useMemo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type {
  MascotCustomization,
  MascotMood,
  MascotPhase,
  Personality,
  MascotDNA,
} from '@/types';
import { detectCapabilities } from '@/lib/deviceCapabilities';
import { useStore } from '@/store';
import { Mascot2D, type AccessoryId } from '@/components/Mascot2D';
import { Mascot3DLazy } from '@/components/Mascot3DLazy';
import { Mascot3DBoundary } from '@/components/Mascot3DBoundary';
import type { MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { MascotAnimationKind } from '@/lib/animation-triggers';

export type { AccessoryId };

interface Props {
  personality: Personality;
  phase: MascotPhase;
  mood: MascotMood;
  size?: number;
  /**
   * Overrides Sims/Spore-like — sliders do usuário. Quando passado,
   * Mascot3D usa em runtime sem mexer no DNA. Null = sem override.
   */
  customization?: MascotCustomization | null;
  /**
   * IDs de mutations desbloqueadas — afeta morfologia visual e brilho.
   * Lista vazia = sem efeitos de mutação.
   */
  mutationIds?: readonly string[];
  /**
   * Action externo (Behavior Engine ou outros drivers). Key novo dispara
   * a animação correspondente em Mascot3D. No fallback 2D, sem efeito.
   */
  action?: { kind: MascotAnimationKind; key: number };
  reactTrigger?: number;
  accessory?:
    | AccessoryId
    | { emoji?: string; slot?: string; id?: AccessoryId }
    | null;
  reduceMotion?: boolean;
  /** Override explícito: força 2D ou 3D. Útil em telas onde 3D é caro. */
  force2D?: boolean;
  force3D?: boolean;
  /** Estilo extra para o container. */
  style?: StyleProp<ViewStyle>;
  /** Modificadores visuais do motor de evolução (glow, aura, postura…). */
  evolutionVisuals?: MascotEvolutionVisuals | null;
  /** Override de DNA para preview/onboarding (antes de persistir no store). */
  dnaOverride?: MascotDNA;
  seedOverride?: number;
}

/**
 * Modificador visual por fase macro — torna a "evolução visível" sem
 * mexer na geometria do 3D (que é puramente DNA-driven).
 * - ovo/bebê: criatura compacta, sem aura extra
 * - crianca/adolescente: tamanho médio
 * - adulto: tamanho pleno
 * - evoluido: tamanho pleno + halo sutil (forma rara)
 *
 * Aplicado via transform scale + ring no container — sobrepõe a render
 * principal sem regredir morfologia.
 */
const PHASE_SCALE: Record<MascotPhase, number> = {
  ovo: 0.78,
  bebe: 0.86,
  crianca: 0.94,
  adolescente: 0.98,
  adulto: 1,
  evoluido: 1.05,
};

function MascotImpl(props: Props) {
  const { force2D, force3D, size = 220, style, dnaOverride, seedOverride, phase } = props;
  const mascot = useStore(s => s.mascot);
  const dna = dnaOverride ?? mascot?.dna;
  const seed = seedOverride ?? mascot?.dna_seed ?? 0;
  const [boundaryFallback, setBoundaryFallback] = useState(false);

  const use3D = useMemo(() => {
    if (boundaryFallback) return false;
    if (force2D) return false;
    if (force3D) return true;
    if (!dna) return false;
    return detectCapabilities().canRender3D;
  }, [force2D, force3D, dna, boundaryFallback]);

  const phaseScale = PHASE_SCALE[phase] ?? 1;
  const isLegendary = phase === 'evoluido';

  if (use3D && dna) {
    return (
      <View
        style={[
          styles.shell,
          { width: size, height: size },
          isLegendary ? styles.legendaryHalo : null,
          style,
          { transform: [{ scale: phaseScale }] },
        ]}
        accessibilityLabel="mascote procedural"
        accessibilityRole="image"
      >
        <Mascot3DBoundary
          fallback={<Mascot2D {...props} />}
          onFallback={() => setBoundaryFallback(true)}
        >
          <Mascot3DLazy
            dna={dna as MascotDNA}
            seed={seed}
            size={size}
            reduceMotion={props.reduceMotion}
            customization={props.customization}
            mutationIds={props.mutationIds}
            mood={props.mood}
            action={props.action}
            evolutionVisuals={props.evolutionVisuals}
          />
        </Mascot3DBoundary>
      </View>
    );
  }

  return <Mascot2D {...props} />;
}

export const Mascot = memo(MascotImpl);
export default Mascot;

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Halo sutil só na fase 'evoluido' — sinaliza forma rara sem ser ostentoso.
  // Borda fina + leve shadow; evita brilho exagerado que descaracterizaria
  // a paleta DNA própria do mascote.
  legendaryHalo: {
    borderRadius: 999,
    shadowColor: '#FFE5A0',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
