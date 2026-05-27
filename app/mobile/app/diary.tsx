import { Typography } from '@/components/ui';
/**
 * app/diary.tsx — Diário com 2 abas: "Do mascote" e "Suas memórias".
 *
 * V2: consolida o que antes eram 2 rotas (/diary + /memories) em uma única.
 *  - Aba "Do mascote": entradas em 1ª pessoa do Pip (nascimento, mutações,
 *    retornos sem culpa, marcos). É a carta dele pra você.
 *  - Aba "Suas memórias": memórias extraídas das conversas (eventos,
 *    sentimentos, pessoas, preferências). É o que ele LEMBRA de você.
 *
 * Ambos têm o mesmo POV ("eu, mascote"), mas a aba do mascote são REFLEXÕES
 * dele sobre você, e Memórias são FATOS que ele guardou. UX diferenciada
 * por copy, ícone e tom — não por cor de fundo.
 */
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { dateLocal, daysBetween, todayLocal } from '@/lib/db';
import { buildMascotDiary, type DiaryEntry, type DiaryEntryKind } from '@/lib/diary/mascotDiary';
import { listMemories, type MemoryItem } from '@/lib/memory';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

type Tab = 'mascot' | 'user';

const KIND_LABEL: Record<DiaryEntryKind, string> = {
  birth: 'Nascimento',
  mutation: 'Algo mudou em mim',
  return_after_absence: 'Você voltou',
  streak_milestone: 'Marco',
};

const KIND_ICON: Record<DiaryEntryKind, { name: 'sparkle' | 'sparkles' | 'heart' | 'flame'; color: 'primary' | 'gold' }> = {
  birth: { name: 'sparkle', color: 'primary' },
  mutation: { name: 'sparkles', color: 'primary' },
  return_after_absence: { name: 'heart', color: 'gold' },
  streak_milestone: { name: 'flame', color: 'gold' },
};

const MEM_KIND_EMOJI: Record<MemoryItem['kind'], string> = {
  feeling: '💛',
  event: '✨',
  person: '👤',
  preference: '🌿',
  fact: '📝',
};

