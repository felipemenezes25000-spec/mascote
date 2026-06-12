import { Typography } from '@/components/ui';
/**
 * Cosmos de Espécies (Bestiário) — mostra a criatura ATUAL do usuário e as 15
 * famílias de espécie que o ovo pode chocar conforme as ações mudam o DNA.
 *
 * Cada família é renderizada com a PALETA do próprio usuário (forceArchetype),
 * então o card responde "é nisso que o SEU bicho poderia virar". A família
 * atual aparece destacada; as outras como "ainda não desperta" — antecipação
 * sem culpa ("seus hábitos guiam pra onde ele cresce").
 */
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analytics } from '@/analytics';
import { CreatureRenderer } from '@/components/mascot/CreatureRenderer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import {
  ARCHETYPES, ARCHETYPE_IDS, countCoherentCreatures,
  creatureGenomeFromDNA, type CreatureArchetype,
} from '@/game/creatures';
import { useStyles } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

const RARITY_TONE: Record<string, string> = {
  comum: '#8A8378', incomum: '#5AA06E', raro: '#4E78C2', épico: '#9A5BC2', lendário: '#C9A227',
};

export default function CosmosScreen() {
  const styles = useStyles(makeStyles);
  const mascot = useStore(s => s.mascot);
  const dna = mascot?.dna;
  const mine = creatureGenomeFromDNA(dna);
  const totalModels = countCoherentCreatures();

  useEffect(() => {
    analytics.track('cosmos_viewed', { archetype: mine.archetype, rarity: mine.rarity });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mascot) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="back" title="Cosmos de Espécies" subtitle={`${ARCHETYPE_IDS.length} famílias · milhões de formas`} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Sua criatura atual */}
        <StaggeredView index={0}>
          <View style={[styles.heroCard, { borderColor: RARITY_TONE[mine.rarity] }]}>
            <CreatureRenderer creature={mine} mood="feliz" size={150} reduceMotion />
            <Typography variant="heading">{mascot.name}</Typography>
            <Typography variant="caption" style={{ color: RARITY_TONE[mine.rarity], fontWeight: '700' }}>
              {mine.speciesName} · {mine.rarity}
            </Typography>
            <Typography variant="mono" tone="dim" align="center">
              Sua espécie nasceu das suas escolhas. Hábitos diferentes guiam pra outra forma.
            </Typography>
          </View>
        </StaggeredView>

        <Typography variant="bodyBold" style={styles.sectionLabel}>As {ARCHETYPE_IDS.length} famílias</Typography>

        {ARCHETYPE_IDS.map((id, i) => {
          const sample = creatureGenomeFromDNA(dna, { forceArchetype: id });
          const isMine = id === mine.archetype;
          const spec = ARCHETYPES[id as CreatureArchetype];
          return (
            <StaggeredView key={id} index={Math.min(1 + i, 8)}>
              <View
                style={[styles.speciesCard, isMine && { borderColor: RARITY_TONE[sample.rarity], borderWidth: 2 }]}
                accessibilityRole="text"
                accessibilityLabel={`${spec.label}${isMine ? ', sua espécie atual' : ''}. Raridade ${spec.baseRarity}.`}
              >
                <View style={styles.preview}>
                  <CreatureRenderer creature={sample} mood={isMine ? 'feliz' : 'ok'} size={84} reduceMotion />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.nameRow}>
                    <Typography variant="bodyBold">{spec.label}</Typography>
                    {isMine && (
                      <View style={[styles.youBadge, { backgroundColor: RARITY_TONE[sample.rarity] }]}>
                        <Typography variant="mono" tone="inkOnBrand" style={{ fontWeight: '700' }}>VOCÊ</Typography>
                      </View>
                    )}
                  </View>
                  <Typography variant="caption" tone="secondary">{sample.speciesName}</Typography>
                  <Typography variant="mono" tone="dim">
                    {spec.baseRarity}
                    {isMine ? ' · sua forma agora' : ' · ainda não desperta'}
                  </Typography>
                </View>
              </View>
            </StaggeredView>
          );
        })}

        <Typography variant="mono" tone="dim" align="center" style={{ marginTop: 8 }}>
          {totalModels.toLocaleString('pt-BR')} criaturas possíveis — nenhuma igual à sua.
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
      padding: theme.spacing.lg, gap: theme.spacing.md,
      maxWidth: 560, width: '100%', alignSelf: 'center',
    },
    heroCard: {
      alignItems: 'center', gap: theme.spacing.xs,
      backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
      borderWidth: 2, padding: theme.spacing.md, ...theme.shadow.sm,
    },
    sectionLabel: { marginTop: theme.spacing.sm },
    speciesCard: {
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
      backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
      borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.sm,
    },
    preview: { width: 92, alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    youBadge: { borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  });
}
