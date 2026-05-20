/**
 * Badge — etiqueta pequena com cor semântica.
 * Variants:
 *  - neutral | brand | success | warning | error | rarity (commom..mythic) | emotion (...)
 */
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';
import type { RarityLevel, EmotionKey, ArchetypeKey } from '@/lib/themes';

type Variant =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'error'
  | { rarity: RarityLevel }
  | { emotion: EmotionKey }
  | { archetype: ArchetypeKey };

interface Props {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'neutral', size = 'sm' }: Props) {
  const theme = useTheme();
  let bg = theme.colors.bg2;
  let fg = theme.colors.textSecondary;
  if (variant === 'brand') {
    bg = theme.colors.primarySoft;
    fg = theme.colors.primaryDeep;
  } else if (variant === 'success') {
    bg = theme.tokens.emotion.calm.bg;
    fg = theme.colors.success;
  } else if (variant === 'warning') {
    bg = theme.tokens.gamification.xp.bg;
    fg = theme.colors.warning;
  } else if (variant === 'error') {
    bg = theme.tokens.emotion.comforted.bg;
    fg = theme.colors.error;
  } else if (typeof variant === 'object') {
    if ('rarity' in variant) {
      const r = theme.tokens.rarity[variant.rarity];
      bg = r.bg;
      fg = r.fg;
    } else if ('emotion' in variant) {
      const e = theme.tokens.emotion[variant.emotion];
      bg = e.bg;
      fg = e.fg;
    } else if ('archetype' in variant) {
      const a = theme.tokens.archetype[variant.archetype];
      bg = a.fg + '22';
      fg = a.accent;
    }
  }
  return (
    <View
      style={[
        styles.base,
        size === 'md' ? styles.md : styles.sm,
        { backgroundColor: bg, borderRadius: theme.radius.pill },
      ]}
    >
      <Typography variant="mono" style={{ color: fg }}>{label}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start' },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  md: { paddingHorizontal: 12, paddingVertical: 5 },
});
