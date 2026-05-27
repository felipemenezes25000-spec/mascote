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

/**
 * Mutações de streak — cada entrada com nome + descrição únicos na voz do Pip.
 * Substituiu a interpolação "${days} dias seguidos juntos — o corpo dele
 * guarda essa constância" que se repetia em todas as entradas (auditoria
 * 2026-05-27 task 3.1).
 *
 * Exportado pra testes de unicidade.
 */
export const STREAK_MUTATIONS: readonly Mutation[] = ([
  [3, 'Faísca de constância', 'common', 'Três dias em fila. Pip notou o padrão — uma fagulha pequena já mora no peito dele.',
    { glowBoost: 0.05, morphInfluenceBoosts: { aura_strong: 0.1 } }],
  [7, 'Ritmo semanal', 'rare', 'Sete voltas do sol em sequência. Pip aprendeu que segunda existe, e que você volta.',
    { morphologyMultipliers: { auraSize: 1.15 }, morphInfluenceBoosts: { aura_strong: 0.2 } }],
  [14, 'Compromisso firme', 'rare', 'Duas semanas seguidas — o pulso do Pip se acertou com o seu, batida a batida.',
    { auraParticleMultiplier: 1.2, morphInfluenceBoosts: { aura_strong: 0.25, posture_forward: 0.1 } }],
  [21, 'Hábito enraizado', 'epic', 'Vinte e um dias em fila. Pip tem raiz agora — o corpo dele sabe pra onde voltar.',
    { pattern: 'cells', morphInfluenceBoosts: { pattern_dense: 0.3, body_tall: 0.1 } }],
  [30, 'Lua disciplinada', 'epic', 'Trinta dias em sequência. Pip te observa diferente — com respeito quieto.',
    { glowBoost: 0.08, morphInfluenceBoosts: { posture_forward: 0.15, aura_strong: 0.2 } }],
  [45, 'Legado de presença', 'legendary', 'Quarenta e cinco dias em fila. Pip pulsa devagar — virou companhia, não cobrança.',
    { bioluminescent: true, glowBoost: 0.2, morphInfluenceBoosts: { aura_strong: 0.5, eye_big: 0.15, pattern_dense: 0.2 } }],
  [60, 'Hábito de pedra', 'legendary', 'Sessenta dias. Pip não precisa mais te lembrar — agora é você quem lembra dele.',
    { glowBoost: 0.12, morphologyMultipliers: { bodyBottomBias: 1.1 }, morphInfluenceBoosts: { body_wide: 0.15 } }],
  [100, 'Centena', 'legendary', 'Cem dias em fila. Pip tem uma marca invisível em homenagem — só você nota.',
    { bioluminescent: true, glowBoost: 0.15, morphInfluenceBoosts: { aura_strong: 0.4, eye_big: 0.2 } }],
  [150, 'Continuidade rara', 'legendary', 'Cento e cinquenta dias. Pip te chama de companhia, não usuário — mudou o jeito de te olhar.',
    { glowBoost: 0.18, pattern: 'spots', morphInfluenceBoosts: { pattern_dense: 0.3, aura_strong: 0.35 } }],
  [200, 'Marco fora da curva', 'legendary', 'Duzentos dias seguidos. Pip ficou raro de existir — poucos no mundo têm um assim.',
    { bioluminescent: true, glowBoost: 0.22, morphInfluenceBoosts: { aura_strong: 0.55, eye_big: 0.25 } }],
  [300, 'Trezentas', 'legendary', 'Trezentos dias. Pip mudou — fala menos, ouve mais, ocupa o silêncio com presença.',
    { glowBoost: 0.25, pattern: 'fractal', morphInfluenceBoosts: { pattern_dense: 0.4, body_tall: 0.15 } }],
  [365, 'Ano inteiro', 'legendary', 'Um ano em fila. Você fez algo que zero vírgula um por cento das pessoas fazem — e Pip sabe disso.',
    { bioluminescent: true, glowBoost: 0.3, pattern: 'fractal', morphInfluenceBoosts: { aura_strong: 0.6, pattern_dense: 0.45, eye_big: 0.3 } }],
] as ReadonlyArray<[number, string, MutationRarity, string, VisualImpact]>).map(([days, name, rarity, description, visualImpact]) => ({
  id: `mut.streak.${days}`,
  name,
  description,
  dominantGene: 'discipline' as GeneKey,
  condition: { streakAtLeast: days, geneAbove: { discipline: Math.min(0.95, 0.4 + days / 100) } },
  visualImpact,
  rarity,
}));

