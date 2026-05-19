import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { habitMeta } from '@/content/missions';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { HabitKind } from '@/types';

const QUESTIONS: { kind: HabitKind; q: string; options: { label: string; value: number }[] }[] = [
  { kind: 'sleep', q: 'Quantas horas você dormiu?', options: [{ label: '< 5h', value: 4 }, { label: '5–6h', value: 6 }, { label: '7–8h', value: 7 }, { label: '> 8h', value: 9 }] },
  { kind: 'water', q: 'Quantos copos de água até agora?', options: [{ label: '0–1', value: 1 }, { label: '2–3', value: 3 }, { label: '4–6', value: 5 }, { label: '7+', value: 7 }] },
  { kind: 'exercise', q: 'Movimento hoje?', options: [{ label: 'Nada', value: 0 }, { label: '< 10min', value: 5 }, { label: '10–30min', value: 20 }, { label: '> 30min', value: 45 }] },
  { kind: 'breath', q: 'Como tá o nervo?', options: [{ label: 'Calmo', value: 1 }, { label: 'OK', value: 2 }, { label: 'Tenso', value: 3 }, { label: 'Surtando', value: 4 }] },
];

export default function CheckIn() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  function pick(value: number) {
    const q = QUESTIONS[step];
    setAnswers(prev => ({ ...prev, [q.kind]: value }));
    if (step + 1 < QUESTIONS.length) setStep(step + 1);
    else {
      const payload = JSON.stringify({ ...answers, [q.kind]: value });
      router.replace({ pathname: '/checkin-result', params: { data: payload } });
    }
  }

  const q = QUESTIONS[step];
  const meta = habitMeta[q.kind];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
            <Text style={styles.closeText}>←</Text>
          </Pressable>
          <Text style={styles.kicker}>CHECK-IN {step + 1}/{QUESTIONS.length}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((step + 1) / QUESTIONS.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, flexGrow: 1 }}>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: theme.spacing.lg }}>
            <Text style={styles.emoji}>{meta.emoji}</Text>
            <Text style={styles.title}>{q.q}</Text>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            {q.options.map(o => (
              <Pressable key={o.label} style={styles.opt} onPress={() => pick(o.value)}>
                <Text style={styles.optLabel}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, gap: theme.spacing.md },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 18, color: theme.colors.text },
    kicker: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '800', letterSpacing: 1 },
    progress: { height: 6, backgroundColor: theme.colors.border, borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: theme.colors.primary },
    emoji: { fontSize: 56 },
    title: { ...theme.text.h2, color: theme.colors.text, textAlign: 'center', marginTop: theme.spacing.sm },
    opt: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
    optLabel: { ...theme.text.body, color: theme.colors.text, fontWeight: '600' },
  });
}
