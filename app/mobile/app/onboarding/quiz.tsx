import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { personalities } from '@/content/personalities';
import { useStyles, useTheme } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

import { Typography } from '@/components/ui';
interface QuizOption {
  label: string;
  weights: Partial<Record<Personality, number>>;
}

interface QuizQ {
  question: string;
  options: QuizOption[];
}

// Por render (não módulo-level): t() pega o locale atual. Os pesos (weights)
// são dados fixos; só question/label traduzem.
function buildQuiz(): QuizQ[] {
  return [
    {
      question: t('onboarding.quiz.q1'),
      options: [
        { label: t('onboarding.quiz.q1_o1'), weights: { calmo: 2 } },
        { label: t('onboarding.quiz.q1_o2'), weights: { motivador: 2 } },
        { label: t('onboarding.quiz.q1_o3'), weights: { fofo: 2 } },
        { label: t('onboarding.quiz.q1_o4'), weights: { sabio: 2 } },
      ],
    },
    {
      question: t('onboarding.quiz.q2'),
      options: [
        { label: t('onboarding.quiz.q2_o1'), weights: { calmo: 2, sabio: 1 } },
        { label: t('onboarding.quiz.q2_o2'), weights: { motivador: 2 } },
        { label: t('onboarding.quiz.q2_o3'), weights: { fofo: 2 } },
        { label: t('onboarding.quiz.q2_o4'), weights: { sabio: 2 } },
      ],
    },
    {
      question: t('onboarding.quiz.q3'),
      options: [
        { label: t('onboarding.quiz.q3_o1'), weights: { calmo: 2, fofo: 1 } },
        { label: t('onboarding.quiz.q3_o2'), weights: { motivador: 2 } },
        { label: t('onboarding.quiz.q3_o3'), weights: { fofo: 2 } },
        { label: t('onboarding.quiz.q3_o4'), weights: { sabio: 2 } },
      ],
    },
    {
      question: t('onboarding.quiz.q4'),
      options: [
        { label: t('onboarding.quiz.q4_o1'), weights: { calmo: 2 } },
        { label: t('onboarding.quiz.q4_o2'), weights: { motivador: 2 } },
        { label: t('onboarding.quiz.q4_o3'), weights: { fofo: 2 } },
        { label: t('onboarding.quiz.q4_o4'), weights: { sabio: 2 } },
      ],
    },
  ];
}

export default function Quiz() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ age_band?: string; display_name?: string }>();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<Personality, number>>({
    calmo: 0,
    motivador: 0,
    fofo: 0,
    sabio: 0,
  });
  const [showResult, setShowResult] = useState(false);
  const quiz = buildQuiz();

  function answer(opt: QuizOption) {
    const next: Record<Personality, number> = { ...scores };
    for (const [k, v] of Object.entries(opt.weights)) {
      next[k as Personality] += v ?? 0;
    }
    setScores(next);
    if (step + 1 < quiz.length) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  }

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] as Personality;

  if (showResult) {
    const meta = personalities.find(p => p.id === winner)!;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.mascotWrap}>
            <Mascot personality={winner} phase="ovo" mood="feliz" size={180} />
          </View>
          <View>
            <Typography variant="body" style={styles.kicker}>{t('onboarding.quiz.result_kicker')}</Typography>
            <Typography variant="body" style={styles.title}>{meta.label}</Typography>
            <Typography variant="body" style={styles.tagline}>{meta.tagline}</Typography>
            <Typography variant="body" style={styles.subtitle}>{meta.description}</Typography>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label={t('onboarding.quiz.cta_pick', meta.label)}
              onPress={() =>
                router.replace({
                  pathname: '/onboarding/goal',
                  params: { age_band: params.age_band ?? '', display_name: params.display_name ?? '' },
                })
              }
            />
            <Pressable
              onPress={() => router.replace('/onboarding/goal')}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.quiz.link_full_tour')}
            >
              <Typography variant="body" style={styles.linkText}>{t('onboarding.quiz.link_full_tour')}</Typography>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const q = quiz[step];
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ gap: theme.spacing.sm }}>
          <Typography variant="body" style={styles.kicker}>{t('onboarding.quiz.progress', step + 1, quiz.length)}</Typography>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${((step + 1) / quiz.length) * 100}%` }]} />
          </View>
          <Typography variant="body" style={styles.title}>{q.question}</Typography>
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          {q.options.map((opt, i) => (
            <Pressable
              key={i}
              onPress={() => answer(opt)}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              style={styles.opt}
            >
              <Typography variant="body" style={styles.optLabel}>{opt.label}</Typography>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => router.replace('/onboarding/goal')}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.quiz.link_skip')}
        >
          <Typography variant="body" style={styles.linkText}>{t('onboarding.quiz.link_skip')}</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  progress: { height: 6, backgroundColor: theme.colors.border, borderRadius: theme.radius.pill, overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary },
  title: { ...theme.text.h2, color: theme.colors.text },
  tagline: { ...theme.text.body, color: theme.colors.textSecondary, marginTop: 2 },
  subtitle: { ...theme.text.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, lineHeight: 18 },
  opt: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optLabel: { ...theme.text.body, color: theme.colors.text },
  linkText: { color: theme.colors.primary, textAlign: 'center', fontWeight: '600', paddingVertical: 6 },
  mascotWrap: { alignItems: 'center' },
});
}
