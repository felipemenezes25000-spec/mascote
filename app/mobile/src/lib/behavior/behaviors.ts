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

/**
 * Conjunto default de behaviors. Engine consome esta lista.
 * Ordem importa em caso de tie (first wins): milestones > reactive > temporal > idle.
 */
export const DEFAULT_BEHAVIORS: readonly Behavior[] = [
  streakMilestone,        // 1.0 must-fire
  reactToReturn,          // 0.7-1.0 ausência
  expressSocialBurst,     // 0-0.5 DNA-driven
  quietContemplation,     // 0-0.45 DNA-driven
  quietObservation,       // 0.5 noite
  idleBreath,             // 0.1 baseline
];