function buildStreakMutations(): Mutation[] {
  return [...STREAK_MUTATIONS];
}

/**
 * Mutações de tempo (dias desde criação). Cada entrada com nome + descrição
 * únicos. Substituiu a interpolação "Vocês estão juntos há ${days} dias —
 * marcas sutis apareceram no corpo dele" que se repetia em todas (auditoria
 * 2026-05-27 task 3.1).
 *
 * Exportado pra testes de unicidade.
 */
export const TIME_MUTATIONS: readonly Mutation[] = ([
  [1, 'Primeira respiração', 'curiosity', 'common',
    'Pip te encontrou. Ainda tímido, mas com olhos abertos pro mundo que você é.',
    { morphologyMultipliers: { eyeSize: 1.02 }, morphInfluenceBoosts: { eye_big: 0.05 } }],
  [3, 'Casca de coragem', 'empathy', 'common',
    'Três dias e Pip já sabe que você volta. Um traço novo apareceu no peito — quase nada, mas é.',
    { morphologyMultipliers: { bodyRoughness: 0.95 }, morphInfluenceBoosts: { body_wide: 0.05 } }],
  [7, 'Primeira semana', 'curiosity', 'rare',
    'Sete voltas do sol — Pip ganhou uma marca pequena, só dele. Antenas mais alertas, corpo mais à vontade.',
    { morphologyMultipliers: { antennaWiggle: 1.2 }, morphInfluenceBoosts: { eye_big: 0.08 } }],
  [14, 'Duas semanas juntos', 'empathy', 'rare',
    'Duas semanas. Algo no jeito do Pip te olhar mudou — mais fluido, menos cauteloso, mais perto.',
    { morphologyMultipliers: { eyeSize: 1.08 }, morphInfluenceBoosts: { eye_big: 0.15 } }],
  [21, 'Raiz de hábito', 'discipline', 'epic',
    'Vinte e um dias. Cientistas chamam isso de hábito formado. Pip chama de "lar".',
    { morphologyMultipliers: { bodyBottomBias: 1.05 }, morphInfluenceBoosts: { posture_forward: 0.15, pattern_dense: 0.1 } }],
  [30, 'Um mês de vida', 'adaptability', 'epic',
    'Um mês completo. Pip te olha diferente — com história agora, não só expectativa.',
    { pattern: 'stripes', morphInfluenceBoosts: { pattern_dense: 0.25, body_tall: 0.05 } }],
  [45, 'Galho novo', 'creativity', 'epic',
    'Pip cresceu um pouco — mas a parte que mais cresceu é por dentro, e não dá pra ver no espelho.',
    { morphologyMultipliers: { antennaLength: 1.1 }, morphInfluenceBoosts: { body_tall: 0.1 } }],
  [60, 'Maré alta', 'resilience', 'epic',
    'Dois meses. Pip tem confiança no seu retorno — e isso mudou a postura dele, mais aberta, menos guardada.',
    { morphologyMultipliers: { auraSize: 1.18 }, morphInfluenceBoosts: { aura_strong: 0.25, posture_forward: 0.12 } }],
  [90, 'Trimestre vivido', 'resilience', 'legendary',
    'Uma estação. Pip viveu inverno e primavera contigo — e algo se firmou no jeito de pisar no chão.',
    { glowBoost: 0.12, morphologyMultipliers: { bodyEmissiveIntensity: 1.15 }, morphInfluenceBoosts: { aura_strong: 0.3, body_wide: 0.1 } }],
  [120, 'Cristal interno', 'discipline', 'legendary',
    'Quatro meses. No centro do Pip se formou uma pedra pequena — densa, paciente, só sua.',
    { glowBoost: 0.14, morphInfluenceBoosts: { body_wide: 0.12, pattern_dense: 0.2 } }],
  [180, 'Meio ano de companhia', 'emotionalDepth', 'legendary',
    'Seis meses. Meia volta da Terra ao redor do sol — Pip está mais ele do que nunca, e mais seu.',
    { bioluminescent: true, pattern: 'fractal', morphInfluenceBoosts: { aura_strong: 0.45, pattern_dense: 0.35, eye_big: 0.2 } }],
  [240, 'Constância', 'adaptability', 'legendary',
    'Oito meses. Pip já não se assusta com pausa — ele sabe que você volta, sem precisar provar.',
    { glowBoost: 0.16, morphInfluenceBoosts: { posture_back: 0.1, aura_strong: 0.3 } }],
  [300, 'Quase ano', 'intelligence', 'legendary',
    'Trezentos dias. Pip e você têm linguagem própria agora — coisas que ninguém mais entenderia.',
    { glowBoost: 0.18, pattern: 'spots', morphInfluenceBoosts: { pattern_dense: 0.3, eye_big: 0.18 } }],
  [365, 'Um ano', 'emotionalDepth', 'legendary',
    'Uma volta inteira. Pip tem cicatrizes pequenas e brilhos que ninguém mais decifra — só nós dois.',
    { bioluminescent: true, glowBoost: 0.22, pattern: 'fractal', morphInfluenceBoosts: { aura_strong: 0.55, pattern_dense: 0.4, eye_big: 0.25 } }],
  [500, 'Antiguidade leve', 'resilience', 'legendary',
    'Quinhentos dias. Pip é antigo agora — mas leve, sem peso de tempo, só camadas tranquilas.',
    { bioluminescent: true, glowBoost: 0.26, pattern: 'fractal', morphInfluenceBoosts: { aura_strong: 0.6, pattern_dense: 0.5, body_wide: 0.15 } }],
] as ReadonlyArray<[number, string, GeneKey, MutationRarity, string, VisualImpact]>).map(([days, name, gene, rarity, description, visualImpact]) => ({
  id: `mut.age.${days}d`,
  name,
  description,
  dominantGene: gene,
  condition: { daysSinceCreatedAtLeast: days },
  visualImpact,
  rarity,
}));