export default function DiaryScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const mascot = useStore(s => s.mascot);
  const profile = useStore(s => s.profile);
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: Tab = params.tab === 'memories' ? 'user' : 'mascot';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [memories, setMemories] = useState<MemoryItem[] | null>(null);

  useEffect(() => {
    if (!profile?.id || !mascot) return;
    let alive = true;
    void (async () => {
      const result = await buildMascotDiary({
        mascot,
        userId: profile.id,
        displayName: profile.display_name,
      });
      if (alive) setEntries(result);
    })();
    return () => {
      alive = false;
    };
  }, [profile?.id, mascot?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    let alive = true;
    void (async () => {
      const all = await listMemories(profile.id);
      if (!alive) return;
      const sorted = [...all].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      // Defensive view-side dedup por summary: legacy data pre-idempotency-window
      // (commit c66fbc8) pode ter memórias duplicadas no AsyncStorage. Mantém a
      // mais recente (sorted DESC garante isso). Espelha o padrão de memories.tsx.
      const seen = new Set<string>();
      const deduped = sorted.filter(m => {
        if (seen.has(m.summary)) return false;
        seen.add(m.summary);
        return true;
      });
      setMemories(deduped);
    })();
    return () => {
      alive = false;
    };
  }, [profile?.id]);

  const memoriesByBucket = useMemo(() => {
    if (!memories) return null;
    const map: Record<string, MemoryItem[]> = {};
    const today = todayLocal();
    for (const m of memories) {
      // Bucket por DIA LOCAL — memória de 23h ontem com user abrindo às 1h
      // de hoje aparece em "Esta semana", não "Hoje".
      const parsed = new Date(m.created_at);
      const memDay = Number.isFinite(parsed.getTime())
        ? dateLocal(parsed)
        : m.created_at.slice(0, 10);
      const ageDays = daysBetween(memDay, today);
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
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: 'Diário' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.backBtn}
          >
            <Icon name="arrow-left" size={20} color={theme.colors.text} strokeWidth={2.4} />
          </Pressable>
          <Typography variant="body" style={styles.kicker}>Diário</Typography>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.tabs}>
          <TabButton
            label="Do mascote"
            icon="heart"
            active={activeTab === 'mascot'}
            onPress={() => setActiveTab('mascot')}
            theme={theme}
            styles={styles}
          />
          <TabButton
            label="Suas memórias"
            icon="book"
            active={activeTab === 'user'}
            onPress={() => setActiveTab('user')}
            theme={theme}
            styles={styles}
          />
        </View>

        {activeTab === 'mascot' ? (
          <MascotTab entries={entries} mascotName={mascot?.name} theme={theme} styles={styles} />
        ) : (
          <UserTab byBucket={memoriesByBucket} theme={theme} styles={styles} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  label, icon, active, onPress, theme, styles,
}: {
  label: string;
  icon: 'heart' | 'book';
  active: boolean;
  onPress: () => void;
  theme: Theme;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Icon
        name={icon}
        size={14}
        color={active ? theme.colors.primary : theme.colors.textSecondary}
        strokeWidth={2.2}
      />
      <Typography variant="body" style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Typography>
    </Pressable>
  );
}

function MascotTab({
  entries, mascotName, theme, styles,
}: {
  entries: DiaryEntry[] | null;
  mascotName?: string;
  theme: Theme;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <>
      <View style={styles.intro}>
        <Typography variant="body" style={styles.introText}>
          Aqui é o {mascotName ?? 'mascote'} falando.{'\n'}
          Não cobra ler. Só queria que você soubesse o que eu sinto.
        </Typography>
      </View>

      {!entries && (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}

      {entries && entries.length === 0 && (
        <View style={styles.empty}>
          <Typography variant="body" style={styles.emptyText}>
            Ainda não tenho muito pra escrever. Volta amanhã pra fazer um check-in — e a gente começa.
          </Typography>
        </View>
      )}

      {entries?.map(entry => (
        <DiaryCard key={entry.id} entry={entry} theme={theme} styles={styles} />
      ))}
    </>
  );
}

function UserTab({
  byBucket, theme, styles,
}: {
  byBucket: Record<string, MemoryItem[]> | null;
  theme: Theme;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <>
      <View style={styles.intro}>
        <Typography variant="body" style={styles.introText}>
          O que eu lembro de você.{'\n'}
          Cada conversa, missão e momento que ficou.
        </Typography>
      </View>

      {!byBucket && (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}

      {byBucket && Object.keys(byBucket).length === 0 && (
        <View style={styles.empty}>
          <Typography variant="body" style={styles.emptyText}>
            Ainda sem memórias guardadas. Conte algo no chat — vou começar a guardar pequenos momentos.
          </Typography>
        </View>
      )}

      {byBucket && Object.entries(byBucket).map(([bucket, items]) => (
        <View key={bucket} style={styles.bucketSection}>
          <Typography variant="body" style={styles.bucketLabel}>{bucket}</Typography>
          {items.map(m => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBubble, { backgroundColor: theme.colors.primaryTint }]}>
                  <Typography variant="body" style={styles.memEmoji}>{MEM_KIND_EMOJI[m.kind]}</Typography>
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="body" style={styles.cardKind}>{m.summary}</Typography>
                  <Typography variant="body" style={styles.cardDate}>{formatAge(m.created_at)}</Typography>
                </View>
              </View>
              {m.source_snippet ? (
                <Typography variant="body" style={styles.memSnippet} numberOfLines={2}>“{m.source_snippet}”</Typography>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

function DiaryCard({
  entry, theme, styles,
}: { entry: DiaryEntry; theme: Theme; styles: ReturnType<typeof makeStyles> }) {
  const iconCfg = KIND_ICON[entry.kind];
  const iconColor = iconCfg.color === 'gold' ? theme.colors.secondary : theme.colors.primary;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBubble, { backgroundColor: iconColor + '22' }]}>
          <Icon name={iconCfg.name} size={14} color={iconColor} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="body" style={styles.cardKind}>{KIND_LABEL[entry.kind]}</Typography>
          <Typography variant="body" style={styles.cardDate}>{formatAge(entry.occurred_at)}</Typography>
        </View>
        {entry.hint && <Typography variant="body" style={styles.cardHint}>{entry.hint}</Typography>}
      </View>
      <Typography variant="body" style={styles.cardBody}>{entry.body}</Typography>
    </View>
  );
}

function formatAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
  return `${Math.floor(days / 30)} meses atrás`;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl * 2,
      gap: theme.spacing.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
    kicker: {
      fontSize: 11,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
    },
    tabs: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.pill,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
    },
    tabActive: {
      backgroundColor: theme.colors.primaryTint,
    },
    tabLabel: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    tabLabelActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    intro: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      marginVertical: theme.spacing.sm,
    },
    introText: {
      ...theme.text.body,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 16,
      lineHeight: 24,
      fontStyle: 'italic',
    },
    loading: { paddingVertical: theme.spacing.xl, alignItems: 'center' },
    empty: { paddingVertical: theme.spacing.xl, alignItems: 'center' },
    emptyText: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    bucketSection: { gap: theme.spacing.sm },
    bucketLabel: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'JetBrainsMono_500Medium',
      marginTop: theme.spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    iconBubble: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardKind: {
      ...theme.text.sm,
      color: theme.colors.text,
      fontWeight: '700',
    },
    cardDate: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
    },
    cardHint: {
      ...theme.text.xs,
      color: theme.colors.primary,
      fontWeight: '700',
      fontFamily: 'JetBrainsMono_500Medium',
    },
    cardBody: {
      ...theme.text.body,
      color: theme.colors.text,
      lineHeight: 22,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 16,
    },
    memEmoji: { fontSize: 16 },
    memSnippet: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
  });
}
