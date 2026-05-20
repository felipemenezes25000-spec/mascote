/**
 * PaywallCard — card "before/after" + CTA emocional pra paywall.
 * Mostra duas situações (atual / após premium) com cor by-archetype.
 */
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme, ArchetypeKey } from '@/lib/themes';
import { Typography } from './Typography';
import { Icon } from '@/components/Icon';

interface Props {
  archetype?: ArchetypeKey;
  beforeTitle: string;
  beforeBody: string;
  afterTitle: string;
  afterBody: string;
  ctaLabel: string;
  onPress: () => void;
  helper?: string;
}

export function PaywallCard({
  archetype,
  beforeTitle,
  beforeBody,
  afterTitle,
  afterBody,
  ctaLabel,
  onPress,
  helper,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const arch = archetype ? theme.tokens.archetype[archetype] : null;
  const accent = arch?.fg ?? theme.colors.primary;
  const accentDeep = arch?.accent ?? theme.colors.primaryDeep;
  return (
    <View style={[styles.card, { borderColor: accent + '44' }]}>
      <View style={styles.row}>
        <View style={[styles.col, { backgroundColor: theme.colors.bg2 }]}>
          <View style={styles.iconWrap}>
            <Icon name="moon" size={18} color={theme.colors.textDim} strokeWidth={2} />
          </View>
          <Typography variant="bodyBold" tone="secondary">{beforeTitle}</Typography>
          <Typography variant="caption" tone="dim">{beforeBody}</Typography>
        </View>
        <View style={[styles.col, { backgroundColor: accent + '14' }]}>
          <View style={styles.iconWrap}>
            <Icon name="sparkles" size={18} color={accent} strokeWidth={2.2} />
          </View>
          <Typography variant="bodyBold" style={{ color: accentDeep }}>{afterTitle}</Typography>
          <Typography variant="caption" tone="secondary">{afterBody}</Typography>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        onPress={onPress}
        style={[styles.cta, { backgroundColor: accent }]}
      >
        <Typography variant="bodyBold" tone="inkOnBrand">{ctaLabel}</Typography>
      </Pressable>
      {helper ? <Typography variant="caption" tone="dim" align="center">{helper}</Typography> : null}
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
      gap: theme.spacing.md,
      ...theme.shadow.sm,
    },
    row: { flexDirection: 'row', gap: theme.spacing.sm },
    col: {
      flex: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm + 2,
      gap: 4,
      minHeight: 100,
    },
    iconWrap: { marginBottom: 4 },
    cta: {
      paddingVertical: 14,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
    },
  });
}
