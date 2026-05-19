import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';

/**
 * Tela legacy — funde-se com goal.tsx no flow v2 (11→6 telas).
 * Mantém a rota viva pra redirect imediato (deep links antigos).
 */
export default function MoodLegacyRedirect() {
  const theme = useTheme();
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({ pathname: '/onboarding/goal', params });
  }, []);

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}><View /></SafeAreaView>;
}
