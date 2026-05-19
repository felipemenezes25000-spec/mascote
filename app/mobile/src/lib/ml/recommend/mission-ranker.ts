/**
 * Mission ranker: combina bandit (taxa de sucesso histórica) + contexto
 * (hora do dia, mood, hábito faltando) pra rankear missões.
 *
 * Output: missão ordenadas por score; primeira é a "melhor aposta agora".
 */

import { missionCatalog, type MissionTemplate } from '@/content/missions';
import type { BanditState } from './bandit';
import { estimatedRate, selectArm } from './bandit';
import type { HabitKind, MascotMood, Personality } from '@/types';

export interface RankingContext {
  personality: Personality;
  /** Mood atual do user (espelho). */
  mood: MascotMood;
  /** Hora local 0..23 — algumas missões fazem mais sentido em horários. */
  hour: number;
  /** Hábitos JÁ feitos hoje (não sugerir de novo). */
  doneToday: Set<HabitKind>;
  /** Hábitos que o user EVITA (low completion histórica). */
  avoidHabits?: Set<HabitKind>;
}

/** Filtros contextuais: que missões são apropriadas AGORA. */
function isContextAppropriate(t: MissionTemplate, ctx: RankingContext): boolean {
  // Não repete hábito já feito hoje
  if (ctx.doneToday.has(t.habit_kind)) return false;
  // Sleep só faz sentido à noite (≥18h)
  if (t.habit_kind === 'sleep' && ctx.hour < 18) return false;
  // Sol só faz sentido de dia (8-17h, intervalos fechados para simetria com sleep `< 18`)
  if (t.habit_kind === 'sun' && (ctx.hour < 8 || ctx.hour >= 18)) return false;
  // Outdoor / exercise: evitar madrugada (0-5h). Antes o range era `>= 1 && < 5`
  // que permitia 0h (meia-noite), claramente madrugada também — bug de borda.
  if ((t.habit_kind === 'outdoor' || t.habit_kind === 'exercise') && ctx.hour < 5) {
    return false;
  }
  // Em mood triste/exausto, evita exercise pesado
  if (
    (ctx.mood === 'triste' || ctx.mood === 'exausto') &&
    t.habit_kind === 'exercise' &&
    t.xp_reward >= 40
  ) {
    return false;
  }
  return true;
}

/** Score contextual extra (somado ao bandit). */
function contextualBonus(t: MissionTemplate, ctx: RankingContext): number {
  let bonus = 0;
  // Match com personalidade preferida do template
  if (t.preferred_personalities.includes(ctx.personality)) bonus += 0.2;
  // Mood-fit:
  if (ctx.mood === 'triste' || ctx.mood === 'exausto') {
    if (t.habit_kind === 'breath' || t.habit_kind === 'meditation' || t.habit_kind === 'sleep') {
      bonus += 0.25;
    }
  }
  if (ctx.mood === 'empolgado' || ctx.mood === 'feliz') {
    if (t.habit_kind === 'exercise' || t.habit_kind === 'outdoor') bonus += 0.15;
  }
  if (ctx.avoidHabits?.has(t.habit_kind)) bonus -= 0.15;
  return bonus;
}

export interface RankedMission {
  template: MissionTemplate;
  score: number;
  /** Decomposição pra debug/explainability */
  banditRate: number;
  contextBonus: number;
}

/**
 * Rankeia missões combinando bandit + contexto. Os top N podem ser
 * passados pro Thompson Sampling pra escolha final.
 */
export function rankMissions(
  bandit: BanditState,
  ctx: RankingContext
): RankedMission[] {
  const appropriate = missionCatalog.filter(t => isContextAppropriate(t, ctx));
  const ranked: RankedMission[] = appropriate.map(t => {
    const arm = bandit.arms.get(t.id);
    const banditRate = arm ? estimatedRate(arm) : 0.5; // prior neutro
    const contextBonus = contextualBonus(t, ctx);
    return { template: t, score: banditRate + contextBonus, banditRate, contextBonus };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/**
 * Escolha final: top K via score, então Thompson Sampling entre eles pra
 * manter exploração. Garante que missões mal-explored ainda aparecem.
 */
export function pickMissionWithBandit(
  bandit: BanditState,
  ctx: RankingContext,
  topK = 5,
  rng: () => number = Math.random
): MissionTemplate | null {
  const ranked = rankMissions(bandit, ctx);
  if (ranked.length === 0) return null;
  const top = ranked.slice(0, topK);
  const chosenId = selectArm(bandit, top.map(r => r.template.id), rng);
  /* v8 ignore next — selectArm retorna null apenas com array vazio; passamos
     top.length > 0 garantido pelo `if (ranked.length === 0)` acima. Guard. */
  if (!chosenId) return top[0].template;
  /* v8 ignore next — fallback `?? top[0].template` cobre o caso onde
     chosenId não está em top (impossível: vem da própria lista). */
  return top.find(r => r.template.id === chosenId)?.template ?? top[0].template;
}
