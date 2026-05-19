/**
 * Aba "Evolução" — terceira tab do handoff.
 * Mostra mascote grande + barra de progresso até próxima fase + histórico
 * de fases desbloqueadas.
 */

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { inventory, userScenes } from '@/lib/db';
import { PHASE_THRESHOLDS, phaseFromXp, xpForLevel, xpToNextLevel } from '@/lib/xp';
import { phaseLabels } from '@/lib/phaseLabels';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';
import type { AccessoryId } from '@/components/Mascot';

const PHASES = PHASE_THRESHOLDS.map(p => ({
  id: p.phase,
  xp: p.xp,
  label: phaseLabels[p.phase],
}));

export default function EvolutionTab() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const settings = useStore(s => s.settings);
  const [activeSceneId, setActiveSceneId] = useState('room');
  const [equippedAccId, setEquippedAccId] = useState<AccessoryId>('none');

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void (async () => {
        const owned = await inventory.listOwned(profile.id);
        const eq = owned.find(o => o.equipped);
        setEquippedAccId((eq?.accessory_id as AccessoryId) ?? 'none');
        setActiveSceneId(await userScenes.getActive(profile.id));
      })();
    }, [profile?.id])
  );

  const toNext = useMemo(
    () => (mascot ? xpToNextLevel(mascot.xp) : { current: 0, needed: 50, progress: 0 }),
    [mascot]
  );

  if (!profile || !mascot) return null;
  const meta = getPersonality(mascot.personality);
  const currentPhaseIdx = PHASES.findIndex(p => p.id === mascot.phase);

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
            <SceneBackground sceneId={activeSceneId} height={320}>
              <MascotAmbient size={220} reduceMotion={settings?.reduce_motion}>
                <Mascot
                  personality={mascot.personality}
                  phase={mascot.phase}
                  mood={mascot.mood}
                  size={220}
                  accessory={equippedAccId}
                  reduceMotion={settings?.reduce_motion}
                />
              </MascotAmbient>
            </SceneBackground>
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

        {/* Phase track */}
        <StaggeredView index={4}>
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <Text style={styles.sectionTitle}>Jornada de evolução</Text>
          </View>
          <View style={styles.phaseList}>
            {PHASES.map((p, i) => {
              const reached = i <= currentPhaseIdx;
              const isCurrent = i === currentPhaseIdx;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.phaseRow,
                    reached && styles.phaseRowReached,
                    isCurrent && styles.phaseRowCurrent,
                  ]}
                >
                  <View style={[styles.phaseDot, reached && styles.phaseDotReached]}>
                    {reached ? (
                      <Icon name="check" size={16} color="#fff" strokeWidth={3} />
                    ) : (
                      <Text style={styles.phaseDotText}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.phaseLabel, isCurrent && styles.phaseLabelCurrent]}>{p.label}</Text>
                    <Text style={styles.phaseXp}>{p.xp} XP</Text>
                  </View>
                  {isCurrent && (
                    <Text style={styles.phaseBadge}>VOCÊ ESTÁ AQUI</Text>
                  )}
                </View>
              );
            })}
          </View>
        </StaggeredView>

        {/* Links pra mais */}
        <StaggeredView index={5}>
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
