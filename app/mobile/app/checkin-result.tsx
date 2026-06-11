import { router, Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { MascotRenderer } from '@/components/MascotRenderer';
import { SceneBackground } from '@/components/SceneBackground';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { getPersonality } from '@/content/personalities';
import { habitMeta } from '@/content/missions';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import { applyCheckinFully } from '@/lib/checkin';
import { activeEventBoost } from '@/lib/events';
import type { Theme } from '@/lib/themes';
import type { HabitKind } from '@/types';

import { Typography } from '@/components/ui';
export default function CheckInResult() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const snapshot = useStore(s => s.lastCheckin);
  const clearLastCheckin = useStore(s => s.clearLastCheckin);
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
    if (!snapshot) return;
    // Defense-in-depth: o snapshot vem do nosso próprio /checkin, mas
    // mantemos o allow-list de HabitKind + bounds numéricos pra resistir
    // a refactors futuros que possam injetar dados externos no store.
    const valid: Record<string, number> = {};
    const ALLOWED: HabitKind[] = ['water', 'sleep', 'exercise', 'meditation', 'reading', 'journaling', 'breath', 'outdoor', 'sun'];
    for (const [k, v] of Object.entries(snapshot.answers)) {
      if (!ALLOWED.includes(k as HabitKind)) continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10_000) continue;
      valid[k] = v;
    }
    if (Object.keys(valid).length === 0) {
      // Snapshot vazio/corrompido — limpa e volta pra home (não Alert: o
      // usuário não disparou esse caminho conscientemente, é só refresh).
      clearLastCheckin();
      router.replace('/(tabs)');
      return;
    }
    setAnswers(valid);
    // Cleanup no unmount: limpa o snapshot pra próxima visita ao
    // /checkin-result (via refresh ou deep-link) cair no redirect ao invés
    // de mostrar dados de check-in antigo.
    return () => {
      clearLastCheckin();
    };
  }, [snapshot, clearLastCheckin]);

  useEffect(() => {
    if (persistedRef.current || answers === null) return;
    if (!profile || !mascot) return;
    persistedRef.current = true;
    let alive = true;
    void (async () => {
      let runningMascot = mascot;
      let totalXp = 0;
      let totalCoins = 0;
      // Calcula o boost UMA vez (relógio consistente pro lote inteiro de check-ins).
      const boost = activeEventBoost();
      for (const [kind, value] of Object.entries(answers)) {
        const out = await applyCheckinFully({
          profile,
          mascot: runningMascot,
          kind: kind as HabitKind,
          value,
          analyticsPath: 'mission',
          boost,
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
  // Refresh direto em /checkin-result sem snapshot no store: redireciona
  // pra home em vez de spinner infinito. O effect acima também limpa o
  // snapshot vazio caso o usuário chegue aqui via deep-link.
  if (!snapshot) return <Redirect href='/(tabs)' />;
  if (answers === null || persistedXp === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" accessibilityLabel="Salvando check-in" />
          <Typography variant="body" style={styles.subtitle}>Salvando seu check-in...</Typography>
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <SceneBackground sceneId="room" height={220}>
          <MascotRenderer
            personality={mascot.personality}
            phase={mascot.phase}
            mood={goodCount >= 3 ? 'empolgado' : 'feliz'}
            size={150}
          />
        </SceneBackground>

        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Typography variant="body" style={styles.title}>{meta.mascotName} sorriu.</Typography>
          <Typography variant="body" style={styles.subtitle}>
            {persistedXp > 0
              ? `+${persistedXp} XP · +${coinsGained} 🪙 · ${goodCount}/${Object.keys(answers).length} marcadores bons hoje`
              // Quando totalXp=0 é porque user já bateu o cap diário (150 XP)
              // antes do guided checkin. Copy honesta — fix auditoria 2026-05-27
              // que viu "+0 XP" e interpretou como bug. Não é bug: é cap.
              : `+${coinsGained} 🪙 · ${goodCount}/${Object.keys(answers).length} bons · XP do dia no máximo (cuidado em dobro)`}
          </Typography>
        </View>

        <View style={styles.list}>
          {Object.entries(answers).map(([k, v], i, arr) => {
            const m = habitMeta[k as HabitKind];
            const isLast = i === arr.length - 1;
            return (
              <View key={k} style={[styles.row, isLast && styles.rowLast]}>
                <Typography variant="body" style={styles.rowEmoji}>{m?.emoji}</Typography>
                <Typography variant="body" style={styles.rowLabel}>{m?.label}</Typography>
                <Typography variant="body" style={styles.rowValue}>{v}</Typography>
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
