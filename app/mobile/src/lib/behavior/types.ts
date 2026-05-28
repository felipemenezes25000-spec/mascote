/**
 * Behavior Engine — types e contratos.
 *
 * O Behavior Engine é o "cérebro autônomo" do mascote: ele decide a cada
 * tick (geralmente 5s) qual comportamento expressar baseado em contexto
 * (DNA, mood, streak, hours since last interaction, hora do dia, etc).
 *
 * **Princípios invioláveis**:
 * - Behaviors NUNCA mutam DB ou Mascot. Apenas geram **side effects visuais**
 *   (animação via ref no Mascot2D, particles, micro-mensagem).
 * - Engine é DETERMINÍSTICA por contexto + cooldown — não chama RNG sem seed.
 * - Cooldown previne behavior repetir antes do tempo. Permite vibe natural.
 *
 * **Inspiração**: utility AI (The Sims), behavior trees (Halo), reactive
 * agents (Replika idle states). Aqui o sabor é WELLNESS — toda reação é
 * acolhedora, jamais cobrança.
 */

import type { Genome } from '@/lib/dna/genome';
import type { LifeState, SimulationEvent } from '@/sim/types';
import type { Mascot, MascotMood } from '@/types';
import type { ReactiveFlags } from './reactiveBehaviors';

/**
 * Contexto que o engine passa pra cada behavior pra computar score.
 * Construído UMA VEZ por tick pelo caller (cheap, snapshot do mundo).
 */
export interface BehaviorContext {
  mascot: Mascot;
  /** Genoma sanitizado pronto pra leitura. */
  genome: Genome;
  /** Mood atual do mascote (derivado ou explícito). */
  mood: MascotMood;
  /** Quantas horas desde a última interação. 0 = ativo agora. */
  hoursSinceLastInteraction: number;
  /** Streak atual em dias. */
  streakCurrent: number;
  /** Hora local 0..23. Pra behaviors temporais (noite, manhã). */
  hour: number;
  /** Reduce motion efetivo da sessão (acessibilidade). */
  reduceMotion?: boolean;
  /**
   * IDs de behaviors já executados em cooldown. Engine filtra antes de
   * computar score — behavior em cooldown não compete.
   */
  cooldownActive: ReadonlySet<string>;
  /**
   * Última vez (timestamp ms) que cada behavior rodou. Útil pra behaviors
   * que querem "freshness check" mais granular que cooldown booleano.
   */
  lastRanAt: ReadonlyMap<string, number>;
  /** Estado de vida da simulação (quando disponível). */
  lifeState?: LifeState | null;
  /** Eventos pendentes do último tick de simulação. */
  simulationEvents?: readonly SimulationEvent[];
  /** Flags de moments/gestos para behaviors reativos imediatos. */
  reactiveFlags?: ReactiveFlags;
}

/**
 * Score retornado por `behavior.score(ctx)`. Faixa [0, 1]:
 *  - 0   → inapropriado agora (engine filtra)
 *  - 0.1 → "se nada melhor, roda" (idle fallback)
 *  - 0.5 → contextualmente bom
 *  - 1.0 → must-fire (milestone, reação a evento)
 *
 * Engine seleciona o MAIOR score por tick (ties: first wins).
 */
export type BehaviorScore = number;

/**
 * Side effects que o behavior pode emitir. Engine recebe e despacha pro
 * consumer (Mascot2D ref, toast queue, etc.) — separar contrato do
 * comportamento facilita teste sem dependência de UI.
 */
export interface BehaviorEffect {
  /**
   * Animação solicitada — Mascot2D ref consome via switch. Strings simples
   * em vez de função pra serem JSON-serializable (testes + replay).
   */
  animation?: 'bounce' | 'wander' | 'celebrate' | 'rest' | 'observe' | 'breath_deep';
  /**
   * Mensagem in-app opcional pra mostrar como speech bubble. Curta (<60 chars).
   * Wellness tone — nunca cobrança.
   */
  message?: string;
  /**
   * Solicita notificação push (delegado pro caller — engine não dispara). */
  notify?: {
    title: string;
    body: string;
  };
}

/**
 * Contrato de um behavior. Cada behavior é uma fábrica pura: dado contexto,
 * retorna score; quando selecionado, retorna efeitos pra dispatch.
 */
export interface Behavior {
  /** ID estável — usado em cooldown tracking. NUNCA mudar pós-release. */
  id: string;
  /** Tipo categórico — útil pra UI listar / debugar. */
  kind: 'idle' | 'reactive' | 'milestone' | 'temporal';
  /**
   * Cooldown em segundos. Após executar, behavior é skip pra esse tempo.
   * idle: tipicamente baixo (5-30s). Reactive: maior (5-60min). Milestone:
   * day-long (24h+) pra não repetir celebração.
   */
  cooldownSeconds: number;
  /** Score [0, 1]. PURO — sem side effects. */
  score: (ctx: BehaviorContext) => BehaviorScore;
  /**
   * Gera efeitos a partir do contexto. PURO — não emite, só descreve.
   * Engine recebe e despacha.
   */
  execute: (ctx: BehaviorContext) => BehaviorEffect;
}

/**
 * Resultado de uma seleção. Útil pra logs + replay determinístico.
 */
export interface BehaviorSelection {
  /** Behavior selecionado, ou null se nada teve score > 0. */
  behavior: Behavior | null;
  /** Score do selecionado (0 se null). */
  score: BehaviorScore;
  /** Scores de todos avaliados — útil pra debug. */
  scoresById: Record<string, BehaviorScore>;
}
