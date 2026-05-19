import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { BrandLogo } from '@/components/BrandLogo';
import { Card } from '@/components/Card';
import { ComboRing } from '@/components/ComboRing';
import { HeroSwipeable } from '@/components/HeroSwipeable';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { DAILY_REWARDS, DailyRewardStrip } from '@/components/DailyRewardStrip';
import { EndowmentRow } from '@/components/EndowmentCard';
import { EvolutionModal } from '@/components/EvolutionModal';
import { HabitChip } from '@/components/HabitChip';
import { HabitValueModal } from '@/components/HabitValueModal';
import { Icon } from '@/components/Icon';
import { LimitedEventBanner } from '@/components/LimitedEventBanner';
import { PersonalTicker, buildPersonalStats } from '@/components/PersonalTicker';
import { Mascot } from '@/components/Mascot';
import { MascotAmbient } from '@/components/MascotAmbient';
import { MissionCard } from '@/components/MissionCard';
import { MysteryBoxCard } from '@/components/MysteryBoxCard';
import { NotificationBell } from '@/components/NotificationBell';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';
import { StaggeredView } from '@/components/StaggeredView';
import { Tour } from '@/components/Tour';
import { WalletPills } from '@/components/WalletPills';
import { XPBar } from '@/components/XPBar';
import { accessoryCatalog } from '@/content/accessories';
import { getPersonality } from '@/content/personalities';
import { habitMeta, pickDailyMission } from '@/content/missions';
import { getScene } from '@/content/scenes';
import { activeSeasonalEvent, isLateNight } from '@/content/seasonal';
import {
  addDays,
  checkins as checkinsDb,
  combo as comboDb,
  comboXpBonus,
  customization as customizationDb,
  dailyReward,
  dnaMutations,
  inventory,
  mascots as mascotsDb,
  messages as messagesDb,
  missions as missionsDb,
  mysteryBox,
  predictNextDailyRewardDay,
  settings as settingsDb,
  todayLocal,
  userScenes,
  wallet as walletDb,
} from '@/lib/db';
import { activeLimitedEvent } from '@/lib/events';
import { maybeNotifyStreakAtRisk, notifyMascotBirthday } from '@/lib/notify';
import { copyFor, markShown, shouldTrigger } from '@/lib/paywall-triggers';
import { applyCheckinFully, undoLastCheckin } from '@/lib/checkin';
import type { CheckinOutcome } from '@/lib/checkin';
import { emergentPhaseLabels, phaseLabels } from '@/lib/phaseLabels';
import { applyXp, xpToNextLevel } from '@/lib/xp';
import { deriveReflectiveMood } from '@/lib/mood';
import { buildProactiveContext, runProactiveScan } from '@/lib/proactive';
import { getEvolutionStory, type EvolutionStory } from '@/lib/evolution-stories';
import { useStore } from '@/store';
import { useBehaviorTick, type BehaviorContext } from '@/lib/behavior';
import { sanitizeGenome } from '@/lib/dna';
import { playVoiceLine, voiceProfileFromGenome } from '@/lib/voice';
import { useEvolutionState } from '@/hooks/useEvolutionState';
import { createAnimationAction } from '@/lib/animation-triggers';
import { buildMascotContextLine, hoursAway, returnLoopKind } from '@/lib/mascot-context-line';
import { FIRST_MISSION } from '@/lib/onboarding-evolution';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import type { AccessoryId } from '@/components/Mascot';
import type { Checkin, HabitKind, MascotCustomization, Mascot as MascotType, MascotMood, MascotPhase, Message, Mission } from '@/types';

const HABITS: HabitKind[] = ['water', 'sleep', 'exercise', 'breath', 'meditation', 'reading', 'journaling', 'outdoor', 'sun'];

