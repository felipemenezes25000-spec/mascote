import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * MissionCard premium — card de destaque com:
 *  - Header: kicker mono uppercase + XP badge tintado
 *  - Title: serif h3 (Instrument Serif), kerning negativo
 *  - Description: body com line-height generoso
 *  - CTA: pill com icon arrow-right ou check (estado)
 *
 * Spring animation via PressableScale (delegado, reduce_motion respected).
 */

interface Props {
  title: string;
  description: string;
  xp: number;
  completed?: boolean;
  onPress: () => void;
}

export function MissionCard({ title, description, xp, completed, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  return (
    <PressableScale
      onPress={onPress}
      style={[styles.card, completed && styles.completed]}
      accessibilityRole="button"
      accessibilityLabel={`${completed ? 'Missão concluída' : 'Missão de hoje'}: ${title}, ${xp} XP`}
      accessibilityState={{ disabled: completed, checked: completed }}
      scale={0.98}
    >
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Icon
            name={completed ? 'check' : 'target'}
            size={11}
            color={completed ? theme.colors.success : theme.colors.primary}
            strokeWidth={2.4}
          />
          <Text style={[styles.label, completed && { color: theme.colors.success }]}>
            {completed ? 'CONCLUÍDA' : 'MISSÃO DE HOJE'}
          </Text>
        </View>
        <View style={styles.xpBadge}>
          <Icon name="zap" size={10} color={theme.colors.primary} strokeWidth={2.4} fill={theme.colors.primary} />
          <Text style={styles.xpText}>+{xp} XP</Text>
        </View>
      </View>
      <Text style={[styles.title, completed && styles.titleDone]}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{completed ? 'Feito' : 'Fazer agora'}</Text>
        <Icon
          name={completed ? 'check' : 'arrow-right'}
          size={14}
          color={theme.colors.primary}
          strokeWidth={2.4}
        />
      </View>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.md,
    },
    completed: {
      opacity: 0.7,
      backgroundColor: theme.colors.success + '10',
      borderColor: theme.colors.success + '50',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    label: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    xpBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
    },
    xpText: {
      fontSize: 11,
      color: theme.colors.primary,
      fontWeight: '800',
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.2,
    },
    title: {
      ...theme.text.h3,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.3,
      marginTop: 2,
    },
    titleDone: {
      color: theme.colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    description: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: theme.spacing.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary + '12',
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
    },
    ctaText: {
      color: theme.colors.primary,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 13,
    },
  });
}
