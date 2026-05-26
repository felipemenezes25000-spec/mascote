/**
 * PersonalityPreviewSwatch — 4 mini-mascotes mostrando o MESMO DNA com
 * personalities diferentes.
 *
 * Exploratório read-only: usuário pergunta "como ficaria meu mascote se
 * tivesse personalidade X?". Bate com personality bias dos morph influences
 * (commit personalityMorphBias).
 *
 * NÃO troca personality. Pra mudar a personality real, vai em
 * /settings/personalization (fluxo de bond/identidade).
 *
 * Performance: 4 MascotRenderer instances pequenas (60px) — bem leve.
 * Use reduceMotion=true pra não animar 4 simultaneamente.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import { MascotRenderer } from '@/components/MascotRenderer';
import { Typography } from '@/components/ui';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type {
  MascotCustomization,
  MascotMood,
  MascotPhase,
  Personality,
} from '@/types';

const PERSONALITIES: ReadonlyArray<{ key: Personality; label: string; emoji: string }> = [
  { key: 'calmo', label: 'Calmo', emoji: '🌿' },
  { key: 'motivador', label: 'Motivador', emoji: '⚡' },
  { key: 'fofo', label: 'Fofo', emoji: '🧸' },
  { key: 'sabio', label: 'Sábio', emoji: '🦉' },
];

export interface PersonalityPreviewSwatchProps {
  /** Personality atual — chip dela ganha border highlighted. */
  currentPersonality: Personality;
  phase: MascotPhase;
  mood: MascotMood;
  /** Customization draft atual — preview reflete sliders ao vivo. */
  customization: MascotCustomization | null;
  /** Mutations afetando o preview (vem do atelier state). */
  mutationIds?: readonly string[];
}

export function PersonalityPreviewSwatch({
  currentPersonality,
  phase,
  mood,
  customization,
  mutationIds = [],
}: PersonalityPreviewSwatchProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {PERSONALITIES.map(({ key, label, emoji }) => {
        const isCurrent = key === currentPersonality;
        return (
          <View key={key} style={styles.swatch}>
            <View
              style={[
                styles.miniWrap,
                {
                  borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                  borderWidth: isCurrent ? 2 : 1,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <MascotRenderer
                personality={key}
                phase={phase}
                mood={mood}
                size={56}
                customization={customization}
                mutationIds={mutationIds}
                reduceMotion
              />
            </View>
            <Typography
              variant="caption"
              tone={isCurrent ? 'brand' : 'secondary'}
              style={{ fontWeight: isCurrent ? '700' : '400' }}
            >
              {emoji} {label}
            </Typography>
          </View>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    swatch: {
      alignItems: 'center',
      gap: 4,
    },
    miniWrap: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
