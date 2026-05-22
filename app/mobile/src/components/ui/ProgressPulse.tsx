/**
 * ProgressPulse — barra de progresso "viva" (mood-aware).
 *
 * Diferente de ProgressBar:
 *  - Cor deriva de mood/emotion/tone (não cinza neutro)
 *  - Pulsa sutilmente quando ativa (Reanimated)
 *  - Glow opcional pra streak/momento alto
 *
 * Foi feita pra Home + Evolução. Substitui barras nuas com cor de marca.
 */

import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import type { MascotMood } from '@/types';

export interface ProgressPulseProps {
  /** Valor 0..1. */
  value: number;
  /** Cor derivada (default: mood→cor; senão brand). */
  mood?: MascotMood;
  /** Altura em px (default 6). */
  height?: number;
  /** Pulsa quando true (chamada de atenção). */
  pulse?: boolean;
  /** Glow ao redor (uso em streak milestones). */
  glow?: boolean;
  /** Acessibilidade. */
  accessibilityLabel?: string;
  reduceMotion?: boolean;
  style?: ViewStyle;
}

export function ProgressPulse({
  value,
  mood,
  height = 6,
  pulse = false,
  glow = false,
  accessibilityLabel,
  reduceMotion = false,
  style,
}: ProgressPulseProps) {
  const theme = useTheme();
  const v = Math.max(0, Math.min(1, value));
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!pulse || reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.65, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fillColor = moodColor(mood, theme);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: Math.round(v * 100), min: 0, max: 100 }}
      style={[
        {
          height,
          width: '100%',
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: `${v * 100}%`,
            height: '100%',
            borderRadius: theme.radius.pill,
            backgroundColor: fillColor,
          },
          glow && {
            shadowColor: fillColor,
            shadowOpacity: 0.45,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
            elevation: 3,
          },
          pulseStyle,
        ]}
      />
    </View>
  );
}

function moodColor(mood: MascotMood | undefined, theme: ReturnType<typeof useTheme>): string {
  // Mapeia MascotMood (pt-br) → token EMOTION (inglês).
  // Se mood não vier, usa cor primária da paleta atual.
  const emotion = theme.tokens.emotion;
  switch (mood) {
    case 'feliz':     return emotion.happy.fg;
    case 'empolgado': return emotion.excited.fg;
    case 'triste':    return emotion.sad.fg;
    case 'exausto':   return emotion.tired.fg;
    case 'ok':        return emotion.calm.fg;
    default:          return theme.colors.primary;
  }
}
