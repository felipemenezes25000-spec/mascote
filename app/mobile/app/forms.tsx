import { Typography } from '@/components/ui';
/**
 * Galeria de Formas — a coleção de evoluções corporais do mascote.
 *
 * Estilo Pokédex com antecipação ética:
 *  - formas CONQUISTADAS: preview vivo do mascote do usuário naquela forma;
 *  - a PRÓXIMA forma: revelada por inteiro ("é isso que vem") — desejo;
 *  - formas DISTANTES: silhueta (opacidade mínima) + nome — mistério.
 *
 * Os previews usam o pipeline real (Mascot2D + journeyVisuals do primeiro
 * XP de cada mundo + fase visual correspondente) — o que você vê é o que
 * o SEU mascote vira, com o SEU DNA e emblema.
 */
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analytics } from '@/analytics';
import { Mascot } from '@/components/Mascot';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { JOURNEY_PHASES, JOURNEY_WORLDS, journeyPhaseFromXp } from '@/game/journey';
import { formDisplayName, formForWorld, mascotFormFromXp } from '@/game/journey/forms';
import { journeyVisuals } from '@/game/journey/visuals';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { phaseFromXp } from '@/lib/xp';
import { useStyles } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

export default function FormsGallery() {
  const styles = useStyles(makeStyles);
  const mascot = useStore(s => s.mascot);
  const { tier } = useSubscriptionTier();
  const xp = mascot?.xp ?? 0;
  const currentWorldId = journeyPhaseFromXp(xp).worldId;
  const currentForm = mascotFormFromXp(xp);
  const conquered = currentWorldId;

  useEffect(() => {
    analytics.track('forms_gallery_viewed', {
      form: currentForm.formId,
      world: currentWorldId,
    });
    // Só no mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mascot) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="back" title="Galeria de Formas" subtitle={`${conquered} de 10 conquistadas`} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Forma atual em destaque */}
        <StaggeredView index={0}>
          <View style={styles.heroCard}>
            <Mascot
              personality={mascot.personality}
              phase={mascot.phase}
              mood="feliz"
              size={150}
              reduceMotion
              journey={journeyVisuals(xp)}
            />
            <Typography variant="heading">{formDisplayName(xp, mascot.dna)}</Typography>
            <Typography variant="caption" tone="secondary" align="center">
              {currentForm.trait}
            </Typography>
          </View>
        </StaggeredView>

        {JOURNEY_WORLDS.map((world, i) => {
          const form = formForWorld(world.id);
          const state: 'conquered' | 'next' | 'far' =
            world.id <= currentWorldId ? 'conquered' : world.id === currentWorldId + 1 ? 'next' : 'far';
          const isCurrent = world.id === currentWorldId;
          const premiumLocked = world.premium && tier === 'free';
          const worldXp = JOURNEY_PHASES[world.firstPhase - 1].xp;
          const a11yState =
            state === 'conquered'
              ? isCurrent ? 'forma atual' : 'conquistada'
              : state === 'next'
                ? `próxima forma, desbloqueia na fase ${world.firstPhase}`
                : `desbloqueia na fase ${world.firstPhase}`;
          return (
            <StaggeredView key={world.id} index={Math.min(1 + i, 8)}>
              <View
                style={[styles.formCard, isCurrent && { borderColor: world.hue, borderWidth: 2 }]}
                accessibilityRole="text"
                accessibilityLabel={`Forma ${form.name}, mundo ${world.name}, ${a11yState}.`}
              >
                <View style={[styles.preview, state === 'far' && styles.previewFar]}>
                  <Mascot
                    personality={mascot.personality}
                    phase={phaseFromXp(worldXp)}
                    mood={state === 'conquered' ? 'feliz' : 'ok'}
                    size={86}
                    reduceMotion
                    journey={journeyVisuals(worldXp)}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.nameRow}>
                    <Typography variant="bodyBold" style={state !== 'far' ? { color: world.hue } : undefined}>
                      {form.name}
                    </Typography>
                    {premiumLocked && (
                      <View style={styles.plusBadge}>
                        <Typography variant="mono" tone="inkOnBrand" style={{ fontWeight: '700' }}>PLUS</Typography>
                      </View>
                    )}
                  </View>
                  <Typography variant="caption" tone="secondary" numberOfLines={2}>
                    {state === 'far' ? 'Uma forma ainda guardada pelo caminho…' : form.trait}
                  </Typography>
                  <Typography variant="mono" tone="dim">
                    {world.emoji} {world.name}
                    {state === 'conquered'
                      ? isCurrent ? ' · você está aqui' : ' · conquistada ✓'
                      : ` · Fase ${world.firstPhase}`}
                  </Typography>
                </View>
              </View>
            </StaggeredView>
          );
        })}

        <Typography variant="caption" tone="secondary" align="center">
          Cada forma nasce do seu cuidado — e nenhuma se perde.
        </Typography>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    heroCard: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadow.sm,
    },
    formCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
    },
    preview: { width: 92, alignItems: 'center' },
    // Silhueta: quase-opaco esconde detalhe mas preserva contorno (mistério).
    previewFar: { opacity: 0.16 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    plusBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
  });
}
