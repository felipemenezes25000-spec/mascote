/**
 * Sistema de mutações persistentes do DNA.
 *
 * **Filosofia**: mutações são marcos biológicos desbloqueáveis pela combinação
 * de DNA-state + hábitos cumpridos + tempo. Diferente do drift contínuo
 * (`habitToGene.applyHabitDrift`), uma mutação é um SALTO QUALITATIVO
 * persistido — uma vez desbloqueada, fica gravada e o renderer pode aplicar
 * efeitos visuais aditivos.
 *
 * **Princípios invioláveis**:
 * - Mutação NUNCA muta o DNA bruto. É uma camada visual aditiva.
 * - Desbloqueio é monotônico — uma vez desbloqueada, não desbloqueia.
 * - Não punitiva — não há mutação "negativa". Falta de hábito não desbloqueia,
 *   mas também não regride uma já-conquistada.
 * - Determinística — mesmas condições, mesmo conjunto de mutações.
 * - Sem efeito colateral em gameplay (não afeta XP/coins/level). É puramente
 *   expressiva.
 *
 * **Como o renderer consome**: `Mascot3D` lê `UnlockedMutation[]` do usuário
 * e aplica `visualImpact` em sequência sobre os params de `morphologyFromGenome`.
 * Pattern → shader; glowBoost → emissive; bioluminescent → pulse opcional.
 */

import type { Genome, GeneKey } from './genome';
import type { HabitKind } from '@/types';

/**
 * Raridade — define peso visual no toast de desbloqueio, ordem de exibição
 * em listas, e cor do badge. NÃO afeta o efeito mecânico.
 */
export type MutationRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Padrão corporal aplicado via shader pelo renderer.
 * 'plain' é o default; outros são desbloqueáveis.
 */
export type BodyPattern = 'plain' | 'stripes' | 'spots' | 'fractal' | 'cells';

/**
 * Condição de desbloqueio. TODOS os campos preenchidos precisam ser
 * satisfeitos (AND lógico). Campos ausentes são ignorados.
 *
 * Para condições mais complexas (OR, alternativas), criar múltiplas mutações
 * com mesma raridade e impacto similar — mantém a config declarativa.
 */
export interface MutationCondition {
  /** Cada gene listado precisa estar >= valor. */
  geneAbove?: Partial<Record<GeneKey, number>>;
  /** Soma de checkins de cada hábito precisa ser >= count. */
  habitCheckinsAtLeast?: Partial<Record<HabitKind, number>>;
  /** Streak atual ou histórica precisa ser >= valor. */
  streakAtLeast?: number;
  /** Dias desde criação do mascote >= valor. */
  daysSinceCreatedAtLeast?: number;
}

/**
 * Impacto visual aditivo. Renderer aplica em ordem sobre os params base
 * gerados por `morphologyFromGenome`. Nenhum campo é obrigatório — uma
 * mutação pode mexer só num aspecto.
 */
export interface VisualImpact {
  /** Multiplicadores em params morfológicos (ex: { eyeSize: 1.2 } = +20%). */
  morphologyMultipliers?: Partial<Record<string, number>>;
  /** Boost no emissive intensity do corpo (additivo). */
  glowBoost?: number;
  /** Liga bioluminescência (pulse leve da paleta accent). */
  bioluminescent?: boolean;
  /** Aplica padrão via shader. Substitui 'plain'. */
  pattern?: BodyPattern;
  /** Multiplicador na quantidade de partículas da aura. */
  auraParticleMultiplier?: number;
}

export interface Mutation {
  /** ID estável — usado em persistência. NUNCA mudar após release. */
  id: string;
  /** Nome PT-BR amigável pro toast. Tom positivo, sem cobrança. */
  name: string;
  /** Descrição PT-BR explicando o que mudou no corpo. */
  description: string;
  /** Gene principal vinculado. Usado em UI agrupando por arquétipo. */
  dominantGene: GeneKey;
  /** Condição que dispara o desbloqueio. */
  condition: MutationCondition;
  /** Efeito visual. */
  visualImpact: VisualImpact;
  /** Tier de raridade. */
  rarity: MutationRarity;
}

