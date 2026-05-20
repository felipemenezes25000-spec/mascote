import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { Typography, Input } from '@/components/ui';
import { getPersonality } from '@/content/personalities';
import { readSystemReduceMotion } from '@/lib/accessibility';
import { mascots, profiles, settings as settingsDb, streaks, wallet as walletDb } from '@/lib/db';
import { seedFromOnboardingAnswers, mapMoodToMascot, type OnboardingAnswers, type StylePreset } from '@/lib/onboarding-evolution';
import { buildPersonalizationInput } from '@/lib/onboarding-evolution';
import { persistOnboardingPersonalization } from '@/lib/personalization-service';
import { generateGenotype } from '@/game/evolution/GenotypeGenerator';
import { sanitizeGenome } from '@/lib/dna';
import type { BondType, CommunicationTone, UserGoal } from '@/game/evolution/EvolutionTypes';
import { stepLabel } from '@/lib/onboarding-flow';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { MascotMood, Personality } from '@/types';

const VALID_MOODS: readonly MascotMood[] = ['triste', 'ok', 'feliz', 'empolgado', 'exausto'];
function parseMood(raw: unknown): MascotMood | null {
  if (typeof raw !== 'string') return null;
  return (VALID_MOODS as readonly string[]).includes(raw) ? (raw as MascotMood) : null;
}

const VALID_AGE_BANDS = ['16-24', '25-34', '35-44', '45+'] as const;
type AgeBand = (typeof VALID_AGE_BANDS)[number];

function parseAgeBand(raw: unknown): AgeBand | null {
  if (typeof raw !== 'string') return null;
  return (VALID_AGE_BANDS as readonly string[]).includes(raw) ? (raw as AgeBand) : null;
}

export default function NameStep() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{
    personality: Personality;
    age_band?: string;
    mood?: string;
    display_name?: string;
    dna_seed?: string;
    bond?: string;
    tone?: string;
    style?: string;
    primaryGoal?: string;
    pronoun?: string;
    goal?: string;
  }>();
  const personality = (params.personality ?? 'calmo') as Personality;
  const ageBand = parseAgeBand(params.age_band);
  const initialMood = parseMood(params.mood) ?? mapMoodToMascot(params.mood ?? '4');
  const defaultMascotName = useMemo(() => getPersonality(personality).mascotName, [personality]);
  // Pré-preenche com o nome capturado em /signup (propagado via URL pelas
  // telas intermediárias com `...params`). Sem isso, usuário re-digita.
  const [userName, setUserName] = useState(params.display_name?.trim() ?? '');
  const [mascotName, setMascotName] = useState(defaultMascotName);
  const setProfile = useStore(s => s.setProfile);
  const setMascot = useStore(s => s.setMascot);
  const setStreak = useStore(s => s.setStreak);
  const setSettings = useStore(s => s.setSettings);
  const setWallet = useStore(s => s.setWallet);

  async function finish() {
    if (!userName.trim()) return;
    const profile = await profiles.upsert({
      display_name: userName.trim(),
      age_band: ageBand,
    });
    // O mood selecionado no onboarding (mood.tsx) ESPELHA o user inicialmente.
    // Sem isso, a pergunta era inútil — agora vira o ponto de partida do mascote.
    // Começa em 'ovo' (xp=0). Antes era 'bebe' com xp=0 — estado inconsistente
    // (threshold de bebê é 100 XP) que fazia (a) o usuário NUNCA ver a
    // narrativa "Quebrou o casco!" da transição ovo→bebê (pulava direto), e
    // (b) qualquer recálculo de phase no applyXp tentava regredir bebê→ovo.
    const answers: OnboardingAnswers = {
      goalId: params.goal ?? 'companhia',
      moodId: params.mood ?? '4',
      stylePreset: (params.style as StylePreset) ?? 'soft',
      bondType: (params.bond as BondType) ?? 'companheiro',
      communicationTone: (params.tone as CommunicationTone) ?? 'carinhoso',
      pronoun: (params.pronoun as 'ele' | 'ela' | 'elu') ?? 'ele',
      primaryGoal: (params.primaryGoal as UserGoal) ?? 'saude_geral',
    };
    const seed = params.dna_seed
      ? parseInt(params.dna_seed, 10)
      : seedFromOnboardingAnswers(answers);
    const input = buildPersonalizationInput(answers, mascotName.trim() || defaultMascotName, personality);
    const genotype = generateGenotype({ ...input, seed });
    const dna = sanitizeGenome(genotype.genome);

    const mascot = await mascots.upsert({
      user_id: profile.id,
      name: mascotName.trim() || defaultMascotName,
      personality,
      phase: 'ovo',
      mood: initialMood ?? 'feliz',
      energy: 90,
      dna,
      dna_seed: seed,
    });
    await persistOnboardingPersonalization(profile.id, answers, mascotName.trim() || defaultMascotName, personality);
    try {
      const { mascotMemoryService } = await import('@/game/memory/MascotMemoryService');
      await mascotMemoryService.recordMilestone(profile.id, 'birth', {
        name: mascotName.trim() || defaultMascotName,
      });
      await mascotMemoryService.recordMilestone(profile.id, 'user_goal', {
        detail: answers.primaryGoal,
      });
    } catch {
      /* memória não bloqueia onboarding */
    }
    const osReduceMotion = await readSystemReduceMotion();
    await settingsDb.update(profile.id, {
      first_mission_pending: true,
      onboarding_bond: answers.bondType,
      onboarding_tone: answers.communicationTone,
      ...(osReduceMotion ? { reduce_motion: true } : {}),
    } as Record<string, unknown>);
    const [streak, settings, wallet] = await Promise.all([
      streaks.get(profile.id),
      settingsDb.get(profile.id),
      walletDb.get(profile.id),
    ]);
    setProfile(profile);
    setMascot(mascot);
    setStreak(streak);
    setSettings(settings);
    setWallet(wallet);
    // Flow v2: skip push.tsx — notice.tsx agora tem toggle de push inline
    router.push({ pathname: '/onboarding/notice', params: { personality } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.mascotWrap}>
            <Mascot personality={personality} phase="ovo" mood="feliz" size={180} />
          </View>
          <View style={styles.form}>
            <Typography variant="mono" tone="brand" style={styles.kicker}>{stepLabel('name')}</Typography>
            <Typography variant="title">Vamos nos apresentar</Typography>

            <Input
              testID="user_name_input"
              accessibilityLabel="Seu nome"
              label="Como você quer ser chamado(a)?"
              value={userName}
              onChangeText={setUserName}
              placeholder="Seu nome"
              autoFocus
              returnKeyType="next"
              maxLength={40}
            />

            <Input
              label="Nome do seu Mascote"
              value={mascotName}
              onChangeText={setMascotName}
              placeholder={defaultMascotName}
              returnKeyType="done"
              onSubmitEditing={finish}
              maxLength={30}
            />
          </View>
          <Button label="Pronto. Vamos começar." onPress={finish} disabled={!userName.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  mascotWrap: { alignItems: 'center', paddingVertical: theme.spacing.md },
  form: { flex: 1, gap: theme.spacing.lg },
  kicker: { fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
}
