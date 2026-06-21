import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { Mascot } from '@/components/Mascot';
import { applyMissionCompletion, COINS_PER_MISSION } from '@/lib/checkin';
import { activeEventBoost } from '@/lib/events';
import { buildMascotContextLine } from '@/lib/mascot-context-line';
import { missions as missionsDb, todayLocal } from '@/lib/db';
import { recordMissionOutcome } from '@/services/missions';
import { emergentPhaseLabels } from '@/lib/phaseLabels';
import { processUnlocks } from '@/lib/unlock';
import { useTheme } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
interface Reward {
  xp: number;
  coins: number;
  leveledUp: boolean;
  phaseChanged: boolean;
}

export default function MissionDone() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ mid?: string }>();
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);

  const [confetti, setConfetti] = useState(true);
  const [reward, setReward] = useState<Reward | null>(null);
  const [resultMascot, setResultMascot] = useState(mascot);
  const [mascotLine, setMascotLine] = useState<string | null>(null);
  const apiKey = useStore(s => s.openAiKey);
  // Guard re-entrância: StrictMode dispara useEffect 2× em dev, o que
  // tentaria persistir a missão duas vezes. `alreadyCompleted` no service
  // já cobre, mas o ref evita até a leitura redundante do mascot.
  const persistedRef = useRef(false);

  useEffect(() => {
    if (persistedRef.current) return;
    if (!profile || !mascot) return;
    persistedRef.current = true;
    let alive = true;
    void (async () => {
      const mid = params.mid;
      const today = todayLocal();
      const todays = await missionsDb.forDate(profile.id, today);
      if (!alive) return;
      const mission = mid ? todays.find(m => m.id === mid) ?? todays[0] : todays[0];
      if (!mission) {
        if (alive) setReward({ xp: 0, coins: 0, leveledUp: false, phaseChanged: false });
        return;
      }
      // Boost de evento limitado também vale pra missão (paridade c/ check-in).
      const out = await applyMissionCompletion({ profile, mascot, mission, boost: activeEventBoost() });
      if (!alive) return;
      // Bandit feedback — alimenta o ranker pra a próxima sugestão. Só conta
      // como "completion success" se o pipeline efetivamente registrou (não
      // foi noop por idempotência). Missões legadas sem template_id são noop
      // dentro do `recordMissionOutcome`.
      if (mission.template_id && !out.alreadyCompleted) {
        void recordMissionOutcome(mission.template_id, true);
      }
      await refreshMascot();
      await refreshWallet();
      if (!alive) return;
      setResultMascot(out.mascot);
      setReward({
        xp: out.xpGained,
        coins: out.coinsGained,
        leveledUp: out.leveledUp,
        phaseChanged: out.phaseChanged,
      });
      const line = await buildMascotContextLine(
        profile.id,
        out.mascot,
        out.phaseChanged ? 'evolution' : 'mission_done',
        apiKey,
      );
      if (!alive) return;
      setMascotLine(line);
      // Disparos de unlock pós-mission (achievements/scenes destravados pelo
      // novo level ou phase) — ficam disponíveis ao voltar pra Home.
      if (!out.alreadyCompleted && streak) {
        const unlocks = await processUnlocks(profile, out.mascot, streak);
        if (!alive) return;
        for (const a of unlocks.achievements)
          enqueueToast({ kind: 'achievement', emoji: a.emoji, title: a.title, subtitle: a.description });
        for (const acc of unlocks.accessories)
          enqueueToast({ kind: 'accessory', emoji: acc.emoji, title: acc.name, subtitle: t('mission_done.toast_accessory_sub') });
        for (const sc of unlocks.scenes)
          enqueueToast({ kind: 'scene', emoji: sc.emoji, title: sc.name, subtitle: t('mission_done.toast_scene_sub') });
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile?.id, mascot?.id]);

  useEffect(() => {
    const timer = setTimeout(() => setConfetti(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!mascot) return <Redirect href='/splash' />;

  const displayMascot = resultMascot ?? mascot;

  const xpText = reward
    ? reward.xp > 0
      ? t('mission_done.reward_xp', reward.xp, reward.coins)
      : t('mission_done.reward_capped', COINS_PER_MISSION)
    : t('mission_done.saving');

  const titleText = reward?.phaseChanged
    ? t('mission_done.title_phase', displayMascot.name, emergentPhaseLabels[displayMascot.phase])
    : reward?.leveledUp
      ? t('mission_done.title_levelup', displayMascot.name, displayMascot.level)
      : t('mission_done.title_proud', displayMascot.name);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <Mascot personality={displayMascot.personality} phase={displayMascot.phase} mood="empolgado" size={180} />
          <Typography variant="body" style={styles.kicker}>{t('mission_done.kicker')}</Typography>
          <Typography variant="body" style={styles.title}>{titleText}</Typography>
          <Typography variant="body" style={styles.subtitle}>{xpText}</Typography>
          {mascotLine && (
            <Typography variant="body" style={[styles.subtitle, { fontWeight: '400', fontSize: 15, color: theme.colors.textSecondary }]}>
              {mascotLine}
            </Typography>
          )}
        </View>
        <Button label={t('mission_done.back_home')} onPress={() => router.replace('/(tabs)')} />
      </View>
      <ConfettiBurst visible={confetti} />
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, justifyContent: 'space-between' },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text, textAlign: 'center' },
    subtitle: { ...theme.text.bodyBold, color: theme.colors.text, fontSize: 18 },
  });
}
