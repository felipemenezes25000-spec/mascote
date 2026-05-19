import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * StreakFlame premium — SVG flame icon com fill coral, tipografia Instrument Serif
 * para o número de dias (elegância editorial), JetBrains Mono pra labels.
 */

interface Props {
  days: number;
  graceLeft?: number;
}

export function StreakFlame({ days, graceLeft }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Icon
        name="flame"
        size={16}
        color={theme.colors.error}
        strokeWidth={2}
        fill={theme.colors.error + '50'}
      />
      <Text style={styles.days}>{days}</Text>
      <Text style={styles.dia}>{days === 1 ? 'dia' : 'dias'}</Text>
      {graceLeft !== undefined && graceLeft > 0 && (
        <View style={styles.grace}>
          <View style={styles.dot} />
          <Text style={styles.graceText}>{graceLeft} folga{graceLeft > 1 ? 's' : ''}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    days: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 18,
      lineHeight: 20,
      letterSpacing: -0.3,
    },
    dia: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
    grace: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 4 },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.textDim,
    },
    graceText: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
      letterSpacing: 0.3,
    },
  });
}
