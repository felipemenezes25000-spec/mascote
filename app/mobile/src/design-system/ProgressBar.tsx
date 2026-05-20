/**
 * <ProgressBar /> — atom do design system V2.
 *
 * Substitui as várias barras inline (energy/XP/archetype) por um único
 * componente animado, configurável por cor semântica (brand, archetype X,
 * state X). Respeita reduce-motion.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';

export type ProgressBarColor =
  | 'brand'
  | 'success'
  | 'danger'
  | 'info'
  | 'warn'
  | string; // permite hex direto

interface Props {
  /** 0..max — clampado se sair do range. */
  value: number;
  max?: number;
  /** Cor semântica ou hex (default 'brand'). */
  color?: ProgressBarColor;
  /** Altura do track em px (default 6). */
  height?: number;
  /** Se true, anima a transição quando o value muda (default true). */
  animate?: boolean;
  /** Override do track (default rgba(0,0,0,0.06)). */
  trackColor?: string;
  /** Estilo do container (margins, etc.). */
  style?: ViewStyle;
  testID?: string;
}

const ANIM_DURATION_MS = 480;

export function ProgressBar({
  value,
  max = 100,
  color = 'brand',
  height = 6,
  animate = true,
  trackColor,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const reduceMotion = useStore(s => s.settings?.reduce_motion ?? false);

  const safeMax = max <= 0 ? 1 : max;
  const safeValue = Math.max(0, Math.min(safeMax, Number.isFinite(value) ? value : 0));
  const pct = (safeValue / safeMax) * 100;

  const width = useSharedValue(reduceMotion ? pct : 0);

  useEffect(() => {
    if (!animate || reduceMotion) {
      width.value = pct;
      return;
    }
    width.value = withTiming(pct, {
      duration: ANIM_DURATION_MS,
      easing: Easing.bezier(0.3, 0, 0.1, 1),
    });
  }, [pct, animate, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const resolvedColor = useMemo(() => {
    if (color.startsWith('#')) return color;
    switch (color) {
      case 'brand':   return theme.colors.primary;
      case 'success': return theme.colors.success;
      case 'danger':  return theme.colors.error;
      case 'info':    return theme.colors.info;
      case 'warn':    return theme.colors.warning;
      default:        return theme.colors.primary;
    }
  }, [color, theme]);

  const resolvedTrack = trackColor ?? (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)');

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: resolvedTrack },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(safeValue), min: 0, max: safeMax }}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: resolvedColor, borderRadius: height / 2 },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
