/**
 * Inscreve no creatureMoments e dispara behaviors reativos imediatamente.
 */

import { useEffect, useRef } from 'react';
import { creatureMoments } from '@/lib/moments';
import type { Moment } from '@/lib/moments/types';
import {
  computeCooldownSet,
  executeBehavior,
  selectBehavior,
} from './engine';
import {
  flagsFromMoment,
  MOMENT_REACTIVE_BEHAVIORS,
  mergeReactiveFlags,
  type ReactiveFlags,
} from './reactiveBehaviors';
import type { Behavior, BehaviorContext, BehaviorEffect } from './types';

export interface UseBehaviorMomentsOptions {
  ctxBuilder: () => BehaviorContext | null;
  onEffect: (effect: BehaviorEffect, behavior: Behavior) => void;
  paused?: boolean;
}

export function useBehaviorMoments({
  ctxBuilder,
  onEffect,
  paused = false,
}: UseBehaviorMomentsOptions): void {
  const lastRanRef = useRef<Map<string, number>>(new Map());
  const pendingFlagsRef = useRef<ReactiveFlags>({});
  const ctxBuilderRef = useRef(ctxBuilder);
  const onEffectRef = useRef(onEffect);
  ctxBuilderRef.current = ctxBuilder;
  onEffectRef.current = onEffect;

  const fireReactive = (extraFlags: ReactiveFlags) => {
    const ctx = ctxBuilderRef.current();
    if (!ctx) return;
    const now = Date.now();
    const mergedFlags = mergeReactiveFlags(ctx.reactiveFlags, extraFlags);
    const cooldownActive = computeCooldownSet(MOMENT_REACTIVE_BEHAVIORS, lastRanRef.current, now);
    const fullCtx: BehaviorContext = {
      ...ctx,
      reactiveFlags: mergedFlags,
      cooldownActive,
      lastRanAt: lastRanRef.current,
    };
    const selection = selectBehavior(MOMENT_REACTIVE_BEHAVIORS, fullCtx);
    if (selection.behavior && selection.score > 0) {
      const effect = executeBehavior(selection.behavior, fullCtx);
      lastRanRef.current.set(selection.behavior.id, now);
      try {
        onEffectRef.current(effect, selection.behavior);
      } catch {
        /* visual-only */
      }
    }
  };

  useEffect(() => {
    if (paused) return undefined;
    const unsub = creatureMoments.subscribe({
      filter: null,
      label: 'behavior-moments',
      handler: (moment: Moment) => {
        const flags = flagsFromMoment(moment.name);
        if (flags) {
          pendingFlagsRef.current = mergeReactiveFlags(pendingFlagsRef.current, flags) ?? flags;
          fireReactive(flags);
        }
      },
    });
    return unsub;
  }, [paused]);
}

/** Dispara behavior reativo imediato (gestos pet/double). */
export function dispatchReactiveBehavior(
  ctx: BehaviorContext,
  flags: ReactiveFlags,
  onEffect: (effect: BehaviorEffect, behavior: Behavior) => void,
  lastRanAt: Map<string, number> = new Map(),
): void {
  const now = Date.now();
  const cooldownActive = computeCooldownSet(MOMENT_REACTIVE_BEHAVIORS, lastRanAt, now);
  const fullCtx: BehaviorContext = {
    ...ctx,
    reactiveFlags: mergeReactiveFlags(ctx.reactiveFlags, flags),
    cooldownActive,
    lastRanAt,
  };
  const selection = selectBehavior(MOMENT_REACTIVE_BEHAVIORS, fullCtx);
  if (selection.behavior && selection.score > 0) {
    const effect = executeBehavior(selection.behavior, fullCtx);
    lastRanAt.set(selection.behavior.id, now);
    onEffect(effect, selection.behavior);
  }
}
