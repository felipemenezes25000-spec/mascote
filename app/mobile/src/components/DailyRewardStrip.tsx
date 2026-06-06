import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useStyles, useTheme } from '@/lib/useTheme';
import { noShadow, type Theme } from '@/lib/themes';

/**
 * Daily reward strip premium — 7 dias com SVG icons em vez de emoji.
 * Estados: past (já resgatado), today (CTA destacado), future (placeholder).
 * Grand prize (dia 7) tem borda dourada permanente.
 */

export interface DailyRewardDay {
  day: number; // 1..7
  coins: number;
  gems?: number;
  isGrand?: boolean;
}

export const DAILY_REWARDS: DailyRewardDay[] = [
  { day: 1, coins: 10 },
  { day: 2, coins: 15 },
  { day: 3, coins: 25 },
  { day: 4, coins: 40 },
  { day: 5, coins: 60, gems: 1 },
  { day: 6, coins: 80, gems: 1 },
  { day: 7, coins: 150, gems: 3, isGrand: true },
];

interface Props {
  currentDay: number; // 1..7
  claimedToday: boolean;
  onClaim: () => void;
}

function rewardIcon(r: DailyRewardDay): IconName {
  if (r.isGrand) return 'trophy';
  if (r.gems) return 'gem';
  return 'coins';
}

export function DailyRewardStrip({ currentDay, claimedToday, onClaim }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <View style={styles.kickerRow}>
            <Icon name="gift" size={10} color={theme.colors.primary} strokeWidth={2.4} />
            <Text style={styles.kicker}>RECOMPENSA DIÁRIA</Text>
          </View>
          <Text style={styles.title}>Volta todo dia</Text>
        </View>
        <PressableScale
          onPress={onClaim}
          disabled={claimedToday}
          style={[styles.claimBtn, claimedToday && styles.claimBtnDone]}
          accessibilityRole="button"
          accessibilityState={{ disabled: claimedToday }}
          accessibilityLabel={claimedToday ? 'Recompensa de hoje já resgatada' : 'Resgatar recompensa diária'}
        >
          {claimedToday ? (
            <Icon name="check" size={12} color={theme.colors.textSecondary} strokeWidth={2.6} />
          ) : null}
          <Text style={[styles.claimText, claimedToday && styles.claimTextDone]}>
            {claimedToday ? 'HOJE' : 'RESGATAR'}
          </Text>
        </PressableScale>
      </View>
      <View style={styles.strip}>
        {DAILY_REWARDS.map(r => {
          const isPast = r.day < currentDay || (r.day === currentDay && claimedToday);
          const isToday = r.day === currentDay && !claimedToday;
          const isFuture = r.day > currentDay;
          const iconName = isPast ? 'check' : rewardIcon(r);
          const iconColor = isToday
            ? theme.colors.inkInverse
            : isPast
            ? theme.colors.primary
            : r.isGrand
            ? theme.colors.gold
            : theme.colors.textSecondary;
          return (
            <View
              key={r.day}
              style={[
                styles.dayCell,
                isPast && styles.dayPast,
                isToday && styles.dayToday,
                isFuture && styles.dayFuture,
                r.isGrand && styles.dayGrand,
              ]}
            >
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>D{r.day}</Text>
              <Icon name={iconName} size={14} color={iconColor} strokeWidth={2.4} />
              <Text style={[styles.dayValue, isToday && styles.dayValueToday]}>
                {r.gems ? `${r.coins}+${r.gems}` : r.coins}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.md,
      ...theme.shadow.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    kickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    kicker: {
      fontSize: 9.5,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.2,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    title: {
      color: theme.colors.text,
      marginTop: 2,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    claimBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      ...theme.shadow.sm,
    },
    claimBtnDone: { backgroundColor: theme.colors.bg2, ...noShadow() },
    claimText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 11,
      letterSpacing: 0.8,
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    claimTextDone: { color: theme.colors.textSecondary },
    strip: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
    dayCell: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 2,
      borderRadius: 12,
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.bg,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    dayPast: { backgroundColor: theme.colors.primaryTint, borderColor: theme.colors.primary + '30' },
    dayToday: { backgroundColor: theme.colors.text, borderColor: theme.colors.primary, ...theme.shadow.sm },
    dayFuture: { backgroundColor: theme.colors.bg, borderColor: theme.colors.border },
    dayGrand: { borderWidth: 1.5, borderColor: theme.colors.gold },
    dayLabel: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: theme.colors.textDim,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    dayLabelToday: { color: theme.colors.inkInverse },
    dayValue: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    dayValueToday: { color: theme.colors.inkInverse },
  });
}
