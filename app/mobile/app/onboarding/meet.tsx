import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { getPersonality } from '@/content/personalities';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

export default function Meet() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ personality: Personality; display_name?: string; goal?: string; mood?: string }>();
  const personality = (params.personality ?? 'motivador') as Personality;
  const meta = getPersonality(personality);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={styles.kicker}>CONHEÇA</Text>
          <Text style={styles.title}>Olha quem chegou pra te acompanhar.</Text>
        </View>
        <View style={styles.sceneWrap}>
          <SceneBackground sceneId="room" height={240}>
            <Mascot personality={personality} phase="bebe" mood="empolgado" size={170} />
          </SceneBackground>
        </View>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>"{meta.greeting}"</Text>
          <Text style={styles.bubbleAuthor}>— {meta.mascotName}, seu {meta.label.toLowerCase()}</Text>
        </View>
        <Button label="Vamos!" onPress={() => router.push({ pathname: '/onboarding/name', params })} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text },
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
  });
}
