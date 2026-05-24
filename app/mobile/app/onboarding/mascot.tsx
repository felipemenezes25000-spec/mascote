/**
 * onboarding/mascot.tsx — DNA reveal + egg hatch + nascimento do mascote.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { getPersonality } from '@/content/personalities';
import { modifiersToVisuals } from '@/game/evolution/PhenotypeRenderer';
import {
  buildPersonalizationInput,
  formatRareTrait,
  generateOnboardingPreview,
  hatchDurationMs,
  mapMoodToMascot,
  personalityFromBond,
  type OnboardingAnswers,
  type StylePreset,
} from '@/lib/onboarding-evolution';
import { stepLabel } from '@/lib/onboarding-flow';
import { sanitizeGenome } from '@/lib/dna';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { BondType, CommunicationTone, UserGoal } from '@/game/evolution/EvolutionTypes';
import type { Personality } from '@/types';

type Phase = 'reveal' | 'hatch' | 'birth';

const VALID_PERSONALITIES: readonly Personality[] = ['calmo', 'motivador', 'fofo', 'sabio'];

function parsePersonality(raw: string | undefined): Personality | undefined {
  if (!raw) return undefined;
  return VALID_PERSONALITIES.includes(raw as Personality) ? (raw as Personality) : undefined;
}

export default function MascotBirth() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{
    goal?: string; mood?: string; style?: string;
    bond?: string; tone?: string; pronoun?: string; primaryGoal?: string;
    display_name?: string; age_band?: string;
    personality?: string;
  }>();

  const answers = useMemo((): OnboardingAnswers => ({
    goalId: params.goal ?? 'companhia',
    moodId: params.mood ?? '4',
    stylePreset: (params.style as StylePreset) ?? 'soft',
    bondType: (params.bond as BondType) ?? 'companheiro',
    communicationTone: (params.tone as CommunicationTone) ?? 'carinhoso',
    pronoun: (params.pronoun as 'ele' | 'ela' | 'elu') ?? 'ele',
    primaryGoal: (params.primaryGoal as UserGoal) ?? 'saude_geral',
  }), [params]);

  // Personality vem explícita do usuário (escolha direta do mascote em
  // quick.tsx/identity.tsx). Se não vier — fluxos legados ou deep-links —
  // cai no derivado-do-bond pra não quebrar.
  const personality = parsePersonality(params.personality) ?? personalityFromBond(answers.bondType);
  const preview = useMemo(
    () => generateOnboardingPreview(answers, getPersonality(personality).mascotName, personality),
    [answers, personality],
  );
  const visuals = useMemo(
    () => modifiersToVisuals(
      preview.phenotype.displayModifiers,
      preview.phenotype.slots.animationSet,
      preview.phenotype.slots.environmentId,
    ),
    [preview],
  );
  const dna = sanitizeGenome(preview.genotype.genome);
  const mood = mapMoodToMascot(answers.moodId);

  const [phase, setPhase] = useState<Phase>('reveal');
  const eggScale = useSharedValue(1);
  const eggOpacity = useSharedValue(1);
  const mascotOpacity = useSharedValue(0);

  useEffect(() => {
    if (phase !== 'hatch') return;
    const dur = hatchDurationMs(preview.seed);
    eggScale.value = withSequence(
      withTiming(1.08, { duration: dur * 0.4, easing: Easing.out(Easing.cubic) }),
      withTiming(0.2, { duration: dur * 0.35, easing: Easing.in(Easing.cubic) }),
    );
    eggOpacity.value = withTiming(0, { duration: dur * 0.5 });
    mascotOpacity.value = withTiming(1, { duration: dur * 0.6 });
    const t = setTimeout(() => setPhase('birth'), dur);
    return () => clearTimeout(t);
  }, [phase, preview.seed]);

  const eggStyle = useAnimatedStyle(() => ({
    opacity: eggOpacity.value,
    transform: [{ scale: eggScale.value }],
  }));
  const mascotStyle = useAnimatedStyle(() => ({ opacity: mascotOpacity.value }));

  if (phase === 'reveal') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.kicker}>{stepLabel('mascot')}</Text>
          <Text style={styles.title}>O DNA dele está pronto</Text>
          <View style={styles.dnaCard}>
            <Text style={styles.dnaLabel}>TRAÇO RARO</Text>
            <Text style={styles.dnaTrait}>{formatRareTrait(preview)}</Text>
            <Text style={styles.dnaSeed}>Seed #{preview.seed.toString(16).toUpperCase()}</Text>
            <Text style={styles.dnaArchetype}>Arquétipo · {preview.genotype.archetype}</Text>
          </View>
          <Text style={styles.hint}>Cada escolha sua deixou marcas únicas. Ninguém terá esse mascote.</Text>
          <Button label="Chocar o ovo" onPress={() => setPhase('hatch')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.kicker}>{stepLabel('mascot')}</Text>
        <Text style={styles.title}>
          {phase === 'hatch' ? 'Algo está nascendo...' : 'Olha quem chegou!'}
        </Text>
        {phase === 'birth' ? (
          <Text style={styles.birthHook}>
            Esse foi o primeiro momento de vida de vocês dois.
          </Text>
        ) : null}
        <View style={styles.sceneWrap}>
          <SceneBackground sceneId="room" height={260}>
            {phase === 'hatch' && (
              <Animated.View style={[styles.egg, eggStyle]}>
                <Text style={styles.eggEmoji}>🥚</Text>
              </Animated.View>
            )}
            <Animated.View style={[styles.mascotWrap, phase === 'birth' ? { opacity: 1 } : mascotStyle]}>
              <Mascot
                personality={personality}
                phase="bebe"
                mood={mood}
                size={170}
                force2D
                dnaOverride={dna}
                seedOverride={preview.seed}
                evolutionVisuals={visuals}
              />
            </Animated.View>
          </SceneBackground>
        </View>
        {phase === 'birth' && (
          <>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>"{preview.firstWords}"</Text>
              <Text style={styles.bubbleSub}>Traço: {formatRareTrait(preview)}</Text>
            </View>
            <Button
              label="Dar um nome"
              onPress={() =>
                router.push({
                  pathname: '/onboarding/name',
                  params: {
                    ...params,
                    personality,
                    dna_seed: String(preview.seed),
                    bond: answers.bondType,
                    tone: answers.communicationTone,
                    style: answers.stylePreset,
                    primaryGoal: answers.primaryGoal,
                    pronoun: answers.pronoun,
                  },
                })
              }
            />
            <Pressable onPress={() => setPhase('reveal')}>
              <Text style={styles.link}>Ver DNA de novo</Text>
            </Pressable>
          </>
        )}
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
    },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text },
    dnaCard: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '44',
      gap: 6,
    },
    dnaLabel: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1 },
    dnaTrait: { ...theme.text.h2, color: theme.colors.text, fontFamily: 'InstrumentSerif_400Regular' },
    dnaSeed: { ...theme.text.xs, color: theme.colors.textSecondary, fontFamily: 'JetBrainsMono_500Medium' },
    dnaArchetype: { ...theme.text.sm, color: theme.colors.textSecondary, fontStyle: 'italic' },
    hint: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center' },
    birthHook: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: -4,
      marginBottom: 2,
    },
    sceneWrap: {},
    egg: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    eggEmoji: { fontSize: 100 },
    mascotWrap: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
    bubble: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    bubbleText: { ...theme.text.body, color: theme.colors.text, fontStyle: 'italic', lineHeight: 24 },
    bubbleSub: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '700' },
    link: { color: theme.colors.primary, textAlign: 'center', fontWeight: '600' },
  });
}
