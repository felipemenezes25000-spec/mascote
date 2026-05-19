import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';

/**
 * Tela legacy — funde-se com mascot.tsx no flow v2 (11→6 telas).
 * mascot.tsx agora tem reveal+greeting inline.
 */
export default function MeetLegacyRedirect() {
  const theme = useTheme();
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({ pathname: '/onboarding/mascot', params });
  }, []);

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}><View /></SafeAreaView>;
}