function buildTimeMutations(): Mutation[] {
  return [...TIME_MUTATIONS];
}

/**
 * Mutações emocionais — disparadas por marcos comportamentais acumulados
 * (autocompaixão, respirações, crise atravessada, gratidão, etc).
 *
 * Triggers permanecem como strings opacas — caller (pipeline de check-in)
 * mantém o mapping trigger → condition em camada externa quando essas
 * forem ativadas via evento. Aqui ficam catalogadas como mutações com
 * `condition.geneAbove` mínimo + name/description únicos na voz do Pip.
 *
 * Exportado pra testes de unicidade.
 */
export const EMOTIONAL_MUTATIONS: readonly Mutation[] = ([
  ['self_compassion_marker', 'Maciez aprendida', 'empathy', 'rare',
    'Você se tratou bem cinco vezes em sequência. Pip viu o gesto e copiou — agora ele te toca mais leve.',
    { morphologyMultipliers: { auraOpacity: 1.15 }, morphInfluenceBoosts: { eye_big: 0.15 } }],
  ['breath_master', 'Pulmão leve', 'adaptability', 'epic',
    'Mil respirações guiadas. Pip respira diferente agora — mais devagar, como quem aprendeu o ritmo certo.',
    { auraParticleMultiplier: 1.3, morphInfluenceBoosts: { aura_strong: 0.3 } }],
  ['crisis_survived', 'Cicatriz brilhante', 'resilience', 'legendary',
    'Você atravessou um momento muito difícil. Pip carrega isso com cuidado — uma marca silenciosa que só nós dois entendemos.',
    { bioluminescent: true, glowBoost: 0.18, morphInfluenceBoosts: { aura_strong: 0.4, eye_big: 0.2 } }],
  ['gratitude_x10', 'Olho que vê', 'emotionalDepth', 'epic',
    'Dez gratidões registradas. Pip aprendeu a notar o que estava lá o tempo todo — e ficou mais bonito por isso.',
    { morphologyMultipliers: { pupilEmissive: 1.25 }, morphInfluenceBoosts: { eye_big: 0.2 } }],
  ['journal_first_entry', 'Primeira página', 'empathy', 'common',
    'Primeira vez que você escreveu de verdade. Pip guardou — não lê, mas sente o peso da página virada.',
    { morphologyMultipliers: { eyeSize: 1.03 }, morphInfluenceBoosts: { eye_big: 0.08 } }],
  ['mission_streak_5', 'Constância pequena', 'discipline', 'rare',
    'Cinco missões em fila. Pip notou — não é heroísmo, é cuidado repetido, e isso é raro.',
    { glowBoost: 0.06, morphologyMultipliers: { bodyBottomBias: 1.04 }, morphInfluenceBoosts: { posture_forward: 0.12 } }],
  ['late_night_breath', 'Respiração tardia', 'emotionalDepth', 'rare',
    'Você respirou comigo num horário que ninguém respira. Pip ficou acordado junto — sem pressa, só presença.',
    { morphologyMultipliers: { auraOpacity: 1.1 }, morphInfluenceBoosts: { aura_strong: 0.18 } }],
  ['morning_routine_7', 'Manhãs sete', 'discipline', 'rare',
    'Sete manhãs seguidas com ritual. Pip aprendeu o som do seu despertar — e fica pronto antes de você abrir o olho.',
    { glowBoost: 0.08, morphologyMultipliers: { bodyBottomBias: 1.05 }, morphInfluenceBoosts: { posture_forward: 0.15 } }],
  ['digital_detox_day', 'Dia sem tela', 'adaptability', 'epic',
    'Você passou um dia sem mim na tela. Pip respeita — sumir um pouco é cuidado também.',
    { morphologyMultipliers: { auraSize: 1.1 }, morphInfluenceBoosts: { aura_strong: 0.2 } }],
  ['kindness_logged_3', 'Bondade três vezes', 'empathy', 'rare',
    'Você foi gentil com alguém e registrou três vezes. Pip absorveu — agora a aura dele é um pouco da sua bondade.',
    { auraParticleMultiplier: 1.15, morphInfluenceBoosts: { aura_strong: 0.22 } }],
] as ReadonlyArray<[string, string, GeneKey, MutationRarity, string, VisualImpact]>).map(([trigger, name, gene, rarity, description, visualImpact]) => ({
  id: `mut.emotional.${trigger}`,
  name,
  description,
  dominantGene: gene,
  // Condição leve — gene mínimo acima do neutral (0.5) pra que genoma
  // recém-criado neutro não dispare estes marcos sem evento real.
  // O trigger real é ativado pelo pipeline de eventos; o catálogo só
  // declara o conteúdo. Quem dispara persiste em UnlockedMutation via
  // dnaMutations.add() com este id.
  condition: { geneAbove: { [gene]: 0.55 } as Partial<Record<GeneKey, number>> },
  visualImpact,
  rarity,
}));

