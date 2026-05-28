import { router, Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { MascotAmbient } from '@/components/MascotAmbient';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { getAccessory } from '@/content/accessories';
import { habitMeta } from '@/content/missions';
import { getPersonality } from '@/content/personalities';
import {
  achievements as achievementsDb,
  checkins,
  inventory,
  userScenes,
  xpEvents,
} from '@/lib/db';
import { emergentPhaseLabels } from '@/lib/phaseLabels';
import { isDemoBilling } from '@/services/subscription';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Checkin, HabitKind } from '@/types';

import { Typography } from '@/components/ui';
const HABIT_ICONS: Record<HabitKind, IconName> = {
  water: 'droplet',
  sleep: 'moon',
  exercise: 'dumbbell',
  breath: 'wind',
  meditation: 'heart',
  reading: 'book',
  journaling: 'pencil',
  outdoor: 'tree',
  sun: 'sun',
};

export default function You() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const settings = useStore(s => s.settings);
  const [weekly, setWeekly] = useState<Record<HabitKind, number>>({} as any);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [accessoriesCount, setAccessoriesCount] = useState(0);
  const [scenesCount, setScenesCount] = useState(0);
  const [activeSceneId, setActiveSceneId] = useState('room');
  const [equippedAccId, setEquippedAccId] = useState<string>('none');

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void load();
    }, [profile?.id])
  );

  async function load() {
    if (!profile) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const since = sevenDaysAgo.toISOString();
    const total = await checkins.countSince(profile.id, since);
    const xp = await xpEvents.total(profile.id);
    setTotalCheckins(total);
    setTotalXp(xp);

    const all: Checkin[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const day = await checkins.list(profile.id, dStr);
      all.push(...day);
    }
    const breakdown: Record<HabitKind, number> = {} as any;
    for (const c of all) {
      breakdown[c.habit_kind] = (breakdown[c.habit_kind] ?? 0) + (c.value ?? 1);
    }
    setWeekly(breakdown);

    const achs = await achievementsDb.listUnlocked(profile.id);
    setAchievementsCount(achs.length);
    const accs = await inventory.listOwned(profile.id);
    setAccessoriesCount(accs.length);
    const eq = accs.find(a => a.equipped);
    if (eq && getAccessory(eq.accessory_id)) {
      setEquippedAccId(eq.accessory_id);
    } else {
      setEquippedAccId('none');
    }
    const sc = await userScenes.listUnlocked(profile.id);
    setScenesCount(sc.length);
    setActiveSceneId(await userScenes.getActive(profile.id));
  }

  if (!profile || !mascot) return <Redirect href="/splash" />;
  const meta = getPersonality(mascot.personality);
  const habitsList = Object.entries(weekly).sort((a, b) => b[1] - a[1]);
  const max = habitsList.length > 0 ? Math.max(...habitsList.map(([, c]) => c as number)) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        variant="modal"
        title="Você"
        subtitle={mascot.name}
        rightActions={[
          { icon: 'settings', onPress: () => router.push('/settings'), label: 'Ajustes' },
        ]}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero mascote */}
        <StaggeredView index={0}>
          <View style={styles.heroWrap}>
            <SceneBackground sceneId={activeSceneId} height={180}>
              <MascotAmbient size={140} reduceMotion={settings?.reduce_motion}>
                <Mascot
                  personality={mascot.personality}
                  phase={mascot.phase}
                  mood={mascot.mood}
                  size={140}
                  accessory={equippedAccId as any}
                  reduceMotion={settings?.reduce_motion}
                />
              </MascotAmbient>
            </SceneBackground>
            <View style={styles.heroInfo}>
              <Typography variant="body" style={styles.heroName}>{mascot.name}</Typography>
              <Typography variant="body" style={styles.heroSub}>
                {meta.label} · {emergentPhaseLabels[mascot.phase]} · nível {mascot.level}
              </Typography>
            </View>
          </View>
        </StaggeredView>

        {/* Stats */}
        <StaggeredView index={1}>
          <View style={styles.statsRow}>
            <Stat icon="flame" label="Streak" value={`${streak?.current_streak ?? 0}d`} />
            <Stat icon="check" label="Check-ins 7d" value={`${totalCheckins}`} />
            <Stat icon="zap" label="XP total" value={`${totalXp}`} />
          </View>
        </StaggeredView>
        <StaggeredView index={2}>
          <View style={styles.statsRow}>
            <Stat icon="trophy" label="Conquistas" value={`${achievementsCount}`} />
            <Stat icon="package" label="Acessórios" value={`${accessoriesCount}`} />
            <Stat icon="sparkles" label="Cenários" value={`${scenesCount}`} />
          </View>
        </StaggeredView>

        {/* Acesso rápido */}
        <StaggeredView index={3}>
          <View style={styles.quickRow}>
            <QuickBtn icon="sparkles" label="DNA" onPress={() => router.push('/dna')} />
            <QuickBtn icon="bar-chart" label="Relatório" onPress={() => router.push('/weekly-report')} />
            <QuickBtn icon="gift" label="Closet" onPress={() => router.push('/closet')} />
            <QuickBtn icon="trophy" label="Conquistas" onPress={() => router.push('/achievements')} />
          </View>
        </StaggeredView>
        <StaggeredView index={4}>
          <View style={styles.quickRow}>
            <QuickBtn icon="book" label="Diário" onPress={() => router.push('/diary')} />
            <QuickBtn icon="share" label="Compartilhar" onPress={() => router.push('/share')} />
            <QuickBtn icon="bell" label="Avisos" onPress={() => router.push('/notifications')} />
            <QuickBtn icon="help-circle" label="Ajuda" onPress={() => router.push('/help')} />
          </View>
        </StaggeredView>

        {/* Hábitos da semana resumo */}
        <StaggeredView index={5}>
          <View style={styles.sectionHeader}>
            <Icon name="calendar" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
            <Typography variant="body" style={styles.sectionTitle}>Hábitos da semana</Typography>
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            {habitsList.length === 0 ? (
              <Typography variant="body" style={styles.empty}>Nenhum check-in essa semana. Começa pequeno.</Typography>
            ) : (
              habitsList.slice(0, 6).map(([kind, count]) => {
                const m = habitMeta[kind as HabitKind];
                const icon = HABIT_ICONS[kind as HabitKind];
                // Defensive: dados migrados / debug podem trazer habit_kind
                // fora do enum atual — sem o guard, .label crasha a tela toda.
                if (!m || !icon) return null;
                const pct = ((count as number) / max) * 100;
                return (
                  <View key={kind} style={styles.habitRow}>
                    <View style={styles.habitIconWrap}>
                      <Icon
                        name={icon}
                        size={14}
                        color={theme.colors.primary}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.habitBarTrack}>
                        <View style={[styles.habitBarFill, { width: `${pct}%` }]} />
                      </View>
                      <Typography variant="body" style={styles.habitLabel}>
                        {m.label} · {count as number}
                      </Typography>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </StaggeredView>

        <StaggeredView index={6}>
          <PressableScale style={styles.linkCta} onPress={() => router.push('/weekly-report')}>
            <Typography variant="body" style={styles.linkCtaText}>Ver relatório completo</Typography>
            <Icon name="arrow-right" size={14} color={theme.colors.primary} strokeWidth={2.4} />
          </PressableScale>
        </StaggeredView>

        {/* Demo paywall teaser — visivel apenas no modo demo/dev. Em prod com
            RevenueCat, o paywall e acessado pelo fluxo normal de assinatura. */}
        {isDemoBilling() && (
          <StaggeredView index={7}>
            <Card variant="elevated" padding="md" style={styles.paywallTeaser}>
              <PressableScale onPress={() => router.push('/paywall')}>
                <View style={styles.paywallKickerRow}>
                  <Icon name="sparkle" size={10} color={theme.colors.primary} strokeWidth={2.4} fill={theme.colors.primary} />
                  <Typography variant="body" style={styles.paywallKicker}>DEMO</Typography>
                </View>
                <Typography variant="body" style={styles.paywallTitle}>Ver tela de paywall</Typography>
                <Typography variant="body" style={styles.paywallSub}>App roda local. Paywall é só visual.</Typography>
              </PressableScale>
            </Card>
          </StaggeredView>
        )}

        <Typography variant="body" style={styles.disclaimer}>
          Mascote é wellness e autocuidado. Não substitui acompanhamento profissional. Em crise: CVV 188.
        </Typography>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statIconWrap}>
        <Icon name={icon} size={12} color={theme.colors.primary} strokeWidth={2.4} />
      </View>
      <Typography variant="body" style={styles.statValue}>{value}</Typography>
      <Typography variant="body" style={styles.statLabel}>{label}</Typography>
    </View>
  );
}

function QuickBtn({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} style={styles.quickBtn} accessibilityLabel={label}>
      <View style={styles.quickIconWrap}>
        <Icon name={icon} size={18} color={theme.colors.primary} strokeWidth={2.2} />
      </View>
      <Typography variant="body" style={styles.quickLabel}>{label}</Typography>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    heroWrap: { gap: 0 },
    heroInfo: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderBottomLeftRadius: theme.radius.xl,
      borderBottomRightRadius: theme.radius.xl,
      marginTop: -10,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.colors.border,
      gap: 2,
      ...theme.shadow.sm,
    },
    heroName: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.3,
    },
    heroSub: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 13,
    },
    statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
    stat: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: 4,
      ...theme.shadow.sm,
    },
    statIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 19,
      lineHeight: 22,
      letterSpacing: -0.2,
    },
    statLabel: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 9.5,
      textAlign: 'center',
    },
    quickRow: { flexDirection: 'row', gap: theme.spacing.sm },
    quickBtn: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 4,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      gap: 6,
      ...theme.shadow.sm,
    },
    quickIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: {
      ...theme.text.xs,
      color: theme.colors.text,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 10.5,
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    empty: {
      ...theme.text.body,
      color: theme.colors.textDim,
      paddingVertical: theme.spacing.md,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
    habitRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    habitIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitBarTrack: {
      height: 10,
      backgroundColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    habitBarFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
    },
    habitLabel: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontWeight: '600',
    },
    linkCta: {
      flexDirection: 'row',
      alignSelf: 'center',
      paddingVertical: 6,
      gap: 6,
      alignItems: 'center',
    },
    linkCtaText: {
      color: theme.colors.primary,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 13.5,
    },
    paywallTeaser: { gap: 4 },
    paywallKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    paywallKicker: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 1.2,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    paywallTitle: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 18,
      letterSpacing: -0.2,
    },
    paywallSub: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2 },
    disclaimer: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 16,
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
  });
}
