import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import type { BondType, CommunicationTone } from '@/game/evolution/EvolutionTypes';
import { mapGoalToUserGoal } from '@/lib/onboarding-evolution';
import { stepLabel } from '@/lib/onboarding-flow';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

interface MascoteEscolha {
  id: 'bipo' | 'zip' | 'lulu' | 'aro';
  mascotName: string;
  label: string;
  tagline: string;
  personality: Personality;
  bond: BondType;
}

// Alinhado com landing mascotevirtual.com.br — usuário escolhe DIRETAMENTE
// entre os 4 personagens canônicos. Bond derivado pra alimentar DNA sem
// pedir uma 2ª pergunta redundante.
const MASCOTES: MascoteEscolha[] = [
  { id: 'bipo', mascotName: 'Bipo', label: 'Bipo · O Calmo',       tagline: 'Presença que não corre.', personality: 'calmo',     bond: 'companheiro' },
  { id: 'zip',  mascotName: 'Zip',  label: 'Zip · O Motivador',    tagline: 'Energia que não bate.',   personality: 'motivador', bond: 'guardiao' },
  { id: 'lulu', mascotName: 'Lulu', label: 'Lulu · A Companheira', tagline: 'Carinho que escuta.',     personality: 'fofo',      bond: 'criatura_fofa' },
  { id: 'aro',  mascotName: 'Aro',  label: 'Aro · O Sábio',        tagline: 'Pergunta que ilumina.',   personality: 'sabio',     bond: 'espirito' },
];

const TONES: { id: CommunicationTone; label: string }[] = [
  { id: 'carinhoso', label: 'Carinhoso' },
  { id: 'direto', label: 'Direto' },
  { id: 'poetico', label: 'Poético' },
  { id: 'engracado', label: 'Engraçado' },
];

const PRONOUNS = [
  { id: 'ele', label: 'Ele / dele' },
  { id: 'ela', label: 'Ela / dela' },
  { id: 'elu', label: 'Elu / dele' },
] as const;

export default function QuickQuestions() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ goal?: string; style?: string }>();
  const [mascote, setMascote] = useState<MascoteEscolha | null>(null);
  const [tone, setTone] = useState<CommunicationTone | null>(null);
  const [pronoun, setPronoun] = useState<'ele' | 'ela' | 'elu' | null>(null);

  const canContinue = !!(mascote && tone && pronoun);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <StaggeredView index={0}>
          <Text style={styles.kicker}>{stepLabel('quick')}</Text>
          <Text style={styles.title}>Só mais 3 toques</Text>
        </StaggeredView>
        <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
          <Section title="Seu mascote">
            {MASCOTES.map(m => (
              <Chip
                key={m.id}
                label={m.label}
                selected={mascote?.id === m.id}
                onPress={() => setMascote(m)}
              />
            ))}
          </Section>
          {mascote && (
            <Text style={{ ...theme.text.xs, color: theme.colors.textSecondary, fontStyle: 'italic' }}>
              "{mascote.tagline}"
            </Text>
          )}
          <Section title="Tom de conversa">
            {TONES.map(t => (
              <Chip key={t.id} label={t.label} selected={tone === t.id} onPress={() => setTone(t.id)} />
            ))}
          </Section>
          <Section title="Pronome do mascote">
            {PRONOUNS.map(p => (
              <Chip key={p.id} label={p.label} selected={pronoun === p.id} onPress={() => setPronoun(p.id)} />
            ))}
          </Section>
        </ScrollView>
        <Button
          label="Revelar DNA"
          disabled={!canContinue}
          onPress={() =>
            router.push({
              pathname: '/onboarding/mascot',
              params: {
                ...params,
                bond: mascote?.bond ?? '',
                tone: tone ?? '',
                pronoun: pronoun ?? '',
                primaryGoal: mapGoalToUserGoal(params.goal ?? ''),
                personality: mascote?.personality ?? '',
              },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text style={{ ...theme.text.sm, color: theme.colors.textSecondary, fontWeight: '700' }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
      }}
    >
      <Text style={{ color: selected ? '#fff' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </PressableScale>
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
      gap: theme.spacing.md,
    },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text, marginTop: theme.spacing.sm },
  });
}
