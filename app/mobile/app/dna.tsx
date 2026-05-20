/**
 * app/dna.tsx — Tela "DNA do Mascote".
 *
 * Por que essa tela existe: o genome já molda a aparência da criatura (em
 * Mascot3D.tsx + morphology.ts), mas o usuário não conecta "fiz check-in de
 * respiração → genes mudaram → mascote ficou diferente". Sem esse loop
 * cognitivo, a evolução parece mágica/aleatória.
 *
 * Princípios:
 * - SEM vocabulário científico ("genoma", "mutação", "DNA bruto") na copy
 *   visível; usamos GENE_META.label (PT-BR) e linguagem afetiva.
 * - SEM culpa: barras crescem com hábitos cumpridos, NUNCA decrescem por
 *   falta. Isso é coerente com applyHabitDrift (drift sempre ≥ 0).
 * - "O que está influenciando" mostra os 3 hábitos do usuário que mais
 *   moldaram a criatura nos últimos 30 dias — joga `HABIT_GENE_MAP` contra
 *   contagem real de check-ins.
 */
import { Stack, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { GENE_META, getArchetype, sanitizeGenome, HABIT_GENE_MAP } from '@/lib/dna';
import type { GeneKey, Genome } from '@/lib/dna';
import { checkins } from '@/lib/db';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';
import type { Checkin, HabitKind } from '@/types';

interface HabitInfluence {
  habit: HabitKind;
  count: number;
  genes: GeneKey[];
}

const HABIT_LABEL: Record<HabitKind, string> = {
  water: 'Água',
  sleep: 'Sono',
  exercise: 'Movimento',
  meditation: 'Meditação',
  reading: 'Leitura',
  journaling: 'Journaling',
  breath: 'Respiração',
  outdoor: 'Ar livre',
  sun: 'Sol',
};

export default function DnaScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const mascot = useStore(s => s.mascot);
  const profile = useStore(s => s.profile);

  const [influences, setInfluences] = useState<HabitInfluence[]>([]);

  const genome: Genome | null = useMemo(() => {
    if (!mascot?.dna) return null;
    return sanitizeGenome(mascot.dna);
  }, [mascot]);

  useEffect(() => {
    if (!profile?.id) return;
    void (async () => {
      const all = await checkins.listAll(profile.id);
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = all.filter((c: Checkin) => new Date(c.occurred_at).getTime() >= cutoff);
      const counts: Partial<Record<HabitKind, number>> = {};
      for (const c of recent) {
        counts[c.habit_kind] = (counts[c.habit_kind] ?? 0) + 1;
      }
      const out: HabitInfluence[] = (Object.keys(counts) as HabitKind[])
        .map(h => ({
          habit: h,
          count: counts[h] ?? 0,
          genes: Object.keys(HABIT_GENE_MAP[h] ?? {}) as GeneKey[],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      setInfluences(out);
    })();
  }, [profile?.id]);

  if (!mascot || !genome) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'DNA do Mascote' }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Seu mascote ainda não nasceu. Termine o onboarding pra ver o DNA.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const archetype = getArchetype(genome);
  const sortedGenes = [...GENE_META].sort((a, b) => genome[b.key] - genome[a.key]);
  const dominantGene = sortedGenes[0];
  const minorGene = sortedGenes[sortedGenes.length - 1];

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: 'DNA do Mascote' }} />
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
          <Text style={styles.kicker}>DNA do Mascote</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.mascotCard}>
          <Mascot
            personality={mascot.personality}
            phase={mascot.phase}
            mood={mascot.mood}
            size={140}
            dnaOverride={genome}
          />
          <Text style={styles.archetypeName}>{archetype.name}</Text>
          <Text style={styles.archetypeTag}>{archetype.tag}</Text>
          <Text style={styles.archetypeTagline}>{archetype.tagline}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Traços</Text>
          <Text style={styles.sectionHint}>
            Quanto mais alto, mais forte na personalidade do seu mascote. Hábitos cumpridos só aumentam — nada nunca cai por falta.
          </Text>
          <View style={styles.bars}>
            {sortedGenes.map(meta => {
              const value = genome[meta.key];
              const pct = Math.round(value * 100);
              return (
                <View key={meta.key} style={styles.barRow}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>{meta.label}</Text>
                    <Text style={styles.barPct}>{pct}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor(theme, value) }]} />
                  </View>
                  <Text style={styles.barDesc}>{meta.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O que está moldando isso</Text>
          {influences.length === 0 ? (
            <Text style={styles.sectionHint}>
              Faça check-ins nos próximos dias e isso aqui se preenche com a história do seu mascote.
            </Text>
          ) : (
            <View style={styles.influences}>
              {influences.map(inf => (
                <View key={inf.habit} style={styles.influenceCard}>
                  <View style={styles.influenceHeader}>
                    <Text style={styles.influenceHabit}>{HABIT_LABEL[inf.habit]}</Text>
                    <Text style={styles.influenceCount}>{inf.count}× em 30 dias</Text>
                  </View>
                  <Text style={styles.influenceGenes}>
                    Fortalece:{' '}
                    {inf.genes
                      .map(g => GENE_META.find(m => m.key === g)?.label)
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Para onde tende a evoluir</Text>
          <Text style={styles.sectionHint}>
            Seu traço dominante é <Text style={styles.bold}>{dominantGene.label}</Text>. Se você seguir cuidando do que está cuidando, novas mutações ligadas a esse traço podem aparecer.
          </Text>
          <Text style={[styles.sectionHint, { marginTop: theme.spacing.sm }]}>
            Quer ver outra parte florescer? <Text style={styles.bold}>{minorGene.label}</Text> está mais discreta — hábitos que reforçam esse traço vão equilibrar o conjunto.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function barColor(theme: Theme, value: number): string {
  // Gradiente sutil: genes baixos puxam pro textDim, médios pro primary, altos
  // pro primaryDeep. Leitura emocional rápida sem precisar interpretar
  // valores percentuais.
  if (value < 0.35) return theme.colors.textDim;
  if (value < 0.65) return theme.colors.primary;
  return theme.colors.primaryDeep;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
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
    mascotCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    archetypeName: {
      ...theme.text.h2,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
      fontFamily: 'InstrumentSerif_400Regular',
    },
    archetypeTag: {
      ...theme.text.sm,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    archetypeTagline: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 4,
    },
    section: { gap: theme.spacing.sm },
    sectionTitle: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
      fontSize: 16,
    },
    sectionHint: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      lineHeight: 21,
    },
    bold: { color: theme.colors.text, fontWeight: '700' },
    bars: { gap: theme.spacing.md, marginTop: theme.spacing.sm },
    barRow: { gap: 4 },
    barHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    barLabel: {
      ...theme.text.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
    barPct: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    barTrack: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 4 },
    barDesc: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 2,
    },
    influences: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    influenceCard: {
      backgroundColor: theme.colors.primaryTint,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary + '33',
      gap: 4,
    },
    influenceHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    influenceHabit: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
    },
    influenceCount: {
      ...theme.text.sm,
      color: theme.colors.primary,
      fontWeight: '700',
      fontFamily: 'JetBrainsMono_500Medium',
    },
    influenceGenes: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
    },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
    emptyText: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
}
