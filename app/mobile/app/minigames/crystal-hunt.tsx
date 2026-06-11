/**
 * Caça aos Cristais 💎 — minigame de memória (grade 3×4, 6 pares).
 *
 * Vire duas cartas por vez: par → ficam abertas com brilho dourado;
 * erro → desviram sozinhas (sem punição, toques bloqueados no intervalo).
 * Score puro em src/game/minigames/crystal-hunt-logic.ts (6 movimentos
 * perfeitos = 1.0, piso 0 em 24). Recompensa via completeMinigame —
 * respeita cap diário de partidas recompensadas e cap global de XP.
 *
 * Flip 3D com reanimated (rotateY + backfaceVisibility); respeita
 * reduce_motion (flip instantâneo). Copy 100% sem culpa: partida além
 * do cap é celebrada como diversão, nunca como erro do usuário.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/ui';
import {
  buildDeck,
  computeScore,
  TOTAL_PAIRS,
} from '@/game/minigames/crystal-hunt-logic';
import { completeMinigame, type MinigameOutcome } from '@/game/minigames/service';
import { logger } from '@/lib/logger';
import { playSfx } from '@/lib/sfx';
import { makeShadow } from '@/lib/themes';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

const GAME_ID = 'crystal-hunt';
/** Tempo que o par errado fica visível antes de desvirar (toques bloqueados). */
const MISMATCH_FLIP_BACK_MS = 700;
/** Pausa pós-último par pra animação de brilho respirar antes do resultado. */
const FINISH_DELAY_MS = 900;
const FLIP_MS = 280;
const CARD_W = 92;
const CARD_H = 110;
const CARD_GAP = 10;

/** Uma frase por par encontrado (índice = pares achados - 1). Zero culpa. */
const MATCH_MICROCOPY = [
  'Pequena vitória ✨',
  'Que brilho! 💎',
  'Memória afiada 🔍',
  'Mais um par no bolso 🌿',
  'Quase lá, no seu ritmo ✨',
  'Todos os cristais! 🌟',
] as const;

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

type GamePhase = 'playing' | 'saving' | 'done';

interface CrystalCardProps {
  index: number;
  emoji: string;
  faceUp: boolean;
  matched: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: (index: number) => void;
}

/**
 * Carta individual — dona do próprio flip (rotateY 0→180 no verso,
 * -180→0 na frente, backfaceVisibility esconde o lado de trás).
 */
