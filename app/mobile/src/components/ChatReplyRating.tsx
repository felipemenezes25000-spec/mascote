/**
 * Feedback rápido da última resposta do mascote (Pilar 3 — analytics).
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export type ReplyRatingKind = 'helpful' | 'not_helpful' | 'repetition';

interface Props {
  onRate: (helpful: boolean, repetition: boolean) => void;
}

export function ChatReplyRating({ onRate }: Props) {
  const styles = useStyles(makeStyles);
  const [done, setDone] = useState<ReplyRatingKind | null>(null);

  if (done) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.thanks}>Obrigado pelo feedback</Text>
      </View>
    );
  }

  function pick(kind: ReplyRatingKind) {
    // Guard contra duplo-tap rapido (<300ms): setState e assincrono e o
    // re-render que esconde a UI nao acontece antes do segundo tap, entao
    // 2 analytics events / 2 backend calls saiam por engano.
    if (done) return;
    setDone(kind);
    if (kind === 'helpful') onRate(true, false);
    else if (kind === 'not_helpful') onRate(false, false);
    else onRate(false, true);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>Essa resposta ajudou?</Text>
      <View style={styles.row}>
        <PressableScale
          style={styles.chip}
          onPress={() => pick('helpful')}
          accessibilityRole="button"
          accessibilityLabel="Resposta útil"
        >
          <Text style={styles.chipText}>Útil</Text>
        </PressableScale>
        <PressableScale
          style={styles.chip}
          onPress={() => pick('not_helpful')}
          accessibilityRole="button"
          accessibilityLabel="Resposta não ajudou"
        >
          <Text style={styles.chipText}>Não ajudou</Text>
        </PressableScale>
        <PressableScale
          style={[styles.chip, styles.chipGhost]}
          onPress={() => pick('repetition')}
          accessibilityRole="button"
          accessibilityLabel="Já vi essa resposta antes"
        >
          <Text style={[styles.chipText, styles.chipGhostText]}>Repetiu?</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
      marginTop: -2,
      marginLeft: theme.spacing.sm,
    },
    prompt: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      marginBottom: 6,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipGhost: {
      backgroundColor: 'transparent',
    },
    chipText: {
      ...theme.text.xs,
      color: theme.colors.text,
      fontWeight: '600',
    },
    chipGhostText: {
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    thanks: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      fontStyle: 'italic',
    },
  });
}
