import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { MascotRenderer } from '@/components/MascotRenderer';
import { buildMomentPendingEvent } from '@/core/mascot-render-contract';
import { SceneBackground } from '@/components/SceneBackground';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { getPersonality } from '@/content/personalities';
import { habitMeta } from '@/content/missions';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import { applyCheckinFully } from '@/lib/checkin';
import type { Theme } from '@/lib/themes';
import type { HabitKind } from '@/types';

export default function CheckInResult() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ data: string }>();
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshStreak = useStore(s => s.refreshStreak);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);

  const [answers, setAnswers] = useState<Record<string, number> | null>(null);
  const [persistedXp, setPersistedXp] = useState<number | null>(null);
  const [coinsGained, setCoinsGained] = useState(0);
  const persistedRef = useRef(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(params.data ?? '{}');
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('JSON inválido');
      }
      // Deep-link malicioso (`/checkin-result?data={"sleep":"DROP","x":NaN}`)
      // passava direto pro applyCheckinFully. Filtra so chaves de HabitKind
      // conhecidas + valores numericos finitos positivos.
      const valid: Record<string, number> = {};
      const ALLOWED: HabitKind[] = ['water', 'sleep', 'exercise', 'meditation', 'reading', 'journaling', 'breath', 'outdoor', 'sun'];
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (!ALLOWED.includes(k as HabitKind)) continue;
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10_000) continue;
        valid[k] = v;
      }
      if (Object.keys(valid).length === 0) {
        throw new Error('Nenhum habito valido no payload');
      }
      setAnswers(valid);
    } catch {
      Alert.alert('Dados inválidos', 'Não consegui ler o check-in. Tente de novo.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [params.data]);

  useEffect(() => {
    if (persistedRef.current || answers === null) return;
    if (!profile || !mascot) return;
    persistedRef.current = true;
    let alive = true;
    void (async () => {
      let runningMascot = mascot;
      let totalXp = 0;
      let totalCoins = 0;
      for (const [kind, value] of Object.entries(answers)) {
        const out = await applyCheckinFully({
          profile,
          mascot: runningMascot,
          kind: kind as HabitKind,
          value,
          analyticsPath: 'mission',
        });
        if (!alive) return;
        runningMascot = out.mascot;
        totalXp += out.xpGained;
        totalCoins += out.coinsGained;
        for (const a of out.unlocks.achievements)
          enqueueToast({ kind: 'achievement', emoji: a.emoji, title: a.title, subtitle: a.description });
        for (const acc of out.unlocks.accessories)
          enqueueToast({ kind: 'accessory', emoji: acc.emoji, title: acc.name, subtitle: 'Equipe no Closet' });
        for (const sc of out.unlocks.scenes)
          enqueueToast({ kind: 'scene', emoji: sc.emoji, title: sc.name, subtitle: 'Cenário desbloqueado' });
      }
      if (!alive) return;
      setPersistedXp(totalXp);
      setCoinsGained(totalCoins);
      await refreshMascot();
      await refreshStreak();
      await refreshWallet();
    })();
    return () => {
      alive = false;
    };
  }, [profile?.id, mascot?.id, answers]);

  if (!mascot) return <Redirect href='/splash' />;
  if (answers === null || persistedXp === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" accessibilityLabel="Salvando check-in" />
          <Text style={styles.subtitle}>Salvando seu check-in...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const meta = getPersonality(mascot.personality);

  const goodCount = Object.entries(answers).filter(([k, v]) => {
    if (k === 'sleep') return v >= 7;
    if (k === 'water') return v >= 5;
    if (k === 'exercise') return v >= 20;
    if (k === 'breath') return v <= 2;
    return v > 0;
  }).length;

  const firstHabit = Object.keys(answers)[0] as HabitKind | undefined;
  const pendingEvent = firstHabit
    ? buildMomentPendingEvent({ habitKind: firstHabit, xpGained: persistedXp })
    : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <SceneBackground sceneId="room" height={220}>
          <MascotRenderer
            personality={mascot.personality}
            phase={mascot.phase}
            mood={goodCount >= 3 ? 'empolgado' : 'feliz'}
            size={150}
            unityContext={{ pendingEvent, sceneId: 'room' }}
          />
        </SceneBackground>

        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text style={styles.title}>{meta.mascotName} sorriu.</Text>
          <Text style={styles.subtitle}>
            +{persistedXp} XP · +{coinsGained} 🪙 · {goodCount}/{Object.keys(answers).length} marcadores bons hoje
          </Text>
        </View>

        <View style={styles.list}>
          {Object.entries(answers).map(([k, v], i, arr) => {
            const m = habitMeta[k as HabitKind];
            const isLast = i === arr.length - 1;
            return (
              <View key={k} style={[styles.row, isLast && styles.rowLast]}>
                <Text style={styles.rowEmoji}>{m?.emoji}</Text>
                <Text style={styles.rowLabel}>{m?.label}</Text>
                <Text style={styles.rowValue}>{v}</Text>
              </View>
            );
          })}
        </View>

        <Button label="Voltar pra Home" onPress={() => router.replace('/(tabs)')} />
        <ConfettiBurst visible={goodCount >= 3} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg },
    title: { ...theme.text.h1, color: theme.colors.text },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center' },
    list: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    rowLast: { borderBottomWidth: 0 },
    rowEmoji: { fontSize: 22 },
    rowLabel: { flex: 1, ...theme.text.body, color: theme.colors.text },
    rowValue: { ...theme.text.bodyBold, color: theme.colors.primary },
  });
}
