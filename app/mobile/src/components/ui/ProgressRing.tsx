/**
 * ProgressRing — círculo SVG com progresso 0..1 + valor central opcional.
 */
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';

interface Props {
  progress: number; // 0..1
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

export function ProgressRing({
  progress,
  size = 64,
  thickness = 6,
  color,
  trackColor,
  label,
}: Props) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? theme.colors.bg2}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? theme.colors.primary}
          strokeWidth={thickness}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${dashOffset}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? (
        <View style={[styles.center, { pointerEvents: 'none' }]}>
          <Text style={[theme.text.bodyBold, { color: theme.colors.text }]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