function CrystalCard({
  index,
  emoji,
  faceUp,
  matched,
  disabled,
  reduceMotion,
  onPress,
}: CrystalCardProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const open = faceUp || matched;
  const rot = useSharedValue(open ? 180 : 0);

  useEffect(() => {
    rot.value = withTiming(open ? 180 : 0, {
      duration: reduceMotion ? 0 : FLIP_MS,
      easing: Easing.inOut(Easing.quad),
    });
  }, [open, reduceMotion, rot]);

  useEffect(() => {
    return () => {
      // Higiene do repo: worklet não fica rodando no UI thread pós-unmount.
      cancelAnimation(rot);
    };
  }, [rot]);

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateY: `${rot.value}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateY: `${rot.value - 180}deg` }],
  }));

  const label = matched
    ? `Carta ${index + 1}, par de ${emoji} encontrado`
    : faceUp
      ? `Carta ${index + 1}, cristal ${emoji} virado pra cima`
      : `Carta ${index + 1}, virada pra baixo`;
  const blocked = disabled || matched || faceUp;

  return (
    <Pressable
      onPress={() => onPress(index)}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked }}
      style={styles.cardSlot}
    >
      <Animated.View style={[styles.cardFace, styles.cardBack, backStyle]}>
        <Icon name="sparkle" size={22} color={theme.colors.primary} strokeWidth={2} />
      </Animated.View>
      <Animated.View
        style={[styles.cardFace, styles.cardFront, matched && styles.cardMatched, frontStyle]}
        // Carta virada pra baixo NÃO pode expor o cristal na árvore de a11y —
        // leitor de tela leria a resposta (QA 2026-06-11). backfaceVisibility
        // esconde só visualmente; aria-hidden cobre AT (RN 0.74 mapeia pra
        // accessibilityElementsHidden/importantForAccessibility no nativo;
        // accessibilityElementsHidden puro NÃO funciona no react-native-web).
        aria-hidden={!open}
      >
        <Typography variant="title" style={styles.cardEmoji}>
          {emoji}
        </Typography>
      </Animated.View>
    </Pressable>
  );
}

export default function CrystalHunt() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const reduceMotion = useStore(s => s.settings?.reduce_motion) ?? false;

  const [deck, setDeck] = useState<string[]>(() => buildDeck(newSeed()));
  const [faceUp, setFaceUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchMsg, setMatchMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [outcome, setOutcome] = useState<MinigameOutcome | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const startRef = useRef(Date.now());
  const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita setState após unmount em finishGame (await pipeline do service).
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  function hapticTap() {
    if (Platform.OS === 'web') return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  function hapticMatch() {
    if (Platform.OS === 'web') return;
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  function onCardPress(index: number) {
    if (phase !== 'playing') return;
    // Duas cartas erradas na mesa = janela de desvirar → bloqueia toques.
    if (faceUp.length >= 2) return;
    if (faceUp.includes(index) || matched.includes(index)) return;
    hapticTap();

    const next = [...faceUp, index];
    if (next.length < 2) {
      setFaceUp(next);
      return;
    }

    // Segunda carta do movimento — conta e resolve.
    const [a, b] = [next[0]!, next[1]!];
    const nextMoves = moves + 1;
    setMoves(nextMoves);

    if (deck[a] === deck[b]) {
      const nextMatched = [...matched, a, b];
      setMatched(nextMatched);
      setFaceUp([]);
      const pairsFound = nextMatched.length / 2;
      setMatchMsg(MATCH_MICROCOPY[pairsFound - 1] ?? MATCH_MICROCOPY[0]);
      hapticMatch();
      if (pairsFound >= TOTAL_PAIRS) {
        // Deixa o último brilho respirar antes do painel de resultado.
        if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
        finishTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          void finishGame(nextMoves);
        }, reduceMotion ? 0 : FINISH_DELAY_MS);
      }
    } else {
      setFaceUp(next);
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
      mismatchTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setFaceUp([]);
      }, MISMATCH_FLIP_BACK_MS);
    }
  }

  async function finishGame(finalMoves: number) {
    setPhase('saving');
    const durationMs = Date.now() - startRef.current;
    if (!profile || !mascot) {
      // Sem snapshot do mascote não tem como pagar — partida vale como diversão.
      setOutcome(null);
      setSaveFailed(true);
      setPhase('done');
      return;
    }
    try {
      const out = await completeMinigame({
        profile,
        mascot,
        gameId: GAME_ID,
        score: computeScore(finalMoves),
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
          emoji: '💎',
          title: 'Subiu de nível!',
          subtitle: 'O brilho dos cristais ajudou',
        });
      }
      // Jingle junto com o painel de resultado — só quando a partida pagou.
      if (out.rewarded) playSfx('coin', { enabled: useStore.getState().settings?.sfx_enabled !== false });
      setOutcome(out);
      setSaveFailed(false);
      setPhase('done');
    } catch (err) {
      logger.warn('[crystal-hunt] completeMinigame failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      if (!mountedRef.current) return;
      setOutcome(null);
      setSaveFailed(true);
      setPhase('done');
    }
  }

  function resetGame() {
    if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    setDeck(buildDeck(newSeed()));
    setFaceUp([]);
    setMatched([]);
    setMoves(0);
    setMatchMsg(null);
    setOutcome(null);
    setSaveFailed(false);
    startRef.current = Date.now();
    setPhase('playing');
  }

  const pairsFound = matched.length / 2;

  if (phase === 'done') {
    const rewarded = outcome?.rewarded === true;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.heroIconWrap}>
            <Icon name="gem" size={48} color={theme.colors.primary} strokeWidth={1.6} />
          </View>
          <Typography variant="title" align="center" style={styles.title}>
            Cristais reunidos!
          </Typography>
          <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
            Você fechou os {TOTAL_PAIRS} pares em {moves} movimentos.
          </Typography>

          {saveFailed ? (
            <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
              A partida valeu — só não consegui registrar a recompensa agora. Tenta de novo
              mais tarde.
            </Typography>
          ) : rewarded && outcome ? (
            <>
              <View style={styles.rewards}>
                <View style={styles.reward}>
                  <Icon
                    name="coins"
                    size={11}
                    color={theme.colors.primaryDeep}
                    strokeWidth={2.4}
                  />
                  <Typography variant="body" style={styles.rewardText}>
                    +{outcome.coinsEarned}
                  </Typography>
                </View>
                {outcome.xpEarned > 0 && (
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
                )}
                <View style={styles.reward}>
                  <Icon name="star" size={11} color={theme.colors.primary} strokeWidth={2.4} />
                  <Typography variant="body" style={styles.rewardText}>
                    {Math.round(computeScore(moves) * 100)}%
                  </Typography>
                </View>
              </View>
              <Typography variant="caption" tone="dim" align="center">
                {outcome.rewardedPlaysLeft > 0
                  ? `Mais ${outcome.rewardedPlaysLeft} ${
                      outcome.rewardedPlaysLeft === 1 ? 'partida' : 'partidas'
                    } com recompensa hoje`
                  : 'Recompensas de hoje completas — jogue pela diversão!'}
              </Typography>
            </>
          ) : (
            <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
              Partida extra — valeu pela diversão! Recompensas voltam amanhã.
            </Typography>
          )}

          <Button label="Jogar de novo" onPress={resetGame} style={styles.doneCta} />
          <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
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
          accessibilityLabel="Fechar Caça aos Cristais"
        >
          <Icon name="x" size={16} color={theme.colors.text} strokeWidth={2.2} />
        </PressableScale>
        <Typography variant="body" style={styles.kicker}>
          CAÇA AOS CRISTAIS
        </Typography>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.center}>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Icon name="gem" size={11} color={theme.colors.primary} strokeWidth={2.4} />
            <Typography variant="mono" style={styles.statText}>
              PARES {pairsFound}/{TOTAL_PAIRS}
            </Typography>
          </View>
          <View style={styles.statPill}>
            <Icon name="target" size={11} color={theme.colors.primary} strokeWidth={2.4} />
            <Typography variant="mono" style={styles.statText}>
              MOVIMENTOS {moves}
            </Typography>
          </View>
        </View>

        <View style={styles.grid}>
          {deck.map((emoji, i) => (
            <CrystalCard
              key={i}
              index={i}
              emoji={emoji}
              faceUp={faceUp.includes(i)}
              matched={matched.includes(i)}
              disabled={phase !== 'playing' || faceUp.length >= 2}
              reduceMotion={reduceMotion}
              onPress={onCardPress}
            />
          ))}
        </View>

        {/* liveRegion: leitor de tela anuncia cada par encontrado. */}
        <View accessibilityLiveRegion="polite" style={styles.msgWrap}>
          <Typography variant="body" tone="brand" align="center" style={styles.matchMsg}>
            {phase === 'saving'
              ? 'Guardando o brilho…'
              : matchMsg ?? 'Encontre os pares de cristais'}
          </Typography>
        </View>
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
    statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    statText: {
      fontSize: 10,
      color: theme.colors.primary,
      letterSpacing: 1.2,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: CARD_GAP,
      width: CARD_W * 3 + CARD_GAP * 2,
    },
    cardSlot: { width: CARD_W, height: CARD_H },
    cardFace: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: CARD_W,
      height: CARD_H,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      backfaceVisibility: 'hidden',
    },
    cardBack: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border2,
      ...theme.shadow.sm,
    },
    cardFront: {
      backgroundColor: theme.colors.primaryTint,
      borderColor: theme.colors.primarySoft,
    },
    cardMatched: {
      borderColor: theme.colors.gold,
      ...makeShadow(theme.colors.gold, 0, 0, 14, 0.55, 6),
    },
    cardEmoji: { fontSize: 34, lineHeight: 42 },
    msgWrap: { minHeight: 26, justifyContent: 'center' },
    matchMsg: {
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 16,
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
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.6,
    },
    subtitle: { maxWidth: 320, lineHeight: 22 },
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
    doneCta: { marginTop: theme.spacing.md },
  });
}