/**
 * Registro persistido de uma mutação desbloqueada por um usuário específico.
 * Armazenado em tabela 'dna_mutations' via AsyncStorage.
 */
export interface UnlockedMutation {
  user_id: string;
  mutation_id: string;
  unlocked_at: string;  // ISO
}

// ============================================================================
// CATÁLOGO — 7 mutações iniciais (1 por arquétipo dominante)
// ============================================================================
// Estes são os marcos biológicos do MVP. Adicionar mais conforme o roadmap
// avança. Cada mutation deve ser visualmente DISTINTA — não criar mutations
// que produzem efeito muito parecido (confunde o usuário).

export const MUTATION_CATALOG: readonly Mutation[] = [
  // — DISCIPLINE / RESILIENCE — "Estrutura Firme"
  {
    id: 'mut.structural_firmness',
    name: 'Estrutura firme',
    description: 'Seu mascote desenvolveu contornos mais definidos. A base ficou mais sólida.',
    dominantGene: 'resilience',
    condition: {
      geneAbove: { resilience: 0.7, discipline: 0.65 },
      habitCheckinsAtLeast: { exercise: 25 },
    },
    visualImpact: {
      morphologyMultipliers: { bodyBottomBias: 1.18, bodyWidthSquash: 1.08, bodyRoughness: 0.85 },
    },
    rarity: 'rare',
  },

  // — EMPATHY / EMOTIONAL DEPTH — "Olhar Profundo"
  {
    id: 'mut.deep_eyes',
    name: 'Olhar profundo',
    description: 'Os olhos ganharam profundidade. Você nota mais nuances quando ele te olha.',
    dominantGene: 'empathy',
    condition: {
      geneAbove: { empathy: 0.7, emotionalDepth: 0.7 },
      habitCheckinsAtLeast: { journaling: 20 },
    },
    visualImpact: {
      morphologyMultipliers: { eyeSize: 1.15, pupilEmissive: 1.3 },
    },
    rarity: 'rare',
  },

  // — CREATIVITY / CHAOS — "Padrões Emergentes"
  {
    id: 'mut.emergent_patterns',
    name: 'Padrões emergentes',
    description: 'Padrões surgiram pelo corpo. Algo único — não existe outro igual.',
    dominantGene: 'creativity',
    condition: {
      geneAbove: { creativity: 0.75, chaos: 0.5 },
      daysSinceCreatedAtLeast: 21,
    },
    visualImpact: {
      pattern: 'fractal',
    },
    rarity: 'epic',
  },

  // — CURIOSITY — "Antenas Reativas"
  {
    id: 'mut.reactive_antennae',
    name: 'Antenas reativas',
    description: 'As antenas ficaram mais sensíveis. Captam o mundo antes do corpo.',
    dominantGene: 'curiosity',
    condition: {
      geneAbove: { curiosity: 0.7 },
      habitCheckinsAtLeast: { outdoor: 15 },
    },
    visualImpact: {
      morphologyMultipliers: { antennaWiggle: 1.6, antennaLength: 1.15 },
    },
    rarity: 'common',
  },

  // — SOCIAL ENERGY — "Aura Expansiva"
  {
    id: 'mut.expansive_aura',
    name: 'Aura expansiva',
    description: 'A aura ao redor dele se ampliou. Você sente presença antes mesmo de olhar.',
    dominantGene: 'socialEnergy',
    condition: {
      geneAbove: { socialEnergy: 0.75 },
      streakAtLeast: 14,
    },
    visualImpact: {
      morphologyMultipliers: { auraOpacity: 1.25, auraSize: 1.3 },
      auraParticleMultiplier: 1.4,
    },
    rarity: 'rare',
  },

  // — INTELLIGENCE — "Brilho Sábio"
  {
    id: 'mut.wisdom_glow',
    name: 'Brilho sábio',
    description: 'Os olhos têm um brilho mais profundo. Parece que ele pensa antes de agir.',
    dominantGene: 'intelligence',
    condition: {
      geneAbove: { intelligence: 0.75 },
      habitCheckinsAtLeast: { reading: 20 },
    },
    visualImpact: {
      morphologyMultipliers: { pupilEmissive: 1.5, bodyEmissiveIntensity: 1.2 },
      glowBoost: 0.15,
    },
    rarity: 'epic',
  },

  // — LEGENDARY: combo extremo — "Forma Bioluminescente"
  {
    id: 'mut.bioluminescent_form',
    name: 'Forma bioluminescente',
    description: 'Algo raro aconteceu. O corpo dele pulsa em um brilho próprio agora.',
    dominantGene: 'resilience',
    condition: {
      geneAbove: { resilience: 0.78, socialEnergy: 0.7, emotionalDepth: 0.7 },
      streakAtLeast: 30,
      daysSinceCreatedAtLeast: 60,
    },
    visualImpact: {
      bioluminescent: true,
      glowBoost: 0.3,
      morphologyMultipliers: { bodyEmissiveIntensity: 1.4 },
    },
    rarity: 'legendary',
  },
];

