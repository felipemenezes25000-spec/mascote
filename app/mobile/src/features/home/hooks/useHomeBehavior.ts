/**
 * useHomeBehavior — extrai o engine de comportamento ambiente do Home.
 *
 * Roda a cada 30s, monta o BehaviorContext do mascote e despacha effects
 * (toast + animação). Foi tirado direto do `index.tsx` que estava grande.
 */
import type { Dispatch, SetStateAction } from 'react';
import { useBehaviorTick, type BehaviorContext } from '@/lib/behavior';
import { sanitizeGenome } from '@/lib/dna';
import type { Mascot, Profile, Streak } from '@/types';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import { useStore } from '@/store';

interface Options {
  profile: Profile | null;
  mascot: Mascot | null;
  streak: Streak | null;
  paused: boolean;
  setBehaviorAction: Dispatch<
    SetStateAction<{ kind: MascotAnimationKind; key: number } | undefined>
  >;
}

export function useHomeBehavior({
  profile,
  mascot,
  streak,
  paused,
  setBehaviorAction,
}: Options) {
  const enqueueToast = useStore(s => s.enqueueToast);

  useBehaviorTick({
    intervalMs: 30_000,
    paused: paused || !mascot || !profile,
    ctxBuilder: (): BehaviorContext | null => {
      if (!mascot || !profile) return null;
      const genome = mascot.dna ? sanitizeGenome(mascot.dna) : null;
      if (!genome) return null;
      const lastSeen = new Date(mascot.last_seen_at).getTime();
      const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);
      return {
        mascot,
        genome,
        mood: mascot.mood,
        hoursSinceLastInteraction: Math.max(0, hoursSince),
        streakCurrent: streak?.current_streak ?? 0,
        hour: new Date().getHours(),
        cooldownActive: new Set(),
        lastRanAt: new Map(),
      };
    },
    onEffect: (effect) => {
      if (effect.message) {
        enqueueToast({
          kind: 'info',
          emoji: '✨',
          title: effect.message,
          subtitle: mascot?.name,
        });
      }
      if (effect.animation && effect.animation !== 'breath_deep') {
        setBehaviorAction({
          kind: effect.animation as MascotAnimationKind,
          key: Date.now(),
        });
      }
    },
  });
}
