import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { habitMeta } from '@/content/missions';
import { useTheme } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';
import type { HabitKind } from '@/types';

import { Typography } from '@/components/ui';
type CheckinQuestion = { kind: HabitKind; q: string; options: { label: string; value: number }[] };

// Construído POR RENDER (não módulo-level): t() tem que ser avaliado com o
// locale atual. No topo do módulo, congelaria no idioma do import.
function buildQuestions(): CheckinQuestion[] {
  return [
    { kind: 'sleep', q: t('checkin.q_sleep'), options: [{ label: '< 5h', value: 4 }, { label: '5–6h', value: 6 }, { label: '7–8h', value: 7 }, { label: '> 8h', value: 9 }] },
    { kind: 'water', q: t('checkin.q_water'), options: [{ label: '0–1', value: 1 }, { label: '2–3', value: 3 }, { label: '4–6', value: 5 }, { label: '7+', value: 7 }] },
    { kind: 'exercise', q: t('checkin.q_exercise'), options: [{ label: t('checkin.opt_exercise_none'), value: 0 }, { label: '< 10min', value: 5 }, { label: '10–30min', value: 20 }, { label: '> 30min', value: 45 }] },
    { kind: 'breath', q: t('checkin.q_breath'), options: [{ label: t('checkin.opt_breath_calm'), value: 1 }, { label: t('checkin.opt_breath_ok'), value: 2 }, { label: t('checkin.opt_breath_tense'), value: 3 }, { label: t('checkin.opt_breath_panic'), value: 4 }] },
  ];
}

export default function CheckIn() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const QUESTIONS = buildQuestions();

  function pick(value: number) {
    const q = QUESTIONS[step];
    setAnswers(prev => ({ ...prev, [q.kind]: value }));
    if (step + 1 < QUESTIONS.length) setStep(step + 1);
    else {
      // Payload sai da URL (`?data=...`) e vai pro store efêmero. Motivos:
      // (1) deep-link malicioso podia injetar JSON arbitrário; (2) URLs com
      // payload acabam em logs/web history; (3) tamanho de query string tem
      // limite. `clearLastCheckin` no unmount de /checkin-result evita reuso
      // stale do snapshot em navegações futuras.
      const finalAnswers = { ...answers, [q.kind]: value } as Record<HabitKind, number>;
      useStore.getState().setLastCheckin({ answers: finalAnswers, timestamp: Date.now() });
      router.replace('/checkin-result');
    }
  }

  const q = QUESTIONS[step];
  const meta = habitMeta[q.kind];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={t('checkin.back')}
          >
            <Typography variant="body" style={styles.closeText}>←</Typography>
          </Pressable>
          <Typography variant="body" style={styles.kicker}>{t('checkin.kicker')} {step + 1}/{QUESTIONS.length}</Typography>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((step + 1) / QUESTIONS.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, flexGrow: 1 }}>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: theme.spacing.lg }}>
            <Typography variant="body" style={styles.emoji}>{meta.emoji}</Typography>
            <Typography variant="body" style={styles.title}>{q.q}</Typography>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            {q.options.map(o => (
              <Pressable
                key={o.label}
                style={styles.opt}
                onPress={() => pick(o.value)}
                accessibilityRole="button"
                accessibilityLabel={o.label}
              >
                <Typography variant="body" style={styles.optLabel}>{o.label}</Typography>
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
