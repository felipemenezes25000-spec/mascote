import { Redirect } from 'expo-router';

// Splash decide a rota final
export default function Index() {
  return <Redirect href="/splash" />;
}
