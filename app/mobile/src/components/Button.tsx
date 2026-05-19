import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
  const styles = useStyles(makeStyles);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (disabled) return;
          scale.value = withSpring(0.96, { damping: 18, stiffness: 380, mass: 0.5 });
          opacity.value = withTiming(0.92, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 220 });
          opacity.value = withTiming(1, { duration: 140 });
        }}
        style={[
          styles.base,
          styles[variant],
          disabled && styles.disabled,
          disabled && variant === 'primary' && styles.disabledPrimary,
        ]}
      >
        <Text
          style={[
            styles.label,
            styles[`${variant}Label`],
            disabled && variant === 'primary' && styles.disabledPrimaryLabel,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    // Antes só `opacity: 0.5` num botão primary laranja ainda parecia clicável.
    // Override específico pra primary: vira surface neutro + label cinza, sem
    // gritar "clica aqui". Variants secondary/ghost continuam só com opacity.
    disabled: { opacity: 0.6 },
    disabledPrimary: {
      backgroundColor: theme.colors.bg2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    disabledPrimaryLabel: { color: theme.colors.textDim },
    label: { ...theme.text.bodyBold },
    primaryLabel: { color: '#fff' },
    secondaryLabel: { color: theme.colors.text },
    ghostLabel: { color: theme.colors.primary },
  });
}
