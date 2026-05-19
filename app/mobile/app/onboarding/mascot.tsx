import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { personalities } from '@/content/personalities';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

export default function MascotPick() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<Personality | null>((params.personality as Personality) ?? null);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>ESCOLHA SEU MASCOTE</Text>
          <Text style={styles.title}>Cada um tem um jeito</Text>
        </View>
        <ScrollView contentContainerStyle={{ gap: theme.spacing.md }}>
          {personalities.map(p => (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p.id)}
              style={[
                styles.card,
                selected === p.id && { borderColor: p.primaryColor, borderWidth: 2 },
              ]}
            >
              <Mascot personality={p.id} phase="bebe" mood="feliz" size={90} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {p.mascotName} · <Text style={styles.kind}>{p.label}</Text>
                </Text>
                <Text style={styles.desc}>{p.tagline}</Text>
                <View style={styles.bestFor}>
                  {p.bestFor.map(b => (
                    <View key={b} style={[styles.tag, { backgroundColor: p.primaryColor + '22', borderColor: p.primaryColor + '55' }]}>
                      <Text style={[styles.tagText, { color: p.accentColor }]}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <Button
          label="Continuar"
          disabled={!selected}
          onPress={() =>
            router.push({
              pathname: '/onboarding/meet',
              params: { ...params, personality: selected ?? '' },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text, marginTop: theme.spacing.sm },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    name: { ...theme.text.h3, color: theme.colors.text },
    kind: { color: theme.colors.textSecondary, fontWeight: '600' },
    desc: { ...theme.text.sm, color: theme.colors.textSecondary, marginTop: 4 },
    bestFor: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
    tagText: { fontSize: 10, fontWeight: '700' },
  });
}
