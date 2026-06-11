import { router, useFocusEffect, useLocalSearchParams, Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { Card } from '@/components/Card';
import { ComboRing } from '@/components/ComboRing';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { DailyRewardStrip } from '@/components/DailyRewardStrip';
import { EndowmentRow } from '@/components/EndowmentCard';
import { EvolutionModal } from '@/components/EvolutionModal';
import { HabitValueModal } from '@/components/HabitValueModal';
import { PersonalTicker } from '@/components/PersonalTicker';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import { Tour } from '@/components/Tour';
import { activeSeasonalEvent, isLateNight } from '@/content/seasonal';
import { activeLimitedEvent } from '@/lib/events';
import { getScene } from '@/content/scenes';
import {
  comboXpBonus,
  missions as missionsDb,
  settings as settingsDb,
  todayLocal,
  userScenes,
  checkins as checkinsDb,
} from '@/lib/db';
import { PrimaryActionCard, Typography } from '@/components/ui';
import { isNightBannerOnCooldown, markNightBannerDismissed } from '@/lib/nightBannerCooldown';
import { maybeNotifyJourneyPhaseClose, maybeNotifyStreakAtRisk, notifyMascotBirthday } from '@/lib/notify';
import { emergentPhaseLabels } from '@/lib/phaseLabels';
import { incrementBond } from '@/lib/bond';
import { xpToNextLevel } from '@/lib/xp';
import { buildProactiveContext, runProactiveScan } from '@/lib/proactive';
import { creatureMoments } from '@/lib/moments';
import type { EvolutionStory } from '@/lib/evolution-stories';
import { useStore } from '@/store';
import { sanitizeGenome } from '@/lib/dna';
import { playVoiceLine, voiceProfileFromGenome } from '@/lib/voice';
import { useEvolutionState } from '@/hooks/useEvolutionState';
import { suggestMissionFor, recordMissionOutcome } from '@/services/missions';
import { generateMissionSuggestion } from '@/ai/MissionGeneratorAI';
import { buildMascotContextLine, hoursAway, returnLoopKind } from '@/lib/mascot-context-line';
import { FIRST_MISSION } from '@/lib/onboarding-evolution';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { entitlementService } from '@/services/subscription/EntitlementService';
import type {
  CheckinOutcome,
} from '@/lib/checkin';
import type {
  HabitKind,
  Mission,
  Mascot as MascotType,
  MascotPhase,
} from '@/types';

import { HomeHeader } from '@/features/home/components/HomeHeader';
import { HomeActionRow } from '@/features/home/components/HomeActionRow';
import { HomeBanner } from '@/features/home/components/HomeBanner';
import { JourneyCard } from '@/features/home/components/JourneyCard';
import { useJourneyClaim } from '@/features/home/hooks/useJourneyClaim';
import { HomeHero } from '@/features/home/components/HomeHero';
import { HomeStatsBars } from '@/features/home/components/HomeStatsBars';
import { HomeQuickActions } from '@/features/home/components/HomeQuickActions';
import { HomeMissionCard } from '@/features/home/components/HomeMissionCard';
import { HomeMemoriesStrip } from '@/features/home/components/HomeMemoriesStrip';
import { HomeAwayStrip } from '@/features/home/components/HomeAwayStrip';
import { mascotMemoryService } from '@/game/memory/MascotMemoryService';
import { useHomeActions, createAnimationAction } from '@/features/home/hooks/useHomeActions';
import { useHomeBootstrap } from '@/features/home/hooks/useHomeBootstrap';
import { useHomeBehavior } from '@/features/home/hooks/useHomeBehavior';
import {
  HOME_HABITS,
  buildMascotStatusFallback,
  greetingFor,
  moodToEmotionKey,
} from '@/features/home/helpers';

const HABITS = HOME_HABITS as readonly HabitKind[];

export default function Home() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { width: vw } = useWindowDimensions();
  const mascotSize = Math.min(240, Math.round(vw * 0.7));
  const sceneHeight = Math.round(mascotSize * 1.5);

  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const settings = useStore(s => s.settings);
  const wallet = useStore(s => s.wallet);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const apiKey = useStore(s => s.openAiKey);
  const lifeSummaryLine = useStore(s => s.lifeSummaryLine);
  const proactiveBubbleLine = useStore(s => s.proactiveBubbleLine);
  const lifeReturnCelebration = useStore(s => s.lifeReturnCelebration);
  const runLifeSimulation = useStore(s => s.runLifeSimulation);
  const lifeState = useStore(s => s.lifeState);
  const lifeEvents = useStore(s => s.lifeEvents);
  const welcomeParam = useLocalSearchParams<{ welcome?: string }>().welcome;
  const welcomeFiredRef = useRef(false);
  // Guard de re-entrância: ensureTodayMission roda no useEffect E no useFocusEffect.
  // No mount os dois disparam no mesmo tick — sem o guard, ambos liam
  // forDate()==[] (TOCTOU) e criavam DUAS missões pro mesmo dia (2× XP). O ref é
  // setado de forma síncrona antes do 1º await, então a 2ª chamada sai na hora.
  const ensuringMissionRef = useRef(false);

  const { isPremium, tier } = useSubscriptionTier();
  const { snapshot, reload, setSnapshot } = useHomeBootstrap({ profile, mascot, tier });
  const { visuals: evolutionVisuals, refresh: refreshEvolution } = useEvolutionState();

  const [mission, setMission] = useState<Mission | null>(null);
  const [reactBeat, setReactBeat] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [evolutionVisible, setEvolutionVisible] = useState(false);
  const [evolutionFrom, setEvolutionFrom] = useState<MascotPhase | null>(null);
  const [evolutionMascot, setEvolutionMascot] = useState<MascotType | null>(null);
  const [habitDetailKind, setHabitDetailKind] = useState<HabitKind | null>(null);
  const [notifKey, setNotifKey] = useState(0);
  const [showNightWarning, setShowNightWarning] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [evolutionStory, setEvolutionStory] = useState<EvolutionStory | null>(null);
  const [mascotLine, setMascotLine] = useState<string | null>(null);
  const returnToastFiredRef = useRef(false);
  const [undoData, setUndoData] = useState<CheckinOutcome | null>(null);
  const [behaviorAction, setBehaviorAction] = useState<
    | { kind: import('@/lib/animation-triggers').MascotAnimationKind; key: number }
    | undefined
  >(undefined);
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = todayLocal();
  const seasonalEvent = useMemo(() => activeSeasonalEvent(), []);

  const showFlash = useCallback((text: string, ms: number = 1500) => {
    setFlash(text);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), ms);
  }, []);

  const showConfetti = useCallback((ms: number = 1200) => {
    setConfetti(true);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setConfetti(false), ms);
  }, []);

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
  }, []);

  useHomeBehavior({
    profile,
    mascot,
    streak,
    paused: showTour,
    setBehaviorAction,
  });

  // Resgate de fases da Jornada ao focar — idempotente (lock no service).
  useJourneyClaim({
    profile,
    mascot,
    enqueueToast,
    refreshWallet,
    onConfetti: showConfetti,
  });

  // Cache por (profile, contexto): buildMascotContextLine pode fazer 1 request
  // OpenAI no contexto 'home'. Sem este guard, era 1 chamada por FOCO da Home
  // (cost + latência). Só recarrega quando o contexto muda (home→saudade→retorno).
  const contextLineKeyRef = useRef<string | null>(null);

  async function loadMascotContextLine() {
    if (!profile || !mascot) return;
    const away = returnLoopKind(hoursAway(mascot.last_seen_at));
    const ctx = away === 'retorno' ? 'return' : away === 'saudade' ? 'saudade' : 'home';
    const key = `${profile.id}:${ctx}`;
    if (contextLineKeyRef.current === key) return;
    contextLineKeyRef.current = key;
    const line = await buildMascotContextLine(profile.id, mascot, ctx, apiKey);
    setMascotLine(line);
  }

  async function maybeReturnLoop() {
    if (!mascot || !profile || returnToastFiredRef.current) return;
    const kind = returnLoopKind(hoursAway(mascot.last_seen_at));
    if (kind === 'none') return;
    returnToastFiredRef.current = true;
    setBehaviorAction(createAnimationAction(kind === 'retorno' ? 'retorno' : 'saudade'));
    const daysAway = Math.floor(hoursAway(mascot.last_seen_at) / 24);
    creatureMoments.emit('user.returned', {
      daysAway,
      mood: lifeState?.mood ?? mascot.mood,
    });
    const line =
      lifeSummaryLine ??
      (await buildMascotContextLine(
        profile.id,
        mascot,
        kind === 'retorno' ? 'return' : 'saudade',
        apiKey,
      ));
    enqueueToast({
      kind: 'info',
      emoji: kind === 'retorno' ? '🌿' : '💛',
      title: mascot.name,
      subtitle: line,
    });
  }

  async function checkAmbientNotifications() {
    if (!profile || !streak) return;
    await maybeNotifyStreakAtRisk(profile, streak.current_streak, streak.last_active_date);
    if (mascot) await maybeNotifyJourneyPhaseClose(profile, mascot.xp);
    const daysOld = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    await notifyMascotBirthday(profile, daysOld);
    setNotifKey(k => k + 1);
  }

  async function maybeRunProactiveScan() {
    if (!profile || !mascot) return;
    try {
      const eventToRemember = lifeEvents.find(
        e =>
          e.kind === 'return_summary' ||
          e.kind === 'while_away_living_moment' ||
          e.kind === 'while_away_habit_missed',
      );
      if (eventToRemember) {
        await mascotMemoryService.recordSimulationEvent(
          profile.id,
          eventToRemember.kind,
          eventToRemember.message,
        );
        setMemoryRefreshKey(k => k + 1);
      }
      const ctx = await buildProactiveContext(profile, mascot.name, lifeState, lifeEvents);
      const { fired, bubbleLine } = await runProactiveScan(ctx);
      if (bubbleLine) {
        useStore.setState({ proactiveBubbleLine: bubbleLine });
      }
      if (fired.length > 0) setNotifKey(k => k + 1);
    } catch {
      /* não bloqueia UI */
    }
  }

  // Missão adaptativa: bandit (suggestMissionFor) é a primeira escolha; se ele
  // ainda não tem dados suficientes, MissionGeneratorAI dá heurística contextual
  // local. Em último caso, pickDailyMission determinístico (já dentro do bandit).
  async function ensureTodayMission() {
    if (!profile || !mascot) return;
    if (ensuringMissionRef.current) return;
    ensuringMissionRef.current = true;
    try {
      const existing = await missionsDb.forDate(profile.id, today);
      if (existing.length > 0) {
        setMission(existing[0]);
        return;
      }
      // Marca como skipadas as missões anteriores ainda pending — alimentando
      // o bandit com sinal negativo (reward 0). Roda só uma vez ao trocar de dia.
      const allMissions = await missionsDb.list(profile.id);
      for (const m of allMissions) {
        if (m.status === 'pending' && m.scheduled_for < today) {
          await missionsDb.update(m.id, { status: 'expired' });
          if (m.template_id) void recordMissionOutcome(m.template_id, false);
        }
      }
      const allCheckins = await checkinsDb.listAll(profile.id);
      const todayRows = await checkinsDb.list(profile.id, today);
      const recentHabits = Array.from(new Set(allCheckins.slice(-30).map(c => c.habit_kind)));
      const tplBandit = await suggestMissionFor({
        personality: mascot.personality,
        mood: mascot.mood,
        doneToday: todayRows.map(r => r.habit_kind),
        dateKey: today,
      });
      let template = tplBandit;
      try {
        const seed = Math.floor(new Date(today).getTime() / 1000);
        const aiOut = generateMissionSuggestion(mascot.personality, seed, recentHabits);
        if (aiOut) template = aiOut;
      } catch {
        /* fallback seguro */
      }
      const created = await missionsDb.add({
        user_id: profile.id,
        title: template.title,
        description: template.description,
        habit_kind: template.habit_kind,
        target_value: template.target_value,
        xp_reward: template.xp_reward,
        status: 'pending',
        scheduled_for: today,
        completed_at: null,
        template_id: template.id,
      });
      setMission(created);
    } finally {
      ensuringMissionRef.current = false;
    }
  }

  async function cycleScene(direction: 1 | -1) {
    if (!profile || snapshot.unlockedSceneIds.length <= 1) return;
    const ids = snapshot.unlockedSceneIds;
    const currentIdx = ids.indexOf(snapshot.activeSceneId);
    const nextIdx = (currentIdx + direction + ids.length) % ids.length;
    const nextId = ids[nextIdx];
    if (!entitlementService.canAccessScene(tier, nextId)) {
      router.push({ pathname: '/paywall', params: { trigger: 'premium_feature' } });
      return;
    }
    setSnapshot(prev => ({ ...prev, activeSceneId: nextId }));
    actions.haptic('light');
    await userScenes.setActive(profile.id, nextId);
  }

  useEffect(() => {
    if (!profile) return;
    void ensureTodayMission();
    void checkAmbientNotifications();
    void maybeRunProactiveScan();
  }, [profile?.id]);

  useEffect(() => {
    if (settings && !settings.tour_completed) setShowTour(true);
  }, [settings?.tour_completed]);

  useEffect(() => {
    if (welcomeParam !== '1' || welcomeFiredRef.current) return;
    welcomeFiredRef.current = true;
    enqueueToast({ kind: 'level', emoji: '⭐', title: 'Nível 2 desbloqueado', subtitle: '+50 XP de boas-vindas' });
    enqueueToast({ kind: 'accessory', emoji: '🧢', title: 'Boné azul equipado', subtitle: 'Seu primeiro acessório' });
    enqueueToast({ kind: 'info', emoji: '🪙', title: '+25 moedas', subtitle: 'Use na loja quando quiser' });
  }, [welcomeParam, enqueueToast]);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void reload();
      void runLifeSimulation();
      void ensureTodayMission();
      void loadMascotContextLine();
      void maybeReturnLoop();
      void maybeRunProactiveScan();
      // V2: respeita cooldown de 8h após dismissal — não vira nag.
      void (async () => {
        if (!isLateNight()) {
          setShowNightWarning(false);
          return;
        }
        const onCooldown = await isNightBannerOnCooldown();
        setShowNightWarning(!onCooldown);
      })();
    }, [profile?.id, reload, runLifeSimulation])
  );

  const actions = useHomeActions({
    profile,
    mascot,
    settings,
    streak,
    isPremium,
    totalCheckinsAll: snapshot.totalCheckinsAll,
    onCheckinDone: async (out) => {
      await reload();
      void refreshEvolution();
      setReactBeat(v => v + 1);
      // Marcos persistidos como memória — pra a strip e o chat referenciarem.
      if (snapshot.firstMissionPending && out.checkin?.habit_kind === 'water') {
        await actions.completeFirstMissionFlag();
        await mascotMemoryService.recordMilestone(profile!.id, 'first_mission', {
          name: out.mascot.name,
        });
        setMemoryRefreshKey(k => k + 1);
        setBehaviorAction(createAnimationAction('micro_evolution', 'water'));
        enqueueToast({
          kind: 'info',
          emoji: '💧',
          title: 'Primeira evolução!',
          subtitle: `${out.mascot.name} brilhou um pouco mais — você cuidou de si.`,
        });
      }
      if (out.streakMilestone && out.streak.current_streak >= 7) {
        await mascotMemoryService.recordMilestone(profile!.id, 'max_streak', {
          detail: String(out.streak.current_streak),
        });
        setMemoryRefreshKey(k => k + 1);
      }
    },
    onEvolution: async ({ fromPhase, mascot: nextMascot, story }) => {
      setEvolutionFrom(fromPhase);
      setEvolutionMascot(nextMascot);
      setEvolutionStory(story);
      setEvolutionVisible(true);
      // Memória persistida: primeira evolução marca início da história.
      if (profile && fromPhase === 'ovo') {
        await mascotMemoryService.recordMilestone(profile.id, 'first_evolution', {
          detail: nextMascot.phase,
        });
        setMemoryRefreshKey(k => k + 1);
      }
    },
    onLevelUp: () => undefined,
    onFlash: showFlash,
    onConfetti: showConfetti,
    onUndoSet: setUndoData,
    onAnimation: (reason) => setBehaviorAction(createAnimationAction(reason)),
    onReloadCloset: reload,
    onReloadIdentity: reload,
  });

  async function finishTour() {
    setShowTour(false);
    if (!profile) return;
    await settingsDb.update(profile.id, { tour_completed: true });
  }

  const toNext = useMemo(
    () => (mascot ? xpToNextLevel(mascot.xp) : { current: 0, needed: 50, progress: 0 }),
    [mascot]
  );
  // bannerActive precisa vir ANTES do early-return abaixo: hooks devem ser
  // chamados na mesma ordem em todo render (rules-of-hooks). seasonalEvent e
  // showNightWarning já estão no escopo (declarados acima).
  const bannerActive = useMemo(
    () => showNightWarning || !!activeLimitedEvent() || !!seasonalEvent,
    [showNightWarning, seasonalEvent],
  );

  if (!profile || !mascot) return <Redirect href="/splash" />;
  const scene = getScene(snapshot.activeSceneId);
  const greet = greetingFor(new Date().getHours());
  const reflective = snapshot.reflectiveMood;
  const emotion = moodToEmotionKey(reflective ?? mascot.mood);
  const displayLine =
    proactiveBubbleLine ??
    lifeSummaryLine ??
    // mascotLine (linha memória-aware, possivelmente via IA) ANTES do fallback
    // estático: o fallback sempre retorna string (nunca null), então com ele à
    // frente o mascotLine era inalcançável — o fetch de cada foco era jogado fora.
    mascotLine ??
    buildMascotStatusFallback(
      reflective,
      !!evolutionVisuals?.activeEnergy,
      !!evolutionVisuals?.calmAura,
    );
  const sceneHour = new Date().getHours();
  const missionActive = mission !== null;
  const rewardAvailable = !snapshot.dailyClaimedToday;
  const awayHours = mascot.last_seen_at ? hoursAway(mascot.last_seen_at) : 0;
  const awayMoreThan24h =
    awayHours >= 24 || lifeEvents.some(
      e => e.kind === 'while_away_living_moment' || e.kind === 'return_summary',
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
        {/* ----- Above the fold: hero + 1 banner + stats + 1 CTA ----- */}
        <View style={styles.aboveFold}>
          <StaggeredView index={0}>
            <HomeHeader
              profile={profile}
              wallet={wallet}
              streak={streak}
              notifKey={notifKey}
              greet={greet}
              showBrand={vw > 360}
            />
          </StaggeredView>

          {bannerActive && (
            <HomeBanner
              showNightWarning={showNightWarning}
              onDismissNight={() => {
                setShowNightWarning(false);
                void markNightBannerDismissed();
              }}
              seasonalEvent={seasonalEvent}
            />
          )}

          <StaggeredView index={1} initialDelay={20}>
            <HomeHero
              mascot={mascot}
              scene={scene}
              sceneHeight={sceneHeight}
              mascotSize={mascotSize}
              reduceMotion={settings?.reduce_motion}
              reactBeat={reactBeat}
              reflectiveMood={reflective}
              equippedAccId={snapshot.equippedAccId}
              customState={snapshot.customState}
              mutationIds={snapshot.mutationIds}
              behaviorAction={behaviorAction}
              unlockedSceneCount={snapshot.unlockedSceneIds.length}
              statusLine={displayLine}
              emotionKey={emotion}
              sceneHour={sceneHour}
              celebrationActive={lifeReturnCelebration}
              onPrev={() => void cycleScene(-1)}
              onNext={() => void cycleScene(1)}
              onSceneBadge={() => router.push({ pathname: '/closet', params: { tab: 'scenes' } })}
              onIdentityPress={() => router.push('/mascot')}
              onGesture={(kind) => {
                setReactBeat(v => v + 1);
                const reasonMap = {
                  tap: 'touch',
                  double: 'mission_complete',
                  long: 'saudade',
                  pet: 'touch',
                } as const;
                setBehaviorAction(createAnimationAction(reasonMap[kind]));
                if (kind === 'pet') creatureMoments.emit('gesture.pet', { intensity: 1 });
                if (kind === 'double') creatureMoments.emit('gesture.double', {});
                if (mascot.dna) {
                  const profileVoice = voiceProfileFromGenome(sanitizeGenome(mascot.dna));
                  const voiceKind = kind === 'double' ? 'celebrate' : kind === 'long' ? 'sleepy' : 'react';
                  const emotion = kind === 'double' ? 0.85 : kind === 'long' ? 0.4 : 0.6;
                  playVoiceLine(profileVoice, { kind: voiceKind, emotion });
                }
                // Vínculo persistido: gesto efêmero vira história gravada.
                // Cap diário no bond.ts evita grind; fire-and-forget pra não travar UX.
                if (profile?.id) void incrementBond(profile.id, kind);
              }}
              flash={flash}
            />
          </StaggeredView>

          <StaggeredView index={2}>
            <HomeStatsBars mascot={mascot} toNext={toNext} />
          </StaggeredView>

          <StaggeredView index={3}>
            <JourneyCard xp={mascot.xp} dna={mascot.dna} onPress={() => router.push('/journey')} />
          </StaggeredView>

          <StaggeredView index={3} initialDelay={20}>
            <HomeActionRow
              onPlay={() => router.push('/minigames')}
              onCare={() => router.push('/checkin')}
              onTalk={() => router.push('/(tabs)/chat')}
              onCustomize={() => router.push('/closet')}
            />
          </StaggeredView>

          <StaggeredView index={3} initialDelay={30}>
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              {snapshot.firstMissionPending ? (
                <PrimaryActionCard
                  title={`Beber água com ${mascot.name}`}
                  subtitle={FIRST_MISSION.description}
                  ctaLabel="Bebi 1 copo"
                  icon="droplet"
                  onPress={() => void actions.handleCheckin('water')}
                  accessibilityHint="Marca primeiro check-in de água"
                />
              ) : missionActive && mission ? (
                <PrimaryActionCard
                  title={mission.title}
                  subtitle={mission.status === 'completed' ? 'Feito hoje · valeu' : mission.description}
                  ctaLabel={mission.status === 'completed' ? 'Ver detalhes' : 'Cuidar agora'}
                  icon="sparkles"
                  onPress={() => router.push('/mission')}
                  accessibilityHint="Abre a missão do dia"
                />
              ) : (
                <PrimaryActionCard
                  title="Cuidar agora"
                  subtitle="Anote como você está em 2 minutos."
                  ctaLabel="Começar"
                  icon="sparkles"
                  onPress={() => router.push('/checkin')}
                />
              )}
            </View>
          </StaggeredView>
        </View>

        {/* ----- Below the fold: revelado em scroll ----- */}
        <View style={styles.belowFold}>
          {undoData && undoData.checkin && (
            <View style={styles.undoWrap}>
              <Typography variant="caption" tone="secondary">
                +{undoData.xpGained} XP · +{undoData.coinsGained} 🪙 anotado
              </Typography>
              <Pressable
                onPress={() => void actions.handleUndoCheckin(undoData)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Desfazer último check-in"
                style={styles.undoBtn}
              >
                <Typography variant="caption" tone="brand" style={{ fontWeight: '700' }}>Desfazer</Typography>
              </Pressable>
            </View>
          )}

          {missionActive && (
            <StaggeredView index={4}>
              <HomeMissionCard
                mission={mission}
                onPressMission={() => router.push('/mission')}
                boxAvailable={snapshot.boxAvailable}
                onOpenBox={() => void actions.openMysteryBox(snapshot.boxAvailable, () => void reload())}
              />
            </StaggeredView>
          )}

          <StaggeredView index={5} initialDelay={20}>
            <HomeMemoriesStrip userId={profile.id} refreshKey={memoryRefreshKey} />
          </StaggeredView>

          <StaggeredView index={6}>
            <HomeQuickActions
              habits={HABITS}
              todayCheckins={snapshot.todayCheckins}
              onPress={(kind) => void actions.handleCheckin(kind)}
              onLongPress={(kind) => setHabitDetailKind(kind)}
            />
          </StaggeredView>

          {rewardAvailable && (
            <StaggeredView index={7}>
              <View style={styles.section}>
                <DailyRewardStrip
                  currentDay={snapshot.dailyCurrentDay}
                  claimedToday={snapshot.dailyClaimedToday}
                  onClaim={() => void actions.claimDailyReward(
                    { day: snapshot.dailyCurrentDay, claimedToday: snapshot.dailyClaimedToday },
                    () => void reload(),
                  )}
                />
              </View>
            </StaggeredView>
          )}

          {awayMoreThan24h && (
            <HomeAwayStrip events={lifeEvents} summaryLine={lifeSummaryLine} />
          )}

          <StaggeredView index={8}>
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <PersonalTicker
                source={{
                  streakCurrent: streak?.current_streak ?? 0,
                  streakLongest: streak?.longest_streak ?? 0,
                  totalCheckins: snapshot.totalCheckinsAll,
                  level: mascot.level,
                  phaseLabel: emergentPhaseLabels[mascot.phase],
                  mascotName: mascot.name,
                }}
              />
            </View>
          </StaggeredView>

          {snapshot.comboLevel >= 2 && (
            <StaggeredView index={9}>
              <View style={styles.section}>
                <Card variant="elevated" padding="md">
                  <ComboRing combo={snapshot.comboLevel} bonusPct={comboXpBonus(snapshot.comboLevel)} />
                </Card>
              </View>
            </StaggeredView>
          )}

          {snapshot.totalCheckinsAll >= 7 && (
            <StaggeredView index={10}>
              <EndowmentRow
                items={[
                  { icon: 'check', value: `${snapshot.totalCheckinsAll}`, label: 'check-ins' },
                  { icon: 'flame', value: `${streak?.longest_streak ?? 0}`, label: 'recorde' },
                  { icon: 'star', value: `${mascot.level}`, label: 'nível' },
                ]}
              />
            </StaggeredView>
          )}

          <StaggeredView index={11}>
            <View style={styles.linkRow}>
              <PressableScale
                onPress={() => router.push('/checkin')}
                accessibilityRole="button"
                accessibilityLabel="Check-in completo guiado"
                // Texto plano (caption ~14lh, sem padding) — hitSlop garante
                // alvo de toque mínimo de 44px sem inflar o visual da linha.
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Typography variant="caption" tone="brand" style={{ fontWeight: '700' }}>Check-in guiado →</Typography>
              </PressableScale>
              <PressableScale
                onPress={() => router.push('/safe-night')}
                accessibilityRole="button"
                accessibilityLabel="Modo noite difícil"
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Typography variant="caption" tone="secondary" style={{ textDecorationLine: 'underline' }}>
                  Tô em momento ruim
                </Typography>
              </PressableScale>
            </View>
          </StaggeredView>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <ConfettiBurst visible={confetti} />

      {/* Modais lazy: criamos o nó React só após interação do usuário. */}
      {evolutionVisible && (
        <EvolutionModal
          visible={evolutionVisible}
          mascot={evolutionMascot}
          fromPhase={evolutionFrom}
          onClose={() => setEvolutionVisible(false)}
          storyTitle={evolutionStory?.title}
          storyBody={evolutionStory?.body}
          storyQuote={evolutionStory?.quote}
        />
      )}

      {habitDetailKind !== null && (
        <HabitValueModal
          visible={true}
          kind={habitDetailKind}
          onClose={() => setHabitDetailKind(null)}
          onConfirm={value => {
            if (habitDetailKind) void actions.handleCheckin(habitDetailKind, value);
            setHabitDetailKind(null);
          }}
        />
      )}

      {showTour && <Tour visible={showTour} onDone={finishTour} />}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center' },
    scrollOuter: { width: '100%', maxWidth: 560 },
    scroll: {
      paddingTop: theme.spacing.md,
      paddingBottom: 120,
    },
    aboveFold: { gap: theme.spacing.md },
    belowFold: { gap: theme.spacing.md, marginTop: theme.spacing.md },
    section: { gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
    undoWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      ...theme.shadow.sm,
    },
    undoBtn: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4 },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
  });
}
