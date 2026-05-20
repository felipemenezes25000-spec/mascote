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
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
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
    void (async () => {
      const result = await buildMascotDiary({
        mascot,
        userId: profile.id,
        displayName: profile.display_name,
      });
      setEntries(result);
    })();
  }, [profile?.id, mascot?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    void (async () => {
      const all = await listMemories(profile.id);
      const sorted = [...all].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setMemories(sorted);
    })();
  }, [profile?.id]);

  const memoriesByBucket = useMemo(() => {
    if (!memories) return null;
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
          <Text style={styles.kicker}>Diário</Text>
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
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
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
        <Text style={styles.introText}>
          Aqui é o {mascotName ?? 'mascote'} falando.{'\n'}
          Não cobra ler. Só queria que você soubesse o que eu sinto.
        </Text>
      </View>

      {!entries && (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}

      {entries && entries.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Ainda não tenho muito pra escrever. Volta amanhã pra fazer um check-in — e a gente começa.
          </Text>
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
        <Text style={styles.introText}>
          O que eu lembro de você.{'\n'}
          Cada conversa, missão e momento que ficou.
        </Text>
      </View>

      {!byBucket && (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}

      {byBucket && Object.keys(byBucket).length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Ainda sem memórias guardadas. Conte algo no chat — vou começar a guardar pequenos momentos.
          </Text>
        </View>
      )}

      {byBucket && Object.entries(byBucket).map(([bucket, items]) => (
        <View key={bucket} style={styles.bucketSection}>
          <Text style={styles.bucketLabel}>{bucket}</Text>
          {items.map(m => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBubble, { backgroundColor: theme.colors.primaryTint }]}>
                  <Text style={styles.memEmoji}>{MEM_KIND_EMOJI[m.kind]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardKind}>{m.summary}</Text>
                  <Text style={styles.cardDate}>{formatAge(m.created_at)}</Text>
                </View>
              </View>
              {m.source_snippet ? (
                <Text style={styles.memSnippet} numberOfLines={2}>“{m.source_snippet}”</Text>
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
          <Text style={styles.cardKind}>{KIND_LABEL[entry.kind]}</Text>
          <Text style={styles.cardDate}>{formatAge(entry.occurred_at)}</Text>
        </View>
        {entry.hint && <Text style={styles.cardHint}>{entry.hint}</Text>}
      </View>
      <Text style={styles.cardBody}>{entry.body}</Text>
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
