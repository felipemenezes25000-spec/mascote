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

const BONDS: { id: BondType; label: string }[] = [
  { id: 'companheiro', label: 'Companheiro leve' },
  { id: 'guardiao', label: 'Guardião protetor' },
  { id: 'criatura_fofa', label: 'Bichinho fofo' },
  { id: 'espirito', label: 'Espírito guia' },
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
  const [bond, setBond] = useState<BondType | null>(null);
  const [tone, setTone] = useState<CommunicationTone | null>(null);
  const [pronoun, setPronoun] = useState<'ele' | 'ela' | 'elu' | null>(null);

  const canContinue = !!(bond && tone && pronoun);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <StaggeredView index={0}>
          <Text style={styles.kicker}>{stepLabel('quick')}</Text>
          <Text style={styles.title}>Só mais 3 toques</Text>
        </StaggeredView>
        <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
          <Section title="Tipo de vínculo">
            {BONDS.map(b => (
              <Chip key={b.id} label={b.label} selected={bond === b.id} onPress={() => setBond(b.id)} />
            ))}
          </Section>
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
                bond: bond ?? '',
                tone: tone ?? '',
                pronoun: pronoun ?? '',
                primaryGoal: mapGoalToUserGoal(params.goal ?? ''),
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
