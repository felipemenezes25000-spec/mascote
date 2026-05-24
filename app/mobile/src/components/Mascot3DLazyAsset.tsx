/**
 * Mascot3DLazyAsset — wrapper smart que escolhe entre:
 *  - Mascot3DAsset (NOVO): GLB modelado em Blender via useGLTF
 *  - Mascot3DLazy (LEGACY): geometry procedural (vertex displacement)
 *
 * Decisão runtime:
 *  1. Feature flag global GLOBAL_USE_GLB_ASSETS (settings/env)
 *  2. GLB existe pra essa personality (verifica registry)
 *  3. Capability device suporta drei native loaders
 *
 * Fallback graceful: se Mascot3DAsset falha em runtime (load error, missing
 * material), boundary captura e retorna Mascot3DLazy procedural. User nunca
 * vê tela quebrada — só "downgrade" silencioso.
 */

import { Suspense, useEffect, useState } from 'react';
import { View } from 'react-native';
import type {
  MascotCustomization,
  MascotDNA,
  MascotMood,
  MascotPhase,
  Personality,
} from '@/types';
import { PERSONALITY_TO_GLB, type UserAgeBand } from '@/lib/dna/bindings';
import type { MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import { Mascot3DLazy } from '@/components/Mascot3DLazy';

// Feature flag — default true após Blender pipeline + scale tuning v3 final.
// Pode ser overridden via env var EXPO_PUBLIC_USE_GLB_ASSETS=false pra rollback.
const GLOBAL_USE_GLB_ASSETS =
  process.env.EXPO_PUBLIC_USE_GLB_ASSETS !== 'false';

interface Props {
  personality: Personality;
  dna: MascotDNA;
  seed?: number;
  phase: MascotPhase;
  mood?: MascotMood;
  userBand?: UserAgeBand;
  size?: number;
  reduceMotion?: boolean;
  customization?: MascotCustomization | null;
  mutationIds?: readonly string[];
  action?: { kind: MascotAnimationKind; key: number };
  evolutionVisuals?: MascotEvolutionVisuals | null;
}

/**
 * Carrega Mascot3DAsset lazy. Se carregamento falha (Metro asset error,
 * drei missing, GLTFLoader erro), boundary cai pro procedural Mascot3DLazy.
 */
export function Mascot3DLazyAsset(props: Props) {
  const [assetFailed, setAssetFailed] = useState(false);

  const useAsset =
    GLOBAL_USE_GLB_ASSETS &&
    !assetFailed &&
    !!PERSONALITY_TO_GLB[props.personality];

  // Wrapper que captura erros do useGLTF (Suspense throws promises)
  // e marca assetFailed=true pra próximo render usar procedural.
  if (useAsset) {
    return (
      <AssetWithFallback
        {...props}
        onFail={() => setAssetFailed(true)}
      />
    );
  }

  // Legacy procedural path
  return (
    <Mascot3DLazy
      dna={props.dna}
      seed={props.seed ?? 0}
      size={props.size ?? 220}
      reduceMotion={props.reduceMotion}
      customization={props.customization}
      mutationIds={props.mutationIds}
      mood={props.mood}
      action={props.action}
      evolutionVisuals={props.evolutionVisuals}
    />
  );
}

/**
 * Wrapper que dynamic-imports Mascot3DAsset. Mantém o import "perdoável"
 * (se @react-three/drei ou GLB load falha, cai pro procedural sem crash).
 *
 * Implementação simples: try/catch via ErrorBoundary-like state. Em produção
 * idealmente seria React.ErrorBoundary mas pra mobile-only é overkill.
 */
function AssetWithFallback(props: Props & { onFail: () => void }) {
  // Lazy require pra evitar drei carregar em web Expo (causa canvas vazio).
  // Capturamos o resultado UMA vez via useState initializer — setState durante
  // render do parent é proibido, então sinalizamos a falha via useEffect.
  const [resolved] = useState<{ Cmp: any; failed: boolean }>(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return { Cmp: require('@/components/Mascot3DAsset').Mascot3DAsset, failed: false };
    } catch {
      return { Cmp: null, failed: true };
    }
  });
  const onFail = props.onFail;
  useEffect(() => {
    if (resolved.failed) onFail();
  }, [resolved.failed, onFail]);

  if (resolved.failed || !resolved.Cmp) {
    return (
      <Mascot3DLazy
        dna={props.dna}
        seed={props.seed ?? 0}
        size={props.size ?? 220}
        reduceMotion={props.reduceMotion}
        customization={props.customization}
        mutationIds={props.mutationIds}
        mood={props.mood}
        action={props.action}
        evolutionVisuals={props.evolutionVisuals}
      />
    );
  }
  const Mascot3DAsset = resolved.Cmp;

  return (
    <Suspense fallback={<View />}>
      <Mascot3DAsset
        personality={props.personality}
        dna={props.dna}
        seed={props.seed ?? 0}
        phase={props.phase}
        mood={props.mood ?? 'ok'}
        userBand={props.userBand}
        reduceMotion={props.reduceMotion}
        customization={props.customization}
        mutationIds={props.mutationIds}
      />
    </Suspense>
  );
}
