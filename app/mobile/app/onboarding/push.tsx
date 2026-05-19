import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality } from '@/types';

export default function PushAsk() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ personality: Personality }>();
  const personality = (params.personality ?? 'motivador') as Personality;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
          <Mascot personality={personality} phase="bebe" mood="feliz" size={150} />
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={styles.title}>Posso te avisar?</Text>
            <Text style={styles.subtitle}>
              No máximo 2 vezes por dia, só pra dizer "tô aqui". Nunca com culpa.
              Você desliga quando quiser nas configurações.
            </Text>
          </View>
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Sim, pode me avisar" onPress={() => router.push({ pathname: '/onboarding/notice', params })} />
          <Pressable onPress={() => router.push({ pathname: '/onboarding/notice', params: { ...params, push: 'no' } })}>
            <Text style={styles.ghost}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg, justifyContent: 'space-between' },
    title: { ...theme.text.h1, color: theme.colors.text, textAlign: 'center' },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center' },
    ghost: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: theme.spacing.md, fontWeight: '600' },
  });
}
