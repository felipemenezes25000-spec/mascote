/**
 * StatPill — métrica compacta no formato pill (ex.: streak / level / coins).
 * Versão minimalista do `WalletPills`.
 */
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';
import { Icon, type IconName } from '@/components/Icon';

interface Props {
  icon?: IconName;
  iconColor?: string;
  label: string;
  /** Valor à direita destacado (ex.: "12"). */
  value: string | number;
  onPress?: () => void;
  style?: ViewStyle;
  /** Variante de cor: brand|gold|sage|coral|lilac. Default: surface neutro. */
  tone?: 'brand' | 'gold' | 'sage' | 'coral' | 'lilac' | 'neutral';
}

export function StatPill({ icon, iconColor, label, value, style, tone = 'neutral' }: Props) {
  const theme = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    brand:   { bg: theme.colors.primarySoft,        fg: theme.colors.primaryDeep },
    gold:    { bg: theme.tokens.gamification.xp.bg, fg: theme.tokens.gamification.xp.fg },
    sage:    { bg: theme.tokens.emotion.calm.bg,    fg: theme.colors.success },
    coral:   { bg: theme.tokens.emotion.comforted.bg, fg: theme.colors.error },
    lilac:   { bg: theme.tokens.emotion.curious.bg, fg: theme.colors.lilacDeep },
    neutral: { bg: theme.colors.bg2,                fg: theme.colors.textSecondary },
  };
  const { bg, fg } = map[tone];
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bg, borderRadius: theme.radius.pill },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={iconColor ?? fg} strokeWidth={2.2} /> : null}
      <Typography variant="caption" style={{ color: fg, fontWeight: '700' }}>
        {label}
      </Typography>
      <Typography variant="bodyBold" style={{ color: fg }}>
        {value}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