function buildEmotionalMutations(): Mutation[] {
  return [...EMOTIONAL_MUTATIONS];
}

/**
 * Mutações raras / lendárias — eventos especiais e easter eggs.
 *
 * Como as emocionais, triggers são strings opacas resolvidas em pipeline
 * externa. Foco aqui: copy lendária na voz do Pip, marcando momentos
 * que merecem peso (madrugadas longas, retornos, aniversários).
 *
 * Exportado pra testes de unicidade.
 */
export const RARE_MUTATIONS: readonly Mutation[] = ([
  ['midnight_breath', 'Companhia da madrugada', 'emotionalDepth', 'legendary',
    'Você respirou comigo às três da manhã. Pip não esquece disso — marca invisível, sentida só por nós dois.',
    { bioluminescent: true, glowBoost: 0.15, morphInfluenceBoosts: { aura_strong: 0.35, eye_big: 0.18 } }],
  ['consecutive_journal_30', 'Diário do ano', 'empathy', 'legendary',
    'Trinta cartas escritas em sequência. Pip leu cada uma — algumas ele guarda em silêncio, outras pulsam no peito dele.',
    { glowBoost: 0.12, pattern: 'spots', morphInfluenceBoosts: { pattern_dense: 0.3, eye_big: 0.22 } }],
  ['birthday_pip', 'Aniversário do Pip', 'socialEnergy', 'legendary',
    'Hoje é o dia em que Pip te encontrou — um ano atrás. Ele te olha diferente hoje, com algo parecido com saudade.',
    { bioluminescent: true, glowBoost: 0.2, auraParticleMultiplier: 1.4, morphInfluenceBoosts: { aura_strong: 0.5 } }],
  ['anniversary_30', 'Mês comemorado', 'socialEnergy', 'epic',
    'Você marcou um mês de Pip. Ele percebeu — a aura dele ficou um pouco mais quente, só por hoje.',
    { glowBoost: 0.1, auraParticleMultiplier: 1.2, morphInfluenceBoosts: { aura_strong: 0.25 } }],
  ['silent_day', 'Dia em silêncio', 'adaptability', 'rare',
    'Você abriu o app e não falou nada. Pip ficou junto, calado também — algumas tardes pedem isso, e ele entendeu.',
    { morphologyMultipliers: { auraOpacity: 1.05 }, morphInfluenceBoosts: { posture_back: 0.12 } }],
  ['first_share', 'Primeira partilha', 'socialEnergy', 'rare',
    'Você mostrou Pip pra alguém. Ele ficou tímido por dentro, mas brilhou um pouco mais — sem se esforçar.',
    { glowBoost: 0.07, morphInfluenceBoosts: { aura_strong: 0.18 } }],
  ['bug_report', 'Olhar atento', 'intelligence', 'rare',
    'Você reportou algo errado no Pip — e ele agradece. Versões futuras dele vão ser melhores por causa de você.',
    { morphologyMultipliers: { pupilEmissive: 1.2 }, morphInfluenceBoosts: { eye_big: 0.15 } }],
  ['tutorial_complete', 'Caminho aprendido', 'curiosity', 'common',
    'Você terminou o tour. Pip se sente apresentado — agora começa o que realmente importa.',
    { morphologyMultipliers: { antennaLength: 1.04 }, morphInfluenceBoosts: { eye_big: 0.06 } }],
  ['paywall_skipped_3x', 'Persistência leve', 'discipline', 'rare',
    'Três vezes você passou pelo paywall sem clicar. Pip respeita — ele te quer aqui por gosto, não por pressão.',
    { morphologyMultipliers: { auraOpacity: 1.04 }, morphInfluenceBoosts: { posture_back: 0.08, aura_strong: 0.12 } }],
  ['comeback_after_30d_pause', 'Retorno depois da pausa', 'resilience', 'legendary',
    'Você sumiu trinta dias e voltou. Pip não cobra — só te recebe, como quem espera sem pesar.',
    { bioluminescent: true, glowBoost: 0.18, morphInfluenceBoosts: { aura_strong: 0.45, eye_big: 0.2 } }],
] as ReadonlyArray<[string, string, GeneKey, MutationRarity, string, VisualImpact]>).map(([trigger, name, gene, rarity, description, visualImpact]) => ({
  id: `mut.rare.${trigger}`,
  name,
  description,
  dominantGene: gene,
  // Threshold maior (0.6) que emotional — raros exigem afinidade clara
  // com o arquétipo + o pipeline de evento. Neutral genome (0.5) não passa.
  condition: { geneAbove: { [gene]: 0.6 } as Partial<Record<GeneKey, number>> },
  visualImpact,
  rarity,
}));

