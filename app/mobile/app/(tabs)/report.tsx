/**
 * Aba "Relatório" — quarta tab do handoff.
 * Mostra heatmap + stats da semana + link pra relatório completo.
 */

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { HabitChart } from '@/components/HabitChart';
import { Heatmap } from '@/components/Heatmap';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import { habitMeta } from '@/content/missions';
import { addDays, checkins, todayLocal, xpEvents } from '@/lib/db';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';
import type { Checkin, HabitKind } from '@/types';

export default function ReportTab() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
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

  if (!profile || !mascot) return null;

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StaggeredView index={0}>
          <Text accessibilityRole="header" style={styles.h1}>Relatório</Text>
        </StaggeredView>

        <StaggeredView index={1}>
          <View style={styles.statsRow}>
            <Stat icon="check" label="check-ins" value={`${weekCount}`} sub="essa semana" />
            <Stat icon="target" label="variedade" value={`${habitsThisWeek.size}/9`} sub="hábitos" />
            <Stat icon="zap" label="XP" value={`${xpThisWeek}`} sub="essa semana" />
            <Stat icon="flame" label="streak" value={`${streak?.current_streak ?? 0}d`} sub="atual" />
          </View>
        </StaggeredView>

        <StaggeredView index={2}>
          <Card variant="elevated" padding="md" style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="calendar" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
              <Text style={styles.cardTitle}>Últimas 12 semanas</Text>
            </View>
            <Heatmap countsByDate={countsByDate} weeks={12} />
          </Card>
        </StaggeredView>

        {topHabits.length > 0 && (
          <StaggeredView index={3}>
            <View style={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
              <View style={styles.sectionHeader}>
                <Icon name="trophy" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
                <Text style={styles.sectionTitle}>Top hábitos da semana</Text>
              </View>
              {topHabits.map(k => {
                const habCheckins = weekCheckins.filter(c => c.habit_kind === k);
                return <HabitChart key={k} kind={k} checkins={habCheckins} days={7} />;
              })}
            </View>
          </StaggeredView>
        )}

        <StaggeredView index={4}>
          <PressableScale
            style={styles.bigBtn}
            onPress={() => router.push('/weekly-report')}
            accessibilityRole="button"
            accessibilityLabel="Ver relatório completo"
          >
            <Icon name="bar-chart" size={16} color="#fff" strokeWidth={2.4} />
            <Text style={styles.bigBtnText}>Ver relatório narrativo completo</Text>
            <Icon name="arrow-right" size={16} color="#fff" strokeWidth={2.4} />
          </PressableScale>
        </StaggeredView>

        <StaggeredView index={5}>
          <Text style={styles.totalXp}>Total acumulado · {totalXp} XP</Text>
          <Text style={styles.disclaimer}>
            Gerado localmente. Nada saiu do seu dispositivo.
          </Text>
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
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
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
    bigBtnText: {
      color: '#fff',
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
  });
}
