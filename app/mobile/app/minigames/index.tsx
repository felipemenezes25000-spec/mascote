import { Typography } from '@/components/ui';
/**
 * Hub de minigames — lista os jogos com estado de unlock (derivado puro do
 * XP via fase da jornada) e partidas recompensadas restantes hoje.
 *
 * Jogo bloqueado mostra a fase que desbloqueia (antecipação), nunca um
 * botão morto. Jogos futuros são teaser textual explícito "em breve".
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { journeyPhaseFromXp } from '@/game/journey';
import { MINIGAMES, UPCOMING_MINIGAMES } from '@/game/minigames/registry';
import { rewardedPlaysLeftToday } from '@/game/minigames/service';
import { useStyles } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

export default function MinigamesHub() {
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const currentPhase = journeyPhaseFromXp(mascot?.xp ?? 0).n;
  const [playsLeft, setPlaysLeft] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void (async () => {
        const entries = await Promise.all(
          MINIGAMES.map(async m => [m.id, await rewardedPlaysLeftToday(profile.id, m.id)] as const),
        );
        setPlaysLeft(Object.fromEntries(entries));
      })();
    }, [profile?.id]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="back" title="Minigames" subtitle="cuidar também é brincar" />
      <ScrollView contentContainerStyle={styles.container}>
        {MINIGAMES.map((m, i) => {
          const unlocked = currentPhase >= m.unlockPhase;
          const left = playsLeft[m.id];
          return (
            <StaggeredView key={m.id} index={i}>
              {unlocked ? (
                <PressableScale
                  onPress={() => router.push(m.route as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`Jogar ${m.name}. ${m.tagline}`}
                  style={styles.gameCard}
                >
                  <Typography variant="display">{m.emoji}</Typography>
                  <View style={{ flex: 1 }}>
                    <Typography variant="bodyBold">{m.name}</Typography>
                    <Typography variant="caption" tone="secondary">{m.tagline}</Typography>
                    <Typography variant="mono" tone="dim">
                      ~{m.roundSeconds}s por partida
                      {typeof left === 'number' &&
                        (left > 0
                          ? ` · ${left} ${left === 1 ? 'recompensa' : 'recompensas'} hoje`
                          : ' · recompensas voltam amanhã (jogue à vontade)')}
                    </Typography>
                  </View>
                  <Typography variant="heading" tone="brand">▶</Typography>
                </PressableScale>
              ) : (
                <View style={[styles.gameCard, styles.gameLocked]}>
                  <Typography variant="display">🔒</Typography>
                  <View style={{ flex: 1 }}>
                    <Typography variant="bodyBold">{m.name}</Typography>
                    <Typography variant="caption" tone="secondary">{m.tagline}</Typography>
                    <Typography variant="mono" tone="brand">
                      Desbloqueia na Fase {m.unlockPhase} da Jornada
                    </Typography>
                  </View>
                </View>
              )}
            </StaggeredView>
          );
        })}

        <View style={styles.upcomingCard}>
          <Typography variant="bodyBold">Em breve</Typography>
          {UPCOMING_MINIGAMES.slice(0, 4).map(u => (
            <Typography key={u.name} variant="caption" tone="secondary">
              {u.emoji} {u.name} — chega com o Mundo {u.plannedWorld}
            </Typography>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    gameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadow.sm,
    },
    gameLocked: { opacity: 0.72 },
    upcomingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: 6,
    },
  });
}
