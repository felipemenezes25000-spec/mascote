/**
 * Skeleton loader — shimmer animado pra states de loading.
 */

import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  const theme = useTheme();
  const reduceMotion = useStore(s => s.settings?.reduce_motion);
  const opacity = useSharedValue(reduceMotion ? 0.55 : 0.4);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 0.55;
      return;
    }
    cancelAnimation(opacity);
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const Box = reduceMotion ? View : Animated.View;

  return (
    <Box
      style={[
        styles.base,
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.border,
        },
        ...(reduceMotion ? [] : [animatedStyle]),
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={{ gap: 8, padding: 16 }}>
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="90%" />
      <Skeleton height={14} width="80%" />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
});
