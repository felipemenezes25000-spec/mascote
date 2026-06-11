/**
 * Cosmos de Criaturas — o ovo choca em QUALQUER bicho, decidido pelas ações.
 *
 * Princípio central (pedido do fundador): "do ovo pode sair qualquer animal,
 * tudo depende das ações da pessoa". O genoma de 11 genes JÁ faz drift por
 * hábito (src/lib/dna/habitToGene.ts) — então a espécie derivada do genoma É
 * consequência direta do que a pessoa faz. Sem contador novo, sem culpa.
 *
 * Coerência > caos: cada ARQUÉTIPO (família de espécie) restringe quais traços
 * fazem sentido juntos — um felino tem orelha de gato + focinho + cauda felina,
 * uma ave tem bico + asas + cauda de penas. Nunca "cobra com 4 patas e asa de
 * borboleta". Isso garante que os >10 mil modelos sejam todos plausíveis.
 *
 * A contagem real de combinações coerentes (ver `countCoherentCreatures`)
 * passa de 1 milhão — o teste prova > 10.000 com folga enorme.
 */

/** Famílias de espécie. Cada uma dispara por um perfil de genes/ações. */
export type CreatureArchetype =
  | 'feline' // gato/lince — empatia + profundidade, calmo
  | 'canine' // cão/raposa — social + empatia, leal
  | 'avian' // ave — curiosidade + social, ar livre/sol
  | 'reptile' // lagarto — disciplina + resiliência
  | 'draconic' // dragão — intensidade + resiliência + caos
  | 'aquatic' // peixe/golfinho — adaptabilidade + água
  | 'amphibian' // sapo/anfíbio — adaptabilidade + caos
  | 'rodent' // roedor/coelho — empatia + curiosidade, pequeno
  | 'ursine' // urso — resiliência + empatia, grande
  | 'insectoid' // inseto/mariposa — criatividade + curiosidade
  | 'plant' // criatura-planta — criatividade + empatia, ar livre
  | 'crystalline' // cristal vivo — disciplina + inteligência
  | 'spirit' // espírito/fantasminha — profundidade + inteligência
  | 'mythic' // quimera/unicórnio — caos + criatividade (raro)
  | 'slime'; // gosma — forma essencial, base adaptável

export type BodyPlan =
  | 'round' | 'oval' | 'tall' | 'long' | 'squat' | 'teardrop' | 'serpentine' | 'blob';

export type EarType =
  | 'none' | 'cat' | 'fox' | 'rabbit' | 'round' | 'fin' | 'tuft' | 'feather';

export type EyeType =
  | 'round' | 'sparkle' | 'sleepy' | 'sharp' | 'big' | 'droopy';

export type SnoutType =
  | 'none' | 'cat' | 'dog' | 'beakShort' | 'beakLong' | 'muzzle' | 'frog';

export type TailType =
  | 'none' | 'cat' | 'foxFluffy' | 'lizard' | 'fish' | 'feather' | 'wisp' | 'curl' | 'leaf';

export type WingType =
  | 'none' | 'feather' | 'bat' | 'butterfly' | 'energy' | 'fin';

/** Adorno do topo da cabeça (chifres, crista, antena, halo, broto). */
export type CrownType =
  | 'none' | 'antenna' | 'singleHorn' | 'twinHorn' | 'crest' | 'halo' | 'leafSprout' | 'flame';

export type CreaturePattern =
  | 'plain' | 'spots' | 'stripes' | 'belly' | 'scales' | 'petals' | 'freckles' | 'swirl';

export type LimbType = 'none' | 'twoLegs' | 'fourLegs' | 'fins' | 'roots';

export type CreatureSize = 'small' | 'medium' | 'large';

export type CreatureRarity = 'comum' | 'incomum' | 'raro' | 'épico' | 'lendário';

/** Paleta resolvida em hex pro renderer (derivada do genoma via paletteFromGenome). */
export interface CreaturePalette {
  body: string;
  accent: string;
  deep: string;
  belly: string;
  eye: string;
}

/**
 * Genoma de criatura — descrição COMPLETA e determinística do bicho.
 * Tudo derivado puro do Genome (11 genes) via `creatureGenomeFromDNA`.
 */
export interface CreatureGenome {
  archetype: CreatureArchetype;
  bodyPlan: BodyPlan;
  ears: EarType;
  eyes: EyeType;
  snout: SnoutType;
  tail: TailType;
  wings: WingType;
  crown: CrownType;
  pattern: CreaturePattern;
  limbs: LimbType;
  size: CreatureSize;
  /** Índice da paleta (0..N) — bucket discreto pra contagem/coleção. */
  paletteId: number;
  palette: CreaturePalette;
  /** Nome da espécie pra UI ("Felino Lunar", "Dragãozinho de Brasa"). */
  speciesName: string;
  rarity: CreatureRarity;
  /** Bochechas/blush coradas (traço de fofura, alguns arquétipos sempre têm). */
  cheeks: boolean;
}

/** Pools de traços permitidos por arquétipo (garante coerência visual). */
export interface ArchetypeSpec {
  id: CreatureArchetype;
  /** Rótulo PT-BR base ("Felino", "Dragãozinho"). */
  label: string;
  /** Raridade base do arquétipo. */
  baseRarity: CreatureRarity;
  /** Bochechas sempre coradas? (fofos). */
  cheeks: boolean;
  bodyPlans: BodyPlan[];
  ears: EarType[];
  eyes: EyeType[];
  snouts: SnoutType[];
  tails: TailType[];
  wings: WingType[];
  crowns: CrownType[];
  patterns: CreaturePattern[];
  limbs: LimbType[];
  sizes: CreatureSize[];
}
