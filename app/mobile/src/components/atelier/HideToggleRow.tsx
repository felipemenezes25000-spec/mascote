/**
 * HideToggleRow — linha clicável que esconde um apêndice (cauda/antenas/spikes).
 *
 * Visual: ListItem-like com nome + descrição + checkbox-style indicator.
 * Tap dispara haptic + onChange. Reflete intenção do usuário independente
 * da presença real no DNA (applyCustomization respeita morph.hasX).
 */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export interface HideToggleRowProps {
  label: string;
  description?: string;
  /** true = esconder (force_hide_X = true). */
  hidden: boolean;
  onChange: (nextHidden: boolean) => void;
}

export function HideToggleRow({ label, description, hidden, onChange }: HideToggleRowProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  const handlePress = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange(!hidden);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.row}
      accessibilityRole="switch"
      accessibilityState={{ checked: hidden }}
      accessibilityLabel={label}
      accessibilityHint={t(
        'atelier.toggles.a11y_hint',
        hidden ? t('atelier.toggles.action_show') : t('atelier.toggles.action_hide'),
        description ?? '',
      )}
    >
      <View style={styles.text}>
        <Typography variant="bodyBold">{label}</Typography>
        {description ? (
          <Typography variant="caption" tone="secondary">
            {description}
          </Typography>
        ) : null}
      </View>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: hidden ? theme.colors.primary : theme.colors.surface,
            borderColor: hidden ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {hidden ? (
          <Icon name="check" size={14} color={theme.tokens.semantic.inkOnBrand} strokeWidth={3} />
        ) : null}
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      gap: theme.spacing.md,
      borderRadius: theme.radius.md,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
