import { Typography } from '@/components/ui';
/**
 * /mascot — Tela de identidade da criatura.
 *
 * Expõe o que torna a criatura "minha":
 *  - Avatar SVG em destaque (Mascot2D via Mascot)
 *  - Arquétipo dominante + tagline (linguagem orgânica DLI)
 *  - 8 afinidades em barra (vetor cosseno DNA × perfis)
 *  - Top 3 genes (descrição PT-BR de cada um)
 *  - Fase macro + label emergente + descrição
 *  - Vínculo persistido (gestos acumulados, tier label)
 *  - Mutações desbloqueadas (cronologia)
 *  - Próximos marcos (3 mutações mais próximas de desbloquear)
 *
 * Princípios:
 *  - Sem gameplay (não dispara nada — só revela)
 *  - Sem juízo (nenhum item é "ruim", todos são neutros)
 *  - Determinístico: mesmo mascot.dna → mesma tela sempre
 */

import { router, Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { MascotRenderer } from '@/components/MascotRenderer';
import { archetypeAffinities } from '@/game/evolution/archetypeAffinity';
import { sanitizeGenome } from '@/lib/dna';
import { GENE_META } from '@/lib/dna/genome';
import {
  evaluateCondition,
  getMutationById,
  MUTATION_CATALOG,
  type Mutation,
  type MutationCondition,
  type UnlockedMutation,
} from '@/lib/dna/mutations';
import { emergentPhaseDescriptions, emergentPhaseLabels } from '@/lib/phaseLabels';
import { checkins as checkinsDb, dnaMutations } from '@/lib/db';
import { bondTierLabel, getBondTotals, type BondTotals } from '@/lib/bond';
import { plural } from '@/lib/format/plural';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { HabitKind } from '@/types';

interface MilestoneCandidate {
  mutation: Mutation;
  progress: number;
  remaining: string;
}

export default function MascotIdentity() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const [unlocked, setUnlocked] = useState<UnlockedMutation[]>([]);
  const [habitCounts, setHabitCounts] = useState<Partial<Record<HabitKind, number>>>({});
  const [bond, setBond] = useState<BondTotals | null>(null);

  useEffect(() => {
    if (!profile || !mascot) return;
    void (async () => {
      const [muts, allCheckins, b] = await Promise.all([
        dnaMutations.listForUser(profile.id),
        checkinsDb.listAll(profile.id),
        getBondTotals(profile.id),
      ]);
      setUnlocked(muts);
      setBond(b);
      const counts: Partial<Record<HabitKind, number>> = {};
      for (const c of allCheckins) {
        counts[c.habit_kind] = (counts[c.habit_kind] ?? 0) + 1;
      }
      setHabitCounts(counts);
    })();
  }, [profile?.id, mascot?.id]);

  const affinities = useMemo(() => {
    if (!mascot?.dna) return [];
    return archetypeAffinities(sanitizeGenome(mascot.dna));
  }, [mascot?.dna]);

  const topGenes = useMemo(() => {
    if (!mascot?.dna) return [];
    const g = sanitizeGenome(mascot.dna);
    return GENE_META
      .map(meta => ({ ...meta, value: g[meta.key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [mascot?.dna]);

  const upcomingMilestones = useMemo<MilestoneCandidate[]>(() => {
    if (!mascot?.dna) return [];
    const genome = sanitizeGenome(mascot.dna);
    const alreadyUnlocked = new Set(unlocked.map(u => u.mutation_id));
    const currentStreak = streak?.current_streak ?? 0;
    const daysSinceCreated = profile
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000)
      : 0;
    return MUTATION_CATALOG
      .filter(m => !alreadyUnlocked.has(m.id))
      .map(m => ({
        mutation: m,
        progress: estimateProgress(m.condition, {
          genome,
          habitCheckinCounts: habitCounts,
          currentStreak,
          daysSinceCreated,
        }),
        remaining: describeRemaining(m.condition, {
          genome,
          habitCheckinCounts: habitCounts,
          currentStreak,
          daysSinceCreated,
        }),
      }))
      .filter(c => c.progress > 0)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  }, [mascot?.dna, unlocked, habitCounts, streak?.current_streak, profile?.created_at]);

  if (!profile || !mascot) return <Redirect href="/splash" />;
  const arch = affinities[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
          <Icon name="arrow-left" size={22} color={theme.colors.text} strokeWidth={2.2} />
        </Pressable>
        <Typography variant="title" style={styles.headerTitle}>Identidade</Typography>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarWrap}>
          <MascotRenderer
            personality={mascot.personality}
            phase={mascot.phase}
            mood={mascot.mood}
            size={180}
            reduceMotion
            mutationIds={unlocked.map(u => u.mutation_id)}
          />
          <View style={styles.heroCtas}>
            <Pressable
              onPress={() => router.push('/mascot-room')}
              accessibilityRole="button"
              accessibilityLabel="Abrir quarto do mascote"
              style={({ pressed }) => [styles.roomCta, pressed && { opacity: 0.7 }]}
            >
              <Typography variant="mono" style={styles.roomCtaText}>
                Visitar o quarto →
              </Typography>
            </Pressable>
            <Pressable
              onPress={() => router.push('/atelier')}
              accessibilityRole="button"
              accessibilityLabel="Abrir Ateliê para customizar mascote"
              style={({ pressed }) => [styles.roomCta, pressed && { opacity: 0.7 }]}
            >
              <Typography variant="mono" style={styles.roomCtaText}>
                ✨ Ateliê
              </Typography>
            </Pressable>
          </View>
        </View>

        {arch ? (
          <View style={styles.archHero}>
            <Typography variant="display" style={styles.archName}>{arch.label}</Typography>
            <Typography tone="secondary" style={styles.archTagline}>{arch.tagline}</Typography>
            <Typography variant="mono" tone="secondary" style={styles.archPercent}>
              {Math.round(arch.percent * 100)}% dominante · {affinities[1]?.label} {Math.round((affinities[1]?.percent ?? 0) * 100)}% como secundário
            </Typography>
          </View>
        ) : null}

        <Section title="Afinidades" subtitle="Como o DNA do seu mascote se relaciona com cada arquétipo">
          {affinities.map(a => (
            <View key={a.id} style={styles.affinityRow}>
              <View style={styles.affinityLabel}>
                <Typography variant="body" style={styles.affinityName}>{a.label}</Typography>
                <Typography variant="mono" tone="secondary" style={styles.affinityPct}>
                  {Math.round(a.percent * 100)}%
                </Typography>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.max(2, Math.round(a.percent * 100))}%`, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
              <Typography variant="mono" tone="dim" style={styles.affinityTag}>{a.tagline}</Typography>
            </View>
          ))}
        </Section>

        <Section title="Traços marcantes" subtitle="Os três genes mais altos definem a personalidade visual">
          {topGenes.map(g => (
            <View key={g.key} style={styles.geneRow}>
              <View style={styles.geneHeader}>
                <Typography variant="bodyBold">{g.label}</Typography>
                <Typography variant="mono" tone="secondary">{Math.round(g.value * 100)}%</Typography>
              </View>
              <Typography variant="caption" tone="secondary">{g.desc}</Typography>
            </View>
          ))}
        </Section>

        <Section title="Forma atual" subtitle="O estado da criatura como organismo, não como fase Tamagotchi">
          <View style={styles.phaseRow}>
            <Typography variant="bodyBold" style={styles.phaseLabel}>
              {emergentPhaseLabels[mascot.phase]}
            </Typography>
            <Typography tone="secondary">{emergentPhaseDescriptions[mascot.phase]}</Typography>
          </View>
        </Section>

        {bond ? (
          <Section title="Vínculo" subtitle="Construído com toques, carinho e tempo juntos">
            <View style={styles.bondRow}>
              <View>
                <Typography variant="display" style={styles.bondTier}>{bondTierLabel(bond.total)}</Typography>
                <Typography variant="mono" tone="secondary">
                  {bond.total} · hoje +{bond.today}{bond.todayCapped ? ' (cap do dia)' : ''}
                </Typography>
              </View>
            </View>
          </Section>
        ) : null}

        <Section
          title="Marcos desbloqueados"
          subtitle={unlocked.length === 0 ? 'Nenhum por enquanto. Os primeiros surgem com hábitos repetidos.' : `${unlocked.length} ${unlocked.length === 1 ? 'marco' : 'marcos'}`}
        >
          {unlocked.map(u => {
            const mut = getMutationById(u.mutation_id);
            if (!mut) return null;
            return (
              <View key={u.mutation_id} style={styles.mutRow}>
                <View style={styles.mutHeader}>
                  <Typography variant="bodyBold">{mut.name}</Typography>
                  <Typography variant="mono" tone="secondary" style={styles.rarityChip}>{rarityLabel(mut.rarity)}</Typography>
                </View>
                <Typography variant="caption" tone="secondary">{mut.description}</Typography>
              </View>
            );
          })}
          {unlocked.length === 0 ? (
            <Typography tone="dim" style={styles.emptyText}>Continue cuidando — o tempo grava marcos no corpo da criatura.</Typography>
          ) : null}
        </Section>

        <Section title="Próximos marcos" subtitle="Os mais próximos de desbloquear, com base no DNA atual e hábitos">
          {upcomingMilestones.length === 0 ? (
            <Typography tone="dim" style={styles.emptyText}>
              Sem candidatos visíveis ainda. Mais variedade de hábitos aproxima novos marcos.
            </Typography>
          ) : (
            upcomingMilestones.map(c => (
              <View key={c.mutation.id} style={styles.milestoneRow}>
                <View style={styles.mutHeader}>
                  <Typography variant="bodyBold">{c.mutation.name}</Typography>
                  <Typography variant="mono" tone="secondary">{Math.round(c.progress * 100)}%</Typography>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(4, Math.round(c.progress * 100))}%`, backgroundColor: theme.colors.success },
                    ]}
                  />
                </View>
                <Typography variant="caption" tone="secondary">{c.remaining}</Typography>
              </View>
            ))
          )}
        </Section>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Typography variant="title" style={styles.sectionTitle}>{title}</Typography>
      {subtitle ? (
        <Typography variant="caption" tone="secondary" style={styles.sectionSubtitle}>{subtitle}</Typography>
      ) : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function rarityLabel(r: Mutation['rarity']): string {
  switch (r) {
    case 'common': return 'comum';
    case 'rare': return 'raro';
    case 'epic': return 'épico';
    case 'legendary': return 'lendário';
  }
}

interface ProgressContext {
  genome: import('@/lib/dna/genome').Genome;
  habitCheckinCounts: Partial<Record<HabitKind, number>>;
  currentStreak: number;
  daysSinceCreated: number;
}

/**
 * Estima progresso (0-1) em direção a uma mutação. Composto pela média
 * normalizada dos componentes da condição que ainda não passaram.
 *
 * Não substitui evaluateCondition (que é AND lógico binário) — é só pra
 * UI ordenar "quais marcos estão mais próximos de cair".
 */
function estimateProgress(cond: MutationCondition, ctx: ProgressContext): number {
  if (evaluateCondition(cond, ctx as unknown as Parameters<typeof evaluateCondition>[1])) {
    return 1;
  }
  const scores: number[] = [];
  if (cond.geneAbove) {
    for (const [key, threshold] of Object.entries(cond.geneAbove)) {
      const v = ctx.genome[key as keyof typeof ctx.genome] ?? 0;
      scores.push(threshold > 0 ? Math.min(1, v / threshold) : 1);
    }
  }
  if (cond.habitCheckinsAtLeast) {
    for (const [habit, count] of Object.entries(cond.habitCheckinsAtLeast) as [HabitKind, number][]) {
      const v = ctx.habitCheckinCounts[habit] ?? 0;
      scores.push(count > 0 ? Math.min(1, v / count) : 1);
    }
  }
  if (typeof cond.streakAtLeast === 'number') {
    scores.push(cond.streakAtLeast > 0 ? Math.min(1, ctx.currentStreak / cond.streakAtLeast) : 1);
  }
  if (typeof cond.daysSinceCreatedAtLeast === 'number') {
    scores.push(cond.daysSinceCreatedAtLeast > 0 ? Math.min(1, ctx.daysSinceCreated / cond.daysSinceCreatedAtLeast) : 1);
  }
  if (scores.length === 0) return 0;
  return scores.reduce((s, n) => s + n, 0) / scores.length;
}

function describeRemaining(cond: MutationCondition, ctx: ProgressContext): string {
  const parts: string[] = [];
  if (cond.habitCheckinsAtLeast) {
    for (const [habit, count] of Object.entries(cond.habitCheckinsAtLeast) as [HabitKind, number][]) {
      const cur = ctx.habitCheckinCounts[habit] ?? 0;
      const need = Math.max(0, count - cur);
      if (need > 0) parts.push(`${need} check-in${need > 1 ? 's' : ''} de ${habit}`);
    }
  }
  if (typeof cond.streakAtLeast === 'number') {
    const need = Math.max(0, cond.streakAtLeast - ctx.currentStreak);
    if (need > 0) parts.push(`+${plural(need, 'dia de streak', 'dias de streak')}`);
  }
  if (typeof cond.daysSinceCreatedAtLeast === 'number') {
    const need = Math.max(0, cond.daysSinceCreatedAtLeast - ctx.daysSinceCreated);
    if (need > 0) parts.push(plural(need, 'dia juntos', 'dias juntos'));
  }
  if (parts.length === 0) return 'Quase lá — equilíbrio dos genes acontece sozinho.';
  return `Falta: ${parts.join(' · ')}`;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerTitle: {},
    scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    avatarWrap: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    heroCtas: {
      marginTop: theme.spacing.md,
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomCta: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    roomCtaText: {
      fontSize: 12,
      letterSpacing: 0.4,
    },
    archHero: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    archName: {
      textAlign: 'center',
      fontSize: 32,
      lineHeight: 36,
      fontFamily: 'InstrumentSerif_400Regular',
    },
    archTagline: {
      textAlign: 'center',
      marginTop: 4,
      fontStyle: 'italic',
    },
    archPercent: {
      textAlign: 'center',
      marginTop: 8,
      fontSize: 11,
      letterSpacing: 0.3,
    },
    section: {
      marginTop: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 17,
      lineHeight: 22,
    },
    sectionSubtitle: { marginTop: 2 },
    sectionBody: { marginTop: theme.spacing.sm, gap: theme.spacing.md },
    affinityRow: { gap: 4 },
    affinityLabel: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    affinityName: {},
    affinityPct: { fontSize: 12 },
    affinityTag: { fontSize: 11, marginTop: 2 },
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
      overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 3 },
    geneRow: { gap: 2 },
    geneHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    phaseRow: { gap: 4 },
    phaseLabel: { textTransform: 'lowercase' },
    bondRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    bondTier: {
      fontSize: 22,
      lineHeight: 26,
      fontFamily: 'InstrumentSerif_400Regular',
    },
    mutRow: { gap: 4 },
    mutHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    rarityChip: {
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    milestoneRow: { gap: 6 },
    emptyText: { fontStyle: 'italic' },
  });
}
