/**
 * LoadingState — placeholder centralizado com pulse + label opcional.
 */
import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';

interface Props {
  label?: string;
  inline?: boolean;
}

export function LoadingState({ label, inline }: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [opacity]);
  return (
    <Animated.View
      style={[styles.base, inline && styles.inline, { opacity }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Carregando'}
    >
      <ActivityIndicator color={theme.colors.primary} />
      {label ? <Typography variant="caption" tone="secondary" style={styles.label}>{label}</Typography> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  inline: { paddingVertical: 12 },
  label: { marginTop: 6 },
});
