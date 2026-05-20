import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Typography, MemoryCard, EmptyState } from '@/components/ui';
import { useStore } from '@/store';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { listMemories, type MemoryItem } from '@/lib/memory';

function ageLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
  return `${Math.floor(days / 30)} meses atrás`;
}

function emojiForKind(kind: MemoryItem['kind']): string {
  switch (kind) {
    case 'feeling': return '💛';
    case 'event': return '✨';
    case 'person': return '👤';
    case 'preference': return '🌿';
    case 'fact':
    default: return '📝';
  }
}

export default function Memories() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      const all = await listMemories(profile.id);
      const sorted = [...all].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setMemories(sorted);
      setLoaded(true);
    })();
  }, [profile?.id]);

  const grouped = useMemo(() => {
    const map: Record<string, MemoryItem[]> = {};
    for (const m of memories) {
      const ageDays = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86_400_000);
      const bucket =
        ageDays <= 0 ? 'Hoje'
        : ageDays <= 7 ? 'Esta semana'
        : ageDays <= 30 ? 'Este mês'
        : 'Mais antigas';
      if (!map[bucket]) map[bucket] = [];
      map[bucket].push(m);
    }
    return map;
  }, [memories]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Typography variant="caption" tone="dim" style={styles.kicker}>
            MEMÓRIA DO MASCOTE
          </Typography>
          <Typography variant="display">O que ele lembra de você</Typography>
          <Typography variant="body" tone="secondary">
            Cada conversa, missão e momento que ficou. Memórias somem com o tempo se não forem reforçadas.
          </Typography>
        </View>

        {loaded && memories.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState
              emoji="🌱"
              title="Ainda sem memórias guardadas"
              body="Conte algo no chat ou complete missões — o mascote vai começar a guardar pequenos momentos."
              ctaLabel="Conversar agora"
              onCta={() => router.push('/(tabs)/chat')}
            />
          </View>
        ) : null}

        {Object.entries(grouped).map(([bucket, items]) => (
          <View key={bucket} style={styles.section}>
            <Typography variant="heading" style={styles.sectionLabel}>
              {bucket}
            </Typography>
            <View style={styles.list}>
              {items.map(m => (
                <MemoryCard
                  key={m.id}
                  memory={{
                    id: m.id,
                    title: m.summary,
                    snippet: m.source_snippet,
                    date: ageLabel(m.created_at),
                    emoji: emojiForKind(m.kind),
                  }}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl * 2,
      gap: theme.spacing.lg,
    },
    header: { gap: theme.spacing.sm },
    kicker: {
      letterSpacing: 1.2,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    section: { gap: theme.spacing.sm },
    sectionLabel: { color: theme.colors.text },
    list: { gap: theme.spacing.sm },
    empty: { paddingVertical: theme.spacing.xl },
    footer: { marginTop: theme.spacing.lg },
  });
}
