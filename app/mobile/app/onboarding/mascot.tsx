import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { personalities, getPersonality } from '@/content/personalities';
import { stepLabel } from '@/lib/onboarding-flow';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

/**
 * Tela combinada (mascot + meet) — pick + reveal+greeting na mesma tela.
 *
 * Antes eram 2 telas: mascot.tsx (escolher) → meet.tsx (cumprimentar). Agora
 * é 1 tela com 2 modos: 'pick' (lista das 4 personalidades) e 'reveal'
 * (cena + bubble com greeting). Reveal substitui o navigate pra /meet.
 */
export default function MascotPick() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<Personality | null>((params.personality as Personality) ?? null);
  const [mode, setMode] = useState<'pick' | 'reveal'>(
    params.personality ? 'reveal' : 'pick',
  );

  if (mode === 'reveal' && selected) {
    const meta = getPersonality(selected);
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View>
            <Text style={[styles.kicker, { color: meta.primaryColor }]}>{stepLabel('mascot')}</Text>
            <Text style={styles.title}>Olha quem chegou pra te acompanhar.</Text>
          </View>
          <View style={styles.sceneWrap}>
            <SceneBackground sceneId="room" height={240}>
              <Mascot personality={selected} phase="bebe" mood="empolgado" size={170} />
            </SceneBackground>
          </View>
          <View style={[styles.bubble, { borderColor: meta.primaryColor + '55' }]}>
            <Text style={styles.bubbleText}>"{meta.greeting}"</Text>
            <Text style={styles.bubbleAuthor}>— {meta.mascotName}, seu {meta.label.toLowerCase()}</Text>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <Button label="Vamos!" onPress={() => router.push({ pathname: '/onboarding/name', params: { ...params, personality: selected } })} />
            <Pressable onPress={() => setMode('pick')} accessibilityLabel="Trocar personalidade">
              <Text style={styles.linkText}>Hmm, deixa eu olhar de novo</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>{stepLabel('mascot')}</Text>
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
          label="É esse aí"
          disabled={!selected}
          onPress={() => setMode('reveal')}
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
    sceneWrap: { paddingHorizontal: 0 },
    bubble: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    bubbleText: { ...theme.text.body, color: theme.colors.text, fontStyle: 'italic' },
    bubbleAuthor: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    linkText: { color: theme.colors.primary, textAlign: 'center', fontWeight: '600', paddingVertical: 6 },
  });
}
