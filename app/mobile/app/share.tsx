import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { MascotAmbient } from '@/components/MascotAmbient';
import { SceneBackground } from '@/components/SceneBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { getPersonality } from '@/content/personalities';
import { checkins as checkinsDb, todayLocal, userScenes } from '@/lib/db';
import {
  buildInviteLink,
  buildInvitePayload,
  buildProgressShareText,
  isStreakMilestone,
} from '@/lib/share';
import { trackEvent } from '@/lib/telemetry';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

type Mode = 'progress' | 'invite';

export default function ShareScreen() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const settings = useStore(s => s.settings);
  const [todayCount, setTodayCount] = useState(0);
  const [sceneId, setSceneId] = useState('room');
  const [mode, setMode] = useState<Mode>('progress');

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const rows = await checkinsDb.list(profile.id, todayLocal());
    setTodayCount(rows.length);
    setSceneId(await userScenes.getActive(profile.id));
  }

  const currentStreak = streak?.current_streak ?? 0;
  const isMilestone = isStreakMilestone(currentStreak);

  async function shareProgress() {
    if (!profile || !mascot) return;
    const text = buildProgressShareText({
      streak: currentStreak,
      todayCount,
      isMilestone,
    });
    trackEvent('share_sent', {
      mode: 'progress',
      streak: currentStreak,
      milestone: isMilestone,
      today_count: todayCount,
      personality: mascot.personality,
    });
    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert('Compartilhamento', text);
    }
  }

  async function shareInvite() {
    if (!profile || !mascot) return;
    const { link, text } = buildInvitePayload(mascot, profile.id);
    trackEvent('invite_sent', {
      streak: currentStreak,
      level: mascot.level,
      personality: mascot.personality,
    });
    try {
      await Share.share({ message: text, url: link });
    } catch {
      Alert.alert('Convite', text);
    }
  }

  if (!profile || !mascot) return <Redirect href="/splash" />;
  const meta = getPersonality(mascot.personality);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="modal" title="Compartilhar" subtitle="seu progresso ou convide um amigo" />

      {/* Tab switcher — progress vs invite */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setMode('progress')}
          style={[styles.tab, mode === 'progress' && styles.tabActive]}
          accessibilityLabel="Compartilhar progresso"
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'progress' }}
        >
          <Text style={[styles.tabLabel, mode === 'progress' && styles.tabLabelActive]}>
            Progresso
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('invite')}
          style={[styles.tab, mode === 'invite' && styles.tabActive]}
          accessibilityLabel="Convidar amigo"
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'invite' }}
        >
          <Text style={[styles.tabLabel, mode === 'invite' && styles.tabLabelActive]}>
            Convidar amigo
          </Text>
        </Pressable>
      </View>

      <StaggeredView index={0}>
        <View style={styles.previewWrap}>
          <View style={styles.preview}>
            <SceneBackground sceneId={sceneId} height={320}>
              <View style={{ alignItems: 'center', paddingTop: 32 }}>
                <MascotAmbient size={140} reduceMotion={settings?.reduce_motion}>
                  <Mascot
                    personality={mascot.personality}
                    phase={mascot.phase}
                    mood={mascot.mood}
                    size={140}
                    reduceMotion={settings?.reduce_motion}
                  />
                </MascotAmbient>
              </View>
            </SceneBackground>
            <View style={styles.cardOverlay}>
              {mode === 'progress' ? (
                <>
                  <Text style={styles.cardKicker}>
                    {isMilestone ? `🎉 MARCO DE ${currentStreak} DIAS` : 'MEU MASCOTE HOJE'}
                  </Text>
                  <Text style={styles.cardName}>{mascot.name}</Text>
                  <Text style={styles.cardLine}>
                    nível {mascot.level} · {mascot.phase}
                  </Text>
                  <View style={styles.cardStats}>
                    <View style={styles.statBox}>
                      <Icon name="flame" size={12} color={theme.colors.error} strokeWidth={2.4} fill={theme.colors.error + '50'} />
                      <Text style={styles.statValue}>{currentStreak}</Text>
                      <Text style={styles.statLabel}>dias</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Icon name="check" size={12} color={theme.colors.success} strokeWidth={2.4} />
                      <Text style={styles.statValue}>{todayCount}×</Text>
                      <Text style={styles.statLabel}>hoje</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Icon name="zap" size={12} color={theme.colors.primary} strokeWidth={2.4} fill={theme.colors.primary} />
                      <Text style={styles.statValue}>{mascot.xp}</Text>
                      <Text style={styles.statLabel}>XP</Text>
                    </View>
                  </View>
                  <Text style={styles.cardFooter}>Mascote · {meta.label}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.cardKicker}>CONVIDE UM AMIGO</Text>
                  <Text style={styles.cardName}>{meta.mascotName} convida</Text>
                  <Text style={styles.cardInvite}>
                    "Vem com a gente. Sem cobrança, sem culpa."
                  </Text>
                  <Text style={styles.cardLink} numberOfLines={1}>
                    {buildInviteLink(profile.id)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </StaggeredView>

      <StaggeredView index={1}>
        <View style={styles.actions}>
          {mode === 'progress' ? (
            <>
              <Button label="Compartilhar progresso" onPress={shareProgress} />
              <Text style={styles.hint}>
                {isMilestone
                  ? `Você bateu ${currentStreak} dias. Vale comemorar — copy especial entra automaticamente.`
                  : 'Em desktop web, abre fallback nativo. No celular abre a folha do sistema.'}
              </Text>
            </>
          ) : (
            <>
              <Button label="Convidar amigo" onPress={shareInvite} />
              <Text style={styles.hint}>
                Cada convite ajuda a gente a crescer sem ad. Sem trackers — só um link pra encontrar o Mascote.
              </Text>
            </>
          )}
        </View>
      </StaggeredView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.pill,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabLabel: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    tabLabelActive: {
      color: theme.tokens.semantic.inkOnBrand,
      fontWeight: '700',
    },
    previewWrap: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
    preview: {
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      ...theme.shadow.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardOverlay: {
      alignItems: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    cardKicker: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.4,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    cardName: {
      fontSize: 32,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -0.6,
      lineHeight: 36,
    },
    cardLine: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
    cardInvite: {
      ...theme.text.body,
      color: theme.colors.text,
      fontStyle: 'italic',
      textAlign: 'center',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      paddingHorizontal: theme.spacing.md,
    },
    cardLink: {
      ...theme.text.sm,
      color: theme.colors.primary,
      fontFamily: 'JetBrainsMono_500Medium',
      marginTop: theme.spacing.sm,
    },
    cardStats: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
    statBox: {
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.92)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: theme.radius.md,
      gap: 2,
      minWidth: 64,
      ...theme.shadow.sm,
    },
    statValue: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 16,
    },
    statLabel: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 9,
    },
    cardFooter: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
    actions: { padding: theme.spacing.lg, gap: theme.spacing.md },
    hint: {
      ...theme.text.xs,
      color: theme.colors.textDim,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
}
