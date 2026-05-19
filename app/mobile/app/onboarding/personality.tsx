import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { PersonalityCard } from '@/components/PersonalityCard';
import { personalities } from '@/content/personalities';
import { stepLabel } from '@/lib/onboarding-flow';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

export default function PersonalityPick() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [selected, setSelected] = useState<Personality | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{stepLabel('personality')}</Text>
          <Text style={styles.title}>Que vibe combina com você hoje?</Text>
          <Text style={styles.subtitle}>
            Pode trocar depois. Vamos começar pelo que parece mais leve agora.
          </Text>
        </View>
        <View style={styles.list}>
          {personalities.map(p => (
            <PersonalityCard
              key={p.id}
              meta={p}
              selected={selected === p.id}
              onPress={() => setSelected(p.id)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="Continuar"
          onPress={() => selected && router.push({ pathname: '/onboarding/name', params: { personality: selected } })}
          disabled={!selected}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: { gap: theme.spacing.sm },
  kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { ...theme.text.h1, color: theme.colors.text },
  subtitle: { ...theme.text.body, color: theme.colors.textSecondary },
  list: { gap: theme.spacing.md },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
}