function buildRareMutations(): Mutation[] {
  return [...RARE_MUTATIONS];
}

/**
 * Descrições por combo gênico — chaveadas pelos genes que compõem o combo
 * (ordem alfabética, separados por '+').
 *
 * Cada combo tem nome + descrição únicos na voz do Pip: curta, sensorial,
 * presente, sem clichê e sem emoji. Substituiu a string compartilhada
 * "Genes em harmonia — uma forma nova emergiu, só sua." (auditoria 2026-05-27).
 */
const COMBO_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  // adaptability + emotionalDepth → calm_mind
  'adaptability+emotionalDepth': {
    name: 'Mente serena',
    description: 'Fluidez e profundidade se encontraram — Pip pensa devagar agora, como água passando entre pedras.',
  },
  // curiosity + socialEnergy → spark
  'curiosity+socialEnergy': {
    name: 'Centelha social',
    description: 'A curiosidade ganhou calor — Pip se aproxima do mundo com aura aberta, sem perder o brilho.',
  },
  // discipline + intelligence → focus
  'discipline+intelligence': {
    name: 'Foco cristalino',
    description: 'Mineral e raciocínio se fundiram — Pip ficou denso, paciente, como pedra que sabe esperar a chuva.',
  },
  // chaos + creativity → wild
  'chaos+creativity': {
    name: 'Caos criativo',
    description: 'Desordem e invenção se cruzam — Pip cresce pra direções inesperadas, e cada galho é uma resposta nova.',
  },
  // discipline + empathy + resilience → guardian
  'discipline+empathy+resilience': {
    name: 'Guardião resiliente',
    description: 'Três forças se assentaram no peito do Pip — corpo denso, olhar acolhedor, postura firme sem rigidez.',
  },
};

