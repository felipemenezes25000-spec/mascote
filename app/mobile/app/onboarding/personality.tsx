import { Redirect } from 'expo-router';

/** Alt-path legado — redireciona pro fluxo canônico (quick após style). */
export default function PersonalityPick() {
  return <Redirect href="/onboarding/goal" />;
}
