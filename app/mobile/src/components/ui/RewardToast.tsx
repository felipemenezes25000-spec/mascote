/**
 * RewardToast — overlay flutuante que aparece quando um reward (XP/coin/streak)
 * é concedido. Auto-dismiss após `durationMs`.
 *
 * Diferente do `UnlockToast` (existing) que é específico para conquista de
 * raridade, este é utilitário pra eventos de gameplay.
 */
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';
import { Icon, type IconName } from '@/components/Icon';

interface Props {
  visible: boolean;
  message: string;
  icon?: IconName;
  /** Cor do ícone (default: brand). */
  iconColor?: string;
  durationMs?: number;
  onDismiss?: () => void;
}

export function RewardToast({ visible, message, icon = 'sparkles', iconColor, durationMs = 2200, onDismiss }: Props) {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 40, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss?.());
    }, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onDismiss, translateY, opacity]);
  if (!visible) return null;
  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          pointerEvents: 'none',
          transform: [{ translateY }],
          opacity,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
          ...theme.shadow.md,
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Icon name={icon} size={18} color={iconColor ?? theme.colors.primary} strokeWidth={2.2} />
      <Typography variant="bodyBold" style={{ flex: 1 }}>{message}</Typography>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    maxWidth: 360,
  },
});
