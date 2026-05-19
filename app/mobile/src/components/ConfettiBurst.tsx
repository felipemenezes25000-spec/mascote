import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';

interface Props {
  visible: boolean;
}

const PIECES = 22;

export function ConfettiBurst({ visible }: Props) {
  const theme = useTheme();
  const colors = useMemo(
    () => [
      theme.colors.primary,
      theme.colors.gold,
      theme.colors.sage,
      theme.colors.sky,
      theme.colors.coral,
      theme.colors.lilac,
    ],
    [theme]
  );
  if (!visible) return null;
  return (
    <View style={[styles.wrap, { pointerEvents: 'none' }]}>
      {Array.from({ length: PIECES }).map((_, i) => {
        const angle = (i / PIECES) * Math.PI * 2;
        const distance = 100 + Math.random() * 80;
        return (
          <Piece
            key={i}
            color={colors[i % colors.length]}
            x={Math.cos(angle) * distance}
            y={Math.sin(angle) * distance}
            delay={i * 12}
            square={i % 2 === 0}
          />
        );
      })}
    </View>
  );
}

function Piece({ color, x, y, delay, square }: { color: string; x: number; y: number; delay: number; square: boolean }) {
  const px = useSharedValue(0);
  const py = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    px.value = withDelay(delay, withTiming(x, { duration: 900 }));
    py.value = withDelay(delay, withTiming(y, { duration: 900 }));
    opacity.value = withDelay(delay, withTiming(0, { duration: 900 }));
    scale.value = withDelay(delay, withTiming(1, { duration: 900 }));
    // deps array vazio intencional: sharedValues do Reanimated são refs
    // mutáveis (não state) e props (x/y/delay) são fixas por instância de
    // Piece — animação one-shot no mount, sem re-execução em re-render.
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: px.value }, { translateY: py.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { backgroundColor: color, borderRadius: square ? 2 : 4 },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  piece: {
    position: 'absolute',
    width: 8,
    height: 8,
    top: '50%',
    left: '50%',
  },
});
