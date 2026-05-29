import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * Pílulas premium: ícones SVG dentro de fundos tintados.
 * Cada pílula tem uma cor de identidade (laranja moeda / azul gema / coral fogo).
 */

interface Props {
  coins: number;
  gems: number;
  streakDays?: number;
}

export function WalletPills({ coins, gems, streakDays }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.pill, styles.pillCoin]}>
        <Icon name="coins" size={11} color={theme.colors.primaryDeep} strokeWidth={2.4} />
        <Text style={styles.text}>{formatNumber(coins)}</Text>
      </View>
      <View style={[styles.pill, styles.pillGem]}>
        <Icon name="gem" size={11} color="#3E6FAB" strokeWidth={2.4} />
        <Text style={styles.text}>{formatNumber(gems)}</Text>
      </View>
      {streakDays !== undefined && (
        <View style={[styles.pill, styles.pillFire]}>
          <Icon name="flame" size={11} color={theme.colors.error} strokeWidth={2.4} fill={theme.colors.error + '40'} />
          <Text style={styles.text}>{streakDays}</Text>
        </View>
      )}
    </View>
  );
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function makeStyles(theme: Theme) {
  // No dark, fundos claros fixos (#E8EFF6 / #FEEAD9) ficavam ilegíveis com o
  // texto claro (theme.colors.text = creme). Espelha o comportamento de
  // primaryTint: vira um wash escuro translúcido da cor de identidade.
  const isDark = theme.mode === 'dark';
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 5 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    pillCoin: {
      backgroundColor: theme.colors.primaryTint,
      borderColor: theme.colors.primarySoft,
    },
    pillGem: {
      backgroundColor: isDark ? '#3E6FAB22' : '#E8EFF6',
      borderColor: isDark ? '#3E6FAB55' : '#BBD3E5',
    },
    pillFire: {
      backgroundColor: isDark ? theme.colors.error + '22' : '#FEEAD9',
      borderColor: isDark ? theme.colors.error + '55' : '#FFC899',
    },
    text: {
      fontSize: 11.5,
      color: theme.colors.text,
      fontWeight: '800',
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.1,
    },
  });
}
