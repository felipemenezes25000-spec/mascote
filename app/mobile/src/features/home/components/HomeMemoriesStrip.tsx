import { MemoryCard, Typography } from '@/components/ui';
/**
 * HomeMemoriesStrip — strip horizontal de memórias contextuais na Home.
 *
 * Aparece SÓ quando há ≥1 memória relevante. Mostra até 3 memórias recentes
 * em linha, com tap → tela `/memories`. Vazio = oculto (não polui a Home com
 * placeholder).
 */
import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useStyles } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';

import { listMemories } from '@/lib/memory';
import type { MemoryItem } from '@/lib/memory';

interface Props {
  userId: string | null;
  /** Refresh manual quando outras telas adicionam memória. */
  refreshKey?: number;
}

function ageLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t('home.memories.age_today');
  if (days === 1) return t('home.memories.age_yesterday');
  if (days < 7) return t('home.memories.age_days', days);
  if (days < 30) return t('home.memories.age_weeks', Math.floor(days / 7));
  return t('home.memories.age_months', Math.floor(days / 30));
}

function emojiForKind(kind: MemoryItem['kind']): string {
  switch (kind) {
    case 'feeling':
      return '💛';
    case 'event':
      return '✨';
    case 'person':
      return '👤';
    case 'preference':
      return '🌿';
    case 'fact':
    default:
      return '📝';
  }
}

export function HomeMemoriesStrip({ userId, refreshKey }: Props) {
  const styles = useStyles(makeStyles);
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void (async () => {
      const all = await listMemories(userId);
      if (!alive) return;
      const sorted = [...all].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setMemories(sorted.slice(0, 3));
    })();
    return () => {
      alive = false;
    };
  }, [userId, refreshKey]);

  if (memories.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Typography variant="caption" tone="dim" style={styles.label}>
        {t('home.memories.label')}
      </Typography>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {memories.map(m => (
          <View key={m.id} style={styles.cardWrap}>
            <MemoryCard
              memory={{
                id: m.id,
                title: m.summary,
                snippet: m.source_snippet,
                date: ageLabel(m.created_at),
                emoji: emojiForKind(m.kind),
              }}
              onPress={() => router.push('/memories')}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { gap: theme.spacing.xs, paddingLeft: theme.spacing.lg },
    label: {
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    row: { gap: theme.spacing.sm, paddingRight: theme.spacing.lg },
    cardWrap: { width: 280 },
  });
}
