/**
 * Minigame "Corrida de Energia" (⚡) — 30 segundos de coleta.
 *
 * Itens bons (💧⭐🍎✨) somam ponto ao tocar; ruins (🌫️😴) tiram (piso 0).
 * Cronograma de spawn é puro/determinístico (energy-run-logic, mulberry32);
 * a tela só dá o tick do relógio e converte frações 0..1 em pixels.
 *
 * Recompensa via completeMinigame — cap diário decidido no service; partida
 * além do cap continua divertida e a UI fala isso SEM culpa.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/ui';
import {
  buildSpawnSchedule,
  computeScore,
  GOOD_COUNT,
  ROUND_MS,
  type SpawnItem,
  type SpawnKind,
} from '@/game/minigames/energy-run-logic';
import { completeMinigame, type MinigameOutcome } from '@/game/minigames/service';
import { logger } from '@/lib/logger';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

type Phase = 'idle' | 'playing' | 'done';

const ITEM_SIZE = 56;
const TICK_MS = 100;

/** Labels de acessibilidade por tipo de item (Pressable cru não tem role default). */
const ITEM_LABELS: Record<SpawnKind, string> = {
  gota: 'Coletar gota d’água',
  estrela: 'Coletar estrela',
  fruta: 'Coletar fruta',
  energia: 'Coletar faísca de energia',
  desanimo: 'Nuvem de desânimo, tocar tira um ponto',
  cansaco: 'Cansaço, tocar tira um ponto',
};

