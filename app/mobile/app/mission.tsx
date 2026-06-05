import { router, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { habitMeta } from '@/content/missions';
import { missions as missionsDb, todayLocal } from '@/lib/db';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';
import type { Mission } from '@/types';

import { Typography } from '@/components/ui';
export default function MissionDetail() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const [mission, setMission] = useState<Mission | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const list = await missionsDb.forDate(profile.id, todayLocal());
    setMission(list[0] ?? null);
    setLoaded(true);
  }

  if (!profile) return <Redirect href="/splash" />;

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <EmptyState
            emoji="🎯"
            title="Sem missão hoje"
            body="Faça um check-in na Home ou volte amanhã — uma nova missão aparece todo dia."
            ctaLabel="Ir pra Home"
            onCta={() => router.replace('/(tabs)')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const meta = habitMeta[mission.habit_kind];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Typography variant="body" style={styles.closeText}>←</Typography>
          </Pressable>
          <Typography variant="body" style={styles.kicker}>MISSÃO DE HOJE</Typography>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.lg }}>
          <Typography variant="body" style={styles.emoji}>{meta.emoji}</Typography>
          <Typography variant="body" style={styles.title}>{mission.title}</Typography>
          <View style={styles.xpBadge}>
            <Typography variant="body" style={styles.xpText}>+{mission.xp_reward} XP · +15 🪙</Typography>
          </View>
        </View>

        <View style={styles.card}>
          <Typography variant="body" style={styles.body}>{mission.description}</Typography>
        </View>

        <View style={styles.card}>
          <Typography variant="body" style={styles.sectionTitle}>Como contar</Typography>
          <Typography variant="body" style={styles.body}>
            • Faz o que tá na descrição.{'\n'}
            • Quando terminar, toca em "Marcar como feito".{'\n'}
            • Sem prova, sem cobrança. Honra própria.
          </Typography>
        </View>

        <View style={{ flexGrow: 1 }} />

        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label="Marcar como feito"
            onPress={() => router.replace({ pathname: '/mission-done', params: { mid: mission.id } })}
            disabled={mission.status === 'completed'}
          />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Vou tentar depois"
          >
            <Typography variant="body" style={styles.ghost}>Vou tentar depois</Typography>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md, flexGrow: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 18, color: theme.colors.text },
    kicker: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '800', letterSpacing: 1 },
    emoji: { fontSize: 64 },
    title: { ...theme.text.h2, color: theme.colors.text, textAlign: 'center' },
    xpBadge: { backgroundColor: theme.colors.primary + '15', paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: 999 },
    xpText: { ...theme.text.bodyBold, color: theme.colors.primary },
    card: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.sm },
    sectionTitle: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    body: { ...theme.text.body, color: theme.colors.text, lineHeight: 22 },
    ghost: { textAlign: 'center', ...theme.text.body, color: theme.colors.textSecondary, paddingVertical: 8 },
  });
}
