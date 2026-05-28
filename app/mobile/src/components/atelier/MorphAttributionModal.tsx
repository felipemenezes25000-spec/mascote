/**
 * MorphAttributionModal — explica COMO o mascote chegou no visual atual.
 *
 * Modal mostra tabela de composição dos morph influences:
 *  - DNA base (computed from sliders + customization)
 *  - + Mutation boosts (com source de cada)
 *  - + Personality bias (com source)
 *  - = Final clamped
 *
 * Usuário entende "por que o olho está tão grande" — vai dizer "vem da
 * mut.deep_eyes (+0.30) + personality calmo (+0.08) + meu slider (+0.15)".
 *
 * Educativo, não interativo (read-only). Pra editar = mexe nos sliders.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import { ModalShell } from '@/components/ui/ModalShell';
import { Typography } from '@/components/ui';
import {
  mergeMorphInfluences,
  morphInfluencesFromMorphology,
  type MorphInfluences,
} from '@/lib/dna/morphInfluences';
import { applyCustomization } from '@/lib/dna/customization';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import {
  aggregateVisualImpact,
  getMutationById,
  type UnlockedMutation,
} from '@/lib/dna/mutations';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import type { Genome } from '@/lib/dna';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { MascotCustomization, MascotDNA, Personality } from '@/types';

const KEY_LABELS_PT: Record<string, string> = {
  eye_big: 'Olhos grandes',
  eye_small: 'Olhos pequenos',
  body_tall: 'Corpo alto',
  body_short: 'Corpo achatado',
  body_wide: 'Corpo largo',
  body_narrow: 'Corpo afinado',
  posture_forward: 'Postura à frente',
  posture_back: 'Postura recolhida',
  aura_strong: 'Aura intensa',
  pattern_dense: 'Padrão denso',
};

export interface MorphAttributionModalProps {
  visible: boolean;
  onClose: () => void;
  dna: MascotDNA;
  customization: MascotCustomization | null;
  personality: Personality;
  unlocked: readonly UnlockedMutation[];
}

interface AttributionRow {
  key: string;
  label: string;
  base: number;
  mutationContrib: number;
  personalityContrib: number;
  final: number;
  /** IDs de mutations que tocam essa key (pra source display). */
  mutationSources: string[];
}

function buildAttributionTable(
  dna: MascotDNA,
  customization: MascotCustomization | null,
  personality: Personality,
  unlocked: readonly UnlockedMutation[],
): AttributionRow[] {
  const baseMorph = morphologyFromGenome(dna as Genome);
  const withCustom = applyCustomization(baseMorph, customization);
  const base = morphInfluencesFromMorphology(withCustom);

  const mutationBoosts = aggregateVisualImpact(unlocked.map(u => u.mutation_id))
    .morphInfluenceBoosts;
  const personalityBias = personalityMorphBias(personality);

  const withMut = mergeMorphInfluences(base, mutationBoosts);
  const finalInf = mergeMorphInfluences(withMut, personalityBias);

  // Coleta keys de TODOS os layers — mostra mesmo se algum layer não tocou.
  const allKeys = new Set<string>([
    ...Object.keys(base),
    ...Object.keys(mutationBoosts),
    ...Object.keys(personalityBias),
    ...Object.keys(finalInf),
  ]);

  // Mapping de keys de mutation que mexem em cada influência morfológica.
  const sourcesByKey: Record<string, string[]> = {};
  for (const u of unlocked) {
    const mut = getMutationById(u.mutation_id);
    if (!mut?.visualImpact.morphInfluenceBoosts) continue;
    for (const key of Object.keys(mut.visualImpact.morphInfluenceBoosts)) {
      sourcesByKey[key] = sourcesByKey[key] ?? [];
      sourcesByKey[key].push(mut.name);
    }
  }

  return Array.from(allKeys)
    .sort()
    .map(key => {
      const baseV = (base as MorphInfluences)[key as keyof MorphInfluences] ?? 0;
      const mutV = mutationBoosts[key] ?? 0;
      const persV = personalityBias[key] ?? 0;
      const finalV =
        (finalInf as MorphInfluences)[key as keyof MorphInfluences] ?? 0;

      return {
        key,
        label: KEY_LABELS_PT[key] ?? key,
        base: baseV,
        mutationContrib: mutV,
        personalityContrib: persV,
        final: finalV,
        mutationSources: sourcesByKey[key] ?? [],
      };
    })
    // Só rows com algum contributing > 0
    .filter(r => r.base > 0 || r.mutationContrib > 0 || r.personalityContrib > 0);
}

