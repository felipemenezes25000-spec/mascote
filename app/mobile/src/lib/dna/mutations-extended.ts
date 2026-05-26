/**
 * Catálogo expandido de mutações — combina hábitos, genes, streak e tempo.
 * Mesclado em `mutations.ts` para 50+ marcos biológicos desbloqueáveis.
 */

import type { GeneKey } from './genome';
import type { HabitKind } from '@/types';
import type { Mutation, MutationRarity, VisualImpact } from './mutations';

const HABIT_GENE: Record<HabitKind, GeneKey> = {
  water: 'resilience',
  sleep: 'emotionalDepth',
  exercise: 'discipline',
  meditation: 'adaptability',
  reading: 'intelligence',
  journaling: 'empathy',
  breath: 'adaptability',
  outdoor: 'curiosity',
  sun: 'socialEnergy',
};

const HABIT_NAMES: Record<HabitKind, string> = {
  water: 'hidratação',
  sleep: 'descanso',
  exercise: 'movimento',
  meditation: 'presença',
  reading: 'leitura',
  journaling: 'reflexão',
  breath: 'respiração',
  outdoor: 'ar livre',
  sun: 'luz solar',
};

const RARITY_BY_TIER: [number, MutationRarity][] = [
  [5, 'common'],
  [12, 'rare'],
  [20, 'epic'],
  [30, 'legendary'],
];

function rarityForCheckins(n: number): MutationRarity {
  for (const [min, r] of RARITY_BY_TIER) {
    if (n <= min) return r;
  }
  return 'legendary';
}

function habitMorph(habit: HabitKind, tier: number): VisualImpact {
  const boosts: Record<HabitKind, Partial<Record<string, number>>> = {
    water: { bodyRoughness: 0.92 + tier * 0.02, bodyWidthSquash: 1.04 + tier * 0.01 },
    sleep: { eyeSize: 1.05 + tier * 0.02, pupilEmissive: 1.1 + tier * 0.03 },
    exercise: { antennaLength: 1.08 + tier * 0.02, bodyBottomBias: 1.1 + tier * 0.02 },
    meditation: { auraOpacity: 1.1 + tier * 0.02, auraSize: 1.05 + tier * 0.02 },
    reading: { pupilEmissive: 1.15 + tier * 0.02, bodyEmissiveIntensity: 1.08 + tier * 0.02 },
    journaling: { eyeSize: 1.08 + tier * 0.02, antennaWiggle: 1.2 + tier * 0.05 },
    breath: { auraParticleMultiplier: 1.1 + tier * 0.05 },
    outdoor: { antennaLength: 1.12 + tier * 0.02, antennaWiggle: 1.25 + tier * 0.05 },
    sun: { glowBoost: 0.05 + tier * 0.02, bodyEmissiveIntensity: 1.12 + tier * 0.02 },
  };
  const m = boosts[habit];
  const morphologyMultipliers: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) {
    if (k !== 'glowBoost' && k !== 'auraParticleMultiplier' && typeof v === 'number') {
      morphologyMultipliers[k] = v;
    }
  }
  const impact: VisualImpact = { morphologyMultipliers };
  if (typeof m.glowBoost === 'number') impact.glowBoost = m.glowBoost;
  if (typeof m.auraParticleMultiplier === 'number') {
    impact.auraParticleMultiplier = m.auraParticleMultiplier;
  }
  if (tier >= 3 && (habit === 'outdoor' || habit === 'reading')) {
    impact.pattern = habit === 'outdoor' ? 'stripes' : 'spots';
  }
  if (tier >= 4 && habit === 'meditation') impact.bioluminescent = true;

  // Morph influence boosts — slice 2026-05-25 / extended pra slice 2026-05-26.
  // Cada hábito empurra blend shapes coerentes com a vibe da prática.
  // Boosts pequenos por tier (max ~0.3 no tier 4) — não dominam customização.
  const boostStep = 0.06 * tier;
  const morphInfluenceBoosts: Partial<Record<string, number>> = {};
  switch (habit) {
    case 'water':
      // hidratação → corpo mais cheio (wide)
      morphInfluenceBoosts.body_wide = boostStep;
      break;
    case 'sleep':
      // descanso → olhos relaxados (big), postura recolhida (back)
      morphInfluenceBoosts.eye_big = boostStep * 0.8;
      morphInfluenceBoosts.posture_back = boostStep * 0.5;
      break;
    case 'exercise':
      // movimento → corpo erguido (tall), postura ativa (forward)
      morphInfluenceBoosts.body_tall = boostStep;
      morphInfluenceBoosts.posture_forward = boostStep * 0.8;
      break;
    case 'meditation':
      // presença → aura forte
      morphInfluenceBoosts.aura_strong = boostStep;
      break;
    case 'reading':
      // leitura → olhar analítico (small)
      morphInfluenceBoosts.eye_small = boostStep * 0.6;
      morphInfluenceBoosts.pattern_dense = boostStep * 0.4;
      break;
    case 'journaling':
      // reflexão → olhos introspectivos (big)
      morphInfluenceBoosts.eye_big = boostStep;
      break;
    case 'breath':
      // respiração → aura
      morphInfluenceBoosts.aura_strong = boostStep * 0.7;
      break;
    case 'outdoor':
      // ar livre → postura aberta (forward), pattern emerge
      morphInfluenceBoosts.posture_forward = boostStep;
      morphInfluenceBoosts.pattern_dense = boostStep * 0.5;
      break;
    case 'sun':
      // luz solar → aura forte
      morphInfluenceBoosts.aura_strong = boostStep;
      break;
  }
  if (Object.keys(morphInfluenceBoosts).length > 0) {
    impact.morphInfluenceBoosts = morphInfluenceBoosts;
  }
  return impact;
}

