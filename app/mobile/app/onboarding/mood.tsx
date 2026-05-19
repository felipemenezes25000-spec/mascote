import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const MOODS = [
  { id: '1', label: 'Muito mal', emoji: '😞' },
  { id: '2', label: 'Mal', emoji: '😕' },
  { id: '3', label: 'Na média', emoji: '😐' },
  { id: '4', label: 'Bem', emoji: '🙂' },
  { id: '5', label: 'Muito bem', emoji: '😄' },
];

export default function Mood() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>HUMOR HOJE</Text>
          <Text style={styles.title}>Como você tá?</Text>
          <Text style={styles.subtitle}>Sem julgamento. Anônimo entre nós.</Text>
        </View>
        <View style={styles.row}>
          {MOODS.map(m => (
            <Pressable
              key={m.id}
              style={[styles.opt, selected === m.id && styles.optSelected]}
              onPress={() => setSelected(m.id)}
            >
              <Text style={styles.emoji}>{m.emoji}</Text>
              <Text style={[styles.label, selected === m.id && styles.labelSel]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <Button
          label="Continuar"
          disabled={!selected}
          onPress={() => router.push({ pathname: '/onboarding/mascot', params: { ...params, mood: selected ?? '' } })}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg, justifyContent: 'space-between' },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text, marginTop: theme.spacing.sm },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
    opt: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 4,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    emoji: { fontSize: 30 },
    label: { ...theme.text.xs, color: theme.colors.textSecondary, textAlign: 'center', fontWeight: '600' },
    labelSel: { color: '#fff' },
  });
}
