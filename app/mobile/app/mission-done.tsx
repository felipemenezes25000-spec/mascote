import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { Mascot } from '@/components/Mascot';
import { applyMissionCompletion, COINS_PER_MISSION } from '@/lib/checkin';
import { missions as missionsDb, todayLocal } from '@/lib/db';
import { phaseLabels } from '@/lib/phaseLabels';
import { processUnlocks } from '@/lib/unlock';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

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
  // Guard re-entrância: StrictMode dispara useEffect 2× em dev, o que
  // tentaria persistir a missão duas vezes. `alreadyCompleted` no service
  // já cobre, mas o ref evita até a leitura redundante do mascot.
  const persistedRef = useRef(false);

  useEffect(() => {
    if (persistedRef.current) return;
    if (!profile || !mascot) return;
    persistedRef.current = true;
    void (async () => {
      const mid = params.mid;
      const today = todayLocal();
      const todays = await missionsDb.forDate(profile.id, today);
      const mission = mid ? todays.find(m => m.id === mid) ?? todays[0] : todays[0];
      if (!mission) {
        setReward({ xp: 0, coins: 0, leveledUp: false, phaseChanged: false });
        return;
      }
      const out = await applyMissionCompletion({ profile, mascot, mission });
      await refreshMascot();
      await refreshWallet();
      setReward({
        xp: out.xpGained,
        coins: out.coinsGained,
        leveledUp: out.leveledUp,
        phaseChanged: out.phaseChanged,
      });
      // Disparos de unlock pós-mission (achievements/scenes destravados pelo
      // novo level ou phase) — ficam disponíveis ao voltar pra Home.
      if (!out.alreadyCompleted && streak) {
        const unlocks = await processUnlocks(profile, out.mascot, streak);
        for (const a of unlocks.achievements)
          enqueueToast({ kind: 'achievement', emoji: a.emoji, title: a.title, subtitle: a.description });
        for (const acc of unlocks.accessories)
          enqueueToast({ kind: 'accessory', emoji: acc.emoji, title: acc.name, subtitle: 'Equipe no Closet' });
        for (const sc of unlocks.scenes)
          enqueueToast({ kind: 'scene', emoji: sc.emoji, title: sc.name, subtitle: 'Cenário desbloqueado' });
      }
    })();
  }, [profile?.id, mascot?.id]);

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 1800);
    return () => clearTimeout(t);
  }, []);

  if (!mascot) return <Redirect href='/splash' />;

  const xpText = reward
    ? reward.xp > 0
      ? `+${reward.xp} XP · +${reward.coins} 🪙`
      : `+${COINS_PER_MISSION} 🪙 — XP do dia já atingiu o limite`
    : 'Salvando...';

  const titleText = reward?.phaseChanged
    ? `${mascot.name} evoluiu pra ${phaseLabels[mascot.phase]}!`
    : reward?.leveledUp
      ? `${mascot.name} subiu pro nv ${mascot.level}!`
      : `${mascot.name} tá orgulhoso.`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <Mascot personality={mascot.personality} phase={mascot.phase} mood="empolgado" size={180} />
          <Text style={styles.kicker}>MISSÃO CONCLUÍDA</Text>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.subtitle}>{xpText}</Text>
        </View>
        <Button label="Voltar pra Home" onPress={() => router.replace('/(tabs)')} />
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
