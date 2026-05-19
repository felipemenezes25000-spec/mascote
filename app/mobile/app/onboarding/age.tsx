import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { stepLabel } from '@/lib/onboarding-flow';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Profile } from '@/types';

type AgeBand = NonNullable<Profile['age_band']> | 'under16';

const options: { id: AgeBand; label: string; allowed: boolean }[] = [
  { id: 'under16', label: 'Menos de 16', allowed: false },
  { id: '16-24', label: '16–24', allowed: true },
  { id: '25-34', label: '25–34', allowed: true },
  { id: '35-44', label: '35–44', allowed: true },
  { id: '45+', label: '45 ou mais', allowed: true },
];

export default function Age() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [selected, setSelected] = useState<AgeBand | null>(null);

  function next() {
    if (!selected) return;
    if (selected === 'under16') {
      Alert.alert(
        'Você precisa ter 16 anos ou mais',
        'O Mascote é pensado pra esse público. Volta quando puder. Cuida de você.',
        [{ text: 'OK' }]
      );
      return;
    }
    router.push({ pathname: '/onboarding/goal', params: { age_band: selected } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>{stepLabel('age')}</Text>
          <Text style={styles.title}>Qual sua faixa de idade?</Text>
          <Text style={styles.subtitle}>
            Vou usar isso só pra adaptar o tom. Idade fica no seu dispositivo, não compartilhamos.
          </Text>
        </View>
        <View style={styles.options}>
          {options.map(o => (
            <Pressable
              key={o.id}
              onPress={() => setSelected(o.id)}
              style={[styles.opt, selected === o.id && styles.optSelected]}
            >
              <Text style={[styles.optLabel, selected === o.id && styles.optLabelSelected]}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button label="Continuar" onPress={next} disabled={!selected} />
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
  title: { ...theme.text.h1, color: theme.colors.text, marginTop: theme.spacing.sm },
  subtitle: { ...theme.text.body, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  options: { gap: theme.spacing.sm },
  opt: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  optLabel: { ...theme.text.bodyBold, color: theme.colors.text },
  optLabelSelected: { color: '#fff' },
});
}
