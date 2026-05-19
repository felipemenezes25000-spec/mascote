import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { HabitKind } from '@/types';
import { habitMeta } from '@/content/missions';

/**
 * HabitChip premium — pill com icon SVG dentro de círculo tintado.
 * Press feedback via PressableScale (spring scale). Estado `done` muda
 * cor da borda + icon pra success.
 */

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

interface Props {
  kind: HabitKind;
  done?: boolean;
  count?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export function HabitChip({ kind, done, count, onPress, onLongPress }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const meta = habitMeta[kind];
  const iconName = HABIT_ICONS[kind];
  const iconColor = done ? theme.colors.success : theme.colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[styles.chip, done && styles.done]}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}${count ? `, ${count} hoje` : ''}`}
    >
      <View style={[styles.iconWrap, done && styles.iconWrapDone]}>
        <Icon name={iconName} size={14} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text style={[styles.label, done && styles.labelDone]}>{meta.label}</Text>
      {count && count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
      ...theme.shadow.sm,
    },
    done: {
      backgroundColor: theme.colors.success + '12',
      borderColor: theme.colors.success + '88',
    },
    iconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDone: {
      backgroundColor: theme.colors.success + '22',
    },
    label: {
      ...theme.text.sm,
      color: theme.colors.text,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 13.5,
    },
    labelDone: { color: theme.colors.success },
    badge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.radius.pill,
      minWidth: 22,
      alignItems: 'center',
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
      fontFamily: 'PlusJakartaSans_700Bold',
    },
  });
}
