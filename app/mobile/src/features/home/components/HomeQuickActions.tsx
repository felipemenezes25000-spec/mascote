/**
 * HomeQuickActions — grid compacto de hábitos.
 * Substitui os 9 chips brigando por espaço por uma grid limpa de QuickActionCards.
 *
 * "Toque" registra +1 do hábito. Ajuste com valor custom continua disponível
 * no checkin guiado completo (rota `/checkin`).
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Typography, QuickActionCard } from '@/components/ui';
import type { IconName } from '@/components/Icon';
import type { HabitKind } from '@/types';

const HABIT_LABELS: Record<HabitKind, { label: string; icon: IconName }> = {
  water:      { label: 'Água',     icon: 'droplet' },
  sleep:      { label: 'Sono',     icon: 'moon' },
  exercise:   { label: 'Mover',    icon: 'dumbbell' },
  breath:     { label: 'Respirar', icon: 'wind' },
  meditation: { label: 'Meditar',  icon: 'heart' },
  reading:    { label: 'Ler',      icon: 'book' },
  journaling: { label: 'Diário',   icon: 'pencil' },
  outdoor:    { label: 'Ar livre', icon: 'tree' },
  sun:        { label: 'Sol',      icon: 'sun' },
};

interface Props {
  habits: readonly HabitKind[];
  todayCheckins: Record<string, number>;
  onPress: (kind: HabitKind) => void;
  onLongPress: (kind: HabitKind) => void;
}

export function HomeQuickActions({ habits, todayCheckins, onPress, onLongPress }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Typography variant="title" style={styles.sectionH2}>Cuide de você</Typography>
        <Typography variant="mono" tone="dim" style={styles.sectionHint}>toque · segure</Typography>
      </View>
      <View style={styles.grid}>
        {habits.map(h => {
          const meta = HABIT_LABELS[h];
          const count = todayCheckins[h] ?? 0;
          return (
            <Pressable
              key={h}
              onPress={() => onPress(h)}
              onLongPress={() => onLongPress(h)}
              accessibilityRole="button"
              accessibilityLabel={`${meta.label}${count > 0 ? `, ${count} vezes hoje` : ''}`}
            >
              <QuickActionCard
                label={meta.label}
                icon={meta.icon}
                hint={count > 0 ? `${count}×` : undefined}
                done={count > 0}
                onPress={() => onPress(h)}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    section: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    sectionH2: { fontSize: 22, lineHeight: 26 },
    sectionHint: { fontStyle: 'italic', fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  });
}
