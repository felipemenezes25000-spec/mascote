/**
 * Mini-jogo respiração 4-7-8 — técnica do Dr. Andrew Weil.
 * 5 ciclos = ~95s. Conta como check-in de breath + XP.
 *
 * Visual premium: círculo que expande (4s inspira) → segura (7s) → encolhe (8s expira).
 * Multi-layer glow (auras concêntricas), tipografia editorial nos números/labels.
 * Reanimated worklet pra animação fluida 60fps.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { applyCheckinFully } from '@/lib/checkin';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import { makeShadow } from '@/lib/themes';
import type { Theme } from '@/lib/themes';

const TOTAL_CYCLES = 5;
type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'done';

interface PhaseSpec {
  label: string;
  duration: number;
  scale: number;
  hint: string;
}

const PHASES: Record<Exclude<Phase, 'idle' | 'done'>, PhaseSpec> = {
  inhale: { label: 'INSPIRA', duration: 4000, scale: 1.6, hint: '4 segundos pelo nariz' },
  hold: { label: 'SEGURA', duration: 7000, scale: 1.6, hint: '7 segundos' },
  exhale: { label: 'EXPIRA', duration: 8000, scale: 0.7, hint: '8 segundos pela boca' },
};

export default function Breathe() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshStreak = useStore(s => s.refreshStreak);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const [phase, setPhase] = useState<Phase>('idle');
  const [cycle, setCycle] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const scale = useSharedValue(0.7);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function cleanup() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  useEffect(() => cleanup, []);

  function hapticBeat() {
    if (Platform.OS === 'web') return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  function transitionTo(next: Exclude<Phase, 'idle'>, currentCycle: number) {
    setPhase(next);
    if (next === 'done') {
      void finish();
      return;
    }
    const spec = PHASES[next];
    scale.value = withTiming(spec.scale, {
      duration: spec.duration,
      easing: Easing.inOut(Easing.cubic),
    });
    hapticBeat();
    setSecondsLeft(Math.floor(spec.duration / 1000));
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => Math.max(1, s - 1));
    }, 1000);
    timerRef.current = setTimeout(() => {
      if (next === 'inhale') transitionTo('hold', currentCycle);
      else if (next === 'hold') transitionTo('exhale', currentCycle);
      else if (next === 'exhale') {
        const nextCycle = currentCycle + 1;
        setCycle(nextCycle);
        if (nextCycle >= TOTAL_CYCLES) transitionTo('done', nextCycle);
        else transitionTo('inhale', nextCycle);
      }
    }, spec.duration);
  }

  function start() {
    setCycle(0);
    transitionTo('inhale', 0);
  }

  function stop() {
    cleanup();
    setPhase('idle');
    setCycle(0);
    scale.value = withTiming(0.7, { duration: 500 });
  }

  async function finish() {
    cleanup();
    if (!profile || !mascot) return;
    // try/catch ao redor de applyCheckinFully: se AsyncStorage falhar a meio do
    // pipeline (xp event vs wallet, p.ex.), a tela "Terminou" ainda renderiza
    // e o user não fica preso num estado intermediário. Refreshes também
    // catch — leitura falha mantém o estado anterior em memória.
    try {
      const out = await applyCheckinFully({
        profile,
        mascot,
        kind: 'breath',
        value: TOTAL_CYCLES,
        unit: 'cycles',
        baseXp: 25,
        coins: 15,
        analyticsPath: 'breathe',
      });
      await Promise.all([
        refreshMascot().catch(() => {}),
        refreshStreak().catch(() => {}),
        refreshWallet().catch(() => {}),
      ]);
      for (const a of out.unlocks.achievements)
        enqueueToast({ kind: 'achievement', emoji: a.emoji, title: a.title, subtitle: a.description });
      for (const acc of out.unlocks.accessories)
        enqueueToast({ kind: 'accessory', emoji: acc.emoji, title: acc.name, subtitle: 'Equipe no Closet' });
      for (const sc of out.unlocks.scenes)
        enqueueToast({ kind: 'scene', emoji: sc.emoji, title: sc.name, subtitle: 'Cenário desbloqueado' });
    } catch {
      // Mantém o usuário na tela "done" mesmo sem reward — não trava UI.
      // Tela já mostra "+25 XP" estático, mas o cap diário pode ter limitado.
    }
  }

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.25 }],
    opacity: 0.3 + (scale.value - 0.7) * 0.4,
  }));

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.heroIconWrap}>
            <Icon name="wind" size={48} color={theme.colors.primary} strokeWidth={1.6} />
          </View>
          <Text style={styles.title}>Terminou</Text>
          <Text style={styles.subtitle}>
            5 ciclos completos. Sente o ritmo do coração mais devagar?
          </Text>
          <View style={styles.rewards}>
            <View style={styles.reward}>
              <Icon name="zap" size={11} color={theme.colors.primary} strokeWidth={2.4} fill={theme.colors.primary} />
              <Text style={styles.rewardText}>+25 XP</Text>
            </View>
            <View style={styles.reward}>
              <Icon name="coins" size={11} color={theme.colors.primaryDeep} strokeWidth={2.4} />
              <Text style={styles.rewardText}>+15</Text>
            </View>
            <View style={styles.reward}>
              <Icon name="check" size={11} color={theme.colors.success} strokeWidth={2.6} />
              <Text style={styles.rewardText}>check-in</Text>
            </View>
          </View>
          <Button label="Voltar pra Home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <PressableScale
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar respiração"
        >
          <Icon name="x" size={16} color={theme.colors.text} strokeWidth={2.2} />
        </PressableScale>
        <Text style={styles.kicker}>RESPIRAÇÃO 4-7-8</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.center}>
        {phase === 'idle' ? (
          <>
            <View style={styles.heroIconWrap}>
              <Icon name="wind" size={48} color={theme.colors.primary} strokeWidth={1.6} />
            </View>
            <Text style={styles.title}>Respiração 4-7-8</Text>
            <Text style={styles.subtitle}>
              Inspira 4s pelo nariz, segura 7s, expira 8s pela boca. 5 ciclos. Ajuda a desacelerar o sistema nervoso.
            </Text>
            <Button label="Começar" onPress={start} style={{ marginTop: 24 }} />
            <View style={styles.hintRow}>
              <Icon name="clock" size={11} color={theme.colors.textDim} strokeWidth={2.2} />
              <Text style={styles.hint}>~95 segundos · +25 XP · +15 moedas</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.cycleBadge}>
              <Text style={styles.cycle}>
                CICLO {cycle + 1} / {TOTAL_CYCLES}
              </Text>
            </View>
            <View style={styles.bubbleWrap}>
              <Animated.View style={[styles.aura, auraStyle]} />
              <Animated.View style={[styles.bubble, circleStyle]}>
                <Text style={styles.phaseLabel}>{PHASES[phase as Exclude<Phase, 'idle' | 'done'>].label}</Text>
                <Text style={styles.phaseTimer}>{secondsLeft}</Text>
              </Animated.View>
            </View>
            <Text style={styles.phaseHint}>
              {PHASES[phase as Exclude<Phase, 'idle' | 'done'>].hint}
            </Text>
            <Pressable onPress={stop} hitSlop={10} style={{ marginTop: 24 }}>
              <Text style={styles.stopText}>Parar</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    close: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.6,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    heroIconWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    title: {
      ...theme.text.h1,
      color: theme.colors.text,
      textAlign: 'center',
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.6,
    },
    subtitle: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
      lineHeight: 22,
    },
    hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
    hint: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      letterSpacing: 0.4,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 11,
    },
    cycleBadge: {
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    cycle: {
      fontSize: 11,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.5,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    bubbleWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 320,
      height: 320,
    },
    aura: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: theme.colors.primary + '30',
    },
    bubble: {
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...makeShadow(theme.colors.primary, 0, 0, 40, 0.55, 10),
    },
    phaseLabel: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 16,
      letterSpacing: 2.5,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    phaseTimer: {
      color: '#fff',
      fontSize: 72,
      lineHeight: 76,
      marginTop: 4,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -2,
    },
    phaseHint: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 15,
    },
    stopText: {
      ...theme.text.body,
      color: theme.colors.textDim,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    rewards: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    reward: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    rewardText: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.2,
    },
  });
}
