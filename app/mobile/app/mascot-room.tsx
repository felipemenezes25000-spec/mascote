/** /mascot-room — quarto do mascote com Mascot2D em destaque e gestos manuais. */

import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MascotRenderer } from '@/components/MascotRenderer';
import { MascotInteractive, type MascotGestureKind } from '@/components/MascotInteractive';
import { SceneBackground } from '@/components/SceneBackground';
import { Typography } from '@/components/ui';
import { habitMeta } from '@/content/missions';
import { emergentPhaseLabels } from '@/lib/phaseLabels';
import { useStore } from '@/store';
import { useTheme } from '@/lib/useTheme';
import * as Haptics from 'expo-haptics';
import type { HabitKind, MascotMood } from '@/types';

/** Hábitos-núcleo oferecidos como atalho de check-in dentro do quarto. */
const ROOM_HABITS: HabitKind[] = ['water', 'sleep', 'exercise', 'meditation', 'reading'];

const MOOD_LABELS: Record<MascotMood, string> = {
  triste: 'Quietinho',
  ok: 'Tranquilo',
  feliz: 'Feliz',
  empolgado: 'Radiante',
  exausto: 'Precisando de descanso',
};

export default function MascotRoom() {
  const theme = useTheme();
  const mascot = useStore(s => s.mascot);
  const settings = useStore(s => s.settings);

  const handleGesture = useCallback((kind: MascotGestureKind) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void kind;
  }, []);

  const handleHabitTap = useCallback((habit: HabitKind) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/checkin', params: { habit } });
  }, []);

  if (!mascot) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
        <Typography variant="body" style={{ color: theme.colors.textSecondary, padding: 16 }}>
          Mascote ainda não carregou.
        </Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SceneBackground sceneId="room" height={420}>
          <View style={styles.heroWrap}>
            <MascotInteractive
              onGesture={handleGesture}
              reduceMotion={settings?.reduce_motion}
              accessibilityLabel={`Carinho no ${mascot.name}`}
            >
              <MascotRenderer
                personality={mascot.personality}
                phase={mascot.phase}
                mood={mascot.mood}
                size={260}
                proceduralGenome={mascot.procedural_genome ?? null}
              />
            </MascotInteractive>
          </View>
        </SceneBackground>

        <View
          style={styles.identityRow}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${mascot.name}, ${emergentPhaseLabels[mascot.phase]}, ${MOOD_LABELS[mascot.mood]}`}
        >
          <Typography variant="body" style={[styles.name, { color: theme.colors.text }]}>
            {mascot.name}
          </Typography>
          <Typography variant="body" style={{ color: theme.colors.textSecondary }}>
            {emergentPhaseLabels[mascot.phase]} · {MOOD_LABELS[mascot.mood]}
          </Typography>
        </View>

        <View style={styles.actions}>
          <Typography variant="body" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            O que vamos fazer agora?
          </Typography>
          <View style={styles.habitsRow}>
            {ROOM_HABITS.map(h => (
              <Pressable
                key={h}
                onPress={() => handleHabitTap(h)}
                style={({ pressed }) => [
                  styles.habitBtn,
                  {
                    backgroundColor: pressed ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Registrar: ${habitMeta[h].label}`}
              >
                <Typography variant="body" style={{ color: theme.colors.text, fontSize: 13 }}>
                  {habitMeta[h].emoji} {habitMeta[h].label}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },
  heroWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  identityRow: { padding: 20, alignItems: 'center', gap: 4 },
  name: { fontSize: 22, fontWeight: '800' },
  actions: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  habitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  habitBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
});
