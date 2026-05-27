import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Tela legacy — funde-se com notice.tsx no flow v2 (11→6 telas).
 * Redirect declarativo evita router.replace antes do Root Layout montar (web).
 */
export default function PushLegacyRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/onboarding/notice', params }} />;
}
