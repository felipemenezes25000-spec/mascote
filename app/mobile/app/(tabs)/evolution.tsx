/**
 * Aba "Evolução" — terceira tab do handoff.
 *
 * Pós-DLI-v2: a tela parou de ser uma esteira "ovo→bebê→criança" e passou
 * a ser uma vitrine procedural — primeiro mostra IDENTIDADE atual (DNA
 * descritores + traços corporais visíveis + mutações desbloqueadas);
 * depois, abaixo, lista marcos de XP como referência secundária.
 *
 * Os PHASE_THRESHOLDS ainda existem internamente pra alimentar o motor de
 * XP/level (não dá pra arrancar sem refatorar grande parte do gameplay),
 * mas o usuário não vê isso como "objetivo". O objetivo é o DNA.
 */

import { router, useFocusEffect, Redirect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { MascotAmbient } from '@/components/MascotAmbient';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';
import { StaggeredView } from '@/components/StaggeredView';
import { XPBar } from '@/components/XPBar';
import { getAccessory } from '@/content/accessories';
import { getPersonality } from '@/content/personalities';
import {
  checkins as checkinsDb,
  customization as customizationDb,
  dnaMutations,
  inventory,
  userScenes,
} from '@/lib/db';
import {
  GENE_KEYS,
  GENE_META,
  MUTATION_CATALOG,
  dnaDescriptors,
  evaluateCondition,
  findNewlyUnlockedMutations,
  getMutationById,
  morphologySummary,
  sanitizeGenome,
  type Genome,
  type Mutation,
  type MutationContext,
  type MutationRarity,
  type UnlockedMutation,
} from '@/lib/dna';
import { xpToNextLevel } from '@/lib/xp';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import { useEvolutionState } from '@/hooks/useEvolutionState';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { EmptyState } from '@/components/EmptyState';
import { PremiumFeatureGuard } from '@/components/PremiumFeatureGuard';
import { mascotMemoryService } from '@/game/memory';
import { archetypeAffinities, type ArchetypeAffinity } from '@/game/evolution/archetypeAffinity';
import type { Theme } from '@/lib/themes';
import type { AccessoryId } from '@/components/Mascot';
import type { HabitKind, MascotCustomization } from '@/types';

// Labels PT-BR amigáveis pros 11 genes — vocabulário wellness, não científico.
// Usa nuance ("afeição visível" em vez de "empatia"; "movimento livre" em vez
// de "caos") pra manter o tom de produto e não soar como ficha técnica.
const GENE_FRIENDLY: Record<string, string> = {
  empathy: 'afeição visível',
  curiosity: 'inquietação curiosa',
  creativity: 'forma criativa',
  discipline: 'postura constante',
  chaos: 'movimento livre',
  aggression: 'contorno firme',
  resilience: 'base sólida',
  emotionalDepth: 'expressividade',
  socialEnergy: 'aura aberta',
  adaptability: 'fluidez',
  intelligence: 'olhar atento',
};

function rarityColor(r: MutationRarity, theme: Theme): string {
  switch (r) {
    case 'legendary': return theme.colors.gold;
    case 'epic':      return theme.colors.lilac;
    case 'rare':      return theme.colors.primary;
    case 'common':    return theme.colors.sky;
  }
}

function rarityLabel(r: MutationRarity): string {
  switch (r) {
    case 'legendary': return 'LENDÁRIA';
    case 'epic':      return 'ÉPICA';
    case 'rare':      return 'RARA';
    case 'common':    return 'COMUM';
  }
}

export default function EvolutionTab() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const settings = useStore(s => s.settings);
  const streak = useStore(s => s.streak);
  const [activeSceneId, setActiveSceneId] = useState('room');
  const [equippedAccId, setEquippedAccId] = useState<AccessoryId>('none');
  const [unlockedMutations, setUnlockedMutations] = useState<UnlockedMutation[]>([]);
  const [habitCounts, setHabitCounts] = useState<Partial<Record<HabitKind, number>>>({});
  const [genomeExpanded, setGenomeExpanded] = useState(false);
  // Customization carregada pra refletir no Mascot grande desta tela —
  // sem isso o user vê descritores+marcos textuais mas o boneco continua
  // padrão. UX-break crítica.
  const [customState, setCustomState] = useState<MascotCustomization | null>(null);
  const {
    visuals: evolutionVisuals,
    state: evolutionState,
    loading: evolutionLoading,
    error: evolutionError,
    refresh: refreshEvolution,
  } = useEvolutionState();
  const { tier } = useSubscriptionTier();
  const [memorySnippets, setMemorySnippets] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void (async () => {
        const [owned, mutations, allCheckins, custom] = await Promise.all([
          inventory.listOwned(profile.id),
          dnaMutations.listForUser(profile.id),
          checkinsDb.listAll(profile.id),
          customizationDb.get(profile.id),
        ]);
        const eq = owned.find(o => o.equipped);
        setEquippedAccId((eq?.accessory_id as AccessoryId) ?? 'none');
        setActiveSceneId(await userScenes.getActive(profile.id));
        setUnlockedMutations(mutations);
        setCustomState(custom);
        // Conta checkins por hábito pra alimentar findNewlyUnlockedMutations
        // (preview do próximo marco)
        const counts: Partial<Record<HabitKind, number>> = {};
        for (const c of allCheckins) {
          counts[c.habit_kind] = (counts[c.habit_kind] ?? 0) + 1;
        }
        setHabitCounts(counts);
        const snap = await mascotMemoryService.snapshot(profile.id, '');
        setMemorySnippets(snap.entries.slice(0, 5).map(e => e.summary));
      })();
    }, [profile?.id])
  );

  const toNext = useMemo(
    () => (mascot ? xpToNextLevel(mascot.xp) : { current: 0, needed: 50, progress: 0 }),
    [mascot]
  );

  if (!profile || !mascot) return <Redirect href="/splash" />;
  const meta = getPersonality(mascot.personality);

  // Identidade procedural: descritores semânticos + traços morfológicos visíveis.
  // Roda só se DNA existe (mascots pré-migration v2 caem no fallback "—").
  const safeDna = mascot.dna ? sanitizeGenome(mascot.dna) : null;
  const descriptors = safeDna ? dnaDescriptors(safeDna) : [];
  const traits = safeDna ? morphologySummary(safeDna) : [];
  const archetypes: ArchetypeAffinity[] = safeDna ? archetypeAffinities(safeDna).slice(0, 4) : [];
  const totalMutations = MUTATION_CATALOG.length;
  const unlockedIds = new Set(unlockedMutations.map(u => u.mutation_id));
  const unlockedMutationDetails: Array<{ mutation: Mutation; unlocked_at: string }> =
    unlockedMutations
      .map(u => {
        const m = getMutationById(u.mutation_id);
        return m ? { mutation: m, unlocked_at: u.unlocked_at } : null;
      })
      .filter((x): x is { mutation: Mutation; unlocked_at: string } => x !== null)
      .sort((a, b) => b.unlocked_at.localeCompare(a.unlocked_at));

  // Próximo marco previsto — usa findNewlyUnlockedMutations com contexto atual
  // PROJETADO um pouco pra frente (simula 1 checkin a mais por hábito frequente
  // pra detectar marco "quase lá"). Estratégia simples: o próximo marco é o
  // que tem mais condições SATISFEITAS, e o menor número de condições faltando.
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  let nextMutationCandidate: Mutation | null = null;
  if (safeDna) {
    const baseCtx: MutationContext = {
      genome: safeDna,
      habitCheckinCounts: habitCounts,
      currentStreak: streak?.current_streak ?? 0,
      daysSinceCreated,
      alreadyUnlocked: unlockedIds,
    };
    // Mutações ainda não desbloqueadas, ordenadas por "proximidade":
    // contagem de condições JÁ satisfeitas dividida pelo total.
    let bestScore = -1;
    for (const m of MUTATION_CATALOG) {
      if (unlockedIds.has(m.id)) continue;
      if (evaluateCondition(m.condition, baseCtx)) continue; // já desbloqueia AGORA
      // Conta sub-condições satisfeitas
      let satisfied = 0;
      let total = 0;
      if (m.condition.geneAbove) {
        for (const [k, v] of Object.entries(m.condition.geneAbove)) {
          total++;
          if (safeDna[k as keyof Genome] >= (v ?? 0)) satisfied++;
        }
      }
      if (m.condition.habitCheckinsAtLeast) {
        for (const [habit, count] of Object.entries(m.condition.habitCheckinsAtLeast)) {
          total++;
          if ((habitCounts[habit as HabitKind] ?? 0) >= (count ?? 0)) satisfied++;
        }
      }
      if (m.condition.streakAtLeast !== undefined) {
        total++;
        if ((streak?.current_streak ?? 0) >= m.condition.streakAtLeast) satisfied++;
      }
      if (m.condition.daysSinceCreatedAtLeast !== undefined) {
        total++;
        if (daysSinceCreated >= m.condition.daysSinceCreatedAtLeast) satisfied++;
      }
      const score = total > 0 ? satisfied / total : 0;
      if (score > bestScore) {
        bestScore = score;
        nextMutationCandidate = m;
      }
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StaggeredView index={0}>
          <View style={styles.headerRow}>
            <Text accessibilityRole="header" style={styles.h1}>Evolução</Text>
            <PressableScale
              onPress={() => router.push('/profile')}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
            >
              <Icon name="settings" size={20} color={theme.colors.text} strokeWidth={2} />
            </PressableScale>
          </View>
        </StaggeredView>

        {/* Mascote grande em cena */}
        <StaggeredView index={1} initialDelay={40}>
          <View style={styles.sceneWrap}>
            {evolutionError ? (
              <EmptyState
                emoji="🧬"
                title="Evolução temporariamente indisponível"
                body={evolutionError}
                ctaLabel="Tentar de novo"
                onCta={() => void refreshEvolution()}
              />
            ) : (
              <SceneBackground sceneId={activeSceneId} height={320}>
                {evolutionLoading ? (
                  <ActivityIndicator style={{ marginVertical: 120 }} accessibilityLabel="Carregando evolução" />
                ) : (
                  <MascotAmbient size={220} reduceMotion={settings?.reduce_motion}>
                    <Mascot
                      personality={mascot.personality}
                      phase={mascot.phase}
                      mood={mascot.mood}
                      size={220}
                      accessory={equippedAccId}
                      reduceMotion={settings?.reduce_motion}
                      customization={customState}
                      mutationIds={unlockedMutations.map(u => u.mutation_id)}
                      evolutionVisuals={evolutionVisuals}
                    />
                  </MascotAmbient>
                )}
              </SceneBackground>
            )}
          </View>
        </StaggeredView>

        <StaggeredView index={2}>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{mascot.name}</Text>
            <Text style={styles.heroSub}>
              {meta.label} · {meta.mascotName} · nível {mascot.level}
            </Text>
          </View>
        </StaggeredView>

        <StaggeredView index={3}>
          <View style={styles.xpBox}>
            <XPBar level={mascot.level} xp={mascot.xp} toNext={toNext} />
          </View>
        </StaggeredView>

        {/* IDENTIDADE PROCEDURAL — seção principal, primeira coisa que o
            usuário vê depois do mascote. Mostra DNA descritores + traços
            visíveis + count de mutações. É o ANTI-Tamagotchi: a criatura
            é definida por O QUE ELA É, não por uma fase fixa. */}
        {safeDna && (descriptors.length > 0 || traits.length > 0) && (
          <StaggeredView index={4}>
            <View style={styles.identityCard}>
              <View style={styles.identityHeader}>
                <Icon name="sparkle" size={14} color={theme.colors.primary} strokeWidth={2.4} />
                <Text style={styles.identityKicker}>Identidade procedural</Text>
              </View>
              {descriptors.length > 0 && (
                <Text style={styles.identityLead}>
                  {descriptors.join(' · ')}
                </Text>
              )}
              {traits.length > 0 && (
                <View style={styles.traitsRow}>
                  {traits.slice(0, 4).map((t, i) => (
                    <View key={i} style={styles.traitChip}>
                      <Text style={styles.traitChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.identityFooter}>
                <Icon name="lock" size={11} color={theme.colors.textSecondary} strokeWidth={2.2} />
                <Text style={styles.identityFooterText}>
                  {totalMutations} marcos biológicos possíveis — cada um único, desbloqueado pelo seu caminho
                </Text>
              </View>
            </View>
          </StaggeredView>
        )}

        {/* ARQUÉTIPOS — substitui a noção de "fase" pela afinidade DNA × tribo.
            O usuário vê seu mascote como uma mistura de arquétipos (Lumina 32%,
            Terra 18%...) em vez de "está na fase Bebê". Mais procedural, menos
            esteira linear. */}
        {archetypes.length > 0 && (
          <StaggeredView index={4} initialDelay={50}>
            <View style={styles.identityCard}>
              <View style={styles.identityHeader}>
                <Icon name="sparkle" size={14} color={theme.colors.primary} strokeWidth={2.4} />
                <Text style={styles.identityKicker}>Arquétipos dominantes</Text>
              </View>
              <View style={styles.genomeList}>
                {archetypes.map((a, i) => (
                  <View key={a.id} style={styles.genomeRow}>
                    <Text style={[styles.genomeLabel, i === 0 && { fontWeight: '700' }]}>
                      {a.label}
                    </Text>
                    <View style={styles.genomeBarTrack}>
                      <View
                        style={[
                          styles.genomeBarFill,
                          {
                            width: `${Math.round(a.percent * 100)}%`,
                            backgroundColor: theme.colors.primary,
                            opacity: 0.4 + a.percent * 0.6,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.genomePct}>{Math.round(a.percent * 100)}%</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.identityFooterText}>
                {archetypes[0].tagline}
              </Text>
            </View>
          </StaggeredView>
        )}

        {/* TIMELINE BIOLÓGICA — substitui a esteira linear de fases.
            Lista cronologicamente reversa as mutações desbloqueadas (até 5
            mais recentes). Empty state acolhedor pra quem nunca teve marco. */}
        <StaggeredView index={5}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Transformações</Text>
            <PressableScale
              onPress={() => router.push('/mutations')}
              accessibilityRole="button"
              accessibilityLabel="Ver todas as mutações"
            >
              <Text style={styles.sectionLink}>ver tudo →</Text>
            </PressableScale>
          </View>
          {unlockedMutationDetails.length === 0 ? (
            <View style={styles.timelineEmpty}>
              <Icon name="sparkle" size={20} color={theme.colors.primary} strokeWidth={1.8} />
              <Text style={styles.timelineEmptyText}>
                Nenhuma transformação ainda. Continue cuidando de você — as mudanças
                aparecem no próprio ritmo dela.
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {unlockedMutationDetails.slice(0, 5).map((u, i) => {
                const color = rarityColor(u.mutation.rarity, theme);
                return (
                  <View key={u.mutation.id} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: color }]} />
                      {i < Math.min(unlockedMutationDetails.length, 5) - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <View style={[styles.timelineCard, { borderColor: color + '55' }]}>
                      <View style={styles.timelineHeader}>
                        <Text style={[styles.timelineRarity, { color }]}>
                          {rarityLabel(u.mutation.rarity)}
                        </Text>
                        <Text style={styles.timelineDate}>
                          {new Date(u.unlocked_at).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                      <Text style={styles.timelineName}>{u.mutation.name}</Text>
                      <Text style={styles.timelineDesc}>{u.mutation.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </StaggeredView>

        {/* PRÓXIMO MARCO — preview da mutation mais próxima de unlock.
            Não revela a condição exata pra preservar o mistério "biológico". */}
        {nextMutationCandidate && (
          <StaggeredView index={6}>
            <PremiumFeatureGuard
              tier={tier}
              feature={nextMutationCandidate.rarity === 'legendary' ? 'legendary' : 'mutation'}
              mutationRarity={nextMutationCandidate.rarity}
            >
            <View style={styles.nextCard}>
              <View style={styles.nextHeader}>
                <Icon name="sparkle" size={14} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={styles.nextKicker}>Algo está chegando</Text>
              </View>
              <Text style={styles.nextHint}>
                Sinto na forma dela uma mudança vindo. Cuide de você no seu ritmo
                — ela acompanha.
              </Text>
              <Text style={styles.nextRarity}>
                · {rarityLabel(nextMutationCandidate.rarity).toLowerCase()} ·
              </Text>
            </View>
            </PremiumFeatureGuard>
          </StaggeredView>
        )}

        {/* Memórias narrativas */}
        {memorySnippets.length > 0 && (
          <StaggeredView index={7}>
            <View style={styles.identityCard}>
              <Text style={styles.sectionTitle}>Memórias que {mascot.name} guarda</Text>
              {memorySnippets.map((s, i) => (
                <Text key={i} style={styles.timelineEmptyText}>· {s}</Text>
              ))}
            </View>
          </StaggeredView>
        )}

        {evolutionState && (
          <StaggeredView index={8}>
            <View style={styles.identityCard}>
              <Text style={styles.sectionTitle}>Personalidade procedural</Text>
              <Text style={styles.identityLead}>
                {evolutionState.microEvolutions.length} microevoluções ·{' '}
                {evolutionState.phenotype.displayModifiers.activeEnergy ? 'energia ativa' : 'calma presente'}
              </Text>
            </View>
          </StaggeredView>
        )}

        {/* GENOME VIEWER — 11 traits em barras, com labels PT-BR amigáveis.
            Colapsível: por default mostra 4 dominantes; expande pra todos. */}
        {safeDna && (
          <StaggeredView index={9}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Traços do corpo dela</Text>
              <PressableScale
                onPress={() => setGenomeExpanded(v => !v)}
                accessibilityRole="button"
                accessibilityLabel={genomeExpanded ? 'Ver menos traços' : 'Ver todos os traços'}
              >
                <Text style={styles.sectionLink}>
                  {genomeExpanded ? 'ver menos' : 'ver todos'}
                </Text>
              </PressableScale>
            </View>
            <View style={styles.genomeList}>
              {(() => {
                // Ordena por valor decrescente (dominantes primeiro)
                const entries = GENE_KEYS.map(k => ({ key: k, value: safeDna[k] }))
                  .sort((a, b) => b.value - a.value);
                const visible = genomeExpanded ? entries : entries.slice(0, 4);
                return visible.map(({ key, value }) => (
                  <View key={key} style={styles.genomeRow}>
                    <Text style={styles.genomeLabel}>{GENE_FRIENDLY[key] ?? key}</Text>
                    <View style={styles.genomeBarTrack}>
                      <View
                        style={[
                          styles.genomeBarFill,
                          {
                            width: `${value * 100}%`,
                            backgroundColor: theme.colors.primary,
                            opacity: 0.4 + value * 0.5,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ));
              })()}
            </View>
          </StaggeredView>
        )}

        {/* Links pra mais */}
        <StaggeredView index={10}>
          <View style={styles.linksRow}>
            <LinkCard icon="flame" label="Streak" onPress={() => router.push('/streak')} />
            <LinkCard icon="trophy" label="Coleção" onPress={() => router.push('/inventory')} />
            <LinkCard icon="gift" label="Closet" onPress={() => router.push('/closet')} />
          </View>
        </StaggeredView>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkCard({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} style={styles.linkCard} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.linkIconWrap}>
        <Icon name={icon} size={20} color={theme.colors.primary} strokeWidth={2.2} />
      </View>
      <Text style={styles.linkLabel}>{label}</Text>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: { paddingTop: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
    },
    h1: {
      ...theme.text.h1,
      color: theme.colors.text,
      fontSize: 32,
      letterSpacing: -0.6,
    },
    iconBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
      alignItems: 'center', justifyContent: 'center',
      ...theme.shadow.sm,
    },
    sceneWrap: { paddingHorizontal: theme.spacing.lg },
    heroInfo: { alignItems: 'center', gap: 4 },
    heroName: {
      ...theme.text.h2,
      color: theme.colors.text,
      fontSize: 26,
      letterSpacing: -0.4,
    },
    heroSub: { ...theme.text.sm, color: theme.colors.textSecondary, fontStyle: 'italic', fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 14 },
    xpBox: { paddingHorizontal: theme.spacing.lg },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    // Card de identidade procedural — anti-Tamagotchi, valoriza o que a
    // criatura É em vez de qual "fase" ela alcançou.
    identityCard: {
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primaryTint,
      borderWidth: 1,
      borderColor: theme.colors.primary + '33',
      gap: theme.spacing.sm,
    },
    identityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    identityKicker: {
      ...theme.text.xs,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10.5,
    },
    identityLead: {
      ...theme.text.body,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    traitsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    traitChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    traitChipText: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      fontSize: 11,
    },
    identityFooter: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 2,
    },
    identityFooterText: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 14,
    },
    phaseList: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    phaseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    phaseRowReached: { opacity: 0.92 },
    phaseRowCurrent: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: theme.colors.primaryTint,
    },
    phaseDot: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: theme.colors.bg2,
      alignItems: 'center', justifyContent: 'center',
    },
    phaseDotReached: { backgroundColor: theme.colors.primary },
    phaseDotText: { color: theme.colors.text, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
    phaseLabel: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    phaseLabelCurrent: { color: theme.colors.primary },
    phaseXp: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10.5,
      letterSpacing: 0.5,
    },
    phaseBadge: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.primary,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      letterSpacing: 0.8,
      fontFamily: 'JetBrainsMono_500Medium',
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    // ---- novos styles SPEC-1 (timeline procedural, viewer de genoma) ----
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    sectionLink: {
      ...theme.text.xs,
      color: theme.colors.primary,
      fontWeight: '700',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10.5,
      letterSpacing: 0.5,
    },
    timeline: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    timelineRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    timelineLeft: {
      width: 16,
      alignItems: 'center',
    },
    timelineDot: {
      width: 12, height: 12, borderRadius: 6,
      marginTop: 8,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: theme.colors.border,
      marginTop: 4,
    },
    timelineCard: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timelineRarity: {
      ...theme.text.xs,
      fontWeight: '800',
      letterSpacing: 0.6,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
    },
    timelineDate: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
    },
    timelineName: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      letterSpacing: -0.2,
      marginTop: 2,
    },
    timelineDesc: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    timelineEmpty: {
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    timelineEmptyText: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 19,
    },
    nextCard: {
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '33',
      borderStyle: 'dashed',
      gap: 6,
    },
    nextHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nextKicker: {
      ...theme.text.xs,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10.5,
    },
    nextHint: {
      ...theme.text.body,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.1,
    },
    nextRarity: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
      letterSpacing: 0.5,
      alignSelf: 'flex-end',
    },
    genomeList: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    genomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: 4,
    },
    genomeLabel: {
      ...theme.text.sm,
      color: theme.colors.text,
      width: 140,
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontStyle: 'italic',
    },
    genomeBarTrack: {
      flex: 1,
      height: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    genomeBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    genomePct: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      width: 40,
      textAlign: 'right',
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 11,
    },
    linksRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    linkCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      gap: 6,
      ...theme.shadow.sm,
    },
    linkIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkLabel: {
      ...theme.text.xs,
      color: theme.colors.text,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 11,
    },
  });
}
