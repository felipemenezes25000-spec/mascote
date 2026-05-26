/**
 * MutationsActiveStrip — chips horizontais com mutations desbloqueadas
 * que estão afetando o preview do Atelier.
 *
 * Visual: ScrollView horizontal de chips coloridos por raridade (common/rare/
 * epic/legendary). Tap mostra Alert com descrição da mutation. Vazio = mensagem
 * dim "Nenhuma mutação desbloqueada ainda".
 *
 * Não permite "desligar" mutation aqui — mutações são marcos biológicos, não
 * customização opcional. Indicador serve pra usuário entender o que está
 * influenciando o visual.
 */

import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/ui';
import { getMutationById, type UnlockedMutation } from '@/lib/dna/mutations';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const RARITY_EMOJI: Record<string, string> = {
  common: '⚪',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡',
};

export interface MutationsActiveStripProps {
  unlocked: readonly UnlockedMutation[];
}

export function MutationsActiveStrip({ unlocked }: MutationsActiveStripProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  if (unlocked.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Typography variant="caption" tone="dim" style={styles.emptyText}>
          Nenhuma mutação desbloqueada ainda — elas surgem com hábitos e tempo.
        </Typography>
      </View>
    );
  }

  // Resolve catalog entry (pula IDs órfãos de catálogos antigos).
  const resolved = unlocked
    .map(u => ({ unlocked: u, def: getMutationById(u.mutation_id) }))
    .filter((x): x is { unlocked: UnlockedMutation; def: NonNullable<ReturnType<typeof getMutationById>> } => x.def !== undefined);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {resolved.map(({ unlocked: u, def: mut }) => {
        const emoji = RARITY_EMOJI[mut.rarity] ?? '✨';
        return (
          <PressableScale
            key={u.mutation_id}
            onPress={() => {
              Alert.alert(
                `${emoji}  ${mut.name}`,
                `${mut.description}\n\nRaridade: ${mut.rarity}\nDesbloqueada: ${new Date(u.unlocked_at).toLocaleDateString('pt-BR')}`,
              );
            }}
            style={[
              styles.chip,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Mutação ${mut.name}. Toque para detalhes.`}
          >
            <Typography variant="caption" style={{ fontWeight: '700' }}>
              {emoji}  {mut.name}
            </Typography>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    emptyWrap: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    emptyText: {
      fontStyle: 'italic',
      textAlign: 'center',
    },
  });
}
