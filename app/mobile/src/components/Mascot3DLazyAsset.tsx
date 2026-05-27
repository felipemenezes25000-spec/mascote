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
 * material, parse, WebGL context lost), o ErrorBoundary interno captura e
 * troca silenciosamente pro Mascot3DLazy procedural. User nunca vê tela
 * quebrada — só "downgrade" silencioso. Se o procedural TAMBÉM falhar, o
 * Mascot3DBoundary externo (Mascot.tsx) cai pro 2D — fallback final.
 */

import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
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
import { logger } from '@/lib/logger';

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
 * drei missing, GLTFLoader erro, WebGL crash), o AssetErrorBoundary interno
 * captura e re-renderiza com procedural Mascot3DLazy.
 */
export function Mascot3DLazyAsset(props: Props) {
  const [assetFailed, setAssetFailed] = useState(false);

  const useAsset =
    GLOBAL_USE_GLB_ASSETS &&
    !assetFailed &&
    !!PERSONALITY_TO_GLB[props.personality];

  const proceduralFallback = (
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

  if (useAsset) {
    return (
      <AssetWithFallback
        {...props}
        proceduralFallback={proceduralFallback}
        onFail={() => setAssetFailed(true)}
      />
    );
  }

  // Legacy procedural path (também usado quando assetFailed=true após erro
  // capturado pelo AssetErrorBoundary).
  return proceduralFallback;
}

/**
 * AssetErrorBoundary — captura QUALQUER erro de render dentro da subárvore
 * (incluindo erros lançados pelo Suspense quando useGLTF rejeita a promise
 * de carregamento) e re-renderiza o fallback procedural.
 *
 * Por que precisamos disto: ErrorBoundary só captura erros em render, NÃO
 * em effects ou em promises async não-Suspense. Mas useGLTF (drei) integra
 * com Suspense — quando o load falha, a promise é REJEITADA e Suspense
 * re-lança como erro de render. Portanto este boundary captura.
 *
 * Após capturar, chamamos onFail() em componentDidCatch pra sinalizar ao
 * parent que o asset falhou, e a partir do próximo render do parent o
 * caminho do asset não é mais tentado (evita loop de re-render-erro).
 */
interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onFail: (error: Error) => void;
}

interface BoundaryState {
  failed: boolean;
}

class AssetErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    logger.warn('[Mascot3DAsset] GLB asset failed, falling back to procedural', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
    this.props.onFail(error);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Wrapper que dynamic-imports Mascot3DAsset. Mantém o import "perdoável"
 * (se @react-three/drei ou GLB load falha, cai pro procedural sem crash).
 *
 * Camadas de defesa:
 *  1. try/catch em require() — captura falha de import síncrono do módulo.
 *  2. AssetErrorBoundary em volta de <Mascot3DAsset> — captura erros de
 *     render, incluindo rejeições do Suspense quando useGLTF falha.
 *  3. Suspense fallback enquanto carrega — placeholder vazio enquanto
 *     o GLB baixa/parseia.
 */
function AssetWithFallback(
  props: Props & { onFail: () => void; proceduralFallback: ReactNode },
) {
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
    return <>{props.proceduralFallback}</>;
  }
  const Mascot3DAsset = resolved.Cmp;

  return (
    <AssetErrorBoundary fallback={props.proceduralFallback} onFail={onFail}>
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
    </AssetErrorBoundary>
  );
}
