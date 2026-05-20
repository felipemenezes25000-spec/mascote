/**
 * HomeBanner — exibe UM banner por vez seguindo prioridade:
 *  1. Noite difícil (cuidado imediato)
 *  2. Evento limitado (oportunidade)
 *  3. Sazonal (decorativo)
 *
 * Antes empilhava 3, somando 180px de "anúncios" antes do mascote.
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Icon } from '@/components/Icon';
import { LimitedEventBanner } from '@/components/LimitedEventBanner';
import { Typography } from '@/components/ui';
import { activeLimitedEvent } from '@/lib/events';

interface SeasonalEvent {
  emoji: string;
  name: string;
  message: string;
}

interface Props {
  showNightWarning: boolean;
  onDismissNight: () => void;
  seasonalEvent: SeasonalEvent | null;
}

export function HomeBanner({ showNightWarning, onDismissNight, seasonalEvent }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  if (showNightWarning) {
    return (
      <View style={styles.nightBanner}>
        <View style={styles.nightIconWrap}>
          <Icon name="moon" size={20} color={theme.tokens.semantic.inkOnDark} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="bodyBold" tone="inkOnBrand" style={styles.nightTitle}>Tá tarde aqui</Typography>
          <Typography variant="caption" tone="inkOnDark">Já passou da 1h. Sono bom é cuidado também.</Typography>
        </View>
        <Pressable
          onPress={onDismissNight}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso noturno"
        >
          <Icon name="x" size={16} color={theme.tokens.semantic.inkOnDark} strokeWidth={2.2} />
        </Pressable>
      </View>
    );
  }
  if (activeLimitedEvent()) return <LimitedEventBanner />;
  if (seasonalEvent) {
    return (
      <View style={styles.seasonalBanner}>
        <Typography style={styles.seasonalEmoji}>{seasonalEvent.emoji}</Typography>
        <View style={{ flex: 1 }}>
          <Typography variant="bodyBold" style={styles.seasonalTitle}>{seasonalEvent.name}</Typography>
          <Typography variant="mono" tone="secondary" style={styles.seasonalBody}>{seasonalEvent.message}</Typography>
        </View>
      </View>
    );
  }
  return null;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    nightBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: '#22203A',
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(183,159,212,0.18)',
    },
    nightIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(183,159,212,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    nightTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
    seasonalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primaryTint,
      borderColor: theme.colors.primarySoft,
      borderWidth: 1,
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      ...theme.shadow.sm,
    },
    seasonalEmoji: { fontSize: 26 },
    seasonalTitle: {
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    seasonalBody: { marginTop: 2, lineHeight: 16 },
  });
}
