/**
 * useBehaviorTick — hook React que liga o Behavior Engine ao ciclo de vida
 * de uma tela.
 *
 * Responsabilidades:
 *  - Periodicamente (default 5s) computa BehaviorContext via `ctxBuilder`
 *  - Chama `selectBehavior` pra escolher behavior baseado em utility score
 *  - Se algum behavior dispara, executa e chama `onEffect(effect, behavior)`
 *  - Mantém cooldown state em ref (não re-render)
 *
 * Caller decide o que fazer com `effect.animation` / `effect.message` /
 * `effect.notify` — geralmente: toast queue + Mascot3D action prop.
 *
 * **Princípio**: hook é PURO em relação a behaviors (não muta nada do
 * mundo). Side effects são responsabilidade do `onEffect` callback.
 */

import { useEffect, useRef } from 'react';
import {
  computeCooldownSet,
  executeBehavior,
  selectBehavior,
  DEFAULT_BEHAVIORS,
} from './index';
import type { Behavior, BehaviorContext, BehaviorEffect } from './types';

export interface UseBehaviorTickOptions {
  /** Behaviors disponíveis. Default = DEFAULT_BEHAVIORS (4 do scaffold). */
  behaviors?: readonly Behavior[];
  /** Intervalo em ms entre ticks. Default 5000. Min 1000 (cap defensivo). */
  intervalMs?: number;
  /**
   * Função que computa o BehaviorContext atual. Chamada a cada tick.
   * Caller deve retornar snapshot fresh — pegando do useStore, etc.
   * Retorna null pra skip esse tick (ex: profile ainda não carregou).
   */
  ctxBuilder: () => BehaviorContext | null;
  /**
   * Disparado quando um behavior é selecionado e executado.
   * Caller despacha visualmente: toast, animação, notif.
   */
  onEffect: (effect: BehaviorEffect, behavior: Behavior) => void;
  /** Pausa o engine (default false). */
  paused?: boolean;
}

/**
 * Liga o behavior engine ao ciclo de vida da tela. Setup automático com
 * cleanup em unmount. Cooldown persiste por hook instance — desmontar
 * reseta cooldowns (intencional: cada tela tem sua janela de behaviors).
 */
export function useBehaviorTick({
  behaviors = DEFAULT_BEHAVIORS,
  intervalMs = 5000,
  ctxBuilder,
  onEffect,
  paused = false,
}: UseBehaviorTickOptions): void {
  // Cooldown tracking — Map de behaviorId → timestamp ms da última execução
  const lastRanRef = useRef<Map<string, number>>(new Map());
  // Refs pra ctxBuilder e onEffect — evita recriar o effect a cada render
  const ctxBuilderRef = useRef(ctxBuilder);
  const onEffectRef = useRef(onEffect);
  ctxBuilderRef.current = ctxBuilder;
  onEffectRef.current = onEffect;

  useEffect(() => {
    if (paused) return undefined;
    // Clamp intervalo: min 1s, max 5min (defensivo contra bugs de caller)
    const safeInterval = Math.max(1000, Math.min(5 * 60 * 1000, intervalMs));
    const tick = () => {
      const ctx = ctxBuilderRef.current();
      if (!ctx) return; // skip — caller sinaliza não-pronto
      const now = Date.now();
      const cooldownActive = computeCooldownSet(behaviors, lastRanRef.current, now);
      const fullCtx: BehaviorContext = {
        ...ctx,
        cooldownActive,
        lastRanAt: lastRanRef.current,
      };
      const selection = selectBehavior(behaviors, fullCtx);
      if (selection.behavior && selection.score > 0) {
        const effect = executeBehavior(selection.behavior, fullCtx);
        // Marca cooldown ANTES de chamar onEffect (caso onEffect demore /
        // dispare re-render — não queremos double-fire no mesmo tick).
        lastRanRef.current.set(selection.behavior.id, now);
        onEffectRef.current(effect, selection.behavior);
      }
    };
    // Tick imediato — não esperar o primeiro intervalo
    tick();
    const id = setInterval(tick, safeInterval);
    return () => clearInterval(id);
  }, [behaviors, intervalMs, paused]);
}
