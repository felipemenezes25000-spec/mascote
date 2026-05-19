import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';

/**
 * Tela legacy — funde-se com notice.tsx no flow v2 (11→6 telas).
 * notice.tsx agora tem toggle de push inline.
 */
export default function PushLegacyRedirect() {
  const theme = useTheme();
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({ pathname: '/onboarding/notice', params });
  }, []);

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}><View /></SafeAreaView>;
}
