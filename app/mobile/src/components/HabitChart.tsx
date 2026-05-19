import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { addDays, dateLocal, todayLocal } from '@/lib/db';
import type { Checkin, HabitKind } from '@/types';
import { habitMeta } from '@/content/missions';

interface Props {
  kind: HabitKind;
  checkins: Checkin[]; // só do hábito, ordenado
  days?: number;
}

export function HabitChart({ kind, checkins, days = 7 }: Props) {
  const styles = useStyles(makeStyles);
  const meta = habitMeta[kind];
  const today = todayLocal();
  const startDate = (() => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - (days - 1));
    return dateLocal(d);
  })();

  const dateValues: { date: string; value: number; label: string }[] = [];
  for (let i = 0; i < days; i++) {
    const dt = addDays(startDate, i);
    const d = new Date(dt + 'T00:00:00');
    // Abreviações de 3 letras pra eliminar a ambiguidade do single-letter
    // (Sex/Sáb/Seg viravam todas "S", Qua/Qui viravam todas "Q").
    const dayLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
    const dayCheckins = checkins.filter(c => c.occurred_on === dt);
    const sum = dayCheckins.reduce((s, c) => s + (c.value ?? 1), 0);
    dateValues.push({ date: dt, value: sum, label: dayLabel });
  }

  const max = Math.max(1, ...dateValues.map(d => d.value));

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
        <Text style={styles.title}>{meta.label}</Text>
        <Text style={styles.totalsmall}>
          {dateValues.reduce((s, d) => s + d.value, 0)} no total
        </Text>
      </View>
      <View style={styles.bars}>
        {dateValues.map((dv, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${(dv.value / max) * 100}%` },
                  dv.date === today && styles.barToday,
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, dv.date === today && styles.dayLabelToday]}>
              {dv.label}
            </Text>
            <Text style={styles.dayValue}>{dv.value || ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    emoji: { fontSize: 18 },
    title: { ...theme.text.bodyBold, color: theme.colors.text, flex: 1 },
    totalsmall: { ...theme.text.xs, color: theme.colors.textSecondary },
    bars: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
      height: 80,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    barTrack: {
      width: 14,
      height: 44,
      backgroundColor: theme.colors.bg,
      borderRadius: 7,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    barFill: {
      width: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 7,
    },
    barToday: { backgroundColor: theme.colors.secondary },
    dayLabel: { ...theme.text.xs, color: theme.colors.textDim, marginTop: 4 },
    dayLabelToday: { color: theme.colors.text, fontWeight: '700' },
    dayValue: { fontSize: 10, color: theme.colors.textSecondary, height: 12 },
  });
}
