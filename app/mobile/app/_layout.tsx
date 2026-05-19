import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { UnlockToast } from '@/components/UnlockToast';
import { installTelemetry } from '@/lib/telemetry';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';

// Instalado UMA vez por process (não em render). O sink lê o consent a cada
// captura via callback, então fica live com mudanças de settings.
installTelemetry({
  isConsented: () => useStore.getState().settings?.consent_analytics === true,
});

export default function RootLayout() {
  const hydrated = useStore(s => s.hydrated);
  const hydrate = useStore(s => s.hydrate);
  const currentToast = useStore(s => s.currentToast);
  const shiftToast = useStore(s => s.shiftToast);
  const theme = useTheme();
  const statusBarStyle = theme.mode === 'dark' ? 'light' : 'dark';
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    (async () => {
      try {
        setHydrateError(null);
        await hydrate();
      } catch (err) {
        setHydrateError(err instanceof Error ? err.message : 'Falha ao carregar dados');
      }
    })();
  }, []);

  if (hydrateError) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.bg }]}>
        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
          Não consegui carregar
        </Text>
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, marginBottom: 16 }}>
          {hydrateError}
        </Text>
        <Pressable
          onPress={() => {
            setHydrateError(null);
            hydrate().catch(e =>
              setHydrateError(e instanceof Error ? e.message : 'Falha ao carregar dados')
            );
          }}
          style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  // Hydration BLOQUEIA o render — sem profile/settings carregados, todas as
  // telas crasham porque dependem deles. Fontes NÃO bloqueiam: em rede ruim
  // o useFonts[loaded] demorava 10s+ e congelava o app inteiro num skeleton.
  // System fonts renderizam imediatamente, custom fonts fazem fade-in quando
  // chegam (pequeno reflow tipográfico, mas app interativo em < 1s).
  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <StatusBar style={statusBarStyle} />
        <HomeSkeleton />
      </SafeAreaProvider>
    );
  }
  // fontsLoaded é só telemetria pra dev — não bloqueia mais.
  void fontsLoaded;

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={statusBarStyle} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: 'slide_from_right',
            animationDuration: 280,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="closet" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="weekly-report" options={{ presentation: 'modal' }} />
          <Stack.Screen name="help" options={{ presentation: 'modal' }} />
          <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
          <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
          <Stack.Screen name="achievements" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="share" options={{ presentation: 'modal' }} />
          <Stack.Screen name="customize" options={{ presentation: 'modal' }} />
          <Stack.Screen name="rewards" options={{ presentation: 'modal' }} />
          <Stack.Screen name="signup" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="checkin" />
          <Stack.Screen name="checkin-result" />
          <Stack.Screen name="mission" />
          <Stack.Screen name="mission-done" />
          <Stack.Screen name="evolution" />
          <Stack.Screen name="streak" />
          <Stack.Screen name="inventory" />
          <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
          <Stack.Screen name="cancel" options={{ presentation: 'modal' }} />
          <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
          <Stack.Screen name="safety" options={{ presentation: 'modal' }} />
          <Stack.Screen name="breathe" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="safe-night" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
        <UnlockToast data={currentToast} onDone={shiftToast} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
