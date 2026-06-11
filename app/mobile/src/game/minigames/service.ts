import { analytics } from '@/analytics';
import {
  checkins as checkinsDb,
  mascots as mascotsDb,
  minigamePlays,
  todayLocal,
  wallet as walletDb,
  withLock,
  xpEvents,
} from '@/lib/db';
import { applyXp, clampMascotPhaseForTier, phaseRank } from '@/lib/xp';
import { subscriptionService } from '@/services/subscription';
import type { Mascot, Profile } from '@/types';
import {
  getMinigame,
  MINIGAME_COINS_MAX,
  MINIGAME_XP_MAX,
  REWARDED_PLAYS_PER_DAY_FREE,
  REWARDED_PLAYS_PER_DAY_PLUS,
} from './registry';

export interface MinigameOutcome {
  mascot: Mascot;
  coinsEarned: number;
  xpEarned: number;
  /** false = partida além do cap diário (jogou por diversão). */
  rewarded: boolean;
  /** Partidas recompensadas restantes hoje neste jogo. */
  rewardedPlaysLeft: number;
  leveledUp: boolean;
  phaseChanged: boolean;
}

/**
 * Conclui uma partida e paga recompensas com as MESMAS garantias do
 * pipeline de missão (src/lib/checkin.ts):
 *
 *  - Lock `checkin:${userId}`: serializa contra check-ins e missões
 *    concorrentes — sem lost-update de XP (auditoria 2026-05-27).
 *  - Mascote FRESCO lido dentro do lock (input pode ser snapshot stale).
 *  - XP via applyXp → respeita o cap diário global de 150 XP.
 *  - Cap de partidas recompensadas decidido pelo retorno ATÔMICO do
 *    increment (sem TOCTOU): além do cap, zero recompensa, sem punição.
 */
export async function completeMinigame(input: {
  profile: Profile;
  mascot: Mascot;
  gameId: string;
  /** Score normalizado 0..1 (cada jogo calcula o seu). */
  score: number;
  durationMs: number;
}): Promise<MinigameOutcome> {
  const { profile, gameId } = input;
  const meta = getMinigame(gameId);
  if (!meta) throw new Error(`[minigames] jogo desconhecido: ${gameId}`);
  // Sanitiza score: NaN/Infinity → 0; clamp [0,1].
  const safeScore = Number.isFinite(input.score)
    ? Math.max(0, Math.min(1, input.score))
    : 0;

  return withLock(`checkin:${profile.id}`, async () => {
    const today = todayLocal();
    const tier = await subscriptionService.getCurrentTier(profile.id);
    const cap = tier === 'free' ? REWARDED_PLAYS_PER_DAY_FREE : REWARDED_PLAYS_PER_DAY_PLUS;
    const playCount = await minigamePlays.increment(profile.id, today, gameId);
    const rewarded = playCount <= cap;
    const rewardedPlaysLeft = Math.max(0, cap - playCount);

    const baseMascot = (await mascotsDb.forUser(profile.id)) ?? input.mascot;
    if (!rewarded) {
      analytics.track('minigame_completed', {
        game_id: gameId,
        score: safeScore,
        duration_ms: input.durationMs,
        coins_earned: 0,
        xp_earned: 0,
        rewarded: false,
      });
      return {
        mascot: baseMascot,
        coinsEarned: 0,
        xpEarned: 0,
        rewarded: false,
        rewardedPlaysLeft,
        leveledUp: false,
        phaseChanged: false,
      };
    }

    // Recompensa escala com o score: piso de 30% pra partida concluída
    // (microvitória sempre conta), teto no máximo do jogo.
    const fraction = 0.3 + 0.7 * safeScore;
    const coins = Math.round(MINIGAME_COINS_MAX * fraction);
    const xpRaw = Math.round(MINIGAME_XP_MAX * fraction);

    const dailyXpSoFar = await checkinsDb.xpSumToday(profile.id, today);
    const result = applyXp(baseMascot, xpRaw, dailyXpSoFar);
    const tierCapped = clampMascotPhaseForTier(result.mascot, tier);
    const tierPhaseChanged = phaseRank(tierCapped.phase) > phaseRank(result.prevPhase);

    if (result.delta > 0) {
      await xpEvents.add({
        user_id: profile.id,
        amount: result.delta,
        reason: 'minigame',
        reference: { game: gameId, score: safeScore },
      });
    }
    await mascotsDb.upsert(tierCapped);
    await walletDb.add(profile.id, coins, 0);

    analytics.track('minigame_completed', {
      game_id: gameId,
      score: safeScore,
      duration_ms: input.durationMs,
      coins_earned: coins,
      xp_earned: result.delta,
      rewarded: true,
    });

    return {
      mascot: tierCapped,
      coinsEarned: coins,
      xpEarned: result.delta,
      rewarded: true,
      rewardedPlaysLeft,
      leveledUp: result.leveledUp,
      phaseChanged: tierPhaseChanged,
    };
  });
}

/** Quantas partidas recompensadas restam hoje (pra UI do hub). */
export async function rewardedPlaysLeftToday(
  userId: string,
  gameId: string,
): Promise<number> {
  const today = todayLocal();
  const [tier, row] = await Promise.all([
    subscriptionService.getCurrentTier(userId),
    minigamePlays.get(userId, today),
  ]);
  const cap = tier === 'free' ? REWARDED_PLAYS_PER_DAY_FREE : REWARDED_PLAYS_PER_DAY_PLUS;
  const played = Number.isFinite(row.rewarded_plays[gameId])
    ? Math.max(0, Math.floor(row.rewarded_plays[gameId]))
    : 0;
  return Math.max(0, cap - played);
}
