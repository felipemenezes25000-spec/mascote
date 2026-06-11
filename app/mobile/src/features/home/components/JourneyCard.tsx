import { Typography } from '@/components/ui';
/**
 * JourneyCard — o coração do "quase lá" na Home.
 *
 * Em UMA olhada: mundo atual, fase X/100, barra até a próxima fase e o
 * próximo desbloqueio. Tap → mapa completo da jornada (/journey).
 *
 * Tudo derivado puro do XP via journeyProgress/nextUnlockTeaser — o card
 * nunca carrega estado próprio (sem fetch, sem race).
 */
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { ProgressBar } from '@/design-system';
import { journeyProgress, nextUnlockTeaser } from '@/game/journey';
import { formDisplayName } from '@/game/journey/forms';
import { almostThereLine } from '@/content/journey-copy';
import { useStyles } from '@/lib/useTheme';
import type { Genome } from '@/lib/dna';
import type { Theme } from '@/lib/themes';

interface Props {
  xp: number;
  /** DNA do mascote — usado pro nome composto da forma ("Lúmen de Aqua"). */
  dna?: Genome | null;
  onPress: () => void;
}

export function JourneyCard({ xp, dna, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const prog = journeyProgress(xp);
  const teaser = nextUnlockTeaser(xp);
  const formName = formDisplayName(xp, dna);
  const pct = Math.round(prog.progress * 100);

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Jornada: mundo ${prog.world.name}, fase ${prog.phase.n} de 100, ${pct}% até a próxima fase. Toque pra abrir o mapa.`}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={[styles.worldBadge, { backgroundColor: `${prog.world.hue}26` }]}>
          <Typography variant="bodyBold">{prog.world.emoji}</Typography>
          <Typography variant="caption" style={{ fontWeight: '700' }}>
            {prog.world.name}
          </Typography>
        </View>
        <Typography variant="mono" tone="secondary">
          Fase {prog.phase.n}/100
        </Typography>
      </View>

      <View style={styles.titleRow}>
        <Typography variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
          {prog.phase.title}
        </Typography>
        <Typography variant="mono" style={{ color: prog.world.hue, fontWeight: '700' }}>
          Forma {formName}
        </Typography>
      </View>

      <ProgressBar value={prog.progress * 100} max={100} color={prog.world.hue} height={8} />

      <View style={styles.teaserRow}>
        {teaser ? (
          <>
            <Typography variant="caption">{teaser.emoji}</Typography>
            <Typography variant="caption" tone="secondary" numberOfLines={2} style={{ flex: 1 }}>
              {almostThereLine(prog)}
            </Typography>
          </>
        ) : (
          <Typography variant="caption" tone="secondary" style={{ flex: 1 }}>
            {almostThereLine(prog)}
          </Typography>
        )}
        <Typography variant="caption" tone="brand" style={{ fontWeight: '700' }}>
          Mapa →
        </Typography>
      </View>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    worldBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
    },
    teaserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
  });
}
