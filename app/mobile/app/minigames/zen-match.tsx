/**
 * Zen Match 🌊 — match-3 pra DESESTRESSAR (tudo que o Candy Crush não fez).
 *
 * Zero vidas, zero timer, zero pay-to-continue, zero game over frustrante.
 * Não bateu o alvo? Copy acolhedora e recomeça na hora, sem custo. Peças são
 * de bem-estar (gota/estrela/folha/lua/sol/coração), não doces.
 *
 * Toda a regra mora na engine pura (src/game/match3/engine.ts). Esta tela só:
 *  - escolhe a fase (hub por capítulo, progresso em AsyncStorage),
 *  - anima o tabuleiro (reanimated: seleção pulsa, swap desliza, estouro
 *    scale+fade, queda spring, especiais brilham),
 *  - traduz o resultado em recompensa via completeMinigame (cap diário OK).
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/ui';
import {
  applySwap,
  createBoard,
  findPossibleMoves,
  getLevel,
  isValidSwap,
  loadZenProgress,
  resolveBoard,
  reshuffle,
  unlockNextLevel,
  type Board,
  type Level,
  type Piece,
  type PieceColor,
  type Pos,
} from '@/game/match3';
import { CHAPTERS, CHAPTER_SIZE, LEVEL_COUNT, objectiveLabel } from '@/game/match3/levels';
import { completeMinigame, type MinigameOutcome } from '@/game/minigames/service';
import { logger } from '@/lib/logger';
import { playSfx } from '@/lib/sfx';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

const GAME_ID = 'zen-match';
/** Pausa parado antes de piscar um hint (sem pressa — só uma gentileza). */
const HINT_AFTER_MS = 6000;
/** Nome PT-BR + ícone de cada cor (UI mapeia, engine só conhece a string). */
const COLOR_META: Record<
  PieceColor,
  { label: string; icon: 'droplet' | 'star' | 'tree' | 'moon' | 'sun' | 'heart'; hue: string }
> = {
  water: { label: 'Gota', icon: 'droplet', hue: '#6FA9CA' },
  star: { label: 'Estrela', icon: 'star', hue: '#F2C14E' },
  leaf: { label: 'Folha', icon: 'tree', hue: '#7BAE7A' },
  moon: { label: 'Lua', icon: 'moon', hue: '#B79FD4' },
  sun: { label: 'Sol', icon: 'sun', hue: '#FF9F45' },
  heart: { label: 'Coração', icon: 'heart', hue: '#E96B5C' },
};

type Screen = 'hub' | 'play';
type PlayPhase = 'playing' | 'won' | 'lost' | 'saving';

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

// ===========================================================================
// Célula animada — dona do próprio pulso de seleção e brilho de especial.
// ===========================================================================

interface CellProps {
  piece: Piece;
  row: number;
  col: number;
  size: number;
  selected: boolean;
  hinted: boolean;
  reduceMotion: boolean;
  onPress: (pos: Pos) => void;
}

