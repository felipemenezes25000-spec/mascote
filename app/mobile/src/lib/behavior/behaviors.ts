/**
 * Behaviors básicos — 3 do scaffold inicial.
 *
 * Cada behavior segue o contrato em ./types.ts:
 *  - score(ctx): número [0,1]
 *  - execute(ctx): retorna BehaviorEffect
 *
 * **Adicionar novos**: criar entrada, adicionar em DEFAULT_BEHAVIORS.
 *  Manter score em [0, 1] e respeitar princípio "wellness, sem cobrança".
 */

import type { Behavior, BehaviorContext, BehaviorEffect } from './types';
import {
  reactiveReturnAfterAbsence,
  reactivePet,
  reactivePostCheckin,
  reactiveMissionComplete,
  reactiveHabitMissed,
  reactiveStreakRisk,
} from './reactiveBehaviors';

// ============================================================================
// idle_breath — sempre roda quando nada melhor está acontecendo
// ============================================================================
// É o "respira fundo" baseline. Score baixo (0.1) pra perder pra qualquer
// behavior contextual. Cooldown curto pra repetir periodicamente.
export const idleBreath: Behavior = {
  id: 'idle.breath',
  kind: 'idle',
  cooldownSeconds: 12,
  score: () => 0.1,
  execute: (): BehaviorEffect => ({
    animation: 'breath_deep',
  }),
};

// ============================================================================
// react_to_return — usuário voltou depois de >24h sem interagir
// ============================================================================
// Score alto (0.85) pra vencer idle. Mas cooldown longo (12h) pra não
// repetir "fiquei aqui" cada toque depois do retorno.
export const reactToReturn: Behavior = {
  id: 'reactive.return',
  kind: 'reactive',
  cooldownSeconds: 12 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    // Só dispara se já passou pelo menos 24h sem interação
    if (ctx.hoursSinceLastInteraction < 24) return 0;
    // Quanto mais tempo, mais "warm" a reação (cap em 72h)
    const days = Math.min(3, ctx.hoursSinceLastInteraction / 24);
    return 0.7 + days * 0.1; // 0.7..1.0
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => {
    const days = Math.floor(ctx.hoursSinceLastInteraction / 24);
    // Tom adaptativo: 1 dia neutro, 3+ dias mais caloroso. Sem cobrança.
    const msg =
      days >= 3 ? 'Bom te ver de novo. Fiquei aqui no meu ritmo.'
      : days >= 2 ? 'Senti sua ausência um pouquinho. Tudo certo?'
      :             'Fiquei aqui, no meu canto. Bom te ver.';
    return {
      animation: 'wander',
      message: msg,
    };
  },
};

// ============================================================================
// streak_milestone — streak bateu múltiplo de 7
// ============================================================================
// Score 1.0 (must-fire) quando streak%7==0 e ainda não rodou hoje. Cooldown
// 24h pra não repetir no mesmo dia.
export const streakMilestone: Behavior = {
  id: 'milestone.streak_7',
  kind: 'milestone',
  cooldownSeconds: 24 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.streakCurrent <= 0) return 0;
    if (ctx.streakCurrent % 7 !== 0) return 0;
    return 1.0;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => {
    const weeks = Math.floor(ctx.streakCurrent / 7);
    // Tom celebrativo escala com a magnitude — 1 sem (calmo) → 4+ sem (eufórico)
    const msg = weeks === 1
      ? 'Sete dias seguidos. Você apareceu cada dia.'
      : weeks <= 4
      ? `${weeks * 7} dias. Algo na sua rotina virou ritmo.`
      : `${weeks * 7} dias. Isso aqui virou um pedacinho de você.`;
    return {
      animation: 'celebrate',
      message: msg,
    };
  },
};

// ============================================================================
// quiet_observation — hora silenciosa (>22h ou <6h)
// ============================================================================
// Score médio (0.5) — só dispara se idle perdesse. Postura mais introspectiva
// no horário de descanso. Cooldown curto pra repetir alguns ciclos por noite.
export const quietObservation: Behavior = {
  id: 'temporal.quiet_observation',
  kind: 'temporal',
  cooldownSeconds: 60 * 60,
  score: (ctx: BehaviorContext) => {
    // Faixas: 22h-5h
    if (ctx.hour >= 22 || ctx.hour < 6) return 0.5;
    return 0;
  },
  execute: (): BehaviorEffect => ({
    animation: 'rest',
  }),
};

function isNightHour(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

function isMorningHour(hour: number): boolean {
  return hour >= 6 && hour < 10;
}

/**
 * yawn — bocejo leve quando energia baixa e sem reduce motion.
 */
export const yawnIdle: Behavior = {
  id: 'idle.yawn',
  kind: 'idle',
  cooldownSeconds: 5 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.reduceMotion) return 0.12;
    if (ctx.mascot.energy > 45) return 0;
    return isNightHour(ctx.hour) ? 0.58 : 0.42;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => ({
    animation: ctx.reduceMotion ? 'breath_deep' : 'rest',
    message: 'Deu um bocejo por aqui.',
  }),
};

