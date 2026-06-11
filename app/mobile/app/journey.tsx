import { Typography } from '@/components/ui';
/**
 * Mapa da Jornada — 100 fases em 10 mundos.
 *
 * A tela responde 3 perguntas em ordem: onde estou, o que falta pra próxima
 * fase, o que vem depois. Mundo atual abre expandido; os outros expandem
 * por toque. Mundos 9-10 (premium) usam teaser ético: recompensas ficam
 * GUARDADAS pro free, nunca perdidas.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analytics } from '@/analytics';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/design-system';
import {
  catalogMilestones,
  journeyPhaseFromXp,
  journeyProgress,
  phasesForWorld,
  worldMap,
} from '@/game/journey';
import { formDisplayName, formForWorld, mascotFormFromXp, nextFormTeaser } from '@/game/journey/forms';
import { almostThereLine, PREMIUM_WORLD_TEASER } from '@/content/journey-copy';
import { UPCOMING_MINIGAMES } from '@/game/minigames/registry';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

export default function JourneyScreen() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const mascot = useStore(s => s.mascot);
  const { tier } = useSubscriptionTier();
  const xp = mascot?.xp ?? 0;
  const prog = journeyProgress(xp);
  const current = journeyPhaseFromXp(xp);
  const map = worldMap(xp);
  const milestones = catalogMilestones();
  const form = mascotFormFromXp(xp);
  const formName = formDisplayName(xp, mascot?.dna);
  const nextForm = nextFormTeaser(xp);
  const [expandedWorld, setExpandedWorld] = useState<number>(prog.world.id);

  useEffect(() => {
    analytics.track('journey_map_viewed', { phase: current.n, world: current.worldId });
    // Só no mount — re-render por XP não é "nova visualização".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showLegendaryTeaser = tier === 'free' && current.n > 80;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="back" title="Jornada" subtitle="100 fases · 10 mundos" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Onde estou */}
        <StaggeredView index={0}>
          <View style={[styles.heroCard, { borderColor: prog.world.hue }]}>
            <View style={styles.heroTop}>
              <Typography variant="display">{prog.world.emoji}</Typography>
              <View style={{ flex: 1 }}>
                <Typography variant="heading">{prog.world.name}</Typography>
                <Typography variant="caption" tone="secondary">
                  Fase {prog.phase.n} de 100 · {prog.phase.title}
                </Typography>
              </View>
            </View>
            <ProgressBar
              value={prog.progress * 100}
              max={100}
              color={prog.world.hue}
              height={10}
            />
            <Typography variant="caption" tone="secondary">
              {almostThereLine(prog)}
            </Typography>
            <View style={styles.formRow}>
              <Typography variant="caption" style={{ color: prog.world.hue, fontWeight: '700' }}>
                🧬 Forma {formName}
              </Typography>
              <Typography variant="mono" tone="dim" numberOfLines={1} style={{ flex: 1 }}>
                {form.trait}
              </Typography>
            </View>
            {nextForm && (
              <Typography variant="mono" tone="secondary">
                Próxima forma na Fase {nextForm.atPhase}: {nextForm.name} — {nextForm.trait}
              </Typography>
            )}
          </View>
        </StaggeredView>

        {/* Recompensas guardadas (teaser ético dos mundos premium) */}
        {showLegendaryTeaser && (
          <StaggeredView index={1}>
            <View style={styles.legendaryCard}>
              <Typography variant="bodyBold">🌌 Recompensas guardadas</Typography>
              <Typography variant="caption" tone="secondary">
                {PREMIUM_WORLD_TEASER}
              </Typography>
              <Button
                label="Conhecer o Plus"
                onPress={() =>
                  router.push({ pathname: '/paywall', params: { trigger: 'journey_legendary' } })
                }
              />
            </View>
          </StaggeredView>
        )}

        {/* Os 10 mundos */}
        {map.map(({ world, state }, i) => {
          const expanded = expandedWorld === world.id;
          const phases = phasesForWorld(world.id);
          const worldMilestones = milestones.filter(
            m => m.phaseN >= world.firstPhase && m.phaseN <= world.lastPhase,
          );
          return (
            <StaggeredView key={world.id} index={Math.min(2 + i, 8)}>
              <View
                style={[
                  styles.worldCard,
                  state === 'current' && { borderColor: world.hue, borderWidth: 2 },
                  state === 'locked' && styles.worldLocked,
                ]}
              >
                <PressableScale
                  onPress={() => setExpandedWorld(expanded ? 0 : world.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mundo ${world.id}: ${world.name}, ${
                    state === 'completed' ? 'completo' : state === 'current' ? 'atual' : 'a desbloquear'
                  }. ${expanded ? 'Toque pra recolher' : 'Toque pra expandir'}.`}
                  accessibilityState={{ expanded }}
                  style={styles.worldHeader}
                >
                  <Typography variant="heading">{world.emoji}</Typography>
                  <View style={{ flex: 1 }}>
                    <View style={styles.worldTitleRow}>
                      <Typography variant="bodyBold">
                        {world.id}. {world.name}
                      </Typography>
                      {world.premium && (
                        <View style={styles.plusBadge}>
                          <Typography variant="mono" tone="inkOnBrand" style={{ fontWeight: '700' }}>
                            PLUS
                          </Typography>
                        </View>
                      )}
                    </View>
                    <Typography variant="caption" tone="secondary" numberOfLines={expanded ? 3 : 1}>
                      {state === 'locked'
                        ? `Começa na fase ${world.firstPhase} · ${world.theme}`
                        : world.theme}
                    </Typography>
                  </View>
                  <Typography variant="heading" tone={state === 'completed' ? 'success' : 'dim'}>
                    {state === 'completed' ? '✓' : state === 'current' ? '•' : '🔒'}
                  </Typography>
                </PressableScale>

                {expanded && (
                  <View style={styles.phaseList}>
                    <Typography variant="caption" tone="secondary" style={styles.worldIntro}>
                      {world.intro}
                    </Typography>
                    {world.id > 1 && (
                      <Typography variant="mono" style={{ color: world.hue, fontWeight: '700' }}>
                        🧬 Forma {formForWorld(world.id).name} — {formForWorld(world.id).trait}
                      </Typography>
                    )}
                    {phases.map(p => {
                      const done = current.n > p.n || (current.n === p.n && prog.progress >= 1);
                      const isCurrent = current.n === p.n;
                      const milestone = milestones.find(m => m.phaseN === p.n);
                      return (
                        <View
                          key={p.n}
                          style={[styles.phaseRow, isCurrent && { backgroundColor: `${world.hue}1A` }]}
                        >
                          <Typography
                            variant="mono"
                            tone={done ? 'success' : isCurrent ? 'brand' : 'dim'}
                            style={styles.phaseNum}
                          >
                            {done ? '✓' : p.n}
                          </Typography>
                          <View style={{ flex: 1 }}>
                            <Typography
                              variant={isCurrent ? 'bodyBold' : 'body'}
                              tone={done || isCurrent ? 'default' : 'secondary'}
                            >
                              {p.title}
                            </Typography>
                            <Typography variant="mono" tone="dim">
                              {p.reward.kind === 'chest' && '🎁 '}
                              {p.reward.kind === 'title' && '🏆 '}
                              {p.reward.kind === 'minigame' && '🎮 '}
                              {p.reward.label}
                              {!done && !isCurrent && ` · ${p.xp} XP`}
                            </Typography>
                            {milestone && (
                              <Typography variant="mono" tone="dim">
                                {milestone.emoji} {milestone.name} · {milestone.unlockLabel}
                              </Typography>
                            )}
                          </View>
                          {isCurrent && (
                            <Typography variant="caption" tone="brand" style={{ fontWeight: '700' }}>
                              você está aqui
                            </Typography>
                          )}
                        </View>
                      );
                    })}
                    {worldMilestones.length > 0 && state === 'locked' && (
                      <Typography variant="mono" tone="dim">
                        Nessa região: {worldMilestones.map(m => m.emoji).join(' ')}
                      </Typography>
                    )}
                  </View>
                )}
              </View>
            </StaggeredView>
          );
        })}

        {/* Teaser honesto de minigames futuros — texto, sem botão morto */}
        <View style={styles.upcomingCard}>
          <Typography variant="bodyBold">Minigames chegando com os próximos mundos</Typography>
          {UPCOMING_MINIGAMES.map(u => (
            <Typography key={u.name} variant="caption" tone="secondary">
              {u.emoji} {u.name} — {u.tagline} (Mundo {u.plannedWorld} · em breve)
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
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 2,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    formRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    legendaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    worldCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    worldLocked: { opacity: 0.72 },
    worldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    worldTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    plusBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    phaseList: { gap: theme.spacing.sm, marginTop: theme.spacing.xs },
    worldIntro: { fontStyle: 'italic' },
    phaseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    phaseNum: { width: 24, textAlign: 'center', fontWeight: '700' },
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
