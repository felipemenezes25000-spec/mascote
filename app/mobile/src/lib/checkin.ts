/**
 * Pipeline unificado de check-in.
 * Toda tela que registra um check-in (Home, Breathe, CheckinResult, missões)
 * DEVE passar por aqui — assim o mascote evolui, wallet ganha moedas,
 * streak avança, unlocks disparam e XP cap diário é respeitado.
 */

import {
  checkins as checkinsDb,
  combo as comboDb,
  comboXpBonus,
  dnaMutations,
  mascots as mascotsDb,
  missions as missionsDb,
  notifications,
  todayLocal,
  wallet as walletDb,
  withLock,
  xpEvents,
} from '@/lib/db';
import { applyCheckinToStreak } from '@/lib/streak';
import { processUnlocks } from '@/lib/unlock';
import { logger } from '@/lib/logger';
import { XP_PER_CHECKIN, applyXp, levelFromXp, phaseFromXp } from '@/lib/xp';
import { emergentPhaseLabels } from '@/lib/phaseLabels';
import {
  applyHabitDrift,
  findNewlyUnlockedMutations,
  sanitizeGenome,
  type Mutation,
  type MutationContext,
} from '@/lib/dna';
import type { HabitKind, Mascot, MascotPhase, Mission, Profile, Streak } from '@/types';
import type { MicroEvolution } from '@/game/evolution/EvolutionTypes';

export const COINS_PER_CHECKIN = 5;
export const COINS_PER_MISSION = 15;

export interface CheckinInput {
  profile: Profile;
  mascot: Mascot;
  kind: HabitKind;
  value?: number;
  unit?: string;
  /** XP base — default XP_PER_CHECKIN. Use 25 para mini-jogos como breathe. */
  baseXp?: number;
  /** Moedas — default COINS_PER_CHECKIN. */
  coins?: number;
}

export interface CheckinOutcome {
  /** Mascote APÓS aplicar XP e bônus de streak. Persistido no DB. */
  mascot: Mascot;
  streak: Streak;
  /** XP efetivamente ganho (respeitando daily cap). */
  xpGained: number;
  /** Moedas ganhas. */
  coinsGained: number;
  /** Gemas ganhas (vem de bônus de streak 7d). */
  gemsGained: number;
  /** True se subiu nível neste check-in (incluindo bônus). */
  leveledUp: boolean;
  /** True se mudou de fase neste check-in (incluindo bônus). */
  phaseChanged: boolean;
  prevPhase: MascotPhase;
  /** Resultado de unlocks (achievements/accessories/scenes desbloqueados). */
  unlocks: Awaited<ReturnType<typeof processUnlocks>>;
  /** Streak bate múltiplo de 7? Use para confetti/toast extra. */
  streakMilestone: boolean;
  /**
   * Mutações biológicas DESBLOQUEADAS neste check-in. Vazia na maioria dos
   * casos — só populada quando condições genéticas + hábito + streak alinham.
   * Caller deve enfileirar UnlockToast tipo 'mutation' pra cada item.
   */
  newMutations: Mutation[];
  /** Microevoluções visuais desbloqueadas neste check-in. */
  newMicroEvolutions: MicroEvolution[];
  /**
   * Row do checkin recém-criado (ou existente, se idempotência batia).
   * Null se a inserção falhou silenciosamente.
   * Usado pelo Home pra oferecer "Desfazer" na janela de 15s.
   */
  checkin: Awaited<ReturnType<typeof checkinsDb.add>>;
}

/**
 * Lock por-usuário pra serializar o pipeline INTEIRO de check-in.
 *
 * Sem este lock, dois taps rápidos em paralelo causam double-spend:
 * - Ambos leem `dailyXpSoFar=0` simultaneamente
 * - `idempotency_key` colide → checkinsDb.add dedup só A ROW
 * - Mas wallet.add, xpEvents.add, mascots.upsert rodam 2× cada
 *
 * Resultado real (sem lock): 1 checkin row, 10 moedas, 2× XP events.
 * Com lock: 2ª call lê estado pós-A, computa idempotency_key diferente,
 * trata como check-in legítimo separado (cap diário de XP limita abuso).
 */
export async function applyCheckinFully(input: CheckinInput): Promise<CheckinOutcome> {
  return withLock(`checkin:${input.profile.id}`, () => applyCheckinFullyCore(input));
}

