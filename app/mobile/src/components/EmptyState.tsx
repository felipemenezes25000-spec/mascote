import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  emoji?: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
  style?: ViewStyle;
}

export function EmptyState({ emoji = '🌱', title, body, ctaLabel, onCta, style }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.wrap, style]} accessibilityRole="text">
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {body && <Text style={styles.body}>{body}</Text>}
      {ctaLabel && onCta && (
        <Pressable onPress={onCta} style={styles.cta} accessibilityRole="button" accessibilityLabel={ctaLabel}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    emoji: { fontSize: 48 },
    title: { ...theme.text.h3, color: theme.colors.text, textAlign: 'center' },
    body: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
      lineHeight: 22,
    },
    cta: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: 12,
      borderRadius: theme.radius.pill,
    },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}
