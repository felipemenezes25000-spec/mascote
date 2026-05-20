/**
 * QuickActionCard — botão compacto para ações secundárias (hábitos, atalhos).
 * Substitui chips brigando por espaço com grid compacto e legível.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Typography } from './Typography';
import { Icon, type IconName } from '@/components/Icon';

interface Props {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Quando true, indica que o usuário já fez a ação hoje (visualmente "feito"). */
  done?: boolean;
  /** Cor do ícone — default brand. */
  iconColor?: string;
  /** Subtítulo curto (ex.: "2/8" para água). */
  hint?: string;
}

export function QuickActionCard({ label, icon, onPress, done, iconColor, hint }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${hint ? `, ${hint}` : ''}${done ? ', feito hoje' : ''}`}
      accessibilityState={{ selected: done }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        done && styles.btnDone,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.iconWrap, done && { backgroundColor: theme.colors.success + '22' }]}>
        <Icon name={icon} size={18} color={done ? theme.colors.success : (iconColor ?? theme.colors.primary)} strokeWidth={2.2} />
      </View>
      <Typography variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>{label}</Typography>
      {hint ? <Typography variant="mono" tone="dim">{hint}</Typography> : null}
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    btn: {
      width: 84,
      paddingVertical: 10,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: 4,
    },
    btnDone: {
      backgroundColor: theme.colors.success + '12',
      borderColor: theme.colors.success + '44',
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryTint,
      marginBottom: 2,
    },
  });
}
