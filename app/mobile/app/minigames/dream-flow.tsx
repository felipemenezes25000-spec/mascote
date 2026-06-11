import { Typography } from '@/components/ui';
/**
 * Mundo dos Sonhos 🌙 — minigame de ritmo calmo (tema: descanso).
 *
 * Um anel de luz pulsa expandindo e contraindo em ciclos lentos (~3.2s).
 * O jogador toca quando o anel encosta no anel-alvo ao redor da lua.
 * 8 rodadas; acerto embala uma estrela ⭐, erro não tira nada (sem culpa).
 *
 * Timing: o acerto é medido contra o RELÓGIO da animação
 * (Date.now() - cycleStartRef), nunca contra estado React — setState atrasa
 * e roubaria acertos legítimos. A janela é função pura em dream-flow-logic.
 *
 * Visual: noite SEMPRE escura (gradiente fixo sobre tokens dark) — toda
 * tinta sobre o gradiente é claro-FIXO consciente (inkOnDark), nunca
 * theme.colors.text, que escurece no light mode (lição auditoria 2026-06-05:
 * fundo de cor fixa exige tinta fixa).
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import {
  computeScore,
  DREAM_CYCLE_MS,
  DREAM_HIT_WINDOW_FRACTION,
  DREAM_ROUNDS,
  isHit,
} from '@/game/minigames/dream-flow-logic';
import { MINIGAME_COINS_MAX, MINIGAME_XP_MAX } from '@/game/minigames/registry';
import { completeMinigame, type MinigameOutcome } from '@/game/minigames/service';
import { logger } from '@/lib/logger';
import { playSfx } from '@/lib/sfx';
import { makeShadow } from '@/lib/themes';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

type GamePhase = 'idle' | 'playing' | 'saving' | 'done';

/** Diâmetro do anel-alvo; o anel de luz tem o mesmo tamanho base. */
const TARGET_SIZE = 230;
/** Escala mínima do anel de luz (início/fim do ciclo). No pico, escala 1. */
const RING_MIN = 0.42;

