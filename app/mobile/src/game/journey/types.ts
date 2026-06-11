import type { BillingTierId } from '@/content/billing';

/**
 * Jornada de 100 fases / 10 mundos — camada de progressão granular POR CIMA
 * do XP existente (src/lib/xp.ts).
 *
 * Princípio inviolável: a fase da jornada é FUNÇÃO PURA do XP cumulativo do
 * mascote. Não existe contador paralelo que possa dessincronizar — o único
 * estado novo é o ponteiro de "última fase com recompensa resgatada"
 * (idempotência), em src/lib/db/journey.ts.
 *
 * Isso herda de graça toda a blindagem do pipeline de check-in: cap diário
 * de XP, sanitização NaN, monotonicidade de fase, locks por usuário.
 */

export type JourneyRewardKind =
  | 'coins'
  | 'gems'
  | 'chest'
  | 'title'
  | 'minigame';

export interface JourneyReward {
  kind: JourneyRewardKind;
  /** Moedas concedidas (todas as recompensas têm pelo menos coins). */
  coins: number;
  /** Gemas concedidas (raras — marcos e baús). */
  gems: number;
  /** Título honorífico (apenas kind='title', fim de mundo). */
  title?: string;
  /** ID de minigame desbloqueado (apenas kind='minigame'). */
  minigameId?: string;
  /** Rótulo curto exibido na UI ("Baú especial", "+25 moedas"). */
  label: string;
}

export interface WorldMeta {
  /** 1..10 */
  id: number;
  name: string;
  emoji: string;
  /** Tema/identidade do mundo, uma linha. */
  theme: string;
  /** Frase de entrada no mundo (copy emocional). */
  intro: string;
  /** Tint de identidade visual (hex) — usado em badges/cards. */
  hue: string;
  /** Primeira e última fase (inclusive). */
  firstPhase: number;
  lastPhase: number;
  /**
   * Mundos 9-10: resgate de recompensas requer entitlement 'premium'.
   * XP continua acumulando pra todos — assinar depois resgata retroativo.
   */
  premium: boolean;
}

export interface JourneyPhase {
  /** 1..100 */
  n: number;
  worldId: number;
  /** XP cumulativo necessário pra ALCANÇAR esta fase. Fase 1 = 0. */
  xp: number;
  /** Nome curto da fase ("Primeiro brilho", "Chama constante"...). */
  title: string;
  reward: JourneyReward;
}

export interface JourneyProgress {
  phase: JourneyPhase;
  world: WorldMeta;
  /** null quando phase.n === 100. */
  nextPhase: JourneyPhase | null;
  /** XP acumulado dentro da fase atual. */
  xpIntoPhase: number;
  /** XP total necessário pra próxima fase (0 quando n=100). */
  xpNeededForNext: number;
  /** 0..1 — progresso até a próxima fase (1 quando n=100). */
  progress: number;
}

export interface JourneyClaimRow {
  user_id: string;
  /** Maior fase cujas recompensas já foram resgatadas. 1 = só a inicial. */
  claimed_phase: number;
  /** Títulos premium que ficaram pendentes por tier (resgate retroativo). */
  updated_at: string;
}

export interface JourneyClaimOutcome {
  /** Fases recém-resgatadas nesta chamada (vazio = nada novo). */
  claimed: JourneyPhase[];
  /** Fases alcançadas mas com resgate bloqueado por tier (mundos 9-10 no free). */
  lockedPremium: JourneyPhase[];
  coinsGained: number;
  gemsGained: number;
  /** Títulos novos ganhos nesta chamada. */
  newTitles: string[];
  /** Minigames recém-desbloqueados nesta chamada. */
  newMinigames: string[];
}

/** Contexto mínimo pra decidir o que o tier pode resgatar. */
export interface JourneyTierContext {
  tier: BillingTierId;
}
