import { ProgressBar, Typography } from '@/components/ui';
/**
 * HomeStatsBars — barras de Energia + XP em grid 2 colunas.
 * Pequenas, compactas — mascote é hero, stats são suporte.
 */
import { View, StyleSheet } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';

import type { Mascot as MascotType } from '@/types';

interface Props {
  mascot: MascotType;
  toNext: { current: number; needed: number; progress: number };
}

export function HomeStatsBars({ mascot, toNext }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.barsRow}>
      <Card
        variant="elevated"
        padding="md"
        style={styles.barCard}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Energia: ${mascot.energy} de 100`}
        accessibilityValue={{ min: 0, max: 100, now: mascot.energy }}
      >
        <View style={styles.barHeader}>
          <Icon name="heart" size={12} color={theme.colors.sage} strokeWidth={2.4} fill={theme.colors.sage} />
          <Typography variant="mono" tone="secondary" style={styles.barLabel}>ENERGIA</Typography>
        </View>
        <ProgressBar progress={mascot.energy / 100} fillColor={theme.colors.sage} animated={false} />
        <Typography variant="mono" tone="secondary">{mascot.energy}/100</Typography>
      </Card>
      <Card
        variant="elevated"
        padding="md"
        style={styles.barCard}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Nível ${mascot.level}: ${toNext.current} de ${toNext.needed} XP até a próxima forma`}
        accessibilityValue={{ min: 0, max: toNext.needed, now: toNext.current }}
      >
        <View style={styles.barHeader}>
          <Icon name="zap" size={12} color={theme.colors.primary} strokeWidth={2.4} fill={theme.colors.primary} />
          <Typography variant="mono" tone="secondary" style={styles.barLabel}>NÍVEL {mascot.level}</Typography>
        </View>
        <ProgressBar progress={Math.max(0.02, toNext.progress)} fillColor={theme.colors.primary} animated={false} />
        <Typography variant="mono" tone="secondary">{toNext.current}/{toNext.needed} XP · próxima forma</Typography>
      </Card>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    barsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    barCard: { flex: 1, gap: 6 },
    barHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    barLabel: { fontWeight: '800', letterSpacing: 0.8 },
  });
}