async function applyCheckinFullyCore(input: CheckinInput): Promise<CheckinOutcome> {
  const { profile, mascot, kind } = input;
  const value = input.value ?? 1;
  const unit = input.unit ?? defaultUnit(kind);
  const baseXpInput = input.baseXp ?? XP_PER_CHECKIN;
  const coinsInput = input.coins ?? COINS_PER_CHECKIN;
  const today = todayLocal();

  const dailyXpSoFar = await checkinsDb.xpSumToday(profile.id, today);
  const wasFirstToday = dailyXpSoFar === 0;

  const streakResult = await applyCheckinToStreak(profile.id);

  const comboAfter = await comboDb.bump(profile.id);
  const bonusPct = comboXpBonus(comboAfter.current);

  const baseXp = baseXpInput + (wasFirstToday ? 5 : 0);
  const xpToGive = Math.round(baseXp * (1 + bonusPct / 100));
  const result = applyXp(mascot, xpToGive, dailyXpSoFar);

  const persistedCheckin = await checkinsDb.add({
    user_id: profile.id,
    habit_kind: kind,
    value,
    unit,
    occurred_on: today,
    occurred_at: new Date().toISOString(),
    xp_awarded: result.delta,
    idempotency_key: `${profile.id}-${today}-${kind}-${value}-${dailyXpSoFar}`,
  });

  if (result.delta > 0) {
    await xpEvents.add({
      user_id: profile.id,
      amount: result.delta,
      reason: 'checkin',
      reference: { habit: kind, value },
    });
  }
  await walletDb.add(profile.id, coinsInput, 0);

  let finalMascot = result.mascot;
  let finalLeveled = result.leveledUp;
  let finalPhaseChanged = result.phaseChanged;
  let totalXpGained = result.delta; // inclui o XP do checkin + bônus de streak
  let gems = 0;

  const streakMilestone =
    streakResult.streak.current_streak > 0 && streakResult.streak.current_streak % 7 === 0;

  if (streakMilestone) {
    const bonus = applyXp(result.mascot, 50, dailyXpSoFar + result.delta);
    /* v8 ignore next — bonus.delta=0 só ocorre se streakMilestone disparou
       num dia onde já bateu cap (raro: precisa ser streak%7=0 + 150 XP gasto). */
    if (bonus.delta > 0) {
      await xpEvents.add({
        user_id: profile.id,
        amount: bonus.delta,
        reason: 'streak_bonus',
        reference: { streak: streakResult.streak.current_streak },
      });
    }
    finalMascot = bonus.mascot;
    finalLeveled = finalLeveled || bonus.leveledUp;
    finalPhaseChanged = finalPhaseChanged || bonus.phaseChanged;
    totalXpGained += bonus.delta;
    await walletDb.add(profile.id, 0, 1);
    gems = 1;
  }

  // DRIFT DE DNA: hábito cumprido reforça genes correspondentes.
  // SEMPRE não-negativo (princípio: sem culpa). Pula se mascot é pré-migration.
  if (finalMascot.dna) {
    const driftedDna = applyHabitDrift(sanitizeGenome(finalMascot.dna), {
      habit: kind,
      intensity: 1,
    });
    finalMascot = { ...finalMascot, dna: driftedDna };
  }

  // AVALIAÇÃO DE MUTAÇÕES: após drift, checa se DNA + histórico + streak
  // satisfazem condições de alguma mutação ainda-não-desbloqueada.
  // Desbloqueio é monotônico — vai pra disco e nunca regride.
  //
  // Custo: 1 read de checkins.listAll (já feito no unlock pipeline abaixo;
  // poderia ser compartilhado em refactor futuro) + 1 read de
  // dnaMutations.idsForUser + N writes (geralmente 0-1 mutation por check-in).
  const newMutations: Mutation[] = [];
  if (finalMascot.dna) {
    try {
      const allCheckinsForCount = await checkinsDb.listAll(profile.id);
      const habitCheckinCounts: Partial<Record<HabitKind, number>> = {};
      for (const c of allCheckinsForCount) {
        habitCheckinCounts[c.habit_kind] = (habitCheckinCounts[c.habit_kind] ?? 0) + 1;
      }
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const alreadyUnlocked = await dnaMutations.idsForUser(profile.id);
      const ctx: MutationContext = {
        genome: finalMascot.dna,
        habitCheckinCounts,
        currentStreak: streakResult.streak.current_streak,
        daysSinceCreated,
        alreadyUnlocked,
      };
      const candidates = findNewlyUnlockedMutations(ctx);
      for (const m of candidates) {
        await dnaMutations.unlock(profile.id, m.id);
        newMutations.push(m);
      }
    } catch (err) {
      // mutations é additive layer — falha aqui NÃO bloqueia check-in.
      // Antes era catch totalmente silencioso; agora logamos pra que erros
      // recorrentes em produção (e.g. mutation_id corrompido) sejam visíveis
      // no telemetry sem precisar reproduzir localmente.
      logger.warn('[checkin] mutation eval failed (non-fatal)', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  await mascotsDb.upsert(finalMascot);

  if (finalPhaseChanged) {
    await notifications.add({
      user_id: profile.id,
      kind: 'evolution',
      title: `${finalMascot.name} mudou.`,
      body: `Agora em ${emergentPhaseLabels[finalMascot.phase]}.`,
      payload: { phase: finalMascot.phase },
      read_at: null,
    });
  } else if (finalLeveled) {
    await notifications.add({
      user_id: profile.id,
      kind: 'level_up',
      title: `Nível ${finalMascot.level}`,
      body: `Você fez ${finalMascot.name} subir de nível.`,
      payload: { level: finalMascot.level },
      read_at: null,
    });
  }

  const unlocks = await processUnlocks(profile, finalMascot, streakResult.streak);
  finalMascot = unlocks.mascot;

  // Microevoluções procedurais — camada visual incremental por hábito.
  let newMicroEvolutions: MicroEvolution[] = [];
  try {
    const { buildEvolutionState, processEvolutionAfterCheckin } = await import('@/game/evolution/EvolutionEngine');
    const allCheckins = await checkinsDb.listAll(profile.id);
    const baseState = buildEvolutionState({
      mascot: finalMascot,
      checkins: allCheckins,
      streak: streakResult.streak,
    });
    const { newMicro } = await processEvolutionAfterCheckin(profile.id, baseState);
    newMicroEvolutions = newMicro;
  } catch (err) {
    logger.warn('[checkin] micro-evolution eval failed (non-fatal)', {
      reason: err instanceof Error ? err.message : 'unknown',
    });
  }

  return {
    mascot: finalMascot,
    streak: streakResult.streak,
    xpGained: totalXpGained,
    coinsGained: coinsInput,
    gemsGained: gems,
    leveledUp: finalLeveled,
    phaseChanged: finalPhaseChanged,
    prevPhase: result.prevPhase,
    unlocks,
    streakMilestone,
    newMutations,
    newMicroEvolutions,
    checkin: persistedCheckin,
  };
}

export interface MissionCompletionOutcome {
  mascot: Mascot;
  mission: Mission;
  xpGained: number;
  coinsGained: number;
  leveledUp: boolean;
  phaseChanged: boolean;
  prevPhase: MascotPhase;
  /** True quando o caller chama com um missionId já completed — short-circuit. */
  alreadyCompleted: boolean;
}

/**
 * Pipeline unificado de "marcar missão como feita".
 *
 * Substitui o auto-complete via tap no card da Home (que dava XP sem nenhuma
 * confirmação) + corrige `/mission-done` que mostrava confete sem persistir.
 * Agora ambos os caminhos passam por aqui.
 *
 * Idempotente: se a missão já estiver completed, retorna `alreadyCompleted=true`
 * sem reaplicar XP — evita double-spend se a tela for re-montada (deep link, navegação).
 */
export async function applyMissionCompletion(input: {
  profile: Profile;
  mascot: Mascot;
  mission: Mission;
}): Promise<MissionCompletionOutcome> {
  // Lock por-missão: duas conclusões paralelas da mesma missão (deep-link,
  // re-mount do checkin-result) liam status='pending' do input args e
  // double-spend XP/moedas. Lock força a 2ª call a esperar a 1ª, depois
  // re-busca o status do DB e curto-circuita via alreadyCompleted.
  return withLock(`mission:${input.mission.id}`, () => applyMissionCompletionCore(input));
}

async function applyMissionCompletionCore(input: {
  profile: Profile;
  mascot: Mascot;
  mission: Mission;
}): Promise<MissionCompletionOutcome> {
  const { profile, mascot, mission } = input;
  // Re-busca status do DB pra detectar conclusão que ocorreu enquanto
  // esperávamos o lock (caso input.mission tenha status='pending' stale).
  const fresh = (await missionsDb.list(profile.id)).find(m => m.id === mission.id);
  const effectiveStatus = fresh?.status ?? mission.status;
  if (effectiveStatus === 'completed') {
    return {
      mascot,
      mission: fresh ?? mission,
      xpGained: 0,
      coinsGained: 0,
      leveledUp: false,
      phaseChanged: false,
      prevPhase: mascot.phase,
      alreadyCompleted: true,
    };
  }
  const today = todayLocal();
  const dailyXpSoFar = await checkinsDb.xpSumToday(profile.id, today);
  const result = applyXp(mascot, mission.xp_reward, dailyXpSoFar);
  const completedAt = new Date().toISOString();
  // missions.update retorna void — construímos o row atualizado localmente
  // pra outcome.mission refletir o estado pós-update sem nova leitura.
  await missionsDb.update(mission.id, {
    status: 'completed',
    completed_at: completedAt,
  });
  const updatedMission: Mission = { ...mission, status: 'completed', completed_at: completedAt };
  if (result.delta > 0) {
    await xpEvents.add({
      user_id: profile.id,
      amount: result.delta,
      reason: 'mission',
      reference: { mission: mission.id },
    });
  }
  await mascotsDb.upsert(result.mascot);
  await walletDb.add(profile.id, COINS_PER_MISSION, 0);
  return {
    mascot: result.mascot,
    mission: updatedMission,
    xpGained: result.delta,
    coinsGained: COINS_PER_MISSION,
    leveledUp: result.leveledUp,
    phaseChanged: result.phaseChanged,
    prevPhase: result.prevPhase,
    alreadyCompleted: false,
  };
}

export interface UndoCheckinInput {
  profile: Profile;
  mascot: Mascot;
  /** O check-in retornado por applyCheckinFully (precisa do id e xp_awarded). */
  checkinId: string;
  xpAwarded: number;
  coinsRefund: number;
}

export interface UndoOutcome {
  /** False se o check-in já tinha sido removido (idempotente). */
  removed: boolean;
  /** Mascote após rollback (persistido). */
  mascot: Mascot;
}

/**
 * Desfaz o último check-in: remove o row, subtrai XP do mascote (recalcula
 * level/phase a partir do novo total) e devolve as moedas.
 *
 * Escopo intencional NÃO inclui: streak (per-day, não per-checkin),
 * combo (próximo check-in já recalibra), unlocks (mostly idempotent —
 * desbloquear de novo não custa nada). Janela curta de uso (~15s) é
 * suficiente pra cobrir "ops, cliquei no botão errado" sem virar
 * loophole de farming.
 */
export async function undoLastCheckin(input: UndoCheckinInput): Promise<UndoOutcome> {
  const removed = await checkinsDb.remove(input.checkinId);
  if (!removed) return { removed: false, mascot: input.mascot };

  // Recomputa o estado do mascote a partir do que sobrou: xp - xpAwarded,
  // level/phase derivados do novo xp. Não devolve energy (UX neutra).
  const newXp = Math.max(0, input.mascot.xp - input.xpAwarded);
  const rolled: Mascot = {
    ...input.mascot,
    xp: newXp,
    level: levelFromXp(newXp),
    phase: phaseFromXp(newXp),
    last_seen_at: new Date().toISOString(),
  };
  await mascotsDb.upsert(rolled);
  // Devolve moedas (spend permite negativo via add com valor negativo? Não.
  // Usa walletDb.add com valor negativo se suportar, senão soma manual).
  if (input.coinsRefund > 0) {
    await walletDb.add(input.profile.id, -input.coinsRefund, 0);
  }
  return { removed: true, mascot: rolled };
}

export function defaultUnit(kind: HabitKind): string {
  switch (kind) {
    case 'water':
      return 'cups';
    case 'sleep':
      return 'hours';
    case 'exercise':
    case 'meditation':
    case 'breath':
      return 'minutes';
    case 'reading':
      return 'pages';
    case 'journaling':
      return 'entries';
    case 'outdoor':
    case 'sun':
      return 'minutes';
    default:
      return '';
  }
}
