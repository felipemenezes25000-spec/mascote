/**
 * ProgressBar — barra horizontal com track + fill animado.
 */
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';

interface Props {
  /** 0..1 */
  progress: number;
  height?: number;
  fillColor?: string;
  trackColor?: string;
  /** Quando true, anima a transição (180ms ease). Default: true. */
  animated?: boolean;
}

export function ProgressBar({ progress, height = 6, fillColor, trackColor, animated = true }: Props) {
  const theme = useTheme();
  const value = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    if (animated) {
      Animated.timing(value, {
        toValue: Math.max(0, Math.min(1, progress)),
        duration: 220,
        useNativeDriver: false,
      }).start();
    } else {
      value.setValue(Math.max(0, Math.min(1, progress)));
    }
  }, [progress, animated, value]);
  const widthInterp = value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height, backgroundColor: trackColor ?? theme.colors.bg2 },
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
    >
      <Animated.View
        style={{
          width: widthInterp,
          height: '100%',
          backgroundColor: fillColor ?? theme.colors.primary,
          borderRadius: height,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
});
