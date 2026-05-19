import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { getPersonality } from '@/content/personalities';
import { mascots, profiles, settings as settingsDb, streaks, wallet as walletDb } from '@/lib/db';
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
  const params = useLocalSearchParams<{ personality: Personality; age_band?: string; mood?: string }>();
  const personality = (params.personality ?? 'calmo') as Personality;
  const ageBand = parseAgeBand(params.age_band);
  const initialMood = parseMood(params.mood);
  const defaultMascotName = useMemo(() => getPersonality(personality).mascotName, [personality]);
  const [userName, setUserName] = useState('');
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
    const mascot = await mascots.upsert({
      user_id: profile.id,
      name: mascotName.trim() || defaultMascotName,
      personality,
      phase: 'ovo',
      mood: initialMood ?? 'feliz',
      energy: 90,
    });
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
    router.push({ pathname: '/onboarding/push', params: { personality } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.mascotWrap}>
            <Mascot personality={personality} phase="bebe" mood="feliz" size={180} />
          </View>
          <View style={styles.form}>
            <Text style={styles.kicker}>{stepLabel('name')}</Text>
            <Text style={styles.title}>Vamos nos apresentar</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Como você quer ser chamado(a)?</Text>
              <TextInput
                testID="user_name_input"
                accessibilityLabel="Seu nome"
                value={userName}
                onChangeText={setUserName}
                placeholder="Seu nome"
                placeholderTextColor={theme.colors.textDim}
                style={styles.input}
                autoFocus
                returnKeyType="next"
                maxLength={40}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nome do seu Mascote</Text>
              <TextInput
                value={mascotName}
                onChangeText={setMascotName}
                placeholder={defaultMascotName}
                placeholderTextColor={theme.colors.textDim}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={finish}
                maxLength={30}
              />
            </View>
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
  kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { ...theme.text.h1, color: theme.colors.text },
  field: { gap: theme.spacing.sm },
  label: { ...theme.text.sm, color: theme.colors.textSecondary, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 18,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
}
