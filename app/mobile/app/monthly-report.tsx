import { router, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { PremiumFeatureGuard } from '@/components/PremiumFeatureGuard';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { addDays, checkins, todayLocal } from '@/lib/db';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
export default function MonthlyReport() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const { tier } = useSubscriptionTier();
  const [monthCheckins, setMonthCheckins] = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      const today = todayLocal();
      const monthStart = addDays(today, -29);
      const all = await checkins.listAll(profile.id);
      const month = all.filter(c => c.occurred_on >= monthStart);
      setMonthCheckins(month.length);
      setActiveDays(new Set(month.map(c => c.occurred_on)).size);
    })();
  }, [profile?.id]);

  if (!profile || !mascot) return <Redirect href="/splash" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar retrospectiva mensal"
        >
          <Typography variant="body" style={styles.closeText}>✕</Typography>
        </Pressable>
        <Typography variant="body" style={styles.headerTitle}>Retrospectiva do mês</Typography>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Mascot personality={mascot.personality} phase={mascot.phase} mood="feliz" size={80} reduceMotion />
          <Typography variant="body" style={styles.heroText}>
            {mascot.name} olhou os últimos 30 dias com carinho — {monthCheckins} cuidados em {activeDays} dias diferentes.
          </Typography>
        </View>

        <PremiumFeatureGuard tier={tier} feature="report">
          <View style={styles.card}>
            <Typography variant="body" style={styles.kicker}>MARCO MENSAL</Typography>
            <Typography variant="body" style={styles.body}>
              Streak atual: {streak?.current_streak ?? 0} dias · Nível {mascot.level}
            </Typography>
            <Typography variant="body" style={styles.body}>
              Uma transformação maior desbloqueia com constância gentil — Plus acelera visuais lendários e relatórios profundos.
            </Typography>
            <Button
              label="Ver evolução completa"
              variant="secondary"
              onPress={() => router.push('/(tabs)/evolution')}
            />
          </View>
        </PremiumFeatureGuard>

        <Pressable
          onPress={() => router.push('/weekly-report')}
          accessibilityRole="button"
          accessibilityLabel="Ver relatório semanal"
        >
          <Typography variant="body" style={{ color: theme.colors.primary, fontWeight: '600', textAlign: 'center' }}>
            Ver relatório semanal →
          </Typography>
        </Pressable>

        <Typography variant="body" style={styles.footer}>
          Retrospectiva local. Gráficos mensais completos no Plus.
        </Typography>
      </ScrollView>
    </SafeAreaView>
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
    scroll: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    heroText: { flex: 1, ...theme.text.body, color: theme.colors.text, lineHeight: 22 },
    card: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 0.6 },
    body: { ...theme.text.body, color: theme.colors.text, lineHeight: 22 },
    footer: { ...theme.text.xs, color: theme.colors.textDim, textAlign: 'center' },
  });
}
