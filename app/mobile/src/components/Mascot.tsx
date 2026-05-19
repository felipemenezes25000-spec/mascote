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

import { memo, useMemo } from 'react';
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
import { Mascot3D } from '@/components/Mascot3D';

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
  action?: { kind: 'bounce' | 'celebrate' | 'wander' | 'rest' | 'observe'; key: number };
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
}

function MascotImpl(props: Props) {
  const { force2D, force3D, size = 220, style } = props;
  const mascot = useStore(s => s.mascot);
  const dna = mascot?.dna;

  const use3D = useMemo(() => {
    if (force2D) return false;
    if (force3D) return true;
    if (!dna) return false; // sem DNA → ainda no fluxo legado, mostra 2D
    return detectCapabilities().canRender3D;
  }, [force2D, force3D, dna]);

  if (use3D && dna) {
    return (
      <View
        style={[styles.shell, { width: size, height: size }, style]}
        accessibilityLabel="mascote procedural"
        accessibilityRole="image"
      >
        <Mascot3D
          dna={dna as MascotDNA}
          seed={mascot?.dna_seed ?? 0}
          size={size}
          reduceMotion={props.reduceMotion}
          customization={props.customization}
          mutationIds={props.mutationIds}
          mood={props.mood}
          action={props.action}
        />
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
});