export default function DreamFlow() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);

  const [phase, setPhase] = useState<GamePhase>('idle');
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: 'hit' | 'miss'; text: string } | null>(null);
  const [outcome, setOutcome] = useState<MinigameOutcome | null>(null);

  // Escala do anel de luz: RING_MIN → 1 (pico, encosta no alvo) → RING_MIN.
  const pulse = useSharedValue(RING_MIN);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Relógio do ciclo atual — fonte de verdade do acerto (estado React atrasa).
  const cycleStartRef = useRef(0);
  // Um toque por rodada: o primeiro decide, os demais são ignorados.
  const tappedRef = useRef(false);
  // Acertos em ref pro finishGame ler valor fresco (setHits é assíncrono).
  const hitsRef = useRef(0);
  const startedAtRef = useRef(0);
  // Evita setState após unmount em `finishGame` (await da pipeline de reward).
  const mountedRef = useRef(true);

  function cleanup() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
      // Sem isso o worklet do withSequence segue animando no UI thread
      // após sair no meio da partida (8 ciclos × 3.2s = ~26s).
      cancelAnimation(pulse);
    };
  }, [pulse]);

  function hapticSoft() {
    if (Platform.OS === 'web') return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  function startGame() {
    hitsRef.current = 0;
    startedAtRef.current = Date.now();
    setHits(0);
    setFeedback(null);
    setOutcome(null);
    setPhase('playing');
    runCycle(0);
  }

  function runCycle(index: number) {
    setRound(index);
    tappedRef.current = false;
    cycleStartRef.current = Date.now();
    pulse.value = RING_MIN;
    pulse.value = withSequence(
      withTiming(1, { duration: DREAM_CYCLE_MS / 2, easing: Easing.inOut(Easing.sin) }),
      withTiming(RING_MIN, { duration: DREAM_CYCLE_MS / 2, easing: Easing.inOut(Easing.sin) }),
    );
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const next = index + 1;
      if (next >= DREAM_ROUNDS) void finishGame();
      else runCycle(next);
    }, DREAM_CYCLE_MS);
  }

  function onTapPlayArea() {
    if (tappedRef.current) return;
    tappedRef.current = true;
    // Mede contra o relógio do ciclo, não contra estado (estado atrasa).
    const elapsed = Date.now() - cycleStartRef.current;
    if (isHit(elapsed, DREAM_CYCLE_MS, DREAM_HIT_WINDOW_FRACTION)) {
      hitsRef.current += 1;
      setHits(hitsRef.current);
      setFeedback({ kind: 'hit', text: 'Sonho embalado 🌙' });
      hapticSoft();
    } else {
      // Sem punição: errar não tira estrela nem encurta a partida.
      setFeedback({ kind: 'miss', text: 'Quase... respira no ritmo' });
    }
  }

  async function finishGame() {
    cleanup();
    cancelAnimation(pulse);
    setPhase('saving');
    const score = computeScore(hitsRef.current, DREAM_ROUNDS);
    const durationMs = Date.now() - startedAtRef.current;
    if (!profile || !mascot) {
      if (!mountedRef.current) return;
      Alert.alert('Ops', 'Não encontrei seu mascote. Volta pra Home e tenta de novo.');
      setPhase('idle');
      return;
    }
    try {
      const out = await completeMinigame({
        profile,
        mascot,
        gameId: 'dream-flow',
        score,
        durationMs,
      });
      await Promise.all([
        refreshMascot().catch(() => {}),
        refreshWallet().catch(() => {}),
      ]);
      if (!mountedRef.current) return;
      if (out.leveledUp) {
        enqueueToast({
          kind: 'level',
          emoji: '🌙',
          title: 'Subiu de nível!',
          subtitle: 'Descansar também faz crescer.',
        });
      }
      // Sino noturno junto com o painel de resultado — só se a partida pagou.
      if (out.rewarded) playSfx('night', { enabled: useStore.getState().settings?.sfx_enabled !== false });
      setOutcome(out);
      setPhase('done');
    } catch (err) {
      logger.warn('[dream-flow] completeMinigame failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      if (!mountedRef.current) return;
      Alert.alert(
        'Não salvei a partida',
        'O sonho terminou, mas não consegui registrar. Tenta de novo.',
      );
      setPhase('idle');
    }
  }

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    // Mais visível conforme se aproxima do alvo — reforço visual do ritmo.
    opacity: 0.3 + pulse.value * 0.6,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Noite fixa: véu lilás no topo desmanchando no escuro — só tokens. */}
      <LinearGradient
        colors={[theme.colors.lilacDeep + '33', theme.colors.bgDark, theme.colors.bgDark]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.headerRow}>
        <PressableScale
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar Mundo dos Sonhos"
        >
          <Icon name="x" size={16} color={theme.tokens.semantic.inkOnDark} strokeWidth={2.2} />
        </PressableScale>
        <Typography variant="body" style={styles.kicker}>MUNDO DOS SONHOS</Typography>
        <View style={{ width: 38 }} />
      </View>

      {phase === 'idle' && (
        <View style={styles.center}>
          <Typography variant="body" style={styles.heroMoon}>🌙</Typography>
          <Typography variant="body" style={styles.title}>Mundo dos Sonhos</Typography>
          <Typography variant="body" style={styles.subtitle}>
            Toque quando o anel de luz encostar na lua. {DREAM_ROUNDS} rodadas, ritmo
            bem calmo. Errar não tira nada — é só seguir o embalo.
          </Typography>
          <Button label="Começar" onPress={startGame} style={{ marginTop: 24 }} />
          <View style={styles.hintRow}>
            <Icon name="moon" size={11} color={theme.tokens.semantic.inkOnDark + '7A'} strokeWidth={2.2} />
            <Typography variant="body" style={styles.hint}>
              ~26 segundos · até +{MINIGAME_COINS_MAX} moedas · até +{MINIGAME_XP_MAX} XP
            </Typography>
          </View>
        </View>
      )}

      {phase === 'playing' && (
        <Pressable
          style={styles.playArea}
          onPress={onTapPlayArea}
          accessibilityRole="button"
          accessibilityLabel={`Embalar o sonho: toque quando o anel de luz alcançar o anel ao redor da lua. Rodada ${round + 1} de ${DREAM_ROUNDS}, ${hits} estrelas embaladas`}
        >
          <View style={styles.roundBadge}>
            <Typography variant="body" style={styles.roundText}>
              RODADA {round + 1} / {DREAM_ROUNDS}
            </Typography>
          </View>

          <View style={styles.skyWrap}>
            <Animated.View style={[styles.pulseRing, pulseStyle]} />
            <View style={styles.targetRing} />
            <Typography variant="body" style={styles.moon}>🌙</Typography>
          </View>

          <Typography
            variant="body"
            style={[styles.feedback, feedback?.kind === 'hit' ? styles.feedbackHit : null]}
          >
            {feedback?.text ?? 'No pico da luz, toca suave.'}
          </Typography>

          <View style={styles.starsRow}>
            {Array.from({ length: DREAM_ROUNDS }).map((_, i) => (
              <Typography
                key={`estrela-${i}`}
                variant="body"
                style={i < hits ? styles.starOn : styles.starOff}
              >
                ⭐
              </Typography>
            ))}
          </View>
        </Pressable>
      )}

      {phase === 'saving' && (
        <View style={styles.center}>
          <Typography variant="body" style={styles.heroMoon}>🌙</Typography>
          <Typography variant="body" style={styles.subtitle}>Embalando o sonho...</Typography>
        </View>
      )}

      {phase === 'done' && outcome && (
        <View style={styles.center}>
          <Typography variant="body" style={styles.heroMoon}>🌙</Typography>
          <Typography variant="body" style={styles.title}>Bons sonhos.</Typography>
          <Typography variant="body" style={styles.subtitle}>
            {hits} de {DREAM_ROUNDS} sonhos embalados.
          </Typography>
          {outcome.rewarded ? (
            <View style={styles.rewards}>
              <View style={styles.reward}>
                <Icon name="moon" size={11} color={theme.colors.gold} strokeWidth={2.4} />
                <Typography variant="body" style={styles.rewardText}>+{outcome.coinsEarned} moedas</Typography>
              </View>
              <View style={styles.reward}>
                <Icon name="sparkles" size={11} color={theme.colors.gold} strokeWidth={2.4} />
                <Typography variant="body" style={styles.rewardText}>+{outcome.xpEarned} XP</Typography>
              </View>
            </View>
          ) : (
            <Typography variant="body" style={styles.extraPlay}>
              Partida extra — valeu pela calma! Recompensas voltam amanhã.
            </Typography>
          )}
          <View style={styles.doneActions}>
            <Button label="Jogar de novo" onPress={startGame} />
            <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  // Tintas claro-FIXAS pro fundo noturno fixo (nunca theme.colors.text aqui).
  const ink = theme.tokens.semantic.inkOnDark;
  const inkSoft = ink + 'B8';
  const inkDim = ink + '7A';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bgDark },
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
      backgroundColor: ink + '14',
      borderWidth: 1,
      borderColor: ink + '26',
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: {
      fontSize: 10,
      color: theme.colors.gold,
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
    playArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    heroMoon: { fontSize: 56, lineHeight: 64 },
    title: {
      ...theme.text.h1,
      color: ink,
      textAlign: 'center',
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.6,
    },
    subtitle: {
      ...theme.text.body,
      color: inkSoft,
      textAlign: 'center',
      maxWidth: 320,
      lineHeight: 22,
    },
    hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
    hint: {
      ...theme.text.xs,
      color: inkDim,
      letterSpacing: 0.4,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 11,
    },
    roundBadge: {
      backgroundColor: theme.colors.lilac + '22',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.lilac + '40',
    },
    roundText: {
      fontSize: 11,
      color: theme.colors.lilac,
      fontWeight: '800',
      letterSpacing: 1.5,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    skyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: TARGET_SIZE + 60,
      height: TARGET_SIZE + 60,
    },
    targetRing: {
      position: 'absolute',
      width: TARGET_SIZE,
      height: TARGET_SIZE,
      borderRadius: TARGET_SIZE / 2,
      borderWidth: 2,
      borderColor: theme.colors.gold + 'B0',
    },
    pulseRing: {
      position: 'absolute',
      width: TARGET_SIZE,
      height: TARGET_SIZE,
      borderRadius: TARGET_SIZE / 2,
      borderWidth: 3,
      borderColor: theme.colors.lilac,
      ...makeShadow(theme.colors.lilac, 0, 0, 24, 0.6, 8),
    },
    moon: { fontSize: 64, lineHeight: 72 },
    feedback: {
      ...theme.text.sm,
      color: inkSoft,
      textAlign: 'center',
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 15,
      // Altura reservada: o texto troca a cada toque sem pular o layout.
      minHeight: 22,
    },
    feedbackHit: { color: theme.colors.gold },
    starsRow: { flexDirection: 'row', gap: 6 },
    starOn: { fontSize: 18, lineHeight: 24 },
    starOff: { fontSize: 18, lineHeight: 24, opacity: 0.18 },
    rewards: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    reward: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.gold + '1C',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.gold + '50',
    },
    rewardText: {
      color: theme.colors.gold,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.2,
    },
    extraPlay: {
      ...theme.text.sm,
      color: inkSoft,
      textAlign: 'center',
      maxWidth: 300,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 15,
      lineHeight: 22,
    },
    doneActions: { gap: theme.spacing.sm, marginTop: theme.spacing.md, alignSelf: 'stretch' },
  });
}
