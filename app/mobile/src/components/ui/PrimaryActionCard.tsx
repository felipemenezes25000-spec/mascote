/**
 * PrimaryActionCard — CTA principal grande, com título emocional + botão.
 * Usado pra "Cuidar agora" / missão de 2min na Home.
 */
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Typography } from './Typography';
import { Icon, type IconName } from '@/components/Icon';

interface Props {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  icon?: IconName;
  onPress: () => void;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function PrimaryActionCard({
  title,
  subtitle,
  ctaLabel,
  icon = 'sparkles',
  onPress,
  style,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${ctaLabel}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.94 },
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon} size={22} color={theme.tokens.semantic.inkOnBrand} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <Typography variant="heading" tone="inkOnBrand">{title}</Typography>
        {subtitle ? (
          <Typography variant="caption" tone="inkOnBrand" style={{ opacity: 0.85 }}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      <View style={styles.ctaWrap}>
        <Typography variant="bodyBold" tone="inkOnBrand">{ctaLabel}</Typography>
        <Icon name="arrow-right" size={18} color={theme.tokens.semantic.inkOnBrand} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      ...theme.shadow.md,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    ctaWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  });
}
