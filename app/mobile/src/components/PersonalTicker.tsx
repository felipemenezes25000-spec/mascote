import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useStyles, useTheme } from '@/lib/useTheme';
import { makeShadow } from '@/lib/themes';
import type { Theme } from '@/lib/themes';
import { useStore } from '@/store';

export interface PersonalStat {
  text: string;
  emphasis?: boolean;
}

export function buildPersonalStats(input: {
  streakCurrent?: number | null;
  streakLongest?: number | null;
  totalCheckins?: number | null;
  level?: number | null;
  phaseLabel?: string | null;
  mascotName?: string | null;
}): PersonalStat[] {
  const out: PersonalStat[] = [];
  const s = input.streakCurrent ?? 0;
  const longest = input.streakLongest ?? 0;
  const checkins = input.totalCheckins ?? 0;
  const level = input.level ?? 1;

  // Streak só vai no ticker quando há sequência real. Antes mostrava
  // "comece sua streak hoje" no D1 — duplicava o que a pílula de streak no
  // header já comunica (🔥 0) e fazia o ticker ser ruído no usuário novo.
  if (s > 0) {
    out.push({ text: `streak atual: ${s} ${s === 1 ? 'dia' : 'dias'}`, emphasis: true });
  }
  if (longest > 0 && longest >= s) {
    out.push({ text: `seu recorde pessoal: ${longest} ${longest === 1 ? 'dia' : 'dias'}` });
  }
  if (checkins > 0) {
    out.push({ text: `${checkins} ${checkins === 1 ? 'check-in registrado' : 'check-ins registrados'}` });
  }
  if (level > 1) {
    out.push({ text: `nível ${level}${input.mascotName ? ` · ${input.mascotName}` : ''}` });
  }
  // phaseLabel só faz sentido no ticker quando há OUTRA estatística pra rotacionar
  // junto — sozinho viraria "ovo" girando no header do user D1, sem contexto.
  if (input.phaseLabel && out.length > 0) {
    out.push({ text: input.phaseLabel.toLowerCase() });
  }
  return out;
}

interface Props {
  stats?: PersonalStat[];
  intervalMs?: number;
  /** Apenas para testes — fontes de dados externas. */
  source?: {
    streakCurrent?: number | null;
    streakLongest?: number | null;
    totalCheckins?: number | null;
    level?: number | null;
    phaseLabel?: string | null;
    mascotName?: string | null;
  };
}

export function PersonalTicker({ stats, intervalMs = 4000, source }: Props) {
  const styles = useStyles(makeStyles);
  const storeStreak = useStore(s => s.streak);
  const storeMascot = useStore(s => s.mascot);

  const computed = useMemo(() => {
    if (stats && stats.length > 0) return stats;
    return buildPersonalStats(
      source ?? {
        streakCurrent: storeStreak?.current_streak ?? null,
        streakLongest: storeStreak?.longest_streak ?? null,
        level: storeMascot?.level ?? null,
        mascotName: storeMascot?.name ?? null,
      }
    );
  }, [stats, source, storeStreak, storeMascot]);

  const [idx, setIdx] = useState(0);
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 800, easing: Easing.in(Easing.ease) })
      ),
      -1
    );
    return () => cancelAnimation(pulse);
  }, []);

  useEffect(() => {
    if (computed.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % computed.length), intervalMs);
    return () => clearInterval(t);
    // Depender de `computed.length` (não `computed`) — o caller passa `source` como
    // objeto literal novo a cada render, então `computed` muda referência sempre,
    // o que recriava o setInterval em cada tick e o ticker nunca avançava.
  }, [computed.length, intervalMs]);

  useEffect(() => {
    if (idx >= computed.length) setIdx(0);
  }, [computed.length, idx]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
  }));

  const current = computed[idx] ?? computed[0];
  if (!current) return null;

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={current.text}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text style={[styles.text, current.emphasis && styles.textEmphasis]} numberOfLines={1}>
        {current.text}
      </Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignSelf: 'flex-start',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.sage,
      ...makeShadow(theme.colors.sage, 0, 0, 4, 0.6, 2),
    },
    text: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      letterSpacing: 0,
    },
    textEmphasis: {
      color: theme.colors.text,
    },
  });
}