function buildHabitMutations(): Mutation[] {
  const out: Mutation[] = [];
  const tiers = [3, 8, 15, 25] as const;
  for (const habit of Object.keys(HABIT_GENE) as HabitKind[]) {
    const gene = HABIT_GENE[habit];
    tiers.forEach((checkins, tierIdx) => {
      const tier = tierIdx + 1;
      out.push({
        id: `mut.habit.${habit}.t${tier}`,
        name: `Marco de ${HABIT_NAMES[habit]} ${tier}`,
        description: `Seu mascote incorporou sua rotina de ${HABIT_NAMES[habit]}. O corpo reagiu de um jeito único.`,
        dominantGene: gene,
        condition: {
          geneAbove: { [gene]: 0.45 + tier * 0.06 },
          habitCheckinsAtLeast: { [habit]: checkins },
        },
        visualImpact: habitMorph(habit, tier),
        rarity: rarityForCheckins(checkins),
      });
    });
  }
  return out;
}

function buildStreakMutations(): Mutation[] {
  const streaks: [number, string, MutationRarity, VisualImpact][] = [
    [3, 'Faísca de constância', 'common', {
      glowBoost: 0.05,
      morphInfluenceBoosts: { aura_strong: 0.1 },
    }],
    [7, 'Ritmo semanal', 'rare', {
      morphologyMultipliers: { auraSize: 1.15 },
      morphInfluenceBoosts: { aura_strong: 0.2 },
    }],
    [14, 'Compromisso firme', 'rare', {
      auraParticleMultiplier: 1.2,
      morphInfluenceBoosts: { aura_strong: 0.25, posture_forward: 0.1 },
    }],
    [21, 'Hábito enraizado', 'epic', {
      pattern: 'cells',
      morphInfluenceBoosts: { pattern_dense: 0.3, body_tall: 0.1 },
    }],
    [45, 'Legado de presença', 'legendary', {
      bioluminescent: true,
      glowBoost: 0.2,
      morphInfluenceBoosts: { aura_strong: 0.5, eye_big: 0.15, pattern_dense: 0.2 },
    }],
  ];
  return streaks.map(([days, name, rarity, visualImpact]) => ({
    id: `mut.streak.${days}`,
    name,
    description: `${days} dias seguidos juntos — o corpo dele guarda essa constância.`,
    dominantGene: 'discipline' as GeneKey,
    condition: { streakAtLeast: days, geneAbove: { discipline: 0.4 + days / 100 } },
    visualImpact,
    rarity,
  }));
}

