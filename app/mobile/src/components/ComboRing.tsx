import { useEffect } from 'react';
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
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  combo: number;     // 1..5
  bonusPct: number;  // % extra de XP no próximo hábito
}

export function ComboRing({ combo, bonusPct }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    // cancel no unmount: sem isso, `withRepeat(-1)` deixava a animação rodando
    // fora da árvore quando o componente desmontava (Home re-render rápido em
    // combo level change recriava o componente).
    return () => cancelAnimation(pulse);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, combo / 5);
  const strokeDash = circumference;
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.wrap}>
      <Animated.View style={animatedStyle}>
        <Svg width={80} height={80} viewBox="0 0 80 80">
          <Defs>
            <LinearGradient id="combo-grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={theme.colors.primary} />
              <Stop offset="100%" stopColor={theme.colors.gold} />
            </LinearGradient>
          </Defs>
          <Circle
            cx="40"
            cy="40"
            r={radius}
            stroke={theme.colors.border}
            strokeWidth="6"
            fill="none"
          />
          <Circle
            cx="40"
            cy="40"
            r={radius}
            stroke="url(#combo-grad)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDash}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
          />
        </Svg>
      </Animated.View>
      <View style={styles.center}>
        <Text style={styles.value}>×{combo}</Text>
        <Text style={styles.label}>combo</Text>
      </View>
      <View style={styles.bonusPill}>
        <Text style={styles.bonus}>+{bonusPct}% XP</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    center: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      fontSize: 26,
      color: theme.colors.text,
      lineHeight: 28,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -0.6,
    },
    label: {
      fontSize: 9,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
      marginTop: -2,
    },
    bonusPill: {
      position: 'absolute',
      bottom: -18,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryTint,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    bonus: {
      fontSize: 9.5,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 0.6,
      fontFamily: 'JetBrainsMono_500Medium',
    },
  });
}