function fmt(v: number): string {
  if (v === 0) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}`;
}

export function MorphAttributionModal({
  visible,
  onClose,
  dna,
  customization,
  personality,
  unlocked,
}: MorphAttributionModalProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const rows = visible ? buildAttributionTable(dna, customization, personality, unlocked) : [];

  return (
    <ModalShell visible={visible} onClose={onClose} title="Composição visual">
      <Typography variant="caption" tone="secondary">
        Cada peso morfológico é a soma de: base DNA+customização +
        mutations + personalidade. Final clamped em [0, 1].
      </Typography>

      {rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Typography variant="body" tone="dim" align="center">
            Nada empurrando a morfologia ainda. Customize sliders ou desbloqueie
            mutações pra ver a composição.
          </Typography>
        </View>
      ) : (
        <ScrollView style={styles.scrollWrap} contentContainerStyle={styles.scrollContent}>
          <View style={styles.tableHeader}>
            <Typography variant="caption" style={[styles.col, styles.colKey, { color: theme.colors.textSecondary }]}>Traço</Typography>
            <Typography variant="caption" style={[styles.col, styles.colNum, { color: theme.colors.textSecondary }]}>Base</Typography>
            <Typography variant="caption" style={[styles.col, styles.colNum, { color: theme.colors.textSecondary }]}>Mut.</Typography>
            <Typography variant="caption" style={[styles.col, styles.colNum, { color: theme.colors.textSecondary }]}>Pers.</Typography>
            <Typography variant="caption" style={[styles.col, styles.colNum, { color: theme.colors.textSecondary, fontWeight: '700' }]}>=Final</Typography>
          </View>
          {rows.map(row => (
            <View key={row.key} style={[styles.tableRow, { borderTopColor: theme.colors.border }]}>
              <View style={[styles.col, styles.colKey]}>
                <Typography variant="caption" style={{ fontWeight: '700' }}>
                  {row.label}
                </Typography>
                {row.mutationSources.length > 0 ? (
                  <Typography variant="mono" tone="dim" style={{ fontSize: 9 }}>
                    via {row.mutationSources.join(', ')}
                  </Typography>
                ) : null}
              </View>
              <Typography variant="mono" style={[styles.col, styles.colNum, { color: theme.colors.textSecondary }]}>{fmt(row.base)}</Typography>
              <Typography variant="mono" style={[styles.col, styles.colNum, { color: row.mutationContrib > 0 ? theme.colors.primary : theme.colors.textSecondary }]}>{fmt(row.mutationContrib)}</Typography>
              <Typography variant="mono" style={[styles.col, styles.colNum, { color: row.personalityContrib > 0 ? theme.colors.coral : theme.colors.textSecondary }]}>{fmt(row.personalityContrib)}</Typography>
              <Typography variant="mono" style={[styles.col, styles.colNum, { color: theme.colors.text, fontWeight: '700' }]}>{fmt(row.final)}</Typography>
            </View>
          ))}
        </ScrollView>
      )}

      <Typography variant="caption" tone="dim" align="center">
        Pesos altos afetam escala e silhueta no preview SVG do Mascot2D.
      </Typography>
    </ModalShell>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    scrollWrap: {
      maxHeight: 320,
    },
    scrollContent: {
      paddingVertical: theme.spacing.xs,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 6,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderTopWidth: 1,
      alignItems: 'center',
    },
    col: {
      paddingHorizontal: 4,
    },
    colKey: {
      flex: 2,
    },
    colNum: {
      flex: 1,
      textAlign: 'right',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
    },
    emptyWrap: {
      paddingVertical: theme.spacing.lg,
    },
  });
}
