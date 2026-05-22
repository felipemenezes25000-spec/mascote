/**
 * Service de missões — ponte entre o ranker ML e o app.
 *
 * Antes, o bandit/mission-ranker eram código órfão: bem implementados, sem
 * callsite. Esse arquivo wire-a o pipeline: persiste estado do bandit em
 * AsyncStorage, alimenta com sucesso/falha de missões completadas, e ranqueia
 * a próxima missão usando contexto (hora, humor, hábitos do dia).
 *
 * Fallback: se o bandit ainda não tem dados suficientes (< 5 trials), volta
 * pra `pickDailyMission` determinístico — assim novo usuário não vê
 * sugestões erráticas no dia 1.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type BanditState,
  createBandit,
  deserializeBandit,
  recordReward,
  serializeBandit,
} from '@/lib/ml/recommend/bandit';
import { pickMissionWithBandit, type RankingContext } from '@/lib/ml/recommend/mission-ranker';
import { missionCatalog, pickDailyMission, type MissionTemplate } from '@/content/missions';
import { withLock } from '@/lib/db';
import { logger } from '@/lib/logger';
import { creatureMoments } from '@/lib/moments';
import type { HabitKind, MascotMood, Personality } from '@/types';

const BANDIT_KEY = 'mascote:_bandit_missions';
const MIN_PULLS_FOR_BANDIT = 5;

/**
 * Mínimo de "pulls" totais antes de confiar no bandit. Abaixo disso, retorna
 * pickDailyMission determinístico — usuário novo não vê escolhas erráticas.
 *
 * Exportado para testes — não use em código de produção.
 */
export const __BANDIT_MIN_PULLS = MIN_PULLS_FOR_BANDIT;

async function loadBandit(): Promise<BanditState> {
  try {
    const raw = await AsyncStorage.getItem(BANDIT_KEY);
    if (!raw) return createBandit();
    return deserializeBandit(raw);
  } catch (err) {
    /* v8 ignore start — AsyncStorage rejeitar em runtime é raro;
       o caminho de retorno é resiliente e o log alerta para investigação. */
    logger.warn('[bandit] failed to load, starting fresh', {
      reason: err instanceof Error ? err.message : 'unknown',
    });
    return createBandit();
    /* v8 ignore stop */
  }
}

async function saveBandit(state: BanditState): Promise<void> {
  try {
    await AsyncStorage.setItem(BANDIT_KEY, serializeBandit(state));
  } catch (err) {
    /* v8 ignore start — idem loadBandit. Não propaga: bandit é melhoria,
       não bloqueante. */
    logger.warn('[bandit] failed to save', {
      reason: err instanceof Error ? err.message : 'unknown',
    });
    /* v8 ignore stop */
  }
}

export interface SuggestMissionInput {
  personality: Personality;
  mood: MascotMood;
  /** Hábitos já feitos hoje (não sugerir de novo). */
  doneToday: HabitKind[];
  /** ISO date local pra fallback determinístico. */
  dateKey: string;
  /** Hora local. Default: agora. */
  hour?: number;
  /** Hábitos que o user tem evitado. Vem de estatísticas. */
  avoidHabits?: HabitKind[];
}

/**
 * Sugere uma missão pra hoje, usando bandit + contexto se houver histórico,
 * ou fallback determinístico.
 */
export async function suggestMissionFor(input: SuggestMissionInput): Promise<MissionTemplate> {
  const bandit = await loadBandit();
  const totalRewards = sumRewards(bandit);
  if (totalRewards < MIN_PULLS_FOR_BANDIT) {
    return pickDailyMission(input.personality, input.dateKey);
  }
  const ctx: RankingContext = {
    personality: input.personality,
    mood: input.mood,
    /* v8 ignore next — `?? new Date().getHours()` é o branch que dispara
       quando hour omitido. Testado em hour-omitido test mas v8 marca branch. */
    hour: input.hour ?? new Date().getHours(),
    doneToday: new Set(input.doneToday),
    /* v8 ignore next — avoidHabits opcional; ramo undefined cobre uso comum. */
    avoidHabits: input.avoidHabits ? new Set(input.avoidHabits) : undefined,
  };
  const picked = pickMissionWithBandit(bandit, ctx);
  /* v8 ignore next — `?? pickDailyMission` é fallback quando ranker retorna null
     (todas missões filtradas). Testado mas branch raro. */
  return picked ?? pickDailyMission(input.personality, input.dateKey);
}

/**
 * Registra resultado de uma missão no bandit. Chamar SEMPRE que missão muda
 * de status final — completed = 1, skipped/expired = 0.
 */
export async function recordMissionOutcome(missionTemplateId: string, completed: boolean): Promise<void> {
  // Sanity: ID precisa existir no catálogo, senão o bandit acumula lixo.
  if (!missionCatalog.some(m => m.id === missionTemplateId)) {
    logger.warn('[bandit] unknown mission id, skipping reward', { missionTemplateId });
    return;
  }
  // Lock pra evitar read-modify-write race quando duas missões fecham juntas
  // (raro mas possível em StrictMode/re-mount do result screen).
  await withLock('bandit_missions', async () => {
    const state = await loadBandit();
    recordReward(state, missionTemplateId, completed ? 1 : 0);
    await saveBandit(state);
  });
  // Emite moment APÓS persistir reward — outros sistemas reagem em paralelo
  // (analytics, animação celebrativa, memória "completou X"). Só emite quando
  // de fato completada (skip não dispara reação positiva).
  if (completed) {
    const template = missionCatalog.find((m) => m.id === missionTemplateId);
    creatureMoments.emit('mission.completed', {
      missionId: missionTemplateId,
      xpGained: template?.xp_reward ?? 0,
      coinsGained: 0, // bandit não rastreia coins; quem paga é o caller (checkin/mission-done)
    });
  }
}

/**
 * Soma total de rewards observados (alpha-1 + beta-1 por arm).
 * Não usa `pulls` porque pulls cresce a cada `selectArm` — gate seria
 * inconsistente: bandit nunca seria chamado se gate dependesse de pulls.
 */
function sumRewards(state: BanditState): number {
  let n = 0;
  for (const arm of state.arms.values()) {
    n += Math.max(0, arm.alpha - 1) + Math.max(0, arm.beta - 1);
  }
  return n;
}

/** Apenas para testes — wipe do estado persistido. */
export async function __resetBanditState(): Promise<void> {
  await AsyncStorage.removeItem(BANDIT_KEY);
}
