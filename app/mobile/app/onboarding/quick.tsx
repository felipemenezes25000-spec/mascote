import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import type { BondType, CommunicationTone } from '@/game/evolution/EvolutionTypes';
import { mapGoalToUserGoal } from '@/lib/onboarding-evolution';
import { stepLabel } from '@/lib/onboarding-flow';
import { useTheme } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

import { Typography } from '@/components/ui';
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
// pedir uma 2ª pergunta redundante. Builders por render: t() pega o locale atual.
function buildMascotes(): MascoteEscolha[] {
  return [
    { id: 'bipo', mascotName: 'Bipo', label: t('onboarding.quick.bipo_label'), tagline: t('onboarding.quick.bipo_tagline'), personality: 'calmo',     bond: 'companheiro' },
    { id: 'zip',  mascotName: 'Zip',  label: t('onboarding.quick.zip_label'),  tagline: t('onboarding.quick.zip_tagline'),  personality: 'motivador', bond: 'guardiao' },
    { id: 'lulu', mascotName: 'Lulu', label: t('onboarding.quick.lulu_label'), tagline: t('onboarding.quick.lulu_tagline'), personality: 'fofo',      bond: 'criatura_fofa' },
    { id: 'aro',  mascotName: 'Aro',  label: t('onboarding.quick.aro_label'),  tagline: t('onboarding.quick.aro_tagline'),  personality: 'sabio',     bond: 'espirito' },
  ];
}

function buildTones(): { id: CommunicationTone; label: string }[] {
  return [
    { id: 'carinhoso', label: t('tones.carinhoso') },
    { id: 'direto', label: t('tones.direto') },
    { id: 'poetico', label: t('tones.poetico') },
    { id: 'engracado', label: t('tones.engracado') },
  ];
}

function buildPronouns(): { id: 'ele' | 'ela' | 'elu'; label: string }[] {
  return [
    { id: 'ele', label: t('pronouns.ele') },
    { id: 'ela', label: t('pronouns.ela') },
    { id: 'elu', label: t('pronouns.elu') },
  ];
}

export default function QuickQuestions() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ goal?: string; style?: string }>();
  const [mascote, setMascote] = useState<MascoteEscolha | null>(null);
  const [tone, setTone] = useState<CommunicationTone | null>(null);
  const [pronoun, setPronoun] = useState<'ele' | 'ela' | 'elu' | null>(null);
  const MASCOTES = buildMascotes();
  const TONES = buildTones();
  const PRONOUNS = buildPronouns();

  const canContinue = !!(mascote && tone && pronoun);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <StaggeredView index={0}>
          <Typography variant="body" style={styles.kicker}>{stepLabel('quick')}</Typography>
          <Typography variant="body" style={styles.title}>{t('onboarding.quick.title')}</Typography>
        </StaggeredView>
        <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
          <Section title={t('onboarding.quick.section_mascot')}>
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
            <Typography variant="body" style={{ ...theme.text.xs, color: theme.colors.textSecondary, fontStyle: 'italic' }}>
              "{mascote.tagline}"
            </Typography>
          )}
          <Section title={t('onboarding.quick.section_tone')}>
            {TONES.map(tn => (
              <Chip key={tn.id} label={tn.label} selected={tone === tn.id} onPress={() => setTone(tn.id)} />
            ))}
          </Section>
          <Section title={t('onboarding.quick.section_pronoun')}>
            {PRONOUNS.map(p => (
              <Chip key={p.id} label={p.label} selected={pronoun === p.id} onPress={() => setPronoun(p.id)} />
            ))}
          </Section>
        </ScrollView>
        <Button
          label={t('onboarding.quick.cta_reveal')}
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
      <Typography variant="body" style={{ ...theme.text.sm, color: theme.colors.textSecondary, fontWeight: '700' }}>{title}</Typography>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
      >
        {children}
      </View>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
      }}
    >
      <Typography variant="body" style={{ color: selected ? '#fff' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Typography>
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
