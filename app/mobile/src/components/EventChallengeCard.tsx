import { Typography } from '@/components/ui';
/**
 * EventChallengeCard — desafio resgatável do evento limitado ativo.
 *
 * "3 check-ins no fim de semana → baú lendário", com progresso DERIVADO
 * dos check-ins reais, countdown honesto (o evento volta no próximo ciclo)
 * e claim idempotente (lock + tryClaim atômico no service).
 *
 * Self-contained: busca progresso no foco e some sozinho quando não há
 * evento com desafio. A Home só decide ONDE renderizar.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/design-system';
import {
  activeEventChallenge,
  challengeProgress,
  claimEventChallenge,
  type EventChallenge,
} from '@/game/events/challenge';
import { eventClaims } from '@/lib/db';
import { timeRemaining } from '@/lib/events';
import { playSfx } from '@/lib/sfx';
import { useStyles } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

interface Props {
  /** Re-busca progresso quando muda (a Home incrementa após check-in). */
  refreshKey?: number;
  onConfetti?: () => void;
}

export function EventChallengeCard({ refreshKey = 0, onConfetti }: Props) {
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const [challenge, setChallenge] = useState<EventChallenge | null>(null);
  const [progress, setProgress] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const claimingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      const ch = activeEventChallenge();
      setChallenge(ch);
      if (!ch) return;
      void (async () => {
        const [p, done] = await Promise.all([
          challengeProgress(profile.id, ch),
          eventClaims.isClaimed(profile.id, ch.id),
        ]);
        setProgress(p);
        setClaimed(done);
      })();
    }, [profile?.id, refreshKey]),
  );

  if (!profile || !challenge) return null;

  const remaining = timeRemaining(challenge.windowEnd);
  const complete = progress >= challenge.target;
  const countdown = remaining.hours > 0
    ? `${remaining.hours}h ${remaining.minutes}min`
    : `${remaining.minutes}min`;

  async function claim() {
    if (!profile || !challenge || claimingRef.current) return;
    claimingRef.current = true;
    try {
      const out = await claimEventChallenge(profile, challenge);
      if (!out.claimed) {
        if (out.reason === 'already') setClaimed(true);
        return;
      }
      setClaimed(true);
      playSfx('chest', { enabled: useStore.getState().settings?.sfx_enabled !== false });
      onConfetti?.();
      await refreshWallet();
      enqueueToast({
        kind: 'info',
        emoji: '🏆',
        title: 'Baú do desafio aberto!',
        subtitle: `+${out.coins} 🪙 +${out.gems} 💎 — constância premiada.`,
      });
    } finally {
      claimingRef.current = false;
    }
  }

  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`${challenge.title}: ${Math.min(progress, challenge.target)} de ${challenge.target} check-ins. ${
        claimed ? 'Baú já resgatado.' : complete ? 'Completo, baú disponível.' : `Termina em ${countdown}.`
      }`}
    >
      <View style={styles.headerRow}>
        <Typography variant="bodyBold">
          {challenge.emoji} {challenge.title}
        </Typography>
        <Typography variant="mono" tone="secondary">⏳ {countdown}</Typography>
      </View>
      <Typography variant="caption" tone="secondary">{challenge.description}</Typography>
      <ProgressBar
        value={Math.min(progress, challenge.target)}
        max={challenge.target}
        color="warn"
        height={8}
      />
      <View style={styles.footerRow}>
        <Typography variant="mono" tone="dim">
          {Math.min(progress, challenge.target)}/{challenge.target} check-ins
        </Typography>
        {claimed ? (
          <Typography variant="caption" tone="success" style={{ fontWeight: '700' }}>
            Baú resgatado ✓
          </Typography>
        ) : complete ? (
          <Button label="Abrir baú 🏆" onPress={() => void claim()} />
        ) : (
          <Typography variant="mono" tone="secondary">
            +{challenge.reward.coins} 🪙 +{challenge.reward.gems} 💎
          </Typography>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.gold,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
  });
}
