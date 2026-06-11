/** /mascot-room — quarto do mascote com Mascot2D em destaque e gestos manuais. */

import { useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MascotRenderer } from '@/components/MascotRenderer';
import { MascotInteractive, type MascotGestureKind } from '@/components/MascotInteractive';
import { SceneBackground } from '@/components/SceneBackground';
import { Typography } from '@/components/ui';
import { habitMeta } from '@/content/missions';
import { emergentPhaseLabels } from '@/lib/phaseLabels';
import { applyCheckinFully } from '@/lib/checkin';
import { activeEventBoost } from '@/lib/events';
import { useStore } from '@/store';
import { useTheme } from '@/lib/useTheme';
import { logger } from '@/lib/logger';
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
  const profile = useStore(s => s.profile);
  const settings = useStore(s => s.settings);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshStreak = useStore(s => s.refreshStreak);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const checkingInRef = useRef(false);

  const handleGesture = useCallback((kind: MascotGestureKind) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void kind;
  }, []);

  // Antes: router.push('/checkin', { habit }) — mas /checkin é um survey FIXO de
  // 4 perguntas (sleep/water/exercise/breath) que IGNORA o param. Tocar
  // "Meditação"/"Leitura" abria um fluxo sem essas perguntas (param morto). Agora
  // o tap registra AQUELE hábito direto pelo pipeline canônico (com boost de
  // evento), coerente com a label "Registrar: X". Auditoria 2026-06-11.
  const handleHabitTap = useCallback(
    async (habit: HabitKind) => {
      if (!profile || !mascot || checkingInRef.current) return;
      checkingInRef.current = true;
      void Haptics.selectionAsync();
      try {
        const out = await applyCheckinFully({
          profile,
          mascot,
          kind: habit,
          analyticsPath: 'home',
          boost: activeEventBoost(),
        });
        await Promise.all([
          refreshMascot().catch(() => {}),
          refreshStreak().catch(() => {}),
          refreshWallet().catch(() => {}),
        ]);
        enqueueToast({
          kind: 'info',
          emoji: habitMeta[habit].emoji,
          title: `${habitMeta[habit].label} registrado`,
          subtitle: out.xpGained > 0 ? `+${out.xpGained} XP — ${mascot.name} sentiu o cuidado.` : 'Já contava por hoje 💛',
        });
      } catch (err) {
        logger.warn('[mascot-room] check-in failed', {
          reason: err instanceof Error ? err.message : 'unknown',
        });
        enqueueToast({ kind: 'info', emoji: '🌀', title: 'Não consegui registrar agora', subtitle: 'Tenta de novo num instante.' });
      } finally {
        checkingInRef.current = false;
      }
    },
    [profile, mascot, refreshMascot, refreshStreak, refreshWallet, enqueueToast],
  );

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
                onPress={() => void handleHabitTap(h)}
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
