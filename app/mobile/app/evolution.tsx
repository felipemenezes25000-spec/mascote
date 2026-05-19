import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { getPersonality } from '@/content/personalities';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';
import type { MascotPhase } from '@/types';

const PHASE_LABELS: Record<MascotPhase, string> = {
  ovo: 'Ovo',
  bebe: 'Bebê',
  crianca: 'Criança',
  adolescente: 'Adolescente',
  adulto: 'Adulto',
  evoluido: 'Forma Rara',
};

export default function EvolutionScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const mascot = useStore(s => s.mascot);
  const params = useLocalSearchParams<{ celebrate?: string }>();
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!mascot) return <Redirect href="/splash" />;

  // QA flagrou: visitas diretas a /evolution mostravam "{name} virou {phase}!"
  // (tela de celebração) mesmo quando a fase atual já era a inicial — confusão.
  // Sem `?celebrate=1` (que é setado pelo flow real de evolução), redirecionamos
  // pra aba de evolução (timeline com progresso até a próxima fase).
  if (!params.celebrate) return <Redirect href="/(tabs)/evolution" />;
  const meta = getPersonality(mascot.personality);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.heroWrap}>
          <SceneBackground sceneId="room" height={300}>
            <Mascot personality={mascot.personality} phase={mascot.phase} mood="empolgado" size={200} />
          </SceneBackground>
        </View>
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text style={styles.kicker}>EVOLUÇÃO</Text>
          <Text style={styles.title}>{mascot.name} virou {PHASE_LABELS[mascot.phase]}!</Text>
          <Text style={styles.subtitle}>{meta.tagline}</Text>
        </View>
        <Button label="Continuar" onPress={() => router.replace('/(tabs)')} />
      </View>
      <ConfettiBurst visible={confetti} />
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg, justifyContent: 'space-between' },
    heroWrap: { paddingHorizontal: 0 },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text, textAlign: 'center' },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center' },
  });
}
