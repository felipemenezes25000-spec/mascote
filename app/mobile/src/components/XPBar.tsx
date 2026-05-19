import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  level: number;
  xp: number;
  toNext: { current: number; needed: number; progress: number };
}

export function XPBar({ level, xp, toNext }: Props) {
  const styles = useStyles(makeStyles);
  const pct = Math.max(0, Math.min(1, toNext.progress));
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.level}>Nível {level}</Text>
        <Text style={styles.xp}>
          {toNext.current}/{toNext.needed} XP
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { width: '100%', gap: 6 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    level: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    xp: { ...theme.text.xs, color: theme.colors.textSecondary },
    track: {
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.pill,
    },
  });
}
