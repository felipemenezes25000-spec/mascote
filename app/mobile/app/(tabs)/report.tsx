import { Typography } from '@/components/ui';
/**
 * Aba "Relatório" — quarta tab do handoff.
 * Mostra heatmap + stats da semana + link pra relatório completo.
 */

import { router, useFocusEffect, Redirect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { HabitChart } from '@/components/HabitChart';
import { Heatmap } from '@/components/Heatmap';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import { addDays, checkins, todayLocal, xpEvents } from '@/lib/db';
import { isStreakMilestone, nextMilestone } from '@/lib/share';
import { daysToNextMilestone } from '@/lib/format/plural';
import { Button } from '@/components/Button';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { buildWeeklyInsightLite } from '@/lib/weekly-insight-lite';
import { useStyles, useTheme } from '@/lib/useTheme';
import { color as dsColor } from '@/design-system/tokens';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';
import type { Checkin, HabitKind } from '@/types';

export default function ReportTab() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const { tier } = useSubscriptionTier();
  const isPremium = tier !== 'free';
  const heatmapWeeks = isPremium ? 12 : 4;
  const [all, setAll] = useState<Checkin[]>([]);
  const [countsByDate, setCountsByDate] = useState<Record<string, number>>({});
  const [totalXp, setTotalXp] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void (async () => {
        const allCheckins = await checkins.listAll(profile.id);
        setAll(allCheckins);
        const today = todayLocal();
        const start84 = addDays(today, -83);
        const grouped: Record<string, number> = {};
        for (const c of allCheckins) {
          if (c.occurred_on < start84) continue;
          grouped[c.occurred_on] = (grouped[c.occurred_on] ?? 0) + 1;
        }
        setCountsByDate(grouped);
        setTotalXp(await xpEvents.total(profile.id));
      })();
    }, [profile?.id])
  );

  if (!profile || !mascot) return <Redirect href="/splash" />;

  const today = todayLocal();
  const weekStart = addDays(today, -6);
  const weekCheckins = all.filter(c => c.occurred_on >= weekStart && c.occurred_on <= today);
  const weekCount = weekCheckins.length;
  const habitsThisWeek = new Set(weekCheckins.map(c => c.habit_kind));
  const xpThisWeek = weekCheckins.reduce((s, c) => s + c.xp_awarded, 0);

  const habitCounts: Record<string, number> = {};
  for (const c of weekCheckins) {
    habitCounts[c.habit_kind] = (habitCounts[c.habit_kind] ?? 0) + (c.value ?? 1);
  }
  const topHabits = Object.entries(habitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k as HabitKind);

  const weeklyInsight = buildWeeklyInsightLite(
    weekCount,
    habitsThisWeek.size,
    streak?.current_streak ?? 0,
    mascot?.name,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StaggeredView index={0}>
          <Typography variant="body" accessibilityRole="header" style={styles.h1}>Relatório</Typography>
        </StaggeredView>

        <StaggeredView index={1}>
          <View style={styles.statsRow}>
            <Stat icon="check" label="check-ins" value={`${weekCount}`} sub="essa semana" />
            <Stat icon="target" label="variedade" value={`${habitsThisWeek.size}/9`} sub="hábitos" />
            <Stat icon="zap" label="XP" value={`${xpThisWeek}`} sub="essa semana" />
            <Stat icon="flame" label="streak" value={`${streak?.current_streak ?? 0}d`} sub="atual" />
          </View>
        </StaggeredView>

        {weekCount === 0 && (
          <StaggeredView index={2}>
            <Card variant="elevated" padding="md" style={styles.emptyCard}>
              <Typography variant="body" style={styles.emptyTitle}>Sem check-ins nesta semana</Typography>
              <Typography variant="body" style={styles.emptyBody}>
                Quando quiser retomar, um check-in curto já começa a preencher seu mapa.
              </Typography>
              <Button variant="secondary" label="Fazer check-in" onPress={() => router.push('/checkin')} />
            </Card>
          </StaggeredView>
        )}

        <StaggeredView index={2}>
          <Card variant="elevated" padding="md" style={styles.insightCard}>
            <View style={styles.cardHeader}>
              <Icon name="sparkles" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
              <Typography variant="body" style={styles.cardTitle}>Insight da semana</Typography>
            </View>
            <Typography variant="body" style={styles.insightBody}>{weeklyInsight}</Typography>
          </Card>
        </StaggeredView>

        <StaggeredView index={3}>
          <Card variant="elevated" padding="md" style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="calendar" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
              <Typography variant="body" style={styles.cardTitle}>
                {isPremium ? 'Últimas 12 semanas' : 'Últimas 4 semanas'}
              </Typography>
            </View>
            <Heatmap countsByDate={countsByDate} weeks={heatmapWeeks} />
            {!isPremium && (
              <View style={styles.plusHint}>
                <Typography variant="body" style={styles.plusHintText}>
                  Plus expande para 12 semanas + relatório narrativo completo
                </Typography>
                <Pressable
                  onPress={() => router.push('/paywall')}
                  accessibilityRole="link"
                  accessibilityLabel="Conhecer Plus"
                >
                  <Typography variant="body" style={styles.plusLink}>Conhecer →</Typography>
                </Pressable>
              </View>
            )}
          </Card>
        </StaggeredView>

        {topHabits.length > 0 && (
          <StaggeredView index={4}>
            <View style={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
              <View style={styles.sectionHeader}>
                <Icon name="trophy" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
                <Typography variant="body" style={styles.sectionTitle}>Top hábitos da semana</Typography>
              </View>
              {topHabits.map(k => {
                const habCheckins = weekCheckins.filter(c => c.habit_kind === k);
                return <HabitChart key={k} kind={k} checkins={habCheckins} days={7} />;
              })}
            </View>
          </StaggeredView>
        )}

        <StaggeredView index={5}>
          <PressableScale
            style={styles.bigBtn}
            onPress={() => router.push('/weekly-report')}
            accessibilityRole="button"
            accessibilityLabel="Ver relatório completo"
          >
            <Icon name="bar-chart" size={16} color={theme.tokens.semantic.inkOnBrand} strokeWidth={2.4} />
            <Typography variant="body" style={styles.bigBtnText}>Ver relatório narrativo completo</Typography>
            <Icon name="arrow-right" size={16} color={theme.tokens.semantic.inkOnBrand} strokeWidth={2.4} />
          </PressableScale>
        </StaggeredView>

        <StaggeredView index={6}>
          {(() => {
            const cur = streak?.current_streak ?? 0;
            const milestone = isStreakMilestone(cur);
            const next = nextMilestone(cur);
            const headline = milestone
              ? `${cur} dias! Convida alguém pra essa jornada?`
              : next
                ? `${daysToNextMilestone(next - cur)} — bora junto?`
                : 'Conta pra alguém que precisa cuidar de si';
            return (
              <PressableScale
                style={styles.shareBtn}
                onPress={() => router.push('/share')}
                accessibilityRole="button"
                accessibilityLabel="Compartilhar ou convidar amigo"
              >
                <Icon name="heart" size={14} color={theme.colors.primary} strokeWidth={2.4} />
                <Typography variant="body" style={styles.shareBtnText}>{headline}</Typography>
                <Icon name="arrow-right" size={14} color={theme.colors.primary} strokeWidth={2.4} />
              </PressableScale>
            );
          })()}
        </StaggeredView>

        <StaggeredView index={7}>
          <Typography variant="body" style={styles.totalXp}>Total acumulado · {totalXp} XP</Typography>
          <Typography variant="body" style={styles.disclaimer}>
            Gerado localmente. Nada saiu do seu dispositivo.
          </Typography>
        </StaggeredView>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub: string }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statIconWrap}>
        <Icon name={icon} size={12} color={theme.colors.primary} strokeWidth={2.4} />
      </View>
      <Typography variant="body" style={styles.statValue}>{value}</Typography>
      <Typography variant="body" style={styles.statLabel}>{label}</Typography>
      <Typography variant="body" style={styles.statSub}>{sub}</Typography>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: { paddingTop: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
    h1: {
      ...theme.text.h1,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.lg,
      fontSize: 32,
      letterSpacing: -0.6,
    },
    statsRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, flexWrap: 'wrap' },
    stat: {
      flex: 1,
      minWidth: 70,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: 4,
      ...theme.shadow.sm,
    },
    statIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      ...theme.text.h2,
      color: theme.colors.text,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.3,
    },
    statLabel: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontSize: 9.5,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    statSub: { fontSize: 10, color: theme.colors.textDim, fontStyle: 'italic' },
    card: {
      marginHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
    },
    bigBtn: {
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'center',
      ...theme.shadow.md,
    },
    shareBtn: {
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primaryTint,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + dsColor.alpha20,
    },
    shareBtnText: {
      ...theme.text.bodyBold,
      color: theme.colors.primary,
      flex: 1,
      textAlign: 'center',
      fontSize: 13,
    },
    insightCard: {
      marginHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    insightBody: {
      ...theme.text.body,
      color: theme.colors.text,
      lineHeight: 22,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 16,
    },
    bigBtnText: {
      color: theme.tokens.semantic.inkOnBrand,
      fontWeight: '700',
      fontSize: 14.5,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.1,
      flex: 1,
      textAlign: 'center',
    },
    totalXp: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      letterSpacing: -0.2,
    },
    disclaimer: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      textAlign: 'center',
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      marginTop: 4,
    },
    plusHint: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    plusHintText: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      flex: 1,
      fontStyle: 'italic',
    },
    plusLink: {
      ...theme.text.sm,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    emptyCard: {
      marginHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
    },
    emptyBody: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      lineHeight: 19,
    },
  });
}