/**
 * look_around — observação autônoma em períodos neutros.
 */
export const lookAround: Behavior = {
  id: 'idle.look_around',
  kind: 'idle',
  cooldownSeconds: 4 * 60,
  score: (ctx: BehaviorContext) => {
    if (isNightHour(ctx.hour)) return 0.2;
    return ctx.mascot.energy >= 35 ? 0.34 : 0.18;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => ({
    animation: ctx.reduceMotion ? 'breath_deep' : 'observe',
  }),
};

/**
 * explore — deslocamento leve quando energia está ok.
 */
export const exploreIdle: Behavior = {
  id: 'idle.explore',
  kind: 'idle',
  cooldownSeconds: 6 * 60,
  score: (ctx: BehaviorContext) => {
    if (isNightHour(ctx.hour)) return 0;
    if (ctx.mascot.energy < 55) return 0;
    if (ctx.mood === 'triste' || ctx.mood === 'exausto') return 0;
    return 0.46;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => ({
    animation: ctx.reduceMotion ? 'observe' : 'wander',
  }),
};

/**
 * rest — desacelera no fim do dia ou energia mais baixa.
 */
export const restIdle: Behavior = {
  id: 'idle.rest',
  kind: 'idle',
  cooldownSeconds: 7 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.mascot.energy <= 35) return 0.62;
    if (ctx.hour >= 19 || ctx.hour < 7) return 0.44;
    return 0.18;
  },
  execute: (): BehaviorEffect => ({
    animation: 'rest',
  }),
};

/**
 * sleep_at_night — prioridade alta durante madrugada em baixa energia.
 */
export const sleepAtNight: Behavior = {
  id: 'temporal.sleep_at_night',
  kind: 'temporal',
  cooldownSeconds: 2 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (!isNightHour(ctx.hour)) return 0;
    if (ctx.mascot.energy > 60 && ctx.mood !== 'exausto') return 0.2;
    return 0.74;
  },
  execute: (): BehaviorEffect => ({
    animation: 'rest',
    message: 'Entrei no modo descanso.',
  }),
};

/**
 * wake_morning — despertar suave nas primeiras horas do dia.
 */
export const wakeMorning: Behavior = {
  id: 'temporal.wake_morning',
  kind: 'temporal',
  cooldownSeconds: 8 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (!isMorningHour(ctx.hour)) return 0;
    if (ctx.mood === 'exausto') return 0.28;
    return 0.52;
  },
  execute: (): BehaviorEffect => ({
    animation: 'observe',
    message: 'Acordei devagar por aqui.',
  }),
};

/**
 * observe_user — reforça presença após retorno recente do usuário.
 */
export const observeUser: Behavior = {
  id: 'reactive.observe_user',
  kind: 'reactive',
  cooldownSeconds: 20 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.hoursSinceLastInteraction > 3) return 0;
    if (ctx.reactiveFlags?.pet || ctx.reactiveFlags?.postCheckin) return 0.68;
    return 0.36;
  },
  execute: (ctx: BehaviorContext): BehaviorEffect => ({
    animation: ctx.reduceMotion ? 'breath_deep' : 'observe',
    message: 'Tô te observando com carinho.',
  }),
};

// ============================================================================
// DNA-DRIVEN BEHAVIORS — score escala com traits do genoma da criatura
// ============================================================================
// Provam que o engine SUPORTA comportamentos diferenciados por personalidade
// genética. Criatura com socialEnergy alto comporta-se diferente de uma com
// intelligence dominante — score por gene faz behaviors competirem de formas
// distintas no mesmo contexto temporal/streak.

/**
 * social_burst — criaturas com alta socialEnergy expressam mais espalhamento.
 * Cooldown médio pra que apareça periodicamente em criaturas sociáveis sem
 * sobrepor a tudo.
 */
export const expressSocialBurst: Behavior = {
  id: 'dna.social_burst',
  kind: 'reactive',
  cooldownSeconds: 8 * 60,
  score: (ctx: BehaviorContext) => {
    // Score linear no socialEnergy: gene 0.8 → score 0.4; gene 0.95 → score 0.475.
    // Cap em 0.5 pra não vencer milestones (1.0) nem react_to_return (>=0.7).
    return Math.min(0.5, ctx.genome.socialEnergy * 0.5);
  },
  execute: (): BehaviorEffect => ({
    animation: 'wander',
    message: 'Algo dentro dela queria sair pro mundo.',
  }),
};

/**
 * quiet_contemplation — criaturas com alta intelligence + discipline
 * preferem observar a reagir. Score combinado dos 2 traits.
 */
export const quietContemplation: Behavior = {
  id: 'dna.quiet_contemplation',
  kind: 'reactive',
  cooldownSeconds: 10 * 60,
  score: (ctx: BehaviorContext) => {
    // Só dispara se AMBOS os traits são salientes (>= 0.6).
    // Sem essa condição estrita, criatura com inteligência alta mas
    // disciplina baixa engatilharia "contemplação" sem fazer sentido.
    if (ctx.genome.intelligence < 0.6) return 0;
    if (ctx.genome.discipline < 0.6) return 0;
    const combined = (ctx.genome.intelligence + ctx.genome.discipline) / 2;
    return Math.min(0.45, combined * 0.5);
  },
  execute: (): BehaviorEffect => ({
    animation: 'observe',
  }),
};