function buildTimeMutations(): Mutation[] {
  const daysList: [number, string, GeneKey, VisualImpact][] = [
    [7, 'Primeira semana', 'curiosity', {
      morphologyMultipliers: { antennaWiggle: 1.2 },
      morphInfluenceBoosts: { eye_big: 0.08 },
    }],
    [14, 'Duas semanas juntos', 'empathy', {
      morphologyMultipliers: { eyeSize: 1.08 },
      morphInfluenceBoosts: { eye_big: 0.15 },
    }],
    [30, 'Um mês de vida', 'adaptability', {
      pattern: 'stripes',
      morphInfluenceBoosts: { pattern_dense: 0.25, body_tall: 0.05 },
    }],
    [90, 'Trimestre vivido', 'resilience', {
      glowBoost: 0.12,
      morphologyMultipliers: { bodyEmissiveIntensity: 1.15 },
      morphInfluenceBoosts: { aura_strong: 0.3, body_wide: 0.1 },
    }],
    [180, 'Meio ano de companhia', 'emotionalDepth', {
      bioluminescent: true,
      pattern: 'fractal',
      morphInfluenceBoosts: { aura_strong: 0.45, pattern_dense: 0.35, eye_big: 0.2 },
    }],
  ];
  return daysList.map(([days, name, gene, visualImpact]) => ({
    id: `mut.age.${days}d`,
    name,
    description: `Vocês estão juntos há ${days} dias — marcas sutis apareceram no corpo dele.`,
    dominantGene: gene,
    condition: { daysSinceCreatedAtLeast: days },
    visualImpact,
    rarity: days >= 90 ? 'legendary' : days >= 30 ? 'epic' : 'rare',
  }));
}

function buildGeneComboMutations(): Mutation[] {
  const combos: {
    id: string;
    name: string;
    genes: Partial<Record<GeneKey, number>>;
    impact: VisualImpact;
    rarity: MutationRarity;
  }[] = [
    {
      id: 'mut.combo.calm_mind',
      name: 'Mente serena',
      genes: { adaptability: 0.65, emotionalDepth: 0.6 },
      impact: { morphologyMultipliers: { auraOpacity: 1.2 }, pattern: 'cells' },
      rarity: 'rare',
    },
    {
      id: 'mut.combo.spark',
      name: 'Centelha social',
      genes: { socialEnergy: 0.7, curiosity: 0.65 },
      impact: { auraParticleMultiplier: 1.35, glowBoost: 0.08 },
      rarity: 'rare',
    },
    {
      id: 'mut.combo.focus',
      name: 'Foco cristalino',
      genes: { intelligence: 0.72, discipline: 0.68 },
      impact: { morphologyMultipliers: { pupilEmissive: 1.4 } },
      rarity: 'epic',
    },
    {
      id: 'mut.combo.wild',
      name: 'Caos criativo',
      genes: { creativity: 0.7, chaos: 0.65 },
      impact: { pattern: 'fractal', morphologyMultipliers: { antennaWiggle: 1.5 } },
      rarity: 'epic',
    },
    {
      id: 'mut.combo.guardian',
      name: 'Guardião resiliente',
      genes: { resilience: 0.75, empathy: 0.7, discipline: 0.65 },
      impact: { bioluminescent: true, glowBoost: 0.18, morphologyMultipliers: { bodyBottomBias: 1.2 } },
      rarity: 'legendary',
    },
  ];
  return combos.map(c => ({
    id: c.id,
    name: c.name,
    description: 'Genes em harmonia — uma forma nova emergiu, só sua.',
    dominantGene: Object.keys(c.genes)[0] as GeneKey,
    condition: { geneAbove: c.genes },
    visualImpact: c.impact,
    rarity: c.rarity,
  }));
}

/** 44+ mutações além do núcleo MVP em mutations.ts */
export function buildExtendedMutationCatalog(): readonly Mutation[] {
  return [
    ...buildHabitMutations(),
    ...buildStreakMutations(),
    ...buildTimeMutations(),
    ...buildGeneComboMutations(),
  ];
}