function Cell({ piece, row, col, size, selected, hinted, reduceMotion, onPress }: CellProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = selected ? 1.08 : 1;
      return;
    }
    if (selected) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 360 }),
          withTiming(1.0, { duration: 360 }),
        ),
        -1,
        true,
      );
    } else if (hinted) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 280 }),
          withTiming(1.0, { duration: 280 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 160 });
    }
  }, [selected, hinted, reduceMotion, pulse]);

  useEffect(() => {
    if (piece.special !== 'none' && !reduceMotion) {
      glow.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(glow);
      glow.value = piece.special !== 'none' ? 1 : 0;
    }
  }, [piece.special, reduceMotion, glow]);

  useEffect(() => {
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(glow);
    };
  }, [pulse, glow]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.45,
  }));

  const color = piece.color;
  if (!color) return <View style={{ width: size, height: size }} />;
  const meta = COLOR_META[color];

  const specialLabel =
    piece.special === 'line'
      ? piece.dir === 'h'
        ? ', peça-linha horizontal'
        : ', peça-linha vertical'
      : piece.special === 'area'
        ? ', peça-área'
        : piece.special === 'prism'
          ? ', prisma'
          : '';
  const label = `${meta.label}, linha ${row + 1} coluna ${col + 1}${specialLabel}${
    selected ? ', selecionada' : ''
  }`;

  return (
    <Pressable
      onPress={() => onPress({ r: row, c: col })}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{ width: size, height: size, padding: 3 }}
    >
      <Animated.View
        style={[
          styles.cell,
          { backgroundColor: meta.hue + '26', borderColor: meta.hue + '55' },
          selected && { borderColor: theme.colors.text, borderWidth: 2 },
          animStyle,
        ]}
      >
        {piece.special !== 'none' && (
          <Animated.View
            style={[
              styles.cellGlow,
              { backgroundColor: meta.hue },
              glowStyle,
            ]}
          />
        )}
        <Icon
          name={meta.icon}
          size={Math.round(size * 0.46)}
          color={meta.hue}
          strokeWidth={2}
          fill={piece.special === 'prism' ? meta.hue : undefined}
        />
        {piece.special === 'line' && (
          <View
            style={[
              styles.lineBadge,
              piece.dir === 'v' && styles.lineBadgeV,
              { backgroundColor: meta.hue },
            ]}
          />
        )}
        {piece.special === 'area' && (
          <View style={[styles.areaBadge, { borderColor: meta.hue }]} />
        )}
        {piece.special === 'prism' && (
          <Icon name="sparkles" size={Math.round(size * 0.3)} color={theme.tokens.semantic.inkOnBrand} strokeWidth={2.2} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ===========================================================================
// Tela principal
// ===========================================================================

export default function ZenMatch() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const reduceMotion = useStore(s => s.settings?.reduce_motion) ?? false;

  const [screen, setScreen] = useState<Screen>('hub');
  // Maior fase liberada (1-based). 1 enquanto carrega do storage.
  const [maxUnlocked, setMaxUnlocked] = useState(1);
  // Capítulo aberto no hub (clampeado ao progresso).
  const [hubChapter, setHubChapter] = useState(0);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadZenProgress(profile?.id ?? null)
      .then(max => {
        if (!mountedRef.current) return;
        setMaxUnlocked(max);
        setHubChapter(Math.floor((max - 1) / CHAPTER_SIZE));
      })
      .catch(() => {});
    return () => {
      mountedRef.current = false;
    };
  }, [profile?.id]);

  // Fase ativa (quando em 'play').
  const [activeLevelN, setActiveLevelN] = useState(1);

  const openLevel = useCallback((n: number) => {
    setActiveLevelN(n);
    setScreen('play');
  }, []);

  function backToHub(updatedMax?: number) {
    if (updatedMax) setMaxUnlocked(m => Math.max(m, updatedMax));
    setScreen('hub');
  }

  if (screen === 'play') {
    return (
      <PlayScreen
        levelN={activeLevelN}
        reduceMotion={reduceMotion}
        onExit={backToHub}
        onAdvance={n => setActiveLevelN(n)}
        deps={{ profile, mascot, refreshMascot, refreshWallet, enqueueToast }}
      />
    );
  }

  // ---- HUB ----
  const chapter = CHAPTERS[hubChapter]!;
  const firstLevel = hubChapter * CHAPTER_SIZE + 1;
  const canPrev = hubChapter > 0;
  const canNext =
    hubChapter < Math.floor((maxUnlocked - 1) / CHAPTER_SIZE) && hubChapter < CHAPTERS.length - 1;
  const currentLevel = getLevel(maxUnlocked);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <PressableScale
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar Zen Match"
        >
          <Icon name="x" size={16} color={theme.colors.text} strokeWidth={2.2} />
        </PressableScale>
        <Typography variant="body" style={styles.kicker}>
          ZEN MATCH
        </Typography>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.hubBody}>
        <View style={styles.heroIconWrap}>
          <Icon name="droplet" size={44} color={theme.colors.primary} strokeWidth={1.6} />
        </View>
        <Typography variant="title" align="center" style={styles.title}>
          Combine, respire, relaxe
        </Typography>
        <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
          Sem vidas, sem tempo, sem pressa. Junte 3 ou mais e veja a cascata acontecer.
        </Typography>

        {/* Card "Continuar de onde parou" */}
        <Pressable
          onPress={() => openLevel(maxUnlocked)}
          accessibilityRole="button"
          accessibilityLabel={`Jogar fase ${maxUnlocked}, ${currentLevel.theme.name}, ${objectiveLabel(
            currentLevel,
          )}`}
          style={styles.continueCard}
        >
          <View style={styles.continueLeft}>
            <Typography variant="mono" tone="brand" style={styles.continueKicker}>
              FASE {maxUnlocked} · {currentLevel.theme.name.toUpperCase()}
            </Typography>
            <Typography variant="bodyBold" style={styles.continueObj}>
              {objectiveLabel(currentLevel)}
            </Typography>
          </View>
          <Icon name="arrow-right" size={20} color={theme.colors.primary} strokeWidth={2.4} />
        </Pressable>

        {/* Navegação por capítulo */}
        <View style={styles.chapterNav}>
          <PressableScale
            onPress={() => canPrev && setHubChapter(c => c - 1)}
            disabled={!canPrev}
            hitSlop={8}
            style={[styles.navArrow, !canPrev && styles.navArrowOff]}
            accessibilityRole="button"
            accessibilityLabel="Capítulo anterior"
            accessibilityState={{ disabled: !canPrev }}
          >
            <Icon name="arrow-left" size={16} color={canPrev ? theme.colors.text : theme.colors.textDim} strokeWidth={2.2} />
          </PressableScale>
          <View style={styles.chapterInfo}>
            <Typography variant="mono" tone="dim" style={styles.chapterIdx}>
              CAPÍTULO {hubChapter + 1}/{CHAPTERS.length}
            </Typography>
            <Typography variant="bodyBold" align="center" style={styles.chapterName}>
              {chapter.name}
            </Typography>
            <Typography variant="caption" tone="secondary" align="center" style={styles.chapterMech}>
              {chapter.mechanic}
            </Typography>
          </View>
          <PressableScale
            onPress={() => canNext && setHubChapter(c => c + 1)}
            disabled={!canNext}
            hitSlop={8}
            style={[styles.navArrow, !canNext && styles.navArrowOff]}
            accessibilityRole="button"
            accessibilityLabel="Próximo capítulo"
            accessibilityState={{ disabled: !canNext }}
          >
            <Icon name="arrow-right" size={16} color={canNext ? theme.colors.text : theme.colors.textDim} strokeWidth={2.2} />
          </PressableScale>
        </View>

        {/* Grade de 50 fases do capítulo */}
        <View style={styles.levelGrid}>
          {Array.from({ length: CHAPTER_SIZE }, (_, i) => {
            const n = firstLevel + i;
            const lvl = getLevel(n);
            const unlocked = n <= maxUnlocked;
            const isZen = lvl.objective === 'zen';
            return (
              <Pressable
                key={n}
                onPress={() => unlocked && openLevel(n)}
                disabled={!unlocked}
                accessibilityRole="button"
                accessibilityLabel={
                  unlocked
                    ? `Fase ${n}, ${objectiveLabel(lvl)}`
                    : `Fase ${n}, ainda bloqueada`
                }
                accessibilityState={{ disabled: !unlocked }}
                style={[
                  styles.levelChip,
                  isZen && styles.levelChipZen,
                  !unlocked && styles.levelChipLocked,
                  n === maxUnlocked && styles.levelChipCurrent,
                ]}
              >
                {unlocked ? (
                  isZen ? (
                    <Icon name="wind" size={13} color={theme.colors.primary} strokeWidth={2.2} />
                  ) : (
                    <Typography variant="mono" style={styles.levelChipText}>
                      {n}
                    </Typography>
                  )
                ) : (
                  <Icon name="lock" size={11} color={theme.colors.textDim} strokeWidth={2.2} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ===========================================================================
// PlayScreen — o tabuleiro jogável de uma fase.
// ===========================================================================

interface PlayDeps {
  profile: ReturnType<typeof useStore.getState>['profile'];
  mascot: ReturnType<typeof useStore.getState>['mascot'];
  refreshMascot: () => Promise<unknown>;
  refreshWallet: () => Promise<unknown>;
  enqueueToast: ReturnType<typeof useStore.getState>['enqueueToast'];
}

interface PlayScreenProps {
  levelN: number;
  reduceMotion: boolean;
  onExit: (updatedMax?: number) => void;
  onAdvance: (n: number) => void;
  deps: PlayDeps;
}

const BOARD_PADDING = 16;
const MAX_BOARD_WIDTH = 360;

function PlayScreen({ levelN, reduceMotion, onExit, onAdvance, deps }: PlayScreenProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const level: Level = useMemo(() => getLevel(levelN), [levelN]);

  const [board, setBoard] = useState<Board>(() => createBoard(randomSeed(), level.rows, level.cols, level.colorCount));
  const [selected, setSelected] = useState<Pos | null>(null);
  const [movesLeft, setMovesLeft] = useState(level.moves);
  const [score, setScore] = useState(0);
  // Progresso do objetivo (coleta/score/etc) — semântica por tipo.
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<PlayPhase>('playing');
  const [hint, setHint] = useState<{ a: Pos; b: Pos } | null>(null);
  const [outcome, setOutcome] = useState<MinigameOutcome | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [stars, setStars] = useState(1);

  // refs
  const boardRef = useRef(board);
  boardRef.current = board;
  const busyRef = useRef(false); // bloqueia toques durante resolução
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(Date.now());
  const mountedRef = useRef(true);
  const seedRef = useRef(randomSeed());
  // Maior fase liberada após esta sessão — devolvida ao hub no "Voltar".
  const maxUnlockedRef = useRef(levelN + 1);

  // É o objetivo de "relaxar N jogadas" (sem alvo punitivo)?
  const isZen = level.objective === 'zen';

  // ---- reset quando a fase muda ----
  useEffect(() => {
    const fresh = createBoard(randomSeed(), level.rows, level.cols, level.colorCount);
    setBoard(fresh);
    setSelected(null);
    setMovesLeft(level.moves);
    setScore(0);
    setProgress(0);
    setPhase('playing');
    setHint(null);
    setOutcome(null);
    setSaveFailed(false);
    setStars(1);
    busyRef.current = false;
    startRef.current = Date.now();
    seedRef.current = randomSeed();
  }, [level]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  // ---- agenda hint quando parado ----
  const scheduleHint = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(null);
    if (phase !== 'playing') return;
    hintTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || busyRef.current) return;
      const moves = findPossibleMoves(boardRef.current);
      if (moves.length > 0) setHint(moves[Math.floor(Math.random() * moves.length)]!);
    }, HINT_AFTER_MS);
  }, [phase]);

  useEffect(() => {
    scheduleHint();
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [board, phase, scheduleHint]);

  function haptic(kind: 'tap' | 'match' | 'win') {
    if (Platform.OS === 'web') return;
    try {
      if (kind === 'win') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (kind === 'match') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  // Quanto do objetivo a resolução acrescenta (mantém UI desacoplada da engine).
  const computeProgressDelta = useCallback(
    (res: ReturnType<typeof resolveBoard>): number => {
      switch (level.objective) {
        case 'collect':
          return level.collectColor ? res.collected[level.collectColor] : 0;
        case 'clear-jelly':
        case 'bring-down':
          // Proxy zen: cada peça removida conta como "limpou/trouxe" — sem
          // mecânica punitiva de geleia (mantém o jogo leve e vencível).
          return Object.values(res.collected).reduce((a, c) => a + c, 0);
        case 'score':
        default:
          return res.totalScore;
      }
    },
    [level.objective, level.collectColor],
  );

  function objectiveReached(p: number): boolean {
    if (isZen) return false; // zen termina por movimentos, não por alvo
    return p >= level.target;
  }

  function onCellPress(pos: Pos) {
    if (phase !== 'playing' || busyRef.current) return;
    setHint(null);

    if (!selected) {
      setSelected(pos);
      haptic('tap');
      scheduleHint();
      return;
    }
    // Toque na mesma peça = desseleciona.
    if (selected.r === pos.r && selected.c === pos.c) {
      setSelected(null);
      return;
    }
    // Vizinha e válida → resolve. Senão, reseleciona a nova.
    if (isValidSwap(boardRef.current, selected, pos)) {
      void doSwap(selected, pos);
    } else {
      setSelected(pos);
      haptic('tap');
      scheduleHint();
    }
  }

  async function doSwap(a: Pos, b: Pos) {
    busyRef.current = true;
    setSelected(null);
    haptic('match');

    const swapped = applySwap(boardRef.current, a, b);
    // Cor do prisma = a cor da peça NÃO-prisma do par (UX: prisma "vira" a cor).
    const pa = swapped.grid[a.r]![a.c]!;
    const pb = swapped.grid[b.r]![b.c]!;
    const prismHint: PieceColor | null =
      pa.special === 'prism' ? pb.color : pb.special === 'prism' ? pa.color : null;

    const res = resolveBoard(swapped, seedRef.current, prismHint);
    seedRef.current = (seedRef.current * 1103515245 + 12345) | 0;

    const gained = res.totalScore;
    const progressDelta = computeProgressDelta(res);
    const nextMoves = movesLeft - 1;

    // Aplica estado (reanimated nas células anima a transição de grid).
    setBoard(res.board);
    setScore(s => s + gained);
    setMovesLeft(nextMoves);

    const nextProgress = progress + progressDelta;
    setProgress(nextProgress);

    // Anti-dead-board: sem movimento → reembaralha de graça (sem culpa).
    let finalBoard = res.board;
    if (findPossibleMoves(res.board).length === 0) {
      finalBoard = reshuffle(res.board, seedRef.current);
      setBoard(finalBoard);
    }

    // Pequena folga pra animação respirar antes de avaliar fim.
    await wait(reduceMotion ? 0 : 240);
    if (!mountedRef.current) return;
    busyRef.current = false;

    if (objectiveReached(nextProgress)) {
      haptic('win');
      void finishWin(nextMoves);
    } else if (nextMoves <= 0) {
      if (isZen) {
        // Zen: acabar os movimentos É a vitória (relaxou as N jogadas).
        haptic('win');
        void finishWin(0);
      } else {
        setPhase('lost');
      }
    }
  }

  function starsFor(remainingMoves: number): number {
    // Sempre >= 1 por concluir. 3 = sobrou bastante movimento; 2 = sobrou algum.
    // Eficiência medida pela folga de movimentos — nunca pune, só celebra mais.
    const leftFrac = remainingMoves / Math.max(1, level.moves);
    if (leftFrac >= 0.45) return 3;
    if (leftFrac >= 0.15) return 2;
    return 1;
  }

  async function finishWin(remainingMoves: number) {
    const earned = isZen ? 3 : starsFor(remainingMoves);
    setStars(earned);
    setPhase('saving');
    const durationMs = Date.now() - startRef.current;

    if (!deps.profile || !deps.mascot) {
      setOutcome(null);
      setSaveFailed(true);
      setPhase('won');
      void unlockNextLevel(deps.profile?.id ?? null, level.n);
      return;
    }
    try {
      const out = await completeMinigame({
        profile: deps.profile,
        mascot: deps.mascot,
        gameId: GAME_ID,
        score: earned / 3, // estrelas → score normalizado 0..1
        durationMs,
      });
      const newMax = await unlockNextLevel(deps.profile.id, level.n);
      await Promise.all([deps.refreshMascot().catch(() => {}), deps.refreshWallet().catch(() => {})]);
      if (!mountedRef.current) return;
      if (out.leveledUp) {
        deps.enqueueToast({
          kind: 'level',
          emoji: '🌊',
          title: 'Subiu de nível!',
          subtitle: 'A calma do Zen Match contou',
        });
      }
      if (out.rewarded) {
        playSfx(earned >= 3 ? 'chest' : 'coin', {
          enabled: useStore.getState().settings?.sfx_enabled !== false,
        });
      }
      setOutcome(out);
      setSaveFailed(false);
      setPhase('won');
      maxUnlockedRef.current = newMax;
    } catch (err) {
      logger.warn('[zen-match] completeMinigame failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      if (!mountedRef.current) return;
      setOutcome(null);
      setSaveFailed(true);
      setPhase('won');
    }
  }

  function retry() {
    const fresh = createBoard(randomSeed(), level.rows, level.cols, level.colorCount);
    setBoard(fresh);
    setSelected(null);
    setMovesLeft(level.moves);
    setScore(0);
    setProgress(0);
    setPhase('playing');
    setHint(null);
    setOutcome(null);
    setSaveFailed(false);
    busyRef.current = false;
    startRef.current = Date.now();
    seedRef.current = randomSeed();
  }

  function doReshuffle() {
    if (busyRef.current || phase !== 'playing') return;
    seedRef.current = (seedRef.current * 1103515245 + 12345) | 0;
    setBoard(b => reshuffle(b, seedRef.current));
    setSelected(null);
    haptic('tap');
  }

  function nextLevel() {
    const n = Math.min(LEVEL_COUNT, level.n + 1);
    onAdvance(n);
  }

  // ---- layout do tabuleiro ----
  const cellSize = Math.floor((MAX_BOARD_WIDTH - BOARD_PADDING * 2) / level.cols);
  const boardWidth = cellSize * level.cols + BOARD_PADDING * 2;

  const hintSet = useMemo(() => {
    if (!hint) return new Set<string>();
    return new Set([`${hint.a.r}:${hint.a.c}`, `${hint.b.r}:${hint.b.c}`]);
  }, [hint]);

  const progressLabel = useMemo(() => {
    if (isZen) return `${movesLeft} jogadas de respiro`;
    return `${Math.min(progress, level.target)} / ${level.target}`;
  }, [isZen, movesLeft, progress, level.target]);

  // ---- painel de resultado ----
  if (phase === 'won' || phase === 'saving') {
    const rewarded = outcome?.rewarded === true;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.resultBody}>
          <View style={styles.heroIconWrap}>
            <Icon name="sparkles" size={44} color={theme.colors.primary} strokeWidth={1.6} />
          </View>
          <View style={styles.starsRow} accessibilityRole="image" accessibilityLabel={`${stars} de 3 estrelas`}>
            {[1, 2, 3].map(i => (
              <Icon
                key={i}
                name="star"
                size={32}
                color={i <= stars ? theme.colors.gold : theme.colors.border2}
                strokeWidth={2}
                fill={i <= stars ? theme.colors.gold : undefined}
              />
            ))}
          </View>
          <Typography variant="title" align="center" style={styles.title}>
            {isZen ? 'Que paz 🌙' : 'Fase concluída!'}
          </Typography>
          <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
            {isZen
              ? 'Você respirou o capítulo inteiro. Sem pressa, sem alvo — só calma.'
              : `${level.theme.name} · ${score} pontos no seu ritmo.`}
          </Typography>

          {phase === 'saving' ? (
            <Typography variant="body" tone="brand" align="center" style={styles.subtitle}>
              Guardando a calma…
            </Typography>
          ) : saveFailed ? (
            <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
              A fase valeu — só não consegui registrar a recompensa agora. Tenta de novo mais tarde.
            </Typography>
          ) : rewarded && outcome ? (
            <>
              <View style={styles.rewards}>
                <View style={styles.reward}>
                  <Icon name="coins" size={11} color={theme.colors.primaryDeep} strokeWidth={2.4} />
                  <Typography variant="body" style={styles.rewardText}>
                    +{outcome.coinsEarned}
                  </Typography>
                </View>
                {outcome.xpEarned > 0 && (
                  <View style={styles.reward}>
                    <Icon name="zap" size={11} color={theme.colors.primary} strokeWidth={2.4} fill={theme.colors.primary} />
                    <Typography variant="body" style={styles.rewardText}>
                      +{outcome.xpEarned} XP
                    </Typography>
                  </View>
                )}
              </View>
              <Typography variant="caption" tone="dim" align="center">
                {outcome.rewardedPlaysLeft > 0
                  ? `Mais ${outcome.rewardedPlaysLeft} ${
                      outcome.rewardedPlaysLeft === 1 ? 'partida' : 'partidas'
                    } com recompensa hoje`
                  : 'Recompensas de hoje completas — jogue pela calma!'}
              </Typography>
            </>
          ) : (
            <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
              Partida extra — valeu pela calma! Recompensas voltam amanhã.
            </Typography>
          )}

          {phase === 'won' && (
            <>
              {level.n < LEVEL_COUNT && (
                <Button label="Próxima fase" onPress={nextLevel} style={styles.doneCta} />
              )}
              <Button label="Voltar" variant="ghost" onPress={() => onExit(maxUnlockedRef.current)} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ---- painel "não bateu o alvo" (sem game over) ----
  if (phase === 'lost') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.resultBody}>
          <View style={styles.heroIconWrap}>
            <Icon name="droplet" size={44} color={theme.colors.primary} strokeWidth={1.6} />
          </View>
          <Typography variant="title" align="center" style={styles.title}>
            Sem pressa 🌊
          </Typography>
          <Typography variant="body" tone="secondary" align="center" style={styles.subtitle}>
            O tabuleiro recomeça quando você quiser. Respira e tenta de novo — sem custo, sem
            perder nada.
          </Typography>
          <Button label="Tentar de novo" onPress={retry} style={styles.doneCta} />
          <Button label="Voltar" variant="ghost" onPress={() => onExit(maxUnlockedRef.current)} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- tabuleiro jogável ----
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <PressableScale
          onPress={() => onExit(maxUnlockedRef.current)}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Sair da fase"
        >
          <Icon name="x" size={16} color={theme.colors.text} strokeWidth={2.2} />
        </PressableScale>
        <Typography variant="body" style={styles.kicker}>
          FASE {level.n} · {level.theme.name.toUpperCase()}
        </Typography>
        <View style={{ width: 38 }} />
      </View>

      {/* HUD: objetivo / movimentos / pontos */}
      <View style={styles.hud}>
        <View style={styles.hudPill}>
          {level.objective === 'collect' && level.collectColor ? (
            <Icon
              name={COLOR_META[level.collectColor].icon}
              size={12}
              color={COLOR_META[level.collectColor].hue}
              strokeWidth={2.2}
            />
          ) : (
            <Icon name="target" size={12} color={theme.colors.primary} strokeWidth={2.2} />
          )}
          <Typography variant="mono" style={styles.hudText}>
            {progressLabel}
          </Typography>
        </View>
        <View style={styles.hudPill}>
          <Icon name="sparkle" size={12} color={theme.colors.primary} strokeWidth={2.2} />
          <Typography variant="mono" style={styles.hudText}>
            {isZen ? '∞' : `${movesLeft} JOGADAS`}
          </Typography>
        </View>
        <View style={styles.hudPill}>
          <Icon name="star" size={12} color={theme.colors.gold} strokeWidth={2.2} />
          <Typography variant="mono" style={styles.hudText}>
            {score}
          </Typography>
        </View>
      </View>

      <Typography variant="caption" tone="secondary" align="center" style={styles.objectiveCaption}>
        {objectiveLabel(level)}
      </Typography>

      <View style={styles.boardWrap}>
        <View style={[styles.board, { width: boardWidth, padding: BOARD_PADDING }]}>
          {board.grid.map((row, r) => (
            <View key={r} style={styles.boardRow}>
              {row.map((piece, c) => (
                <Cell
                  key={`${r}:${c}:${piece.id}`}
                  piece={piece}
                  row={r}
                  col={c}
                  size={cellSize}
                  selected={!!selected && selected.r === r && selected.c === c}
                  hinted={hintSet.has(`${r}:${c}`)}
                  reduceMotion={reduceMotion}
                  onPress={onCellPress}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footerRow}>
        <PressableScale
          onPress={doReshuffle}
          style={styles.footerBtn}
          accessibilityRole="button"
          accessibilityLabel="Embaralhar o tabuleiro, sem custo"
        >
          <Icon name="sparkles" size={15} color={theme.colors.primary} strokeWidth={2.2} />
          <Typography variant="caption" tone="brand" style={styles.footerBtnText}>
            Embaralhar
          </Typography>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

/** Promise-sleep que respeita unmount via mountedRef no chamador. */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===========================================================================
// Styles
// ===========================================================================

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
      letterSpacing: 1.4,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    // ---- hub ----
    hubBody: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    heroIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    title: { fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
    subtitle: { maxWidth: 330, lineHeight: 22 },
    continueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginTop: theme.spacing.sm,
    },
    continueLeft: { flex: 1, gap: 3 },
    continueKicker: { fontSize: 10, letterSpacing: 1.1 },
    continueObj: { color: theme.colors.text },
    chapterNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 360,
      marginTop: theme.spacing.xs,
    },
    navArrow: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navArrowOff: { opacity: 0.4 },
    chapterInfo: { flex: 1, alignItems: 'center', gap: 2 },
    chapterIdx: { fontSize: 9, letterSpacing: 1 },
    chapterName: { color: theme.colors.text, fontSize: 16 },
    chapterMech: { maxWidth: 240 },
    levelGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 7,
      maxWidth: 360,
      marginTop: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
    },
    levelChip: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelChipZen: {
      backgroundColor: theme.colors.primaryTint,
      borderColor: theme.colors.primarySoft,
    },
    levelChipLocked: { opacity: 0.5, backgroundColor: theme.colors.bg2 },
    levelChipCurrent: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    levelChipText: {
      fontSize: 12,
      color: theme.colors.text,
      letterSpacing: 0.3,
    },
    // ---- play HUD ----
    hud: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    hudPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },
    hudText: { fontSize: 11, color: theme.colors.text, letterSpacing: 0.6 },
    objectiveCaption: { marginTop: theme.spacing.sm },
    boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    board: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.md,
    },
    boardRow: { flexDirection: 'row' },
    cell: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    cellGlow: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 12,
    },
    lineBadge: {
      position: 'absolute',
      bottom: 5,
      height: 3,
      width: '64%',
      borderRadius: 2,
    },
    lineBadgeV: {
      width: 3,
      height: '64%',
      bottom: undefined,
    },
    areaBadge: {
      position: 'absolute',
      width: '54%',
      height: '54%',
      borderRadius: 6,
      borderWidth: 2,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primaryTint,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    footerBtnText: { fontWeight: '700' },
    // ---- result ----
    resultBody: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    starsRow: { flexDirection: 'row', gap: theme.spacing.sm },
    rewards: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
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
    doneCta: { marginTop: theme.spacing.sm },
  });
}
