/**
 * useHomeActions — encapsula handlers de check-in, daily reward, mystery box.
 *
 * Mantém a Home (`app/(tabs)/index.tsx`) focada em rendering. O hook sabe
 * coordenar refresh do store + toast queue + side-effects (paywall trigger).
 */
import { useCallback, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { analytics } from '@/analytics';
import {
  checkins as checkinsDb,
  combo as comboDb,
  dailyReward,
  mascots as mascotsDb,
  mysteryBox,
  settings as settingsDb,
  todayLocal,
  wallet as walletDb,
  withLock,
} from '@/lib/db';
import { applyCheckinFully, undoLastCheckin } from '@/lib/checkin';
import type { CheckinOutcome } from '@/lib/checkin';
import { activeEventBoost } from '@/lib/events';
import { applyXp } from '@/lib/xp';
import { copyFor, isInPaywallCooldown, markShown, shouldTrigger } from '@/lib/paywall-triggers';
import { DAILY_REWARDS } from '@/components/DailyRewardStrip';
import { createAnimationAction } from '@/lib/animation-triggers';
import { sanitizeGenome } from '@/lib/dna';
import { playSfx } from '@/lib/sfx';
import { playVoiceLine, voiceProfileFromGenome } from '@/lib/voice';
import { getEvolutionStory, type EvolutionStory } from '@/lib/evolution-stories';
import { creatureMoments } from '@/lib/moments';
import { mascotMemoryService } from '@/game/memory/MascotMemoryService';
import { hasRareFormTrigger } from '@/game/evolution/EvolutionMilestones';
import type { HabitKind, Mascot, MascotPhase, Profile, Settings, Streak } from '@/types';
import { useStore } from '@/store';

interface UseHomeActionsOptions {
  profile: Profile | null;
  mascot: Mascot | null;
  settings: Settings | null;
  streak: Streak | null;
  isPremium: boolean;
  onCheckinDone: (outcome: CheckinOutcome) => void;
  onEvolution: (data: { fromPhase: MascotPhase; mascot: Mascot; story: EvolutionStory }) => void;
  onLevelUp: (mascot: Mascot) => void;
  onFlash: (text: string, ms?: number) => void;
  onConfetti: (ms?: number) => void;
  onUndoSet: (data: CheckinOutcome | null) => void;
  onAnimation: (reason: import('@/lib/animation-triggers').AnimationTriggerReason) => void;
  onReloadCloset: () => Promise<void>;
  onReloadIdentity: () => Promise<void>;
  totalCheckinsAll: number;
}

export function useHomeActions(opts: UseHomeActionsOptions) {
  const refreshMascot = useStore(s => s.refreshMascot);
  const refreshStreak = useStore(s => s.refreshStreak);
  const refreshWallet = useStore(s => s.refreshWallet);
  const enqueueToast = useStore(s => s.enqueueToast);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sem cleanup, o setTimeout de 15s (que limpa `undoOutcome` no parent)
  // disparava após o user navegar pra fora — call em opts.onUndoSet rodava
  // contra um componente desmontado e captava callback stale.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  const haptic = useCallback(
    (type: 'light' | 'medium' | 'success' = 'light') => {
      if (Platform.OS === 'web' || opts.settings?.reduce_motion) return;
      try {
        if (type === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {/* haptics opcional */}
    },
    [opts.settings?.reduce_motion],
  );

  const maybeShowPaywall = useCallback(
    async (currentMascot: Mascot, currentStreak: Streak) => {
      const profile = opts.profile;
      if (!profile) return;
      // Cooldown de sessão (fix auditoria 2026-05-27): se já mostramos paywall
      // nos últimos 30min, segura este. Múltiplos milestones no mesmo tap
      // (streak_7 + level_5 + checkin_30) não viram chain de upsells.
      if (isInPaywallCooldown()) return;
      const [allCheckins, boxOpenedCount] = await Promise.all([
        checkinsDb.listAll(profile.id),
        mysteryBox.openedCount(profile.id),
      ]);
      const trigger = await shouldTrigger({
        mascot: currentMascot,
        streak: currentStreak,
        totalCheckins: allCheckins.length,
        boxOpenedCount,
        hasSubscription: opts.isPremium,
      });
      if (!trigger) return;
      await markShown(trigger);
      const copy = copyFor(trigger, currentMascot.name);
      enqueueToast({ kind: 'info', emoji: '✨', title: copy.title, subtitle: copy.body });
      router.push('/paywall');
    },
    [opts.profile, opts.isPremium, enqueueToast],
  );

  const handleCheckin = useCallback(
    async (kind: HabitKind, customValue?: number) => {
      const profile = opts.profile;
      const mascot = opts.mascot;
      if (!profile || !mascot) return;
      haptic('light');
      const value = customValue ?? 1;
      const out = await applyCheckinFully({
        profile,
        mascot,
        kind,
        value,
        analyticsPath: 'home',
        // Aplica o multiplicador do evento limitado ativo (XP em dobro / moedas
        // 3×) que o LimitedEventBanner anuncia. Calculado aqui (com relógio) e
        // passado pro core puro.
        boost: activeEventBoost(),
      });
      await refreshStreak();
      await refreshWallet();
      await refreshMascot();
      opts.onCheckinDone(out);

      // Wiring de moments — bus central reage em paralelo (animação, memória,
      // analytics, voz). Não substitui as side effects locais abaixo; ADICIONA
      // uma camada de pub/sub pra desacoplar.
      creatureMoments.emit('checkin.completed', {
        habit: kind,
        intensity: value,
        xpGained: out.xpGained,
      });
      // Moment específico do hábito — handlers podem reagir só ao que importa
      // (ex: SoundService toca som de água apenas em 'habit.water').
      switch (kind) {
        case 'water':      creatureMoments.emit('habit.water', { intensity: value }); break;
        case 'sleep':      creatureMoments.emit('habit.sleep', { intensity: value }); break;
        case 'exercise':   creatureMoments.emit('habit.exercise', { intensity: value }); break;
        case 'meditation': creatureMoments.emit('habit.meditation', { intensity: value }); break;
        case 'reading':    creatureMoments.emit('habit.reading', { intensity: value }); break;
        case 'breath':     creatureMoments.emit('habit.breath', { intensity: value }); break;
        case 'outdoor':    creatureMoments.emit('habit.outdoor', { intensity: value }); break;
        case 'sun':        creatureMoments.emit('habit.sun', { intensity: value }); break;
        case 'journaling': creatureMoments.emit('habit.journaling', { intensity: value }); break;
      }

      if (out.streakMilestone) {
        enqueueToast({
          kind: 'info',
          emoji: '🔥',
          title: `Streak de ${out.streak.current_streak} dias!`,
          subtitle: `+${out.xpGained} XP · +${out.gemsGained} 💎`,
        });
        creatureMoments.emit('streak.milestone', {
          days: out.streak.current_streak,
          isFirst: out.streak.current_streak === 7,
        });
      }

      if (out.phaseChanged) {
        haptic('success');
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000,
        );
        const story = getEvolutionStory({
          mascotName: out.mascot.name,
          personality: out.mascot.personality,
          fromPhase: out.prevPhase,
          toPhase: out.mascot.phase,
          totalCheckins: opts.totalCheckinsAll + 1,
          daysSinceCreated,
          currentStreak: out.streak.current_streak,
        });
        creatureMoments.emit('phase.advanced', {
          from: out.prevPhase,
          to: out.mascot.phase,
        });
        opts.onEvolution({ fromPhase: out.prevPhase, mascot: out.mascot, story });

        // Auto-update do ProceduralGenome em phase change. Fire-and-forget:
        // não bloqueia o reveal modal — quando responde, atualiza o store via
        // refreshMascot na próxima leitura. Rate-limit interno (24h) garante
        // que não vai gerar de novo se já gerou hoje.
        void (async () => {
          try {
            const { maybeAutoUpdateGenome } = await import('@/lib/procedural/autoUpdate');
            await maybeAutoUpdateGenome({
              mascot: out.mascot,
              prevPhase: out.prevPhase,
              streak: out.streak.current_streak,
            });
          } catch {
            // logger em autoUpdate já cobre; aqui é só engolir pra não quebrar UI
          }
        })();
      } else if (out.leveledUp) {
        haptic('success');
        opts.onLevelUp(out.mascot);
        enqueueToast({ kind: 'level', emoji: '⭐', title: `Nível ${out.mascot.level}`, subtitle: 'Continue assim' });
      } else if (out.xpGained > 0) {
        opts.onFlash(`+${out.xpGained} XP · +${out.coinsGained} 🪙`);
      } else {
        opts.onFlash('Anotado (limite diário atingido)', 1800);
      }

      // Janela de undo (15s) — não oferece se evoluiu ou se foi idempotente.
      if (!out.phaseChanged && out.checkin) {
        opts.onUndoSet(out);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => opts.onUndoSet(null), 15_000);
      }

      if (out.newMicroEvolutions.length > 0) {
        opts.onAnimation('micro_evolution');
        const first = out.newMicroEvolutions[0];
        enqueueToast({
          kind: 'info',
          emoji: '✨',
          title: 'Microevolução!',
          subtitle: first?.label ?? 'Seu mascote mudou sutilmente',
        });
        creatureMoments.emit('microevolution.observed', {
          kind: (first as { kind?: string } | undefined)?.kind ?? 'unknown',
          description: first?.label ?? 'Seu mascote mudou sutilmente',
        });
        if (hasRareFormTrigger(out.newMicroEvolutions)) {
          void mascotMemoryService.recordMilestone(profile.id, 'rare_form', {
            detail: first?.label,
          });
          enqueueToast({
            kind: 'mutation',
            emoji: '🌟',
            title: 'Forma rara',
            subtitle: first?.label ?? 'Um traço raro apareceu no mascote.',
            rarity: 'rare',
          });
        }
      }

      for (const a of out.unlocks.achievements) enqueueToast({ kind: 'achievement', emoji: a.emoji, title: a.title, subtitle: a.description });
      for (const acc of out.unlocks.accessories) enqueueToast({ kind: 'accessory', emoji: acc.emoji, title: acc.name, subtitle: 'Equipe no Closet' });
      for (const sc of out.unlocks.scenes) enqueueToast({ kind: 'scene', emoji: sc.emoji, title: sc.name, subtitle: 'Cenário desbloqueado' });
      for (const mut of out.newMutations) {
        enqueueToast({
          kind: 'mutation',
          emoji: '✨',
          title: mut.name,
          subtitle: mut.description,
          rarity: mut.rarity === 'common' ? 'common' : mut.rarity,
        });
        creatureMoments.emit('mutation.unlocked', {
          mutationId: mut.id,
          rarity: mut.rarity as 'common' | 'rare' | 'epic' | 'legendary',
        });
      }
      await opts.onReloadCloset();
      if (out.newMutations.length > 0) {
        await opts.onReloadIdentity();
        if (out.mascot.dna) {
          const profileVoice = voiceProfileFromGenome(sanitizeGenome(out.mascot.dna));
          const intensity = out.newMutations[0].rarity === 'legendary' ? 0.95 : 0.75;
          playVoiceLine(profileVoice, { kind: 'celebrate', emotion: intensity });
        }
      }

      // Paywall só se houve PROGRESSO real (XP ganho OU streak milestone OU
      // phaseChange OU unlock). Tap em hábito já completado hoje (0 XP, sem
      // unlock) NUNCA dispara paywall — bug reportado na auditoria 2026-05-27.
      // Combinado com SESSION_COOLDOWN_MS em paywall-triggers, evita interromper
      // user em positive flow state com upsell.
      const madeProgress =
        out.xpGained > 0 ||
        out.streakMilestone ||
        out.phaseChanged ||
        out.leveledUp ||
        out.newMutations.length > 0 ||
        out.unlocks.achievements.length > 0;
      if (madeProgress) {
        await maybeShowPaywall(out.mascot, out.streak);
      }
    },
    [opts, haptic, refreshMascot, refreshStreak, refreshWallet, enqueueToast, maybeShowPaywall],
  );

  const handleUndoCheckin = useCallback(
    async (data: CheckinOutcome | null) => {
      const profile = opts.profile;
      const mascot = opts.mascot;
      if (!profile || !mascot || !data || !data.checkin) return;
      opts.onUndoSet(null);
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
      opts.onFlash('Desfeito', 1200);
    },
    [opts, haptic, refreshMascot, refreshWallet],
  );

  const claimDailyReward = useCallback(
    async (current: { day: number; claimedToday: boolean }, onClaimed: (day: number) => void) => {
      const profile = opts.profile;
      if (!profile || current.claimedToday) return;
      haptic('success');
      const today = todayLocal();
      const claimed = await dailyReward.claim(profile.id, today);
      if (!claimed) return;
      // Defensive bounds: se current_day > DAILY_REWARDS.length, wrap pelo ciclo.
      const idx = Math.max(0, Math.min(DAILY_REWARDS.length - 1, claimed.current_day - 1));
      const reward = DAILY_REWARDS[idx];
      if (!reward) return;
      await walletDb.add(profile.id, reward.coins, reward.gems ?? 0);
      analytics.track('daily_reward_claimed', { day: claimed.current_day });
      await refreshWallet();
      onClaimed(claimed.current_day);
      // Jingle de recompensa: baú no grande prêmio (D7), moedinha nos demais.
      playSfx(reward.isGrand ? 'chest' : 'coin', { enabled: opts.settings?.sfx_enabled !== false });
      opts.onConfetti();
      enqueueToast({
        kind: 'info',
        emoji: reward.isGrand ? '🏆' : reward.gems ? '💎' : '🪙',
        title: `Dia ${claimed.current_day} · +${reward.coins} 🪙${reward.gems ? ` +${reward.gems} 💎` : ''}`,
        subtitle: reward.isGrand ? 'GRANDE PRÊMIO!' : 'Volta amanhã pra mais.',
      });
    },
    [opts, haptic, refreshWallet, enqueueToast],
  );

  const openMysteryBox = useCallback(
    async (boxAvailable: boolean, onOpened: () => void) => {
      const profile = opts.profile;
      const mascot = opts.mascot;
      if (!profile || !boxAvailable) return;
      haptic('success');
      const today = todayLocal();
      const opened = await mysteryBox.open(profile.id, today);
      if (!opened) return;
      analytics.track('mystery_box_opened', {
        total_opened: await mysteryBox.openedCount(profile.id),
      });
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
        // Serializa o XP da caixa pelo MESMO lock per-user do check-in e lê o
        // mascote FRESCO + o XP já ganho hoje. Antes: applyXp(mascot, xp, 0) —
        // o `0` ignorava o cap diário (box dava XP além do teto de 150) e o
        // upsert fora do lock, com `mascot` stale do closure, clobberava o XP
        // de um check-in concorrente. Auditoria 2026-06-11.
        await withLock(`checkin:${profile.id}`, async () => {
          const fresh = (await mascotsDb.forUser(profile.id)) ?? mascot;
          const dailyXpSoFar = await checkinsDb.xpSumToday(profile.id, today);
          const xpBonus = applyXp(fresh, drop.xp!, dailyXpSoFar);
          await mascotsDb.upsert(xpBonus.mascot);
        });
        await refreshMascot();
      }
      await refreshWallet();
      onOpened();
      playSfx('chest', { enabled: opts.settings?.sfx_enabled !== false });
      opts.onConfetti(1500);
      enqueueToast({ kind: 'info', emoji: '🎁', title: 'Caixa surpresa!', subtitle: drop.label });
    },
    [opts, haptic, refreshMascot, refreshWallet, enqueueToast],
  );

  const dismissNightWarning = useCallback(() => undefined, []);

  const completeFirstMissionFlag = useCallback(async () => {
    const profile = opts.profile;
    if (!profile) return;
    await settingsDb.update(profile.id, { first_mission_pending: false } as Record<string, unknown>);
  }, [opts.profile]);

  const refreshComboLevel = useCallback(async () => {
    const profile = opts.profile;
    if (!profile) return 1;
    const c = await comboDb.get(profile.id);
    return c.current;
  }, [opts.profile]);

  return {
    haptic,
    handleCheckin,
    handleUndoCheckin,
    claimDailyReward,
    openMysteryBox,
    dismissNightWarning,
    completeFirstMissionFlag,
    refreshComboLevel,
  };
}

export { createAnimationAction };
