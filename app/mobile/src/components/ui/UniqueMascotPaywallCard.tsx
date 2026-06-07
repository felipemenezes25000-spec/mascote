/**
 * UniqueMascotPaywallCard — card de paywall que mostra o ProceduralGenome
 * do user e ancora a venda na unicidade do mascote.
 *
 * Headline: "Seu {nome} é único no mundo."
 * Subtexto: story do procedural genome se houver, senão copy fallback.
 *
 * Ver spec § B.9.
 */

import { memo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Mascot2D } from '@/components/Mascot2D';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/lib/useTheme';
import type { Mascot, MascotMood, MascotPhase, Personality, ProceduralGenome } from '@/types';

interface Props {
  mascot: Pick<Mascot, 'name' | 'personality' | 'phase' | 'mood'> & {
    procedural_genome?: ProceduralGenome | null;
    dna?: Mascot['dna'];
  };
  onCtaPress: () => void;
  ctaLabel?: string;
  disabled?: boolean;
}

function UniqueMascotPaywallCardImpl({ mascot, onCtaPress, ctaLabel = 'Continuar evoluindo — Premium', disabled }: Props) {
  const theme = useTheme();
  const story = mascot.procedural_genome?.story
    ?? `${mascot.name} já é único — agora é só deixar a história continuar.`;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.heroRow}>
        <Mascot2D
          personality={mascot.personality as Personality}
          phase={mascot.phase as MascotPhase}
          mood={mascot.mood as MascotMood}
          size={140}
          dna={mascot.dna}
          proceduralGenome={mascot.procedural_genome ?? null}
        />
      </View>

      <View style={styles.copyWrap}>
        <Typography variant="body" style={[styles.headline, { color: theme.colors.text }]}>
          {mascot.name} é único no mundo.
        </Typography>
        <Typography variant="body" style={[styles.story, { color: theme.colors.textSecondary }]}>
          {story}
        </Typography>
      </View>

      <Pressable
        onPress={onCtaPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: disabled
              ? theme.colors.border
              : pressed
                ? theme.colors.primaryDeep ?? theme.colors.primary
                : theme.colors.primary,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Typography
          variant="body"
          style={[
            styles.ctaLabel,
            { color: disabled ? theme.colors.textSecondary : theme.tokens.semantic.inkOnBrand },
          ]}
        >
          {ctaLabel}
        </Typography>
      </Pressable>
    </View>
  );
}

export const UniqueMascotPaywallCard = memo(UniqueMascotPaywallCardImpl);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  heroRow: { alignItems: 'center' },
  copyWrap: { alignItems: 'center', gap: 6 },
  headline: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  story: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cta: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaLabel: { fontWeight: '800', fontSize: 15 },
});
