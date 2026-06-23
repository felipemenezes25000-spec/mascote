import { Typography } from '@/components/ui';
/**
 * HomeActionRow — os 4 verbos do app em uma linha: Jogar, Cuidar,
 * Conversar, Personalizar. O usuário abre a Home e sabe o que PODE FAZER
 * agora sem caçar nada (critério dos "3 segundos").
 */
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useStyles } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';

interface Props {
  onPlay: () => void;
  onCare: () => void;
  onTalk: () => void;
  onCustomize: () => void;
}

export function HomeActionRow({ onPlay, onCare, onTalk, onCustomize }: Props) {
  const styles = useStyles(makeStyles);
  const actions = [
    { emoji: '🎮', label: t('home.actions.label_play'), onPress: onPlay, hint: t('home.actions.hint_play') },
    { emoji: '💧', label: t('home.actions.label_care'), onPress: onCare, hint: t('home.actions.hint_care') },
    { emoji: '💬', label: t('home.actions.label_talk'), onPress: onTalk, hint: t('home.actions.hint_talk') },
    { emoji: '🎀', label: t('home.actions.label_customize'), onPress: onCustomize, hint: t('home.actions.hint_customize') },
  ];
  return (
    <View style={styles.row}>
      {actions.map(a => (
        <PressableScale
          key={a.label}
          onPress={a.onPress}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          accessibilityHint={a.hint}
          style={styles.action}
        >
          <Typography variant="heading">{a.emoji}</Typography>
          <Typography variant="caption" style={{ fontWeight: '700' }}>
            {a.label}
          </Typography>
        </PressableScale>
      ))}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    action: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: theme.spacing.sm + 2,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      // Altura mínima de alvo de toque 44px (a11y) — padding + 2 linhas cobrem.
      minHeight: 64,
      justifyContent: 'center',
    },
  });
}