export default function EnergyRun() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);

  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [points, setPoints] = useState(0);
  const [tapped, setTapped] = useState<ReadonlySet<number>>(new Set());
  const [outcome, setOutcome] = useState<MinigameOutcome | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [arena, setArena] = useState({ w: 0, h: 0 });

  const scheduleRef = useRef<SpawnItem[]>([]);
  // Espelho síncrono do state `tapped`: dedupe de double-tap precisa ser
  // imediato — o guard dentro do setTapped funcional não protege os efeitos
  // colaterais (contador/haptic) de dois taps no mesmo frame.
  const tappedRef = useRef<Set<number>>(new Set());
  const goodCollectedRef = useRef(0);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Garante UMA finalização por partida (tick de 100ms pode disparar 2x).
  const endedRef = useRef(false);
  // Evita setState após unmount em finishRound (await pipeline de recompensa).
  const mountedRef = useRef(true);

  function cleanup() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  function haptic(kind: 'good' | 'bad') {
    if (Platform.OS === 'web') return;
    try {
      void Haptics.impactAsync(
        kind === 'good'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Heavy,
      );
    } catch {}
  }

  function start() {
    cleanup();
    scheduleRef.current = buildSpawnSchedule(Date.now());
    tappedRef.current = new Set();
    goodCollectedRef.current = 0;
    endedRef.current = false;
    setTapped(new Set());
    setPoints(0);
    setOutcome(null);
    setSaveFailed(false);
    setElapsedMs(0);
    setPhase('playing');
    startedAtRef.current = Date.now();
    // Relógio mestre por timestamp (não acumula drift do setInterval).
    tickRef.current = setInterval(() => {
      const e = Date.now() - startedAtRef.current;
      if (e >= ROUND_MS) {
        setElapsedMs(ROUND_MS);
        void finishRound();
        return;
      }
      setElapsedMs(e);
    }, TICK_MS);
  }

  function onTapItem(item: SpawnItem) {
    if (phase !== 'playing' || endedRef.current) return;
    if (tappedRef.current.has(item.id)) return;
    tappedRef.current.add(item.id);
    setTapped(new Set(tappedRef.current));
    if (item.good) {
      goodCollectedRef.current += 1;
      setPoints(p => p + 1);
      haptic('good');
    } else {
      setPoints(p => Math.max(0, p - 1));
      haptic('bad');
    }
  }

  async function finishRound() {
    if (endedRef.current) return;
    endedRef.current = true;
    cleanup();
    setPhase('done');
    if (!profile || !mascot) {
      if (!mountedRef.current) return;
      Alert.alert('Ops', 'Não encontrei seu mascote. Volta pra Home e tenta de novo.');
      setSaveFailed(true);
      return;
    }
    try {
      const out = await completeMinigame({
        profile,
        mascot,
        gameId: 'energy-run',
        score: computeScore(goodCollectedRef.current, GOOD_COUNT),
        durationMs: ROUND_MS,
      });
      await Promise.all([
        refreshMascot().catch(() => {}),
        refreshWallet().catch(() => {}),
      ]);
      if (!mountedRef.current) return;
      if (out.leveledUp) {
        enqueueToast({
          kind: 'level',
          emoji: '⚡',
          title: 'Subiu de nível!',
          subtitle: 'A energia da corrida fez efeito',
        });
      }
      setOutcome(out);
    } catch (err) {
      logger.warn('[energy-run] completeMinigame failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      if (!mountedRef.current) return;
      setSaveFailed(true);
    }
  }

  const secondsLeft = Math.max(0, Math.ceil((ROUND_MS - elapsedMs) / 1000));
  const activeItems =
    phase === 'playing'
      ? scheduleRef.current.filter(
          it =>
            !tapped.has(it.id) &&
            elapsedMs >= it.atMs &&
            elapsedMs < it.atMs + it.lifeMs,
        )
      : [];

  if (phase === 'done') {
    const collected = goodCollectedRef.current;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.heroIconWrap}>
            <Typography variant="body" style={styles.heroEmoji}>⚡</Typography>
          </View>
          <Typography variant="body" style={styles.title}>Boa corrida!</Typography>
          <Typography variant="body" style={styles.subtitle}>
            Você coletou {collected} de {GOOD_COUNT} itens de energia. Placar final: {points}.
          </Typography>
          {outcome ? (
            outcome.rewarded ? (
              <>
                <View style={styles.rewards}>
                  <View style={styles.reward}>
                    <Icon name="coins" size={11} color={theme.colors.primaryDeep} strokeWidth={2.4} />
                    <Typography variant="body" style={styles.rewardText}>
                      +{outcome.coinsEarned}
                    </Typography>
                  </View>
                  <View style={styles.reward}>
                    <Icon
                      name="zap"
                      size={11}
                      color={theme.colors.primary}
                      strokeWidth={2.4}
                      fill={theme.colors.primary}
                    />
                    <Typography variant="body" style={styles.rewardText}>
                      +{outcome.xpEarned} XP
                    </Typography>
                  </View>
                </View>
                <Typography variant="body" style={styles.capHint}>
                  {outcome.rewardedPlaysLeft > 0
                    ? `Ainda valem recompensas: ${outcome.rewardedPlaysLeft} ${outcome.rewardedPlaysLeft === 1 ? 'partida' : 'partidas'} hoje.`
                    : 'Recompensas de hoje completas — pode seguir jogando por diversão!'}
                </Typography>
              </>
            ) : (
              <Typography variant="body" style={styles.capHint}>
                Partida extra — valeu pela diversão! Recompensas voltam amanhã.
              </Typography>
            )
          ) : (
            <Typography variant="body" style={styles.capHint}>
              {saveFailed
                ? 'A corrida terminou, mas não consegui registrar as recompensas. Tenta de novo mais tarde.'
                : 'Contando a energia...'}
            </Typography>
          )}
          <Button label="Jogar de novo" onPress={start} style={{ marginTop: 12 }} />
          <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
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
          accessibilityLabel="Fechar Corrida de Energia"
        >
          <Icon name="x" size={16} color={theme.colors.text} strokeWidth={2.2} />
        </PressableScale>
        <Typography variant="body" style={styles.kicker}>CORRIDA DE ENERGIA</Typography>
        <View style={{ width: 38 }} />
      </View>

      {phase === 'idle' ? (
        <View style={styles.center}>
          <View style={styles.heroIconWrap}>
            <Typography variant="body" style={styles.heroEmoji}>⚡</Typography>
          </View>
          <Typography variant="body" style={styles.title}>Corrida de Energia</Typography>
          <Typography variant="body" style={styles.subtitle}>
            Toque nas gotas 💧, estrelas ⭐, frutas 🍎 e faíscas ✨ antes que sumam.
            Desvie das nuvens de desânimo 🌫️ e do cansaço 😴 — eles tiram ponto.
          </Typography>
          <Button label="Começar" onPress={start} style={{ marginTop: 24 }} />
          <View style={styles.hintRow}>
            <Icon name="clock" size={11} color={theme.colors.textDim} strokeWidth={2.2} />
            <Typography variant="body" style={styles.hint}>30 segundos · moedas + XP pelo placar</Typography>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.hudRow}>
            <View style={styles.hudPill}>
              <Icon name="clock" size={12} color={theme.colors.primary} strokeWidth={2.4} />
              <Typography variant="body" style={styles.hudText}>{secondsLeft}s</Typography>
            </View>
            <View style={styles.hudPill}>
              <Icon
                name="zap"
                size={12}
                color={theme.colors.primary}
                strokeWidth={2.4}
                fill={theme.colors.primary}
              />
              <Typography variant="body" style={styles.hudText}>{points}</Typography>
            </View>
          </View>
          <View
            style={styles.arena}
            onLayout={e => setArena({
              w: e.nativeEvent.layout.width,
              h: e.nativeEvent.layout.height,
            })}
          >
            {arena.w > 0 &&
              activeItems.map(item => (
                <SpawnedItemView
                  key={item.id}
                  item={item}
                  left={item.x * (arena.w - ITEM_SIZE)}
                  top={item.y * (arena.h - ITEM_SIZE)}
                  onTap={onTapItem}
                  styles={styles}
                />
              ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

interface SpawnedItemProps {
  item: SpawnItem;
  left: number;
  top: number;
  onTap: (item: SpawnItem) => void;
  styles: ReturnType<typeof makeStyles>;
}

function SpawnedItemView({ item, left, top, onTap, styles }: SpawnedItemProps) {
  // Pop-in suave no spawn; componente monta quando o item entra na janela ativa.
  const pop = useSharedValue(0.4);
  useEffect(() => {
    pop.value = withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 });
  }, [pop]);
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top }, popStyle]}>
      <PressableScale
        onPress={() => onTap(item)}
        accessibilityRole="button"
        accessibilityLabel={ITEM_LABELS[item.kind]}
        style={[styles.item, item.good ? styles.itemGood : styles.itemBad]}
      >
        <Typography variant="body" style={styles.itemEmoji}>{item.emoji}</Typography>
      </PressableScale>
    </Animated.View>
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
    heroEmoji: { fontSize: 44, lineHeight: 56 },
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
    hudRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    hudPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
      minWidth: 76,
      justifyContent: 'center',
    },
    hudText: {
      fontSize: 15,
      color: theme.colors.primary,
      fontWeight: '800',
      fontFamily: 'JetBrainsMono_500Medium',
      letterSpacing: 0.4,
    },
    arena: {
      flex: 1,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bg2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    item: {
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      borderRadius: ITEM_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    itemGood: {
      backgroundColor: theme.colors.primaryTint,
      borderColor: theme.colors.primarySoft,
    },
    itemBad: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border2,
    },
    itemEmoji: { fontSize: 28, lineHeight: 36 },
    rewards: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
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
    capHint: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
    },
  });
}
