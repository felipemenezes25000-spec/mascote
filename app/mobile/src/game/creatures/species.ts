import type { Genome } from '@/lib/dna/genome';
import { hslToHex } from '@/lib/procedural';
import { ARCHETYPES, ARCHETYPE_IDS } from './archetypes';
import type {
  CreatureArchetype,
  CreatureGenome,
  CreaturePalette,
  CreatureRarity,
} from './types';

/**
 * Derivação da criatura a partir do DNA — 100% pura e determinística.
 * Mesmo genoma → mesma criatura, SEMPRE (igual ao resto do sistema DLI).
 *
 * Como as ações entram: o genoma faz drift por hábito (habitToGene.ts), então
 * cumprir hábitos diferentes empurra os genes e MUDA a espécie ao longo do
 * tempo — "do ovo pode sair qualquer bicho, depende do que a pessoa faz".
 */

/** Hash determinístico de um número [0,1] + sal — espalha bem. */
function hashSlot(genome: Genome, salt: number): number {
  let h = 0x811c9dc5 ^ Math.floor(salt * 2654435761) >>> 0;
  for (const k of Object.keys(genome) as (keyof Genome)[]) {
    const v = Math.floor((Number.isFinite(genome[k]) ? genome[k] : 0.5) * 9973);
    h ^= v + salt;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function pick<T>(pool: readonly T[], h: number): T {
  if (pool.length === 0) return undefined as unknown as T;
  return pool[h % pool.length];
}

/** Famílias de matiz por arquétipo — dão variedade cromática coerente. */
const ARCHETYPE_HUE: Record<CreatureArchetype, number> = {
  feline: 28, canine: 34, avian: 200, reptile: 120, draconic: 8,
  aquatic: 196, amphibian: 96, rodent: 40, ursine: 24, insectoid: 280,
  plant: 130, crystalline: 188, spirit: 268, mythic: 312, slime: 150,
};

/** Quantos buckets de paleta — usado na contagem e na coleção. */
export const PALETTE_BUCKETS = 24;

function creaturePalette(genome: Genome, archetype: CreatureArchetype): {
  palette: CreaturePalette;
  paletteId: number;
} {
  // Hue: mistura do anchor do arquétipo com a "assinatura" do genoma — dá
  // variedade ENORME (azuis aquáticos, verdes répteis, lilás de espírito)
  // sem cair no roxo-neon alienígena (sat/light mantidos suaves).
  const sig = (genome.empathy * 90 + genome.creativity * 80 + genome.chaos * 60) % 360;
  const anchor = ARCHETYPE_HUE[archetype];
  const hue = (anchor * 0.62 + sig * 0.38 + genome.curiosity * 24) % 360;
  const sat = 38 + genome.socialEnergy * 24 + genome.emotionalDepth * 8;
  const light = 56 + genome.resilience * 8 - genome.aggression * 6;
  const body = hslToHex([hue, clamp(sat, 28, 70), clamp(light, 48, 70)]);
  const belly = hslToHex([hue, clamp(sat - 14, 18, 56), clamp(light + 16, 62, 88)]);
  const accent = hslToHex([(hue + 24) % 360, clamp(sat + 8, 30, 74), clamp(light + 6, 50, 76)]);
  const deep = hslToHex([hue, clamp(sat + 6, 30, 72), clamp(light - 18, 26, 52)]);
  const eye = hslToHex([(hue + 200) % 360, 30, 18]);
  const paletteId = Math.floor((hue / 360) * PALETTE_BUCKETS) % PALETTE_BUCKETS;
  return { palette: { body, accent, deep, belly, eye }, paletteId };
}

/** Desvio-padrão dos 11 genes — mede o quanto a criatura já "se diferenciou". */
function geneSpread(g: Genome): number {
  const vals = Object.values(g).filter(v => Number.isFinite(v)) as number[];
  if (vals.length === 0) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

/** Pontua cada arquétipo a partir dos genes (que vêm das ações). */
function archetypeScores(g: Genome): Record<CreatureArchetype, number> {
  const inv = (x: number) => 1 - x;
  // Gosma é o ESTADO INICIAL: vence quando o genoma é achatado (recém-choco,
  // ações ainda não diferenciaram). Conforme hábitos puxam genes, o spread
  // cresce, slime cai e um bicho "de verdade" emerge. flatness∈[0,1].
  const flatness = 1 - Math.min(1, geneSpread(g) * 6);
  return {
    feline: g.empathy * 1.0 + g.emotionalDepth * 0.8 + inv(g.aggression) * 0.4 + inv(g.socialEnergy) * 0.3,
    canine: g.socialEnergy * 1.0 + g.empathy * 0.7 + g.adaptability * 0.4,
    avian: g.curiosity * 1.0 + g.socialEnergy * 0.6 + g.adaptability * 0.4 + inv(g.resilience) * 0.2,
    reptile: g.discipline * 1.0 + g.resilience * 0.8 + inv(g.socialEnergy) * 0.3,
    draconic: g.aggression * 1.1 + g.resilience * 0.7 + g.chaos * 0.5,
    aquatic: g.adaptability * 1.1 + inv(g.aggression) * 0.4 + g.emotionalDepth * 0.4,
    amphibian: g.adaptability * 0.7 + g.chaos * 0.7 + g.curiosity * 0.3,
    rodent: g.empathy * 0.7 + g.curiosity * 0.7 + inv(g.resilience) * 0.5,
    ursine: g.resilience * 1.0 + g.empathy * 0.6 + inv(g.curiosity) * 0.3,
    insectoid: g.creativity * 1.0 + g.curiosity * 0.7 + g.chaos * 0.4,
    plant: g.creativity * 0.8 + g.empathy * 0.7 + inv(g.aggression) * 0.4,
    crystalline: g.discipline * 0.9 + g.intelligence * 1.0 + inv(g.chaos) * 0.4,
    spirit: g.emotionalDepth * 1.0 + g.intelligence * 0.7 + inv(g.socialEnergy) * 0.4,
    // Mítico só vence quando caos E criatividade são ambos altos (incomum).
    mythic: g.chaos * 0.7 + g.creativity * 0.8 + (g.chaos > 0.7 && g.creativity > 0.7 ? 0.6 : 0),
    // Gosma vence o genoma achatado (recém-choco). Cai forte com diferenciação.
    slime: 0.7 + flatness * 1.2,
  };
}

export function archetypeFromGenome(g: Genome): CreatureArchetype {
  const scores = archetypeScores(g);
  let best: CreatureArchetype = 'slime';
  let bestVal = -Infinity;
  for (const id of ARCHETYPE_IDS) {
    const v = scores[id];
    // Desempate determinístico por hash (estável por genoma).
    const tie = (hashSlot(g, id.length * 7 + 3) % 1000) / 100000;
    if (v + tie > bestVal) {
      bestVal = v + tie;
      best = id;
    }
  }
  return best;
}

const ADJECTIVES_BY_HUE: [number, string][] = [
  [20, 'de Brasa'], [50, 'Dourado'], [90, 'Selvagem'], [140, 'da Mata'],
  [180, 'Sereno'], [210, 'Celeste'], [250, 'Noturno'], [290, 'Místico'], [330, 'Floral'],
];

function adjectiveFor(hueBucket: number, g: Genome): string {
  const hue = (hueBucket / PALETTE_BUCKETS) * 360;
  let adj = 'Lunar';
  for (const [maxHue, label] of ADJECTIVES_BY_HUE) {
    if (hue <= maxHue) { adj = label; break; }
  }
  // Traços extremos sobrescrevem com algo memorável.
  if (g.intelligence > 0.82) return 'Sábio';
  if (g.aggression > 0.82) return 'Indômito';
  if (g.empathy > 0.85) return 'Gentil';
  return adj;
}

const RARITY_ORDER: CreatureRarity[] = ['comum', 'incomum', 'raro', 'épico', 'lendário'];

function bumpRarity(base: CreatureRarity, steps: number): CreatureRarity {
  const i = RARITY_ORDER.indexOf(base);
  return RARITY_ORDER[Math.max(0, Math.min(RARITY_ORDER.length - 1, i + steps))];
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

export interface CreatureOptions {
  /** Força um arquétipo (preview/bestiário). */
  forceArchetype?: CreatureArchetype;
}

/** O coração: genoma → criatura coerente completa. */
export function creatureGenomeFromDNA(
  genomeRaw: Genome | undefined | null,
  opts: CreatureOptions = {},
): CreatureGenome {
  // Genoma ausente/corrompido → genoma neutro (gosminha) sem crashar.
  const genome: Genome = genomeRaw && typeof genomeRaw === 'object'
    ? genomeRaw
    : ({ empathy: 0.5, curiosity: 0.5, creativity: 0.5, discipline: 0.5, chaos: 0.5,
        aggression: 0.5, resilience: 0.5, emotionalDepth: 0.5, socialEnergy: 0.5,
        adaptability: 0.5, intelligence: 0.5 } as Genome);

  const archetype = opts.forceArchetype ?? archetypeFromGenome(genome);
  const spec = ARCHETYPES[archetype];
  const { palette, paletteId } = creaturePalette(genome, archetype);

  const g = (slot: number) => hashSlot(genome, slot);
  const bodyPlan = pick(spec.bodyPlans, g(11));
  const ears = pick(spec.ears, g(23));
  const eyes = pick(spec.eyes, g(31));
  const snout = pick(spec.snouts, g(41));
  const tail = pick(spec.tails, g(53));
  const wings = pick(spec.wings, g(61));
  const crown = pick(spec.crowns, g(71));
  const pattern = pick(spec.patterns, g(83));
  const limbs = pick(spec.limbs, g(97));
  const size = pick(spec.sizes, g(101));

  // Raridade: arquétipo base + bônus por combinação espetacular.
  let rarity = spec.baseRarity;
  const rareCrown = crown === 'flame' || crown === 'halo' || crown === 'twinHorn' || crown === 'singleHorn';
  const rareWing = wings === 'butterfly' || wings === 'energy' || wings === 'bat';
  if (rareCrown && rareWing) rarity = bumpRarity(rarity, 1);
  if (pattern === 'swirl' && rareCrown) rarity = bumpRarity(rarity, 1);

  const speciesName = `${spec.label} ${adjectiveFor(paletteId, genome)}`;

  return {
    archetype, bodyPlan, ears, eyes, snout, tail, wings, crown, pattern, limbs,
    size, paletteId, palette, speciesName, rarity, cheeks: spec.cheeks,
  };
}

/**
 * Contagem de criaturas COERENTES — soma, por arquétipo, do produto das
 * cardinalidades dos pools, vezes os buckets de paleta. Prova que o cosmos
 * tem MUITO mais que 10 mil modelos plausíveis (na casa dos milhões).
 */
export function countCoherentCreatures(): number {
  let total = 0;
  for (const id of ARCHETYPE_IDS) {
    const s = ARCHETYPES[id];
    const product =
      s.bodyPlans.length * s.ears.length * s.eyes.length * s.snouts.length *
      s.tails.length * s.wings.length * s.crowns.length * s.patterns.length *
      s.limbs.length * s.sizes.length;
    total += product * PALETTE_BUCKETS;
  }
  return total;
}

/** Hash estável da criatura pra dedup/coleção (sem a paleta hex). */
export function creatureFingerprint(c: CreatureGenome): string {
  return [
    c.archetype, c.bodyPlan, c.ears, c.eyes, c.snout, c.tail, c.wings,
    c.crown, c.pattern, c.limbs, c.size, c.paletteId,
  ].join(':');
}
