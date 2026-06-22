import { QuickActionCard, Typography } from '@/components/ui';
/**
 * CareActionGrid (HomeQuickActions) — até 5 hábitos visíveis + sheet com o restante.
 * Reduz carga cognitiva na Home; long-press continua abrindo valor custom.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';

import { BottomSheet } from '@/components/ui/ModalShell';
import { PressableScale } from '@/components/PressableScale';
import type { IconName } from '@/components/Icon';
import type { HabitKind } from '@/types';

// Ícone é dado fixo; o label vem do namespace compartilhado `habits` via t()
// (avaliado no render p/ pegar o locale atual).
const HABIT_ICONS: Record<HabitKind, IconName> = {
  water: 'droplet',
  sleep: 'moon',
  exercise: 'dumbbell',
  breath: 'wind',
  meditation: 'heart',
  reading: 'book',
  journaling: 'pencil',
  outdoor: 'tree',
  sun: 'sun',
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
  return (
    <QuickActionCard
      label={t(`habits.${kind}`)}
      icon={HABIT_ICONS[kind]}
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
        <Typography variant="title" style={styles.sectionH2}>{t('home.quick.section_title')}</Typography>
        <Typography variant="mono" tone="dim" style={styles.sectionHint}>{t('home.quick.section_hint')}</Typography>
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
            accessibilityLabel={t('home.quick.more_a11y', hidden.length)}
          >
            <Typography variant="bodyBold" style={styles.moreLabel}>+{hidden.length}</Typography>
            <Typography variant="mono" tone="dim" style={styles.moreSub}>{t('home.quick.more_sub')}</Typography>
          </PressableScale>
        )}
      </View>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('home.quick.sheet_title')}
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
