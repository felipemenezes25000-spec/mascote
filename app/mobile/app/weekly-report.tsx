import { router, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { HabitChart } from '@/components/HabitChart';
import { Heatmap } from '@/components/Heatmap';
import { Mascot } from '@/components/Mascot';
import { PremiumFeatureGuard } from '@/components/PremiumFeatureGuard';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { addDays, checkins, messages as messagesDb, todayLocal } from '@/lib/db';
import { generateWeeklyReport } from '@/lib/weeklyReportGenerator';
import { computeInsights, type Insight } from '@/lib/insights';
import { loadStoredPersonalization, storedToPartial } from '@/lib/personalization-service';
import { entitlementService } from '@/services/subscription';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Checkin, HabitKind, Message } from '@/types';

export default function WeeklyReport() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const { tier, isPremium } = useSubscriptionTier();
  const [all, setAll] = useState<Checkin[]>([]);
  const [personalization, setPersonalization] = useState<ReturnType<typeof storedToPartial>>(undefined);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [countsByDate, setCountsByDate] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const [allCheckins, msgs] = await Promise.all([
      checkins.listAll(profile.id),
      messagesDb.listAll(profile.id),
    ]);
    setAll(allCheckins);
    setAllMessages(msgs);
    const today = todayLocal();
    const start84 = addDays(today, -83);
    const grouped: Record<string, number> = {};
    for (const c of allCheckins) {
      if (c.occurred_on < start84) continue;
      grouped[c.occurred_on] = (grouped[c.occurred_on] ?? 0) + 1;
    }
    setCountsByDate(grouped);
    const stored = await loadStoredPersonalization(profile.id);
    setPersonalization(storedToPartial(stored));
  }

  async function shareReport() {
    if (!mascot || !entitlementService.canExportReport(tier)) {
      router.push({ pathname: '/paywall', params: { trigger: 'premium_feature' } });
      return;
    }
    const body = [
      narrative.greeting,
      narrative.evolutionNote,
      narrative.highlight,
      narrative.closing,
    ].join('\n\n');
    await Share.share({ message: `Relatório da semana — ${mascot.name}\n\n${body}` });
  }

  if (!profile || !mascot) return <Redirect href="/splash" />;

  // Stats da semana
  const today = todayLocal();
  const weekStart = addDays(today, -6);
  const prevWeekStart = addDays(today, -13);
  const prevWeekEnd = addDays(today, -7);
  const weekCheckins = all.filter(c => c.occurred_on >= weekStart && c.occurred_on <= today);
  const prevWeekCheckins = all.filter(c => c.occurred_on >= prevWeekStart && c.occurred_on <= prevWeekEnd);
  const weekCount = weekCheckins.length;
  const habitsThisWeek = new Set(weekCheckins.map(c => c.habit_kind));
  const xpThisWeek = weekCheckins.reduce((s, c) => s + c.xp_awarded, 0);

  const habitCounts: Record<string, number> = {};
  for (const c of weekCheckins) {
    habitCounts[c.habit_kind] = (habitCounts[c.habit_kind] ?? 0) + (c.value ?? 1);
  }
  const sortedHabits = Object.entries(habitCounts).sort((a, b) => b[1] - a[1]);

  // Nova narrativa (carta do mascote)
  const narrative = generateWeeklyReport({
    mascot,
    checkins: weekCheckins,
    prevWeekCheckins,
    allCheckins: all,
    streak,
    personalization,
  });

  const fullReport = entitlementService.canViewFullWeeklyReport(tier);

  // Insights longitudinais (correlações hábito × humor) — usa últimos 30 dias
  const start30 = addDays(today, -29);
  const last30Checkins = all.filter(c => c.occurred_on >= start30);
  const last30Messages = allMessages.filter(m => m.created_at.slice(0, 10) >= start30);
  const insights: Insight[] = computeInsights({
    checkins: last30Checkins,
    messages: last30Messages,
  });

  // Charts: top 4 hábitos da semana
  const topHabitsForCharts = sortedHabits.slice(0, 4).map(([k]) => k as HabitKind);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar relatório semanal"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Você essa semana</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Carta narrativa do mascote — 5 blocos pequenos */}
        <View style={styles.letterBox}>
          <View style={styles.letterHeader}>
            <Mascot
              personality={mascot.personality}
              phase={mascot.phase}
              mood="feliz"
              size={64}
              reduceMotion
            />
            <View>
              <Text style={styles.letterKicker}>CARTA DA SEMANA</Text>
              <Text style={styles.letterFrom}>— {mascot.name}</Text>
            </View>
          </View>
          <Text style={styles.letterGreeting}>{narrative.greeting}</Text>
          <Text style={styles.letterBody}>{narrative.evolutionNote}</Text>
          <Text style={styles.letterBody}>{narrative.highlight}</Text>
          {fullReport ? (
            <>
              <Text style={styles.letterBody}>{narrative.observation}</Text>
              <Text style={styles.letterBody}>{narrative.nudge}</Text>
            </>
          ) : (
            <Text style={styles.letterBody}>
              Plus desbloqueia observações profundas, heatmap e exportação — sem pressa.
            </Text>
          )}
          <Text style={styles.letterClosing}>{narrative.closing}</Text>
        </View>

        {!fullReport && (
          <View style={styles.previewBanner}>
            <Text style={styles.previewText}>Prévia gratuita · relatório completo no Plus</Text>
            <Button variant="secondary" label="Ver Plus" onPress={() => router.push('/paywall')} />
          </View>
        )}

        <PremiumFeatureGuard tier={tier} feature="report">
        {/* Insights longitudinais — só aparece se houver descobertas */}
        {insights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>O que {mascot.name} percebeu</Text>
            {insights.map((ins, i) => (
              <View key={i} style={styles.insightRow}>
                <Text style={styles.insightBullet}>·</Text>
                <Text style={styles.insightText}>{ins.text}</Text>
              </View>
            ))}
            <Text style={styles.insightDisclaimer}>
              Observações do seu padrão. Não é diagnóstico.
            </Text>
          </View>
        )}

        {/* Stats grid */}
        <View style={styles.statsRow}>
          <Stat label="Check-ins" value={`${weekCount}`} />
          <Stat label="Variedade" value={`${habitsThisWeek.size}/9`} />
          <Stat label="XP semana" value={`${xpThisWeek}`} />
          <Stat label="Streak" value={`${streak?.current_streak ?? 0}d`} />
        </View>

        {/* Heatmap */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Últimas 12 semanas</Text>
          <Heatmap countsByDate={countsByDate} weeks={12} />
        </View>

        {/* Charts por hábito */}
        {topHabitsForCharts.length > 0 && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={styles.sectionTitleOutside}>Hábitos da semana</Text>
            {topHabitsForCharts.map(k => {
              const habCheckins = weekCheckins.filter(c => c.habit_kind === k);
              return <HabitChart key={k} kind={k} checkins={habCheckins} days={7} />;
            })}
          </View>
        )}

        </PremiumFeatureGuard>

        {isPremium && (
          <Button label="Compartilhar relatório" variant="secondary" onPress={() => void shareReport()} />
        )}

        <Text style={styles.footer}>
          Relatório gerado localmente, com base no que você registrou. Nada saiu do seu dispositivo.
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}


function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeText: { fontSize: 16, color: theme.colors.text },
  headerTitle: { ...theme.text.h3, color: theme.colors.text },
  scroll: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  heroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroKicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 0.6 },
  heroText: { ...theme.text.body, color: theme.colors.text, lineHeight: 22 },
  letterBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  letterKicker: {
    ...theme.text.xs,
    color: theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  letterFrom: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  letterGreeting: {
    ...theme.text.bodyBold,
    color: theme.colors.text,
    lineHeight: 24,
  },
  letterBody: {
    ...theme.text.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  letterClosing: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 22,
  },
  insightRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  insightBullet: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  insightText: {
    flex: 1,
    ...theme.text.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  insightDisclaimer: {
    ...theme.text.xs,
    color: theme.colors.textDim,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  stat: {
    flex: 1,
    minWidth: 70,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { ...theme.text.h3, color: theme.colors.text },
  statLabel: { ...theme.text.xs, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTitleOutside: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    ...theme.text.xs,
    color: theme.colors.textDim,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  previewBanner: {
    backgroundColor: theme.colors.primaryTint,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary + '44',
  },
  previewText: { ...theme.text.sm, color: theme.colors.text, lineHeight: 20 },
});
}
