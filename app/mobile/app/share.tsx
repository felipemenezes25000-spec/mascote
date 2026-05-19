import { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
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
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function ShareScreen() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const settings = useStore(s => s.settings);
  const [todayCount, setTodayCount] = useState(0);
  const [sceneId, setSceneId] = useState('room');

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

  async function doShare() {
    if (!profile || !mascot) return;
    const text = `Hoje cuidei de mim ${todayCount}x no Mascote. Streak: ${streak?.current_streak ?? 0} dias 🌱`;
    try {
      await Share.share({ message: text });
    } catch (e: any) {
      Alert.alert('Compartilhamento', text);
    }
  }

  if (!profile || !mascot) return null;
  const meta = getPersonality(mascot.personality);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="modal" title="Compartilhar" subtitle="seu progresso de hoje" />

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
              <Text style={styles.cardKicker}>MEU MASCOTE HOJE</Text>
              <Text style={styles.cardName}>{mascot.name}</Text>
              <Text style={styles.cardLine}>
                nível {mascot.level} · {mascot.phase}
              </Text>
              <View style={styles.cardStats}>
                <View style={styles.statBox}>
                  <Icon name="flame" size={12} color={theme.colors.error} strokeWidth={2.4} fill={theme.colors.error + '50'} />
                  <Text style={styles.statValue}>{streak?.current_streak ?? 0}</Text>
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
            </View>
          </View>
        </View>
      </StaggeredView>

      <StaggeredView index={1}>
        <View style={styles.actions}>
          <Button label="Compartilhar texto" onPress={doShare} />
          <Text style={styles.hint}>
            Em desktop web, o compartilhamento abre fallback nativo. No celular abre a folha do sistema.
          </Text>
        </View>
      </StaggeredView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
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
