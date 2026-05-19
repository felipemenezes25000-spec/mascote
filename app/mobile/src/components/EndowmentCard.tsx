import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * Endowment cards — comunicam o que o usuário JÁ ACUMULOU.
 * Psicologia: progresso visível aumenta apego ao produto ("o que já investi
 * vale mais que o esforço de continuar").
 *
 * Usado em momentos pré-paywall pra que ele sinta que tem muito a perder.
 *
 * Premium: icon SVG dentro de círculo tintado + multi-layer shadow sutil.
 */

interface Props {
  value: string;
  label: string;
  /** SVG icon (preferido). Compat: `emoji` ainda aceito. */
  icon?: IconName;
  emoji?: string;
}

export function EndowmentCard({ value, label, icon, emoji }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={18} color={theme.colors.primary} strokeWidth={2} />
        </View>
      ) : emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : null}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

interface RowProps {
  items: Array<{ value: string; label: string; icon?: IconName; emoji?: string }>;
}

export function EndowmentRow({ items }: RowProps) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <EndowmentCard key={i} {...item} />
      ))}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: 6,
      ...theme.shadow.sm,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: { fontSize: 22 },
    value: { ...theme.text.h2, color: theme.colors.text, lineHeight: 28 },
    label: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
      fontWeight: '700',
    },
  });
}
