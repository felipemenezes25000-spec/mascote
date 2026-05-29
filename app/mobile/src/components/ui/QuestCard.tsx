/**
 * QuestCard — card de missão/quest com título, body, recompensa, CTA.
 * Variante "soft" do MissionCard com tokens semânticos.
 */
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Typography } from './Typography';
import { Icon, type IconName } from '@/components/Icon';
import { Badge } from './Badge';

interface Props {
  title: string;
  subtitle?: string;
  icon?: IconName;
  rewardLabel?: string;
  ctaLabel?: string;
  onPress?: () => void;
  done?: boolean;
  style?: ViewStyle;
}

export function QuestCard({
  title,
  subtitle,
  icon = 'target',
  rewardLabel,
  ctaLabel,
  onPress,
  done,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const interactive = !!onPress && !done;
  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.card,
        done && styles.cardDone,
        interactive && pressed && { opacity: 0.94 },
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon
          name={done ? 'check' : icon}
          size={20}
          color={done ? theme.colors.success : theme.colors.primary}
          strokeWidth={2.2}
        />
      </View>
      <View style={styles.body}>
        <Typography variant="bodyBold" numberOfLines={2}>{title}</Typography>
        {subtitle ? <Typography variant="caption" tone="secondary" numberOfLines={2}>{subtitle}</Typography> : null}
        <View style={styles.row}>
          {rewardLabel ? <Badge label={rewardLabel} variant="warning" /> : null}
          {done ? <Badge label="FEITO" variant="success" /> : null}
        </View>
      </View>
      {!done && ctaLabel ? (
        <View style={styles.cta}>
          <Typography variant="caption" tone="brand" style={{ fontWeight: '700' }}>{ctaLabel}</Typography>
          <Icon name="arrow-right" size={14} color={theme.colors.primary} strokeWidth={2.2} />
        </View>
      ) : null}
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    cardDone: {
      borderColor: theme.colors.success + '44',
      backgroundColor: theme.colors.success + '0A',
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 4 },
    row: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-end',
    },
  });
}
