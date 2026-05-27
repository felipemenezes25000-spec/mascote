import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * Custom 404 screen in pt-BR with Pip tone.
 *
 * Expo Router renders this for any path that doesn't match a known route.
 * Sem essa tela, Expo cai num placeholder em inglês ("This screen doesn't exist").
 */
export default function NotFoundScreen() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <>
      <Stack.Screen options={{ title: 'Caminho não encontrado' }} />
      <View style={styles.container}>
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
          …
        </Text>
        <Text style={styles.title}>Pip se perdeu por aqui</Text>
        <Text style={styles.body}>
          Esse caminho não existe — ou existe e Pip ainda não chegou nele.{'\n\n'}
          Quer voltar pro lugar onde ele tá te esperando?
        </Text>
        <Button
          variant="primary"
          label="Voltar pra casa"
          accessibilityLabel="Voltar pra tela inicial"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.bg,
    },
    emoji: {
      fontSize: 64,
      fontFamily: 'InstrumentSerif_400Regular',
      color: theme.colors.primary,
    },
    title: {
      fontSize: 24,
      fontFamily: 'InstrumentSerif_400Regular',
      textAlign: 'center',
      color: theme.colors.text,
    },
    body: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans_400Regular',
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 320,
      color: theme.colors.textSecondary,
    },
  });
}
