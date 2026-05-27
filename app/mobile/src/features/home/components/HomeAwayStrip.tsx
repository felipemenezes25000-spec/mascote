import { Typography } from '@/components/ui';
/**
 * HomeAwayStrip — micro-resumo do que o mascote fez enquanto o usuário estava fora.
 * Tom tranquilo, sem culpa (living moments da simulação).
 */
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import type { SimulationEvent } from '@/sim/types';

interface Props {
  events: readonly SimulationEvent[];
  summaryLine?: string | null;
}

export function HomeAwayStrip({ events, summaryLine }: Props) {
  const theme = useTheme();
  const awayMoment = events.find(
    e => e.kind === 'while_away_living_moment' || e.kind === 'return_summary',
  );
  const line = summaryLine ?? awayMoment?.message;
  if (!line) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface2,
          borderColor: theme.colors.border2,
          marginHorizontal: theme.spacing.lg,
        },
      ]}
      accessibilityRole="text"
    >
      <Typography variant="caption" tone="secondary" style={styles.label}>
        Enquanto você estava fora
      </Typography>
      <Typography variant="body" tone="default">
        {line}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    marginBottom: 8,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
});
