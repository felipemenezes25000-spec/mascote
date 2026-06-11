/**
 * useJourneyClaim — resgata recompensas da Jornada quando a Home foca.
 *
 * O resgate em si é idempotente e serializado no service (lock journey:uid);
 * este hook só evita chamadas redundantes no MESMO valor de XP (ref) e
 * transforma o resultado em celebração (toasts + confetti + refreshWallet).
 */
import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { claimJourneyRewards } from '@/game/journey/service';
import { getWorld } from '@/game/journey';
import { phaseClaimCelebration, worldEnteredLine } from '@/content/journey-copy';
import { logger } from '@/lib/logger';
import type { Mascot, Profile } from '@/types';

interface ToastInput {
  kind: 'achievement' | 'accessory' | 'scene' | 'level' | 'info' | 'mutation';
  emoji: string;
  title: string;
  subtitle: string;
}

interface Options {
  profile: Profile | null;
  mascot: Mascot | null;
  enqueueToast: (t: ToastInput) => void;
  refreshWallet: () => Promise<void>;
  onConfetti: () => void;
}

export function useJourneyClaim({
  profile,
  mascot,
  enqueueToast,
  refreshWallet,
  onConfetti,
}: Options) {
  const lastClaimedXpRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile || !mascot) return;
      if (lastClaimedXpRef.current === mascot.xp) return;
      lastClaimedXpRef.current = mascot.xp;
      void (async () => {
        try {
          const out = await claimJourneyRewards(profile, mascot.xp);
          if (out.claimed.length === 0) return;
          onConfetti();
          enqueueToast({
            kind: 'level',
            emoji: '✨',
            title: out.claimed.length === 1
              ? `Fase ${out.claimed[0].n} · ${out.claimed[0].title}`
              : `${out.claimed.length} fases desbloqueadas!`,
            subtitle: phaseClaimCelebration(out.claimed.length, out.coinsGained, out.gemsGained),
          });
          for (const title of out.newTitles) {
            const phase = out.claimed.find(p => p.reward.title === title);
            const world = phase ? getWorld(phase.worldId) : null;
            enqueueToast({
              kind: 'achievement',
              emoji: world?.emoji ?? '🏆',
              title: `Título: ${title}`,
              subtitle: world
                ? worldEnteredLine(getWorld(Math.min(world.id + 1, 10)).name, getWorld(Math.min(world.id + 1, 10)).emoji)
                : 'Um capítulo inteiro concluído.',
            });
          }
          for (const gameId of out.newMinigames) {
            enqueueToast({
              kind: 'info',
              emoji: '🎮',
              title: 'Minigame novo!',
              subtitle: 'Toque em Jogar pra conhecer.',
            });
            void gameId;
          }
          await refreshWallet();
        } catch (e) {
          // Resgate falho não pode quebrar a Home — tenta de novo no próximo foco.
          lastClaimedXpRef.current = null;
          logger.warn('[journey] claim falhou, retry no próximo foco', { error: String(e) });
        }
      })();
    }, [profile?.id, mascot?.xp]),
  );
}