// ============================================================================
// AVALIAÇÃO — funções puras, testáveis
// ============================================================================

/**
 * Contexto necessário pra avaliar mutações. Caller (pipeline de check-in)
 * monta isto a partir do estado atual + queries no DB.
 */
export interface MutationContext {
  genome: Genome;
  /** Soma de check-ins por hábito (lifetime). */
  habitCheckinCounts: Partial<Record<HabitKind, number>>;
  /** Streak atual. */
  currentStreak: number;
  /** Dias desde criação do mascote. */
  daysSinceCreated: number;
  /** IDs de mutações já desbloqueadas — pra não re-emitir. */
  alreadyUnlocked: ReadonlySet<string>;
}

/**
 * Avalia se uma condição específica é satisfeita pelo contexto.
 * Pura, sem side effects. Cada campo preenchido precisa passar (AND).
 */
export function evaluateCondition(
  condition: MutationCondition,
  ctx: MutationContext,
): boolean {
  // geneAbove: cada gene listado precisa >= valor
  if (condition.geneAbove) {
    for (const [key, threshold] of Object.entries(condition.geneAbove) as [GeneKey, number][]) {
      if (ctx.genome[key] < threshold) return false;
    }
  }
  // habitCheckinsAtLeast: cada habit listado precisa de count
  if (condition.habitCheckinsAtLeast) {
    for (const [habit, count] of Object.entries(condition.habitCheckinsAtLeast) as [HabitKind, number][]) {
      if ((ctx.habitCheckinCounts[habit] ?? 0) < count) return false;
    }
  }
  // streakAtLeast
  if (typeof condition.streakAtLeast === 'number') {
    if (ctx.currentStreak < condition.streakAtLeast) return false;
  }
  // daysSinceCreatedAtLeast
  if (typeof condition.daysSinceCreatedAtLeast === 'number') {
    if (ctx.daysSinceCreated < condition.daysSinceCreatedAtLeast) return false;
  }
  return true;
}

/**
 * Retorna lista de mutações desbloqueáveis NESTE momento — ainda não
 * desbloqueadas pelo usuário, com condição satisfeita.
 *
 * Caller persiste o resultado via `unlockMutations()` e exibe toasts.
 * Ordem do retorno = ordem em MUTATION_CATALOG (estável).
 */
export function findNewlyUnlockedMutations(ctx: MutationContext): Mutation[] {
  return MUTATION_CATALOG.filter(
    m => !ctx.alreadyUnlocked.has(m.id) && evaluateCondition(m.condition, ctx),
  );
}

/**
 * Lookup helper por ID. Retorna undefined se ID inválido (defensivo —
 * registros persistidos com ID que não existe mais no catálogo são ignorados).
 */
export function getMutationById(id: string): Mutation | undefined {
  return MUTATION_CATALOG.find(m => m.id === id);
}

// ============================================================================
// APLICAÇÃO VISUAL — composição imutável dos efeitos sobre morfologia
// ============================================================================

/**
 * Snapshot dos efeitos visuais agregados de TODAS as mutações desbloqueadas.
 * Renderer consome isso pra aplicar overlay sobre morphologyFromGenome.
 *
 * Multiplicadores compõem multiplicativamente (1.2 * 1.15 = 1.38, não 1.35).
 * Padrões: o ÚLTIMO desbloqueado vence (futuro: usuário escolhe via customize).
 * Booleans: OR lógico.
 */
