import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { personalities } from '@/content/personalities';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

interface QuizOption {
  label: string;
  weights: Partial<Record<Personality, number>>;
}

interface QuizQ {
  question: string;
  options: QuizOption[];
}

const quiz: QuizQ[] = [
  {
    question: 'Quando você tá numa fase corrida, o que você mais precisa ouvir?',
    options: [
      { label: '"Respira, sem pressa."', weights: { calmo: 2 } },
      { label: '"Bora, uma coisa de cada vez!"', weights: { motivador: 2 } },
      { label: '"Eu fico aqui com você."', weights: { fofo: 2 } },
      { label: '"O que importa de verdade hoje?"', weights: { sabio: 2 } },
    ],
  },
  {
    question: 'Como você gosta de ser elogiado?',
    options: [
      { label: 'Em silêncio, com presença', weights: { calmo: 2, sabio: 1 } },
      { label: 'Com energia: "boa, mandou bem!"', weights: { motivador: 2 } },
      { label: 'Com carinho fofo, emojis 💛', weights: { fofo: 2 } },
      { label: 'Com uma pergunta que me faça notar a conquista', weights: { sabio: 2 } },
    ],
  },
  {
    question: 'Domingo à noite — que vibe combina mais com você?',
    options: [
      { label: 'Chá, pijama, silêncio', weights: { calmo: 2, fofo: 1 } },
      { label: 'Planejar a semana animado', weights: { motivador: 2 } },
      { label: 'Ligar pra alguém querido', weights: { fofo: 2 } },
      { label: 'Refletir sobre o que aprendi essa semana', weights: { sabio: 2 } },
    ],
  },
  {
    question: 'Qual frase você gostaria de receber numa segunda de manhã?',
    options: [
      { label: '"Vai devagar, o dia cabe."', weights: { calmo: 2 } },
      { label: '"Bora! Hoje tem missão pequena pronta pra você."', weights: { motivador: 2 } },
      { label: '"Oi 🌱 que bom te ver hoje."', weights: { fofo: 2 } },
      { label: '"O que merece atenção hoje?"', weights: { sabio: 2 } },
    ],
  },
];

export default function Quiz() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ age_band: string }>();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<Personality, number>>({
    calmo: 0,
    motivador: 0,
    fofo: 0,
    sabio: 0,
  });
  const [showResult, setShowResult] = useState(false);

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
            <Mascot personality={winner} phase="bebe" mood="feliz" size={180} />
          </View>
          <View>
            <Text style={styles.kicker}>Combinou contigo</Text>
            <Text style={styles.title}>{meta.label}</Text>
            <Text style={styles.tagline}>{meta.tagline}</Text>
            <Text style={styles.subtitle}>{meta.description}</Text>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label={`Vou de ${meta.label}`}
              onPress={() =>
                router.replace({
                  pathname: '/onboarding/name',
                  params: { personality: winner, age_band: params.age_band ?? '' },
                })
              }
            />
            <Pressable onPress={() => router.push('/onboarding/personality')}>
              <Text style={styles.linkText}>Hmm, deixa eu olhar todas</Text>
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
          <Text style={styles.kicker}>Passo 2 de 4 · pergunta {step + 1}/{quiz.length}</Text>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${((step + 1) / quiz.length) * 100}%` }]} />
          </View>
          <Text style={styles.title}>{q.question}</Text>
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          {q.options.map((opt, i) => (
            <Pressable key={i} onPress={() => answer(opt)} style={styles.opt}>
              <Text style={styles.optLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => router.push('/onboarding/personality')}>
          <Text style={styles.linkText}>Pular quiz e escolher direto</Text>
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
