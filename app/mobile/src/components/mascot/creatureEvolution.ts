/**
 * Camada de evolução VISÍVEL da criatura — traduz fase + mutações desbloqueadas
 * em um descritor que o CreatureRenderer aplica sobre a forma derivada do genoma.
 *
 * Conceito (spec 2026-06-18): o GENOMA é o destino (orelhas/cauda/asas/coroa/
 * padrão que a criatura terá); a EVOLUÇÃO é a jornada de REVELAR esse destino,
 * devagar e com sentido. Estágio cedo = forma minimalista; estágio avançado =
 * forma plena + floreios. Mutações (marcos por hábito/streak/gene) aplicam
 * efeitos SEMPRE, mesmo em estágio baixo.
 *
 * PURO (sem reanimated/SVG) → testável. O mecanismo de desenho/animação vive no
 * CreatureRenderer; aqui só a DECISÃO.
 *
 * Ponte de mutações: o catálogo (`lib/dna/mutations`) descreve `VisualImpact` na
 * língua do Mascot2D legado (Morphology). Aqui traduzimos os campos relevantes
 * para o que o CreatureRenderer (SVG) sabe desenhar — sem migrar o catálogo.
 */
import type { MascotPhase } from '@/types';
import { aggregateVisualImpact, type BodyPattern } from '@/lib/dna/mutations';
import type { CreatureGenome } from '@/game/creatures';

export interface EvolutionVisuals {
  /** 0 (ovo) .. 5 (evoluido). */
  stage: number;
  revealTail: boolean;
  revealPattern: boolean;
  revealWings: boolean;
  revealCrown: boolean;
  /** Intensidade do brilho/aura, 0..1. */
  glow: number;
  /** Pulsar o brilho (mutação bioluminescente ou estágio máximo). */
  pulse: boolean;
  /** Quantidade de faíscas ao redor (0..8). */
  sparkleCount: number;
  /** Sobrescreve o padrão do corpo (de mutação) — nome de pattern do CreatureRenderer ou null. */
  patternOverride: CreatureGenome['pattern'] | null;
  /** Multiplicador no tamanho dos olhos (de mutação). */
  eyeScale: number;
  /** Escala geral da criatura por estágio (cresce ao evoluir; 1 em preview). */
  sizeScale: number;
  /** Bochechas/blush — escondidas no ovo, reveladas a partir de bebe. */
  revealCheeks: boolean;
}

const PHASE_STAGE: Record<MascotPhase, number> = {
  ovo: 0,
  bebe: 1,
  crianca: 2,
  adolescente: 3,
  adulto: 4,
  evoluido: 5,
};

const MAX_STAGE = 5;

/** BodyPattern (mutação) → pattern do CreatureRenderer (CreatureGenome['pattern']). */
const MUTATION_PATTERN_TO_CREATURE: Record<Exclude<BodyPattern, 'plain'>, CreatureGenome['pattern']> = {
  spots: 'spots',
  stripes: 'stripes',
  cells: 'scales',
  fractal: 'swirl',
};

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

export function creatureEvolution(input: {
  phase?: MascotPhase | null;
  mutationIds?: readonly string[];
}): EvolutionVisuals {
  // Sem fase = contexto de PREVIEW (bestiário/cosmos/onboarding): mostra a forma
  // PLENA da criatura, sem a aura de evolução. Com fase = mascote VIVO: revelação
  // progressiva + aura. Isso evita regredir os previews pra formas larvais.
  const hasPhase = input.phase != null;
  const stage = hasPhase ? (PHASE_STAGE[input.phase as MascotPhase] ?? 0) : MAX_STAGE;
  const impact = aggregateVisualImpact(input.mutationIds ?? []);

  // Padrão de mutação sobrescreve e REVELA cedo (marco aparece mesmo em ovo).
  const patternOverride =
    impact.pattern !== 'plain' ? (MUTATION_PATTERN_TO_CREATURE[impact.pattern] ?? null) : null;

  // Glow: a aura de EVOLUÇÃO só existe no mascote vivo (com fase); preview fica
  // sem aura de fase. Mutações de glow aplicam sempre. Clamp [0,1].
  const emissiveMult = impact.morphologyMultipliers.bodyEmissiveIntensity ?? 1;
  const stageGlow = hasPhase ? (stage / MAX_STAGE) * 0.6 : 0;
  const glow = clamp(stageGlow + impact.glowBoost + (emissiveMult - 1) * 0.3, 0, 1);

  // Pulso: mutação bioluminescente sempre; ou forma plena do mascote vivo.
  const pulse = impact.bioluminescent || (hasPhase && stage >= MAX_STAGE);

  // Faíscas: forma plena do mascote vivo dá algumas; mutação de aura adiciona.
  let sparkleCount = hasPhase && stage >= MAX_STAGE ? 3 : 0;
  if (impact.auraParticleMultiplier > 1) sparkleCount += 2;
  sparkleCount = Math.min(8, sparkleCount);

  // Olhos: só amplia (catálogo só aumenta), clamp pra não virar grotesco.
  const eyeScale = clamp(impact.morphologyMultipliers.eyeSize ?? 1, 0.8, 1.6);

  // Crescimento por estágio (sutil, controlado): ovo 0.84 → evoluido 1.08. Soma
  // às revelações de traço (crescer + transformar juntos, não no lugar de). Em
  // preview (sem fase) fica neutro pra não inflar o bestiário.
  const sizeScale = hasPhase ? 0.84 + (stage / MAX_STAGE) * 0.24 : 1;

  return {
    stage,
    // Preview (sem fase) revela tudo; mascote vivo revela por estágio.
    revealTail: !hasPhase || stage >= 1,
    revealPattern: !hasPhase || stage >= 2 || patternOverride !== null,
    revealWings: !hasPhase || stage >= 3,
    revealCrown: !hasPhase || stage >= 4,
    glow,
    pulse,
    sparkleCount,
    patternOverride,
    eyeScale,
    sizeScale,
    // Bochechas: escondidas no ovo, reveladas de bebe pra frente (diferencia cedo).
    revealCheeks: !hasPhase || stage >= 1,
  };
}
