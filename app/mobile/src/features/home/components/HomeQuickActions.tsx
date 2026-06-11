import { QuickActionCard, Typography } from '@/components/ui';
/**
 * CareActionGrid (HomeQuickActions) — até 5 hábitos visíveis + sheet com o restante.
 * Reduz carga cognitiva na Home; long-press continua abrindo valor custom.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

import { BottomSheet } from '@/components/ui/ModalShell';
import { PressableScale } from '@/components/PressableScale';
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

const MAX_VISIBLE = 5;

interface Props {
  habits: readonly HabitKind[];
  todayCheckins: Record<string, number>;
  onPress: (kind: HabitKind) => void;
  onLongPress: (kind: HabitKind) => void;
}

function HabitTile({
  kind,
  count,
  onPress,
  onLongPress,
}: {
  kind: HabitKind;
  count: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const meta = HABIT_LABELS[kind];
  return (
    <QuickActionCard
      label={meta.label}
      icon={meta.icon}
      hint={count > 0 ? `${count}×` : undefined}
      done={count > 0}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  );
}

export function HomeQuickActions({ habits, todayCheckins, onPress, onLongPress }: Props) {
  const styles = useStyles(makeStyles);
  const [sheetOpen, setSheetOpen] = useState(false);
  const visible = habits.slice(0, MAX_VISIBLE);
  const hidden = habits.slice(MAX_VISIBLE);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Typography variant="title" style={styles.sectionH2}>Cuide de você</Typography>
        <Typography variant="mono" tone="dim" style={styles.sectionHint}>toque · segure · sem chat agora</Typography>
      </View>
      <View style={styles.grid}>
        {visible.map(h => (
          <HabitTile
            key={h}
            kind={h}
            count={todayCheckins[h] ?? 0}
            onPress={() => onPress(h)}
            onLongPress={() => onLongPress(h)}
          />
        ))}
        {hidden.length > 0 && (
          <PressableScale
            style={styles.moreTile}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Ver mais ${hidden.length} cuidados`}
          >
            <Typography variant="bodyBold" style={styles.moreLabel}>+{hidden.length}</Typography>
            <Typography variant="mono" tone="dim" style={styles.moreSub}>mais</Typography>
          </PressableScale>
        )}
      </View>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Mais cuidados"
      >
        <View style={styles.sheetGrid}>
          {hidden.map(h => (
            <HabitTile
              key={h}
              kind={h}
              count={todayCheckins[h] ?? 0}
              onPress={() => {
                onPress(h);
                setSheetOpen(false);
              }}
              onLongPress={() => {
                onLongPress(h);
                setSheetOpen(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

/** Alias semântico do mega-prompt v2. */
export const CareActionGrid = HomeQuickActions;

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
    sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    moreTile: {
      width: 72,
      minHeight: 80,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    moreLabel: { fontSize: 18, color: theme.colors.primary },
    moreSub: { fontSize: 10 },
  });
}