export default function Home() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  // useWindowDimensions reage a rotação / split-screen / foldable / web resize.
  // Dimensions.get('window') seria 1-shot e congelaria — useWindowDimensions é
  // o pattern correto pra layout adaptativo em RN.
  const { width: vw } = useWindowDimensions();
  // Mascot: cap em 224 (design ideal), shrink em telas pequenas pra deixar
  // respiro. 60% do viewport é o sweet-spot — em iPhone SE (320) vira 192,
  // em iPhone 14 (390) bate o cap 224, em tablet bate o cap também.
  const mascotSize = Math.min(224, Math.round(vw * 0.6));
  // Scene cresce proporcionalmente: ~1.43× a altura do mascote (proporção do
  // design original 320/224). Mantém o "respiro" acima/abaixo do mascote.
  const sceneHeight = Math.round(mascotSize * 1.43);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const settings = useStore(s => s.settings);
  const wallet = useStore(s => s.wallet);
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshStreak = useStore(s => s.refreshStreak);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const welcomeParam = useLocalSearchParams<{ welcome?: string }>().welcome;
  const welcomeFiredRef = useRef(false);

  const [todayCheckins, setTodayCheckins] = useState<Record<string, number>>({});
  const [mission, setMission] = useState<Mission | null>(null);
  const [reactBeat, setReactBeat] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [evolutionVisible, setEvolutionVisible] = useState(false);
  const [evolutionFrom, setEvolutionFrom] = useState<MascotPhase | null>(null);
  const [evolutionMascot, setEvolutionMascot] = useState<MascotType | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string>('room');
  const [unlockedSceneIds, setUnlockedSceneIds] = useState<string[]>(['room']);
  // ↑ id real no scenesCatalog é 'room' (label "Quartinho"); db.ts migra 'quarto' legado.
  const [equippedAccId, setEquippedAccId] = useState<AccessoryId>('none');
  const [habitDetailKind, setHabitDetailKind] = useState<HabitKind | null>(null);
  const [notifKey, setNotifKey] = useState(0);
  const [showNightWarning, setShowNightWarning] = useState(false);
  const [dailyCurrentDay, setDailyCurrentDay] = useState(1);
  const [dailyClaimedToday, setDailyClaimedToday] = useState(false);
  const [boxAvailable, setBoxAvailable] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [comboLevel, setComboLevel] = useState(1);
  const [showTour, setShowTour] = useState(false);
  const [totalCheckinsAll, setTotalCheckinsAll] = useState(0);
  // Customization + mutations carregados da persistência. Passados pro
  // <Mascot/> principal pra refletir VISUALMENTE no Hero da Home — usuário
  // precisa SENTIR a evolução biológica da criatura na tela principal.
  const [customState, setCustomState] = useState<MascotCustomization | null>(null);
  const [mutationIds, setMutationIds] = useState<readonly string[]>([]);
  // Mood derivado (espelha o user): cai pra mascot.mood quando ainda não
  // temos dados suficientes. Recalculado em loadToday/refreshs.
  const [reflectiveMood, setReflectiveMood] = useState<MascotMood | null>(null);
  const [evolutionStory, setEvolutionStory] = useState<EvolutionStory | null>(null);
  const { visuals: evolutionVisuals, refresh: refreshEvolution } = useEvolutionState();
  const { isPremium } = useSubscriptionTier();
  const apiKey = useStore(s => s.openAiKey);
  const [mascotLine, setMascotLine] = useState<string | null>(null);
  const [firstMissionPending, setFirstMissionPending] = useState(false);
  const returnToastFiredRef = useRef(false);
  // Janela de 15s pra "desfazer último check-in". Guardamos o outcome
  // inteiro (não só checkin) porque undoLastCheckin precisa de xpGained
  // pra reverter — usar mascot.xp atual seria errado se o user fez 2 checkins
  // entre o último e o undo (não devolveria a quantia certa).
  const [undoData, setUndoData] = useState<CheckinOutcome | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = todayLocal();
  const seasonalEvent = useMemo(() => activeSeasonalEvent(), []);

  // ============================================================================
  // Behavior Engine — tick a cada 30s na Home. Despacha effects via toast queue
  // (message) ou notification (notify). NÃO muta state do mascote — só sinaliza.
  //
  // Pausado se mascot não carregou ainda (ctxBuilder retorna null) ou se
  // estamos no welcome flow (tour ativo). Cooldown impede repetição.
  // ============================================================================
  useBehaviorTick({
    intervalMs: 30_000,
    paused: showTour || !mascot || !profile,
    ctxBuilder: (): BehaviorContext | null => {
      if (!mascot || !profile) return null;
      // Sanitize DNA (defensive — pré-migration v2 cai aqui)
      const genome = mascot.dna ? sanitizeGenome(mascot.dna) : null;
      if (!genome) return null;
      // hoursSinceLastInteraction baseado em last_seen_at
      const lastSeen = new Date(mascot.last_seen_at).getTime();
      const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);
      return {
        mascot,
        genome,
        mood: mascot.mood,
        hoursSinceLastInteraction: Math.max(0, hoursSince),
        streakCurrent: streak?.current_streak ?? 0,
        hour: new Date().getHours(),
        cooldownActive: new Set(), // engine preenche
        lastRanAt: new Map(),       // engine preenche
      };
    },
    onEffect: (effect, _behavior) => {
      // Effects relevantes pra Home:
      //  • message → toast info
      //  • animation → action prop pro Mascot 3D (já fluindo via state)
      if (effect.message) {
        enqueueToast({
          kind: 'info',
          emoji: '✨',
          title: effect.message,
          subtitle: mascot?.name,
        });
      }
      if (effect.animation && effect.animation !== 'breath_deep') {
        // 'breath_deep' é idle baseline — já é a anim padrão do Mascot3D,
        // não precisa de trigger. Outros despacham um pulse incremental
        // que Mascot3D consome via key change.
        setBehaviorAction({ kind: effect.animation as 'bounce' | 'celebrate' | 'wander' | 'rest' | 'observe', key: Date.now() });
      }
    },
  });
  // State pro action do Behavior Engine — só usado se mascot.dna existe
  const [behaviorAction, setBehaviorAction] = useState<
    | { kind: 'bounce' | 'celebrate' | 'wander' | 'rest' | 'observe'; key: number }
    | undefined
  >(undefined);

  // Refs para timers efêmeros de UI (flash text e confetti). Centralizar aqui:
  // (a) cancela o anterior antes de criar novo — evita flicker em ações rápidas;
  // (b) cleanup no unmount evita setState em componente desmontado.
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  function showFlash(text: string, ms: number = 1500) {
    setFlash(text);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), ms);
  }

  function showConfetti(ms: number = 1200) {
    setConfetti(true);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setConfetti(false), ms);
  }

  useEffect(() => {
    if (!profile) return;
    void ensureTodayMission();
    void checkAmbientNotifications();
    void maybeRunProactiveScan();
    void recomputeReflectiveMood();
  }, [profile?.id]);

  useEffect(() => {
    if (settings && !settings.tour_completed) setShowTour(true);
  }, [settings?.tour_completed]);

  // Pacote Bem-Vindo — fires 3 toasts uma vez quando user chega via ?welcome=1.
  // Os recursos (50 XP, 25 moedas, cap unlock+equip) já foram entregues em
  // notice.tsx#finish(). Aqui só celebramos.
  useEffect(() => {
    if (welcomeParam !== '1' || welcomeFiredRef.current) return;
    welcomeFiredRef.current = true;
    enqueueToast({ kind: 'level', emoji: '⭐', title: 'Nível 2 desbloqueado', subtitle: '+50 XP de boas-vindas' });
    enqueueToast({ kind: 'accessory', emoji: '🧢', title: 'Boné azul equipado', subtitle: 'Seu primeiro acessório' });
    enqueueToast({ kind: 'info', emoji: '🪙', title: '+25 moedas', subtitle: 'Use na loja quando quiser' });
  }, [welcomeParam, enqueueToast]);

  async function finishTour() {
    setShowTour(false);
    if (!profile) return;
    await settingsDb.update(profile.id, { tour_completed: true });
  }

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void loadToday();
      void loadCloset();
      void loadDailyAndBox();
      // Re-pega o estado da missão: quando o user volta de `/mission-done`,
      // o status pode ter virado 'completed' e o card precisa refletir isso.
      void ensureTodayMission();
      // Sem isto, o mood espelho era calculado só no mount inicial — ficava
      // congelado mesmo após check-ins/conversas que mudavam a vibe do user.
      void recomputeReflectiveMood();
      // Customization (sliders Sims-like) + mutationIds (marcos biológicos).
      // CRÍTICO: sem isso, mascote no Hero da Home ignora tudo que o user
      // ajustou em /customize e tudo que desbloqueou via check-ins.
      void loadIdentity();
      void loadFirstMissionFlag();
      void loadMascotContextLine();
      void maybeReturnLoop();
      setShowNightWarning(isLateNight());
    }, [profile?.id])
  );

  async function loadMascotContextLine() {
    if (!profile || !mascot) return;
    const away = returnLoopKind(hoursAway(mascot.last_seen_at));
    const ctx =
      away === 'retorno' ? 'return'
      : away === 'saudade' ? 'saudade'
      : 'home';
    const line = await buildMascotContextLine(profile.id, mascot, ctx, apiKey);
    setMascotLine(line);
  }

  async function maybeReturnLoop() {
    if (!mascot || returnToastFiredRef.current) return;
    const kind = returnLoopKind(hoursAway(mascot.last_seen_at));
    if (kind === 'none') return;
    returnToastFiredRef.current = true;
    setBehaviorAction(createAnimationAction(kind === 'retorno' ? 'retorno' : 'saudade'));
    const line = await buildMascotContextLine(profile!.id, mascot, kind === 'retorno' ? 'return' : 'saudade', apiKey);
    enqueueToast({
      kind: 'info',
      emoji: kind === 'retorno' ? '🌿' : '💛',
      title: mascot.name,
      subtitle: line,
    });
  }

  async function loadFirstMissionFlag() {
    if (!profile) return;
    const s = await settingsDb.get(profile.id);
    setFirstMissionPending(!!(s as { first_mission_pending?: boolean }).first_mission_pending);
  }

  async function loadIdentity() {
    if (!profile) return;
    const [custom, mutations] = await Promise.all([
      customizationDb.get(profile.id),
      dnaMutations.listForUser(profile.id),
    ]);
    setCustomState(custom);
    setMutationIds(mutations.map(m => m.mutation_id));
  }

  async function checkAmbientNotifications() {
    if (!profile || !streak) return;
    await maybeNotifyStreakAtRisk(profile, streak.current_streak, streak.last_active_date);
    const daysOld = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    await notifyMascotBirthday(profile, daysOld);
    setNotifKey(k => k + 1);
  }

  async function loadToday() {
    if (!profile) return;
    const rows = await checkinsDb.list(profile.id, today);
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.habit_kind] = (counts[r.habit_kind] ?? 0) + (r.value ?? 1);
    setTodayCheckins(counts);
  }

  async function loadCloset() {
    if (!profile) return;
    const owned = await inventory.listOwned(profile.id);
    const eq = owned.find(o => o.equipped);
    if (eq && accessoryCatalog.find(a => a.id === eq.accessory_id)) {
      setEquippedAccId(eq.accessory_id as AccessoryId);
    } else {
      setEquippedAccId('none');
    }
    setActiveSceneId(await userScenes.getActive(profile.id));
    // Lista de scenes que o user já desbloqueou — pro swipe ciclar entre elas
    const scenes = await userScenes.listUnlocked(profile.id);
    const ids = scenes.map(s => s.scene_id);
    setUnlockedSceneIds(ids.length > 0 ? ids : ['room']);
  }

  async function cycleScene(direction: 1 | -1) {
    if (!profile || unlockedSceneIds.length <= 1) return;
    const currentIdx = unlockedSceneIds.indexOf(activeSceneId);
    const nextIdx = (currentIdx + direction + unlockedSceneIds.length) % unlockedSceneIds.length;
    const nextId = unlockedSceneIds[nextIdx];
    setActiveSceneId(nextId);
    haptic('light');
    await userScenes.setActive(profile.id, nextId);
  }

  async function loadDailyAndBox() {
    if (!profile) return;
    const d = await dailyReward.get(profile.id);
    // Usa predictor puro pra refletir EXATAMENTE o que `dailyReward.claim` vai
    // entregar (reset de dia 7 → 1, reset após diff>1, etc).
    setDailyCurrentDay(predictNextDailyRewardDay(d, today));
    setDailyClaimedToday(d.last_claimed_date === today);
    const b = await mysteryBox.get(profile.id);
    setBoxAvailable(b.last_opened_date !== today);
    const c = await comboDb.get(profile.id);
    setComboLevel(c.current);
    const all = await checkinsDb.listAll(profile.id);
    setTotalCheckinsAll(all.length);
  }

  // Mascote-espelho: deriva mood do que o user disse + padrões de hábito
  async function recomputeReflectiveMood() {
    if (!profile || !mascot) return;
    const cutoff = addDays(today, -7);
    const [recentCheckins, allMessages] = await Promise.all([
      checkinsDb.listAll(profile.id).then(rows => rows.filter(r => r.occurred_on >= cutoff)),
      messagesDb.listRecent(profile.id, 20),
    ]);
    const lastCheckin = recentCheckins
      .map(c => new Date(c.occurred_at).getTime())
      .sort((a, b) => b - a)[0];
    const hoursSinceLastCheckin = lastCheckin
      ? (Date.now() - lastCheckin) / 3_600_000
      : 999;
    const derived = deriveReflectiveMood({
      baseMood: mascot.mood,
      recentMessages: allMessages,
      recentCheckins,
      hoursSinceLastCheckin,
    });
    setReflectiveMood(derived);
  }

  // Scan proativo: roda 1× quando o user abre o app (ou troca de perfil)
  async function maybeRunProactiveScan() {
    if (!profile || !mascot) return;
    try {
      const ctx = await buildProactiveContext(profile, mascot.name);
      await runProactiveScan(ctx);
      setNotifKey(k => k + 1);
    } catch {
      // não bloqueia UI
    }
  }

  async function ensureTodayMission() {
    if (!profile || !mascot) return;
    const existing = await missionsDb.forDate(profile.id, today);
    if (existing.length > 0) {
      setMission(existing[0]);
      return;
    }
    const template = pickDailyMission(mascot.personality, today);
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
    });
    setMission(created);
  }

  const haptic = useCallback(
    (type: 'light' | 'medium' | 'success' = 'light') => {
      if (Platform.OS === 'web' || settings?.reduce_motion) return;
      try {
        if (type === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    },
    [settings?.reduce_motion]
  );

  async function handleCheckin(kind: HabitKind, customValue?: number) {
    if (!profile || !mascot) return;
    haptic('light');
    const value = customValue ?? 1;

    const out = await applyCheckinFully({ profile, mascot, kind, value });

    setComboLevel((await comboDb.get(profile.id)).current);
    await refreshStreak();
    await refreshWallet();
    await refreshMascot();
    await loadToday();
    void recomputeReflectiveMood();
    void refreshEvolution();
    setReactBeat(v => v + 1);

    if (out.streakMilestone) {
      enqueueToast({
        kind: 'info',
        emoji: '🔥',
        title: `Streak de ${out.streak.current_streak} dias!`,
        subtitle: `+${out.xpGained} XP · +${out.gemsGained} 💎`,
      });
    }

    if (out.phaseChanged) {
      haptic('success');
      setEvolutionFrom(out.prevPhase);
      setEvolutionMascot(out.mascot);
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
      );
      setEvolutionStory(
        getEvolutionStory({
          mascotName: out.mascot.name,
          personality: out.mascot.personality,
          fromPhase: out.prevPhase,
          toPhase: out.mascot.phase,
          totalCheckins: totalCheckinsAll + 1,
          daysSinceCreated,
          currentStreak: out.streak.current_streak,
        })
      );
      setEvolutionVisible(true);
    } else if (out.leveledUp) {
      haptic('success');
      enqueueToast({ kind: 'level', emoji: '⭐', title: `Nível ${out.mascot.level}`, subtitle: 'Continue assim' });
    } else if (out.xpGained > 0) {
      showFlash(`+${out.xpGained} XP · +${out.coinsGained} 🪙`);
    } else {
      showFlash('Anotado (limite diário atingido)', 1800);
    }

    // Abre janela de 15s pra desfazer. Não oferece undo quando: (a) evoluiu
    // (cancelar evolução é mais ruim que registrar o ghost click), (b) o
    // checkin foi idempotente e nada foi gravado.
    if (!out.phaseChanged && out.checkin) {
      setUndoData(out);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoData(null), 15_000);
    }

    if (out.newMicroEvolutions.length > 0) {
      setBehaviorAction(createAnimationAction('micro_evolution'));
      enqueueToast({
        kind: 'info',
        emoji: '✨',
        title: 'Microevolução!',
        subtitle: out.newMicroEvolutions[0]?.label ?? 'Seu mascote mudou sutilmente',
      });
    }

    if (firstMissionPending && kind === 'water') {
      await settingsDb.update(profile.id, { first_mission_pending: false } as Record<string, unknown>);
      setFirstMissionPending(false);
      setBehaviorAction(createAnimationAction('micro_evolution', 'water'));
      enqueueToast({
        kind: 'info',
        emoji: '💧',
        title: 'Primeira evolução!',
        subtitle: `${out.mascot.name} brilhou um pouco mais — você cuidou de si.`,
      });
    }

    for (const a of out.unlocks.achievements) enqueueToast({ kind: 'achievement', emoji: a.emoji, title: a.title, subtitle: a.description });
    for (const acc of out.unlocks.accessories) enqueueToast({ kind: 'accessory', emoji: acc.emoji, title: acc.name, subtitle: 'Equipe no Closet' });
    for (const sc of out.unlocks.scenes) enqueueToast({ kind: 'scene', emoji: sc.emoji, title: sc.name, subtitle: 'Cenário desbloqueado' });
    // Marcos biológicos desbloqueados — toast distinto por raridade.
    // Catalog em src/lib/dna/mutations.ts. UI mostra raridade colorida.
    for (const mut of out.newMutations) {
      enqueueToast({
        kind: 'mutation',
        emoji: '✨',
        title: mut.name,
        subtitle: mut.description,
        rarity: mut.rarity === 'common' ? 'common' : mut.rarity,
      });
    }
    await loadCloset();
    // Recarregar identity SE houve novas mutações — sem isso, o Mascot do
    // Hero não reflete imediatamente o marco visual desbloqueado pelo checkin.
    if (out.newMutations.length > 0) {
      await loadIdentity();
      // Voz procedural — uma micro-celebração por mutation desbloqueada.
      // Emotion escala com raridade (lendária = mais intensa).
      if (out.mascot.dna) {
        const profile = voiceProfileFromGenome(sanitizeGenome(out.mascot.dna));
        const intensity = out.newMutations[0].rarity === 'legendary' ? 0.95 : 0.75;
        playVoiceLine(profile, { kind: 'celebrate', emotion: intensity });
      }
    }

    // Paywall contextual ético — só após momento de valor real, nunca em fragilidade
    await maybeShowPaywall(out.mascot, out.streak);
  }

  async function handleUndoCheckin() {
    if (!profile || !mascot) return;
    const data = undoData;
    if (!data || !data.checkin) return;
    setUndoData(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    haptic('light');
    await undoLastCheckin({
      profile,
      mascot,
      checkinId: data.checkin.id,
      xpAwarded: data.xpGained,
      coinsRefund: data.coinsGained,
    });
    await refreshMascot();
    await refreshWallet();
    await loadToday();
    showFlash('Desfeito', 1200);
  }

  async function maybeShowPaywall(currentMascot: MascotType, currentStreak: typeof streak) {
    if (!profile || !currentStreak) return;
    const [allCheckins, boxOpenedCount] = await Promise.all([
      checkinsDb.listAll(profile.id),
      mysteryBox.openedCount(profile.id),
    ]);
    const trigger = await shouldTrigger({
      mascot: currentMascot,
      streak: currentStreak,
      totalCheckins: allCheckins.length,
      boxOpenedCount,
      hasSubscription: isPremium,
    });
    if (!trigger) return;
    await markShown(trigger);
    const copy = copyFor(trigger, currentMascot.name);
    enqueueToast({
      kind: 'info',
      emoji: '✨',
      title: copy.title,
      subtitle: copy.body,
    });
    router.push('/paywall');
  }

  async function claimDailyReward() {
    if (!profile || dailyClaimedToday) return;
    haptic('success');
    const claimed = await dailyReward.claim(profile.id, today);
    if (!claimed) return;
    const reward = DAILY_REWARDS[claimed.current_day - 1];
    await walletDb.add(profile.id, reward.coins, reward.gems ?? 0);
    await refreshWallet();
    setDailyCurrentDay(claimed.current_day);
    setDailyClaimedToday(true);
    showConfetti();
    enqueueToast({
      kind: 'info',
      emoji: reward.isGrand ? '🏆' : reward.gems ? '💎' : '🪙',
      title: `Dia ${claimed.current_day} · +${reward.coins} 🪙${reward.gems ? ` +${reward.gems} 💎` : ''}`,
      subtitle: reward.isGrand ? 'GRANDE PRÊMIO!' : 'Volta amanhã pra mais.',
    });
  }

  async function openMysteryBox() {
    if (!profile || !boxAvailable) return;
    haptic('success');
    const opened = await mysteryBox.open(profile.id, today);
    if (!opened) return;
    const drops: Array<{ coins: number; gems: number; xp?: number; label: string }> = [
      { coins: 30, gems: 0, label: '+30 🪙' },
      { coins: 75, gems: 0, label: '+75 🪙' },
      { coins: 0, gems: 2, label: '+2 💎' },
      { coins: 50, gems: 0, xp: 50, label: '+50 XP & 🪙' },
      { coins: 100, gems: 1, label: '+100 🪙 +1 💎' },
    ];
    const drop = drops[Math.floor(Math.random() * drops.length)];
    await walletDb.add(profile.id, drop.coins, drop.gems);
    if (drop.xp && mascot) {
      const xpBonus = applyXp(mascot, drop.xp, 0);
      await mascotsDb.upsert(xpBonus.mascot);
      await refreshMascot();
    }
    await refreshWallet();
    setBoxAvailable(false);
    showConfetti(1500);
    enqueueToast({ kind: 'info', emoji: '🎁', title: 'Caixa surpresa!', subtitle: drop.label });
  }

  const personalityMeta = useMemo(() => (mascot ? getPersonality(mascot.personality) : null), [mascot]);
  const toNext = useMemo(
    () => (mascot ? xpToNextLevel(mascot.xp) : { current: 0, needed: 50, progress: 0 }),
    [mascot]
  );

  if (!profile || !mascot) return null;
  const scene = getScene(activeSceneId);
  const greet = greetingFor(new Date().getHours());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
        {/* Header bar conforme handoff: BrandLogo + greet + nome | pílulas.
            Em viewports estreitos (≤360), o nome trunca com ellipsis e o
            BrandLogo desaparece — abre espaço pras pílulas + bell sem overlap. */}
        <StaggeredView index={0}>
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              {vw > 360 && <BrandLogo size={38} shadow={false} />}
              <View style={styles.nameBlock}>
                <Text style={styles.kicker} numberOfLines={1}>{greet}</Text>
                {/* accessibilityRole=header → role=heading no DOM (RN Web). */}
                <Text accessibilityRole="header" style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
                  {profile.display_name?.split(' ')[0] ?? 'Você'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <WalletPills
                coins={wallet?.coins ?? 0}
                gems={wallet?.gems ?? 0}
                streakDays={streak?.current_streak}
              />
              <NotificationBell profileId={profile.id} refreshKey={notifKey} />
            </View>
          </View>
        </StaggeredView>

        <StaggeredView index={1}>
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <PersonalTicker
              source={{
                streakCurrent: streak?.current_streak ?? 0,
                streakLongest: streak?.longest_streak ?? 0,
                totalCheckins: totalCheckinsAll,
                level: mascot?.level ?? 1,
                phaseLabel: mascot ? phaseLabels[mascot.phase] : null,
                mascotName: mascot?.name ?? null,
              }}
            />
          </View>
        </StaggeredView>

        {/* Hierarquia de banner — UM por vez no topo, em ordem de relevância:
            1. Noite difícil (cuidado imediato), 2. Evento limitado (oportunidade),
            3. Sazonal (decorativo). Antes podiam empilhar 3 — somava 180px de
            "anúncios" antes do mascote. */}
        {showNightWarning ? (
          <View style={styles.nightBanner}>
            <View style={styles.nightIconWrap}>
              <Icon name="moon" size={20} color="#D7CDE6" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nightTitle}>Tá tarde aqui</Text>
              <Text style={styles.nightBody}>Já passou da 1h. Sono bom é cuidado também.</Text>
            </View>
            <Pressable
              onPress={() => setShowNightWarning(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fechar aviso noturno"
            >
              <Icon name="x" size={16} color="#D7CDE6" strokeWidth={2.2} />
            </Pressable>
          </View>
        ) : activeLimitedEvent() ? (
          <LimitedEventBanner />
        ) : seasonalEvent ? (
          <View style={styles.seasonalBanner}>
            <Text style={styles.seasonalEmoji}>{seasonalEvent.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.seasonalTitle}>{seasonalEvent.name}</Text>
              <Text style={styles.seasonalBody}>{seasonalEvent.message}</Text>
            </View>
          </View>
        ) : null}

        {/* Status emocional + próxima ação */}
        <StaggeredView index={2} initialDelay={20}>
          <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
            <Card variant="elevated" padding="md">
              <Text style={styles.emotionalKicker}>COMO {mascot.name.toUpperCase()} SE SENTE</Text>
              <Text style={styles.emotionalText}>
                {mascotLine
                  ?? (reflectiveMood === 'empolgado' ? 'Radiante — sentiu sua energia hoje!'
                  : reflectiveMood === 'triste' ? 'Um pouco quieto... mas aqui por você.'
                  : reflectiveMood === 'exausto' ? 'Precisando de descanso — sem pressa.'
                  : evolutionVisuals?.activeEnergy ? 'Com energia — seus hábitos ativos brilham nele.'
                  : evolutionVisuals?.calmAura ? 'Calmo e presente — respira com você.'
                  : 'Aqui, no seu ritmo.')}
              </Text>
              <PressableScale onPress={() => router.push('/weekly-report')} style={{ marginTop: 6 }}>
                <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>
                  Relatório da semana →
                </Text>
              </PressableScale>
              {evolutionVisuals && evolutionVisuals.glowMultiplier > 1.05 && (
                <Text style={styles.evolutionHint}>✨ Evolução visual ativa pelos seus hábitos</Text>
              )}
            </Card>
            {firstMissionPending && (
              <Card variant="elevated" padding="md" style={{ borderColor: theme.colors.primary, borderWidth: 1 }}>
                <Text style={styles.emotionalKicker}>PRIMEIRA MISSÃO · 30s</Text>
                <Text style={styles.emotionalText}>{FIRST_MISSION.description}</Text>
                <PressableScale
                  onPress={() => void handleCheckin('water')}
                  style={{ marginTop: theme.spacing.sm, alignSelf: 'flex-start' }}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Beber água agora →</Text>
                </PressableScale>
              </Card>
            )}
          </View>
        </StaggeredView>

        {/* Hero scenario */}
        <StaggeredView index={3} initialDelay={40}>
          <View style={styles.sceneWrap}>
          <HeroSwipeable
            onPrev={() => void cycleScene(-1)}
            onNext={() => void cycleScene(1)}
          >
          <SceneBackground sceneId={activeSceneId} height={sceneHeight}>
            <Pressable
              style={styles.mascotInScene}
              onPress={() => {
                setReactBeat(v => v + 1);
                // Voz procedural — tap dispara micro-vocalização "react"
                // modulada pelo DNA. Volume cap 0.2 (ambient, não invasivo).
                // No-op silencioso em RN nativo (sem Web Audio).
                if (mascot.dna) {
                  const profile = voiceProfileFromGenome(sanitizeGenome(mascot.dna));
                  playVoiceLine(profile, { kind: 'react', emotion: 0.6 });
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Carinho no ${mascot.name}`}
            >
              <MascotAmbient size={mascotSize} reduceMotion={settings?.reduce_motion}>
                <Mascot
                  personality={mascot.personality}
                  phase={mascot.phase}
                  mood={reflectiveMood ?? mascot.mood}
                  size={mascotSize}
                  reactTrigger={reactBeat}
                  accessory={equippedAccId}
                  reduceMotion={settings?.reduce_motion}
                  action={behaviorAction}
                  customization={customState}
                  mutationIds={mutationIds}
                  evolutionVisuals={evolutionVisuals}
                />
              </MascotAmbient>
            </Pressable>
            {/* Scene badge (top-right) — só quando há 2+ cenas desbloqueadas,
                porque sem alternativa é decoração inútil. */}
            {unlockedSceneIds.length > 1 && (
              <PressableScale
                style={styles.sceneBadge}
                onPress={() => router.push('/closet')}
                accessibilityRole="button"
                accessibilityLabel={`Trocar cenário, atual ${scene.name}`}
              >
                <Text style={styles.sceneEmoji}>{scene.emoji}</Text>
                <Text style={styles.sceneName}>{scene.name}</Text>
              </PressableScale>
            )}
            {/* Nome/level (bottom-left). Único overlay informativo sobre a cena
                — XP, energia e próxima forma vão pras barras dedicadas abaixo. */}
            <View style={[styles.mascotNameBox, { pointerEvents: 'none' }]}>
              <Text style={styles.mascotNameStrong}>{mascot.name}</Text>
              <Text style={styles.mascotPhaseSmall}>
                nv {mascot.level} · {emergentPhaseLabels[mascot.phase]}
              </Text>
            </View>
            {flash && (
              <View style={[styles.flash, { pointerEvents: 'none' }]}>
                <Text style={styles.flashText}>{flash}</Text>
              </View>
            )}
          </SceneBackground>
          </HeroSwipeable>
          </View>
        </StaggeredView>

        {/* Desfazer último check-in (janela 15s) — flutua acima das barras
            sem deslocar nenhum elemento existente. */}
        {undoData && undoData.checkin && (
          <View style={styles.undoWrap}>
            <Text style={styles.undoText}>
              +{undoData.xpGained} XP · +{undoData.coinsGained} 🪙 anotado
            </Text>
            <Pressable
              onPress={handleUndoCheckin}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Desfazer último check-in"
              style={styles.undoBtn}
            >
              <Text style={styles.undoBtnText}>Desfazer</Text>
            </Pressable>
          </View>
        )}

        {/* Energy + XP bars (grid 1fr 1fr conforme handoff) */}
        <StaggeredView index={4}>
          <View style={styles.barsRow}>
          <Card variant="elevated" padding="md" style={styles.barCard}>
            <View style={styles.barHeader}>
              <Icon name="heart" size={12} color={theme.colors.sage} strokeWidth={2.4} fill={theme.colors.sage} />
              <Text style={styles.barLabel}>ENERGIA</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFillEnergy, { width: `${mascot.energy}%` }]} />
            </View>
            <Text style={styles.barValue}>{mascot.energy}/100</Text>
          </Card>
          <Card variant="elevated" padding="md" style={styles.barCard}>
            <View style={styles.barHeader}>
              <Icon name="zap" size={12} color={theme.colors.primary} strokeWidth={2.4} fill={theme.colors.primary} />
              <Text style={styles.barLabel}>NÍVEL {mascot.level}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFillXp, { width: `${Math.max(2, toNext.progress * 100)}%` }]} />
            </View>
            <Text style={styles.barValue}>{toNext.current}/{toNext.needed} XP · próxima forma</Text>
          </Card>
          </View>
        </StaggeredView>

        {/* Daily reward */}
        <StaggeredView index={4}>
          <View style={styles.section}>
            <DailyRewardStrip
              currentDay={dailyCurrentDay}
              claimedToday={dailyClaimedToday}
              onClaim={claimDailyReward}
            />
          </View>
        </StaggeredView>

        {/* Combo só aparece quando há combo real (≥2). Antes mostrava "×1 +8% XP"
            no D1 — informava nada porque todos começam em 1. Vira sinal quando
            o user realmente encadeou check-ins. */}
        {comboLevel >= 2 && (
          <StaggeredView index={5}>
            <View style={styles.section}>
              <Card variant="elevated" padding="md">
                <ComboRing combo={comboLevel} bonusPct={comboXpBonus(comboLevel)} />
              </Card>
            </View>
          </StaggeredView>
        )}

        {/* Mission + Mystery box */}
        <StaggeredView index={6}>
          <View style={[styles.section, styles.missionRow]}>
            <View style={{ flex: 1 }}>
              {mission ? (
                <MissionCard
                  title={mission.title}
                  description={mission.description}
                  xp={mission.xp_reward}
                  completed={mission.status === 'completed'}
                  onPress={() => router.push('/mission')}
                />
              ) : (
                <View style={styles.missionEmpty} accessibilityRole="text">
                  <Text style={styles.missionEmptyTitle}>Missão do dia em breve</Text>
                  <Text style={styles.missionEmptyBody}>
                    Faça um check-in ou volte amanhã — uma nova missão aparece aqui.
                  </Text>
                </View>
              )}
            </View>
            <MysteryBoxCard available={boxAvailable} onOpen={openMysteryBox} />
          </View>
        </StaggeredView>

        {/* Linha de safety + entrada pra checkin completo.
            Antes era um row de 4 quick-actions (Check-in, Conversar, Loja,
            Coleção) — 3 deles duplicavam tab bar (Conversar) ou paths
            existentes via pílulas do wallet / customize. Reduzido pra 2 links
            de texto: o checkin guiado e o modo noite difícil. */}
        <StaggeredView index={7}>
          <View style={styles.linkRow}>
            <Pressable
              onPress={() => router.push('/checkin')}
              style={styles.linkPressable}
              accessibilityRole="button"
              accessibilityLabel="Check-in completo guiado"
            >
              <Text style={styles.linkPrimary}>Check-in guiado →</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/safe-night')}
              style={styles.linkPressable}
              accessibilityRole="button"
              accessibilityLabel="Modo noite difícil — presença sem cobrança"
            >
              <Text style={styles.linkSecondary}>Tô em momento ruim</Text>
            </Pressable>
          </View>
        </StaggeredView>

        {/* Endowment cards (mostra o que já investiu — psicologia de apego).
            Threshold subiu de 3 pra 7 check-ins — antes aparecia quase de cara,
            quando ainda não há "investimento" visível pra reforçar. */}
        {totalCheckinsAll >= 7 && (
          <StaggeredView index={8}>
            <EndowmentRow
              items={[
                { icon: 'check', value: `${totalCheckinsAll}`, label: 'check-ins' },
                { icon: 'flame', value: `${streak?.longest_streak ?? 0}`, label: 'recorde' },
                { icon: 'star', value: `${mascot.level}`, label: 'nível' },
              ]}
            />
          </StaggeredView>
        )}

        {/* Habit chips */}
        <StaggeredView index={9}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionH2}>Cuide de você</Text>
              <Text style={styles.sectionHint}>toque = +1 · segure = ajustar</Text>
            </View>
            <View style={styles.chips}>
              {HABITS.map((h, i) => (
                <StaggeredView key={h} index={i} step={40} initialDelay={500} distance={8}>
                  <HabitChip
                    kind={h}
                    count={todayCheckins[h]}
                    done={(todayCheckins[h] ?? 0) > 0}
                    onPress={() => handleCheckin(h)}
                    onLongPress={() => setHabitDetailKind(h)}
                  />
                </StaggeredView>
              ))}
            </View>
          </View>
        </StaggeredView>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfettiBurst visible={confetti} />

      <EvolutionModal
        visible={evolutionVisible}
        mascot={evolutionMascot}
        fromPhase={evolutionFrom}
        onClose={() => setEvolutionVisible(false)}
        storyTitle={evolutionStory?.title}
        storyBody={evolutionStory?.body}
        storyQuote={evolutionStory?.quote}
      />

      <HabitValueModal
        visible={habitDetailKind !== null}
        kind={habitDetailKind}
        onClose={() => setHabitDetailKind(null)}
        onConfirm={value => {
          if (habitDetailKind) void handleCheckin(habitDetailKind, value);
          setHabitDetailKind(null);
        }}
      />

      <Tour visible={showTour} onDone={finishTour} />
    </SafeAreaView>
  );
}

function greetingFor(hour: number): string {
  if (hour < 5) return 'BOA MADRUGADA';
  if (hour < 12) return 'BOM DIA';
  if (hour < 18) return 'BOA TARDE';
  return 'BOA NOITE';
}


function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center' },
  // ScrollView outer: largura travada em 560 max — em tablets/desktop o
  // conteúdo não estica feito "TV widget". `alignSelf: stretch` em mobile
  // (≤560) deixa ocupar a tela toda; em web/iPad centraliza naturalmente.
  scrollOuter: { width: '100%', maxWidth: 560 },
  scroll: {
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
    // Tab bar é position: absolute (height 64 + bottom 16 + safe-area).
    // Sem este padding o conteúdo final fica oculto atrás da bar.
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
  },
  kicker: {
    fontSize: 9.5,
    color: theme.colors.textDim,
    fontWeight: '700',
    letterSpacing: 1.6,
    fontFamily: 'JetBrainsMono_500Medium',
    marginBottom: 2,
  },
  greeting: {
    ...theme.text.h2,
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  // headerActions é prioritário (não shrink) — wallet pills + bell têm tamanho
  // intrínseco fixo. brandRow encolhe pra caber, e o name dentro trunca.
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1, minWidth: 0 },
  // `minWidth: 0` é essencial pra flex truncate funcionar em RN web.
  nameBlock: { flex: 1, minWidth: 0 },
  comboRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'stretch' },
  comboBox: {
    paddingBottom: theme.spacing.lg,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBox: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  eventIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,128,48,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eventKicker: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  eventTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  eventBody: { color: 'rgba(255,243,231,0.72)', fontSize: 11.5, fontWeight: '600' },
  headerSubRow: { paddingHorizontal: theme.spacing.lg },
  nightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#22203A',
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(183,159,212,0.18)',
  },
  nightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(183,159,212,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nightTitle: { color: '#fff', fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  nightBody: { color: '#D7CDE6', fontSize: 12, lineHeight: 16, marginTop: 2 },
  seasonalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primaryTint,
    borderColor: theme.colors.primarySoft,
    borderWidth: 1,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    ...theme.shadow.sm,
  },
  seasonalEmoji: { fontSize: 26 },
  seasonalTitle: {
    ...theme.text.bodyBold,
    color: theme.colors.text,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  seasonalBody: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 },
  sceneWrap: { paddingHorizontal: theme.spacing.lg, position: 'relative' },
  mascotInScene: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
  sceneBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.glass,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
    ...theme.shadow.sm,
  },
  sceneEmoji: { fontSize: 13 },
  sceneName: {
    ...theme.text.xs,
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  mascotNameBox: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: theme.colors.glass,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
    ...theme.shadow.sm,
  },
  mascotNameStrong: {
    color: theme.colors.text,
    lineHeight: 18,
    fontSize: 15,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.2,
  },
  mascotPhaseSmall: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 10.5,
  },
  flash: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  flashText: { color: '#fff', ...theme.text.bodyBold, fontSize: 13 },
  xpWrap: { paddingHorizontal: theme.spacing.lg + theme.spacing.sm },
  barsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  barCard: {
    flex: 1,
    gap: 6,
  },
  barHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: theme.colors.textSecondary,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  barTrack: {
    height: 6,
    backgroundColor: theme.colors.bg2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFillEnergy: {
    height: '100%',
    backgroundColor: theme.colors.sage,
    borderRadius: 999,
  },
  barFillXp: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
  },
  barValue: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  section: { gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  missionRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'stretch' },
  missionEmpty: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    justifyContent: 'center',
    gap: 4,
    minHeight: 88,
  },
  missionEmptyTitle: { ...theme.text.bodyBold, color: theme.colors.text },
  missionEmptyBody: { ...theme.text.xs, color: theme.colors.textSecondary, lineHeight: 16 },
  // Linha de links (substitui quick actions). Dois ações textuais, sem cards.
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  linkPressable: { paddingVertical: 8, paddingHorizontal: 4 },
  linkPrimary: {
    ...theme.text.sm,
    color: theme.colors.primary,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  linkSecondary: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  sectionTitle: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionH2: {
    ...theme.text.h2,
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 26,
  },
  sectionHint: {
    ...theme.text.xs,
    color: theme.colors.textDim,
    fontWeight: '600',
    fontStyle: 'italic',
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
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
  undoText: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  undoBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  undoBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  emotionalKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: theme.colors.textSecondary,
    fontFamily: 'JetBrainsMono_500Medium',
    marginBottom: 4,
  },
  emotionalText: {
    ...theme.text.body,
    color: theme.colors.text,
    lineHeight: 22,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 17,
  },
  evolutionHint: {
    ...theme.text.xs,
    color: theme.colors.primary,
    marginTop: 6,
    fontWeight: '600',
  },
});
}