// ============================================================================
// CONTEXTUAL BEHAVIORS — reagem a estado emocional / temporal específico
// ============================================================================
// Adicionados em DLI-v4 pra dar mais "vida" — mascote responde a manhã, noite,
// volta curta, e humor recente. Cooldowns calibrados pra não inflar UI.

/**
 * morning_greeting — saudação suave entre 6h e 10h. Cooldown 12h pra
 * disparar uma vez por dia. Score moderado (0.4) — perde pra milestones.
 */
export const morningGreeting: Behavior = {
  id: 'temporal.morning_greeting',
  kind: 'temporal',
  cooldownSeconds: 12 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.hour < 6 || ctx.hour > 10) return 0;
    return 0.4;
  },
  execute: (): BehaviorEffect => ({
    animation: 'wander',
    message: 'Bom dia. Cheguei junto.',
  }),
};

/**
 * evening_calm — wind down pós 19h até 22h (antes do quiet_observation
 * noturno em 22h-5h tomar o lugar). Tom mais introspectivo. Cooldown 18h.
 */
export const eveningCalm: Behavior = {
  id: 'temporal.evening_calm',
  kind: 'temporal',
  cooldownSeconds: 18 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.hour < 19 || ctx.hour >= 22) return 0;
    return 0.35;
  },
  execute: (): BehaviorEffect => ({
    animation: 'rest',
    message: 'Tá quase descansando o dia.',
  }),
};

/**
 * gentle_return — usuário voltou após ausência CURTA (4-24h). Diferente
 * do reactToReturn (>24h, tom mais saudoso); este é leve e quase
 * imperceptível. Cooldown 4h pra não disparar a cada tab switch.
 */
export const gentleReturn: Behavior = {
  id: 'reactive.gentle_return',
  kind: 'reactive',
  cooldownSeconds: 4 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    if (ctx.hoursSinceLastInteraction < 4) return 0;
    if (ctx.hoursSinceLastInteraction >= 24) return 0; // longo é o reactToReturn
    return 0.55;
  },
  execute: (): BehaviorEffect => ({
    animation: 'wander',
    message: 'Olha quem voltou.',
  }),
};

/**
 * mood_recovery_cheer — se mood atual é alegre, mas há histórico recente
 * de sad streaks, celebra a recuperação sem ser invasivo. Cooldown 24h.
 * (Caller pode preencher cooldownActive baseado em métricas reais; aqui o
 * score já filtra por mood + sem assumir histórico explícito.)
 */
export const moodRecoveryCheer: Behavior = {
  id: 'reactive.mood_recovery',
  kind: 'reactive',
  cooldownSeconds: 24 * 60 * 60,
  score: (ctx: BehaviorContext) => {
    // Só dispara se mood é positivo NOW e DNA tem alguma emotionalDepth
    // pra ela "perceber" o contraste
    if (ctx.mood !== 'feliz' && ctx.mood !== 'empolgado') return 0;
    if (ctx.genome.emotionalDepth < 0.5) return 0;
    return 0.6;
  },
  execute: (): BehaviorEffect => ({
    animation: 'celebrate',
    message: 'A energia hoje tá diferente. Eu sinto.',
  }),
};

/**
 * Conjunto default de behaviors. Engine consome esta lista.
 * Ordem importa em caso de tie (first wins): milestones > reactive > temporal > idle.
 */
export const DEFAULT_BEHAVIORS: readonly Behavior[] = [
  reactivePet,            // 0.95 moment/gesture pet
  reactivePostCheckin,    // 0.9 pós check-in
  reactiveMissionComplete,// 0.92 missão/gesture double
  reactiveReturnAfterAbsence, // 0.85+ retorno simulação
  reactiveHabitMissed,    // 0.82 hábito perdido offline
  streakMilestone,        // 1.0 must-fire
  reactToReturn,          // 0.7-1.0 ausência longa (>24h)
  reactiveStreakRisk,     // 0.78 streak em risco
  observeUser,            // 0.36-0.68 presença reativa curta
  moodRecoveryCheer,      // 0.6 humor positivo + depth
  sleepAtNight,           // 0.2-0.74 madrugada/energia
  wakeMorning,            // 0.28-0.52 despertar manhã
  gentleReturn,           // 0.55 ausência curta (4-24h)
  expressSocialBurst,     // 0-0.5 DNA-driven
  quietContemplation,     // 0-0.45 DNA-driven
  yawnIdle,               // 0.12-0.58 bocejo autônomo
  exploreIdle,            // 0-0.46 exploração leve
  lookAround,             // 0.18-0.34 observação neutra
  restIdle,               // 0.18-0.62 desacelera
  morningGreeting,        // 0.4 manhã (6-10h)
  eveningCalm,            // 0.35 noite cedo (19-22h)
  quietObservation,       // 0.5 madrugada (22-5h)
  idleBreath,             // 0.1 baseline
];