export interface AggregatedVisualImpact {
  morphologyMultipliers: Record<string, number>;
  glowBoost: number;
  bioluminescent: boolean;
  pattern: BodyPattern;
  auraParticleMultiplier: number;
}

export const NEUTRAL_VISUAL_IMPACT: AggregatedVisualImpact = {
  morphologyMultipliers: {},
  glowBoost: 0,
  bioluminescent: false,
  pattern: 'plain',
  auraParticleMultiplier: 1,
};

/**
 * Agrega impactos visuais de uma lista de mutações desbloqueadas.
 * Pura, idempotente, ordem-independente para multiplicadores e booleans.
 */
export function aggregateVisualImpact(
  unlockedIds: readonly string[],
): AggregatedVisualImpact {
  const out: AggregatedVisualImpact = {
    morphologyMultipliers: {},
    glowBoost: 0,
    bioluminescent: false,
    pattern: 'plain',
    auraParticleMultiplier: 1,
  };
  for (const id of unlockedIds) {
    const m = getMutationById(id);
    if (!m) continue;
    const v = m.visualImpact;
    if (v.morphologyMultipliers) {
      for (const [key, mult] of Object.entries(v.morphologyMultipliers)) {
        if (typeof mult !== 'number') continue;
        out.morphologyMultipliers[key] = (out.morphologyMultipliers[key] ?? 1) * mult;
      }
    }
    if (typeof v.glowBoost === 'number') {
      out.glowBoost += v.glowBoost;
    }
    if (v.bioluminescent) {
      out.bioluminescent = true;
    }
    if (v.pattern && v.pattern !== 'plain') {
      out.pattern = v.pattern;
    }
    if (typeof v.auraParticleMultiplier === 'number') {
      out.auraParticleMultiplier *= v.auraParticleMultiplier;
    }
  }
  return out;
}

/**
 * Lista todas as mutações catalogadas — útil pra UI que mostra "coleção"
 * completa, incluindo as ainda bloqueadas.
 */
export function listAllMutations(): readonly Mutation[] {
  return MUTATION_CATALOG;
}

// ============================================================================
// APLICAÇÃO em MORPHOLOGY — consumido pelo renderer
// ============================================================================

import type { Morphology } from './morphology';

/**
 * Aplica os efeitos visuais agregados (de mutations desbloqueadas) sobre uma
 * Morphology já-derivada. Retorna nova Morphology — não muta input.
 *
 * **Ordem recomendada de composição** (consumidor):
 *   1. base = morphologyFromGenome(genome)
 *   2. withCustom = applyCustomization(base, custom)   // overrides do user
 *   3. final = applyMutationVisualImpact(withCustom, impact)  // marcos
 *
 * Ordem importa: customização é a vontade direta do usuário (aplicada
 * primeiro), e mutations são marcos biológicos celebrativos (em cima).
 */
export function applyMutationVisualImpact(
  morph: Morphology,
  impact: AggregatedVisualImpact,
): Morphology {
  const out: Morphology = { ...morph };
  // Multiplicadores morfológicos (typesafe — só aplica keys que existem)
  type MorphKeys = keyof Morphology;
  for (const [key, mult] of Object.entries(impact.morphologyMultipliers)) {
    if (typeof mult !== 'number') continue;
    const k = key as MorphKeys;
    const cur = out[k];
    if (typeof cur === 'number') {
      (out as Record<MorphKeys, unknown>)[k] = cur * mult;
    }
  }
  // glowBoost: incremento aditivo no emissive intensity do corpo
  if (impact.glowBoost > 0) {
    out.bodyEmissiveIntensity += impact.glowBoost;
  }
  // auraParticleMultiplier: scale na contagem de partículas
  if (impact.auraParticleMultiplier !== 1) {
    out.auraParticleCount = Math.max(
      0,
      Math.floor(out.auraParticleCount * impact.auraParticleMultiplier),
    );
  }
  return out;
}