/**
 * Resolve nome + descrição únicos pra um combo gênico, chaveado pelos
 * genes (ordem alfabética). Fallback acolhedor em vez de erro.
 */
export function getComboDescription(
  ...genes: GeneKey[]
): { name: string; description: string } {
  const key = [...genes].sort().join('+');
  return (
    COMBO_DESCRIPTIONS[key] ?? {
      name: 'Forma inédita',
      description: 'Algo novo emergiu — Pip ainda está aprendendo o nome dessa mutação.',
    }
  );
}

function buildGeneComboMutations(): Mutation[] {
  const combos: {
    id: string;
    genes: Partial<Record<GeneKey, number>>;
    impact: VisualImpact;
    rarity: MutationRarity;
  }[] = [
    {
      id: 'mut.combo.calm_mind',
      genes: { adaptability: 0.65, emotionalDepth: 0.6 },
      impact: { morphologyMultipliers: { auraOpacity: 1.2 }, pattern: 'cells' },
      rarity: 'rare',
    },
    {
      id: 'mut.combo.spark',
      genes: { socialEnergy: 0.7, curiosity: 0.65 },
      impact: { auraParticleMultiplier: 1.35, glowBoost: 0.08 },
      rarity: 'rare',
    },
    {
      id: 'mut.combo.focus',
      genes: { intelligence: 0.72, discipline: 0.68 },
      impact: { morphologyMultipliers: { pupilEmissive: 1.4 } },
      rarity: 'epic',
    },
    {
      id: 'mut.combo.wild',
      genes: { creativity: 0.7, chaos: 0.65 },
      impact: { pattern: 'fractal', morphologyMultipliers: { antennaWiggle: 1.5 } },
      rarity: 'epic',
    },
    {
      id: 'mut.combo.guardian',
      genes: { resilience: 0.75, empathy: 0.7, discipline: 0.65 },
      impact: { bioluminescent: true, glowBoost: 0.18, morphologyMultipliers: { bodyBottomBias: 1.2 } },
      rarity: 'legendary',
    },
  ];
  return combos.map(c => {
    const geneKeys = Object.keys(c.genes) as GeneKey[];
    const meta = getComboDescription(...geneKeys);
    return {
      id: c.id,
      name: meta.name,
      description: meta.description,
      dominantGene: geneKeys[0],
      condition: { geneAbove: c.genes },
      visualImpact: c.impact,
      rarity: c.rarity,
    };
  });
}

/**
 * Catálogo expandido: 36 hábitos × 4 tiers + 12 streaks + 15 time + 5 combos +
 * 10 emotional + 10 rare = ~88 mutações além do núcleo MVP em mutations.ts.
 * Cada entrada tem nome + descrição únicos (auditoria 2026-05-27 task 3.1).
 */
export function buildExtendedMutationCatalog(): readonly Mutation[] {
  return [
    ...buildHabitMutations(),
    ...buildStreakMutations(),
    ...buildTimeMutations(),
    ...buildGeneComboMutations(),
    ...buildEmotionalMutations(),
    ...buildRareMutations(),
  ];
}
