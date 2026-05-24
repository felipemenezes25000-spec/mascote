/**
 * /mascot-room — quarto vivo do mascote (Unity Mascot Room).
 *
 * Esta rota é o destino premium da experiência: Unity render do mascote em
 * cena 3D dedicada, com debug panel, botões de teste e fallback automático
 * para Three.js se Unity falhar.
 *
 * Diferente de /mascot (identidade — DNA/afinidades/marcos), esta tela é
 * sobre a CRIATURA viva e interativa.
 */

import { router, Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { MascotRenderer } from '@/components/MascotRenderer';
import { Typography } from '@/components/ui';
import {
  buildUnityMascotState,
  isUnityEnabled,
  resolveRendererMode,
} from '@/core/mascot-render-contract';
import type { UnityHabitKind, UnityMascotState } from '@/core/mascot-render-contract';
import { unityMascotBridge } from '@/components/unity/UnityMascotBridge';
import { sendEventPlay, sendGesture } from '@/components/unity/unityMessageMapper';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const TEST_HABITS: UnityHabitKind[] = ['water', 'sleep', 'exercise', 'meditation', 'reading'];

export default function MascotRoom() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const settings = useStore(s => s.settings);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [reduceMotion, setReduceMotion] = useState<boolean>(settings?.reduce_motion ?? false);
  const [ackTick, setAckTick] = useState(0);

  const appendLog = useCallback((line: string) => {
    setDebugLog(prev => [...prev.slice(-7), `${new Date().toLocaleTimeString()} ${line}`]);
  }, []);

  useEffect(() => {
    const unsub = unityMascotBridge.subscribe(msg => {
      if (msg.type === 'ack') setAckTick(v => v + 1);
      appendLog(`← ${msg.type}${'message' in msg ? ` (${msg.message})` : ''}`);
    });
    return unsub;
  }, [appendLog]);

  useEffect(() => {
    const timer = setInterval(() => setAckTick(v => v + 1), 600);
    return () => clearInterval(timer);
  }, []);

  const rendererMode = resolveRendererMode({ preferUnity: true });
  const ackStats = useMemo(() => unityMascotBridge.getAckStats(), [ackTick]);

  const unityState: UnityMascotState | null = useMemo(() => {
    if (!mascot) return null;
    return buildUnityMascotState(mascot, {
      profile,
      reduceMotion,
      quality: 'auto',
    });
  }, [mascot, profile, reduceMotion]);

  const handleHabitTest = useCallback(
    (habit: UnityHabitKind) => {
      sendEventPlay({ kind: 'habit', habit, intensity: 1 });
      appendLog(`→ event.play habit:${habit}`);
    },
    [appendLog],
  );

  const handleGesture = useCallback(
    (gesture: 'tap' | 'pet' | 'poke') => {
      sendGesture(gesture);
      appendLog(`→ gesture ${gesture}`);
    },
    [appendLog],
  );

  const handleLevelUp = useCallback(() => {
    sendEventPlay({ kind: 'phase.advanced', from: 'baby', to: 'child' });
    appendLog('→ event.play phase.advanced');
  }, [appendLog]);

  if (!profile || !mascot) return <Redirect href="/splash" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Icon name="arrow-left" size={22} color={theme.colors.text} strokeWidth={2.2} />
        </Pressable>
        <Typography variant="title" style={styles.headerTitle}>Quarto do mascote</Typography>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.stage}>
          <MascotRenderer
            personality={mascot.personality}
            phase={mascot.phase}
            mood={mascot.mood}
            size={260}
            reduceMotion={reduceMotion}
            unityState={unityState}
            preferUnity
          />
        </View>

        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>Interagir</Typography>
          <View style={styles.row}>
            <TestButton label="Tap" onPress={() => handleGesture('tap')} />
            <TestButton label="Pet" onPress={() => handleGesture('pet')} />
            <TestButton label="Poke" onPress={() => handleGesture('poke')} />
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>Disparar reação por hábito</Typography>
          <View style={styles.row}>
            {TEST_HABITS.map(h => (
              <TestButton key={h} label={h} onPress={() => handleHabitTest(h)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>Eventos</Typography>
          <View style={styles.row}>
            <TestButton label="Phase advance" onPress={handleLevelUp} />
            <TestButton
              label={reduceMotion ? 'Reduce motion ON' : 'Reduce motion OFF'}
              onPress={() => {
                setReduceMotion(v => !v);
                appendLog(`→ reduceMotion=${!reduceMotion}`);
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>Debug</Typography>
          <Typography variant="mono" tone="secondary" style={styles.debugStatus}>
            renderer: {rendererMode} · unityFlag: {String(isUnityEnabled())} · nativeEmbedded: {String(unityMascotBridge.isNativeEmbedded())} · mascot: {mascot.name} · phase: {mascot.phase}
          </Typography>
          <Typography variant="mono" tone="secondary" style={styles.debugStatus}>
            ack ms: {ackStats.lastAckLatencyMs ?? '-'} · retry: {ackStats.retryCount} · ack seq: {ackStats.lastAckSeq ?? '-'} · timeout: {ackStats.timeoutCount}
          </Typography>
          <View style={styles.debugBox}>
            {debugLog.length === 0 ? (
              <Typography variant="mono" tone="dim">aguardando mensagens…</Typography>
            ) : (
              debugLog.map((line, i) => (
                <Typography key={i} variant="mono" tone="secondary" style={styles.debugLine}>{line}</Typography>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface TestButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

function TestButton({ label, onPress, style }: TestButtonProps) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && styles.buttonPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Typography variant="mono" style={styles.buttonLabel}>{label}</Typography>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerTitle: {},
    scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    stage: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    section: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      lineHeight: 22,
      marginBottom: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    button: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    buttonPressed: { opacity: 0.7 },
    buttonLabel: {
      color: theme.tokens.semantic.inkOnBrand,
      fontSize: 12,
      letterSpacing: 0.3,
    },
    debugStatus: {
      fontSize: 11,
      marginBottom: theme.spacing.sm,
    },
    debugBox: {
      backgroundColor: theme.colors.bg,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 80,
    },
    debugLine: {
      fontSize: 11,
      lineHeight: 16,
    },
  });
}

