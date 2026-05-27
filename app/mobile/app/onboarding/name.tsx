import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { getPersonality } from '@/content/personalities';
import { readSystemReduceMotion } from '@/lib/accessibility';
import { mascots, profiles, settings as settingsDb, streaks, wallet as walletDb } from '@/lib/db';
import { sanitizeDisplayName } from '@/lib/identity/displayName';
import { seedFromOnboardingAnswers, mapMoodToMascot, type OnboardingAnswers, type StylePreset } from '@/lib/onboarding-evolution';
import { buildPersonalizationInput } from '@/lib/onboarding-evolution';
import { persistOnboardingPersonalization } from '@/lib/personalization-service';
import { generateGenotype } from '@/game/evolution/GenotypeGenerator';
import { sanitizeGenome } from '@/lib/dna';
import type { BondType, CommunicationTone, UserGoal } from '@/game/evolution/EvolutionTypes';
import { getOnboardingDraft } from '@/lib/onboarding-draft';
import { stepLabel } from '@/lib/onboarding-flow';
import { useStore } from '@/store';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { MascotMood, Personality } from '@/types';
import { Input, Typography } from '@/components/ui';

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
  const draft = getOnboardingDraft();
  const [userName, setUserName] = useState(
    params.display_name?.trim() || draft.display_name?.trim() || '',
  );
  const [mascotName, setMascotName] = useState(defaultMascotName);
  const [saving, setSaving] = useState(false);
  const setProfile = useStore(s => s.setProfile);
  const setMascot = useStore(s => s.setMascot);
  const setStreak = useStore(s => s.setStreak);
  const setSettings = useStore(s => s.setSettings);
  const setWallet = useStore(s => s.setWallet);

  async function finish() {
    // Re-entry guard: o pipeline abaixo faz ~8 awaits em sequência (upsert
    // profile/mascot, persist personalization, recordMilestone x2, update
    // settings, Promise.all de 3 reads, set state). Sem o flag, double-tap
    // cria 2 perfis duplicados antes do botão atualizar via `disabled`.
    if (saving || !userName.trim()) return;
    // Sanitiza antes de salvar profile: "hm,mjh" e similares são rejeitados
    // aqui em vez de vazar pro diário/header. Helper compartilhado com
    // settings e HomeHeader pra coerência.
    const sanitizedName = sanitizeDisplayName(userName);
    if (!sanitizedName) {
      const { Alert } = await import('react-native');
      Alert.alert(
        'Nome inválido',
        'Use ao menos 2 letras. Pode incluir espaços, hífen ou apóstrofo.',
      );
      return;
    }
    setSaving(true);
    try {
    const profile = await profiles.upsert({
      display_name: sanitizedName,
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
    const parsedSeed = params.dna_seed ? parseInt(params.dna_seed, 10) : NaN;
    // Clamp em int32 nao-negativo: `Number.isFinite(1e308)` e true, e seed
    // gigante via deep-link hostil inflava a geracao de DNA. PRNG nosso usa
    // mod 2^32, entao qualquer coisa > 2^31 ja perde semantica determinista.
    const validSeed = Number.isFinite(parsedSeed) && parsedSeed >= 0 && parsedSeed < 2 ** 31
      ? parsedSeed
      : null;
    const seed = validSeed ?? seedFromOnboardingAnswers(answers);
    const input = buildPersonalizationInput(answers, mascotName.trim() || defaultMascotName, personality);
    const genotype = generateGenotype({ ...input, seed });
    const dna = sanitizeGenome(genotype.genome);

    // Rollback de profile orphaned: se mascots.upsert (ou qualquer step do
    // pipeline) falhar depois do profiles.upsert ja ter criado o profile,
    // o usuario fica com perfil sem mascot → splash → /(tabs) → crash em
    // telas que assumem mascot existe.
    let mascot;
    try {
      mascot = await mascots.upsert({
        user_id: profile.id,
        name: mascotName.trim() || defaultMascotName,
        personality,
        phase: 'ovo',
        mood: initialMood ?? 'feliz',
        energy: 90,
        dna,
        dna_seed: seed,
      });
    } catch (err) {
      await profiles.clear().catch(() => {});
      throw err;
    }
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
    } finally {
      // Reseta `saving` no finally garante que erro inesperado no upsert
      // não trava o botão em loading permanente (UX morta sem feedback).
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.mascotWrap}>
            {/* Visual = "bebe" pra manter continuidade com /onboarding/mascot
                (recém-chocado). O mascote PERSISTE como 'ovo' (linha ~121)
                pra não pular a narrativa "Quebrou o casco!" no primeiro XP —
                ver comentário em finish(). Aqui é só apresentação. */}
            <Mascot personality={personality} phase="bebe" mood={initialMood ?? 'feliz'} size={180} />
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
              returnKeyType="done"
              blurOnSubmit
              maxLength={40}
            />

            <Input
              label="Nome do seu Mascote"
              value={mascotName}
              onChangeText={setMascotName}
              placeholder={defaultMascotName}
              returnKeyType="done"
              maxLength={30}
            />
          </View>
          <Button
            testID="onboarding_name_finish"
            label={saving ? 'Criando seu mascote...' : 'Pronto. Vamos começar.'}
            onPress={finish}
            disabled={!userName.trim() || saving}
          />
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
