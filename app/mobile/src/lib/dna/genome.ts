/**
 * Genoma procedural — o núcleo do sistema "Digital Living Identity".
 *
 * Cada mascote possui um Genome: 11 floats em [0.02, 0.98] que governam
 * morfologia, paleta, animação, postura, e comportamento emergente.
 *
 * **Princípios invioláveis preservados aqui:**
 * - Determinismo total: mesmo seed gera mesmo genoma. SEMPRE.
 * - Sem culpa: drift é sempre não-negativo (ver habitToGene.ts).
 * - Privacidade local: o Genome nunca sai do device. Nunca vai pra IA.
 *   Validações ativas em pentest (ver tests/security/dna-privacy.test.ts).
 * - Sem terapia: o genoma não diagnostica. É expressão estética/comportamental,
 *   nunca interpretado como sintoma.
 */

/** Chaves dos 11 genes que compõem o genoma. Ordem é parte do contrato. */
export const GENE_KEYS = [
  'empathy',
  'curiosity',
  'creativity',
  'discipline',
  'chaos',
  'aggression',
  'resilience',
  'emotionalDepth',
  'socialEnergy',
  'adaptability',
  'intelligence',
] as const;

export type GeneKey = (typeof GENE_KEYS)[number];

/**
 * Genome — 11 traits contínuos.
 *
 * Faixa válida: [GENE_MIN, GENE_MAX].
 * Floats em ponto de [0.02, 0.98] evitam extremos absolutos que produzem
 * geometrias degeneradas (corpos sem volume, olhos invertidos).
 */
export type Genome = Record<GeneKey, number>;

export const GENE_MIN = 0.02;
export const GENE_MAX = 0.98;

/** Metadata humana (label PT-BR, descrição visual). Imutável. */
export interface GeneMeta {
  key: GeneKey;
  label: string;
  desc: string;
}

export const GENE_META: readonly GeneMeta[] = [
  { key: 'empathy',         label: 'Empatia',                 desc: 'tamanho dos olhos, inclinação da cabeça, suavidade dos movimentos' },
  { key: 'curiosity',       label: 'Curiosidade',             desc: 'velocidade do eye-tracking, dilatação da pupila, antenas' },
  { key: 'creativity',      label: 'Criatividade',            desc: 'tentáculos, padrões, formas exóticas, partículas' },
  { key: 'discipline',      label: 'Disciplina',              desc: 'simetria, postura ereta, brilho refinado' },
  { key: 'chaos',           label: 'Caos',                    desc: 'assimetria, número de membros, deformações' },
  { key: 'aggression',      label: 'Intensidade',             desc: 'espinhos, ângulos, postura defensiva' },
  { key: 'resilience',      label: 'Resiliência',             desc: 'densidade corporal, robustez, base larga' },
  { key: 'emotionalDepth',  label: 'Profundidade emocional',  desc: 'expressividade, mudanças de cor com humor' },
  { key: 'socialEnergy',    label: 'Energia social',          desc: 'aura, calor da paleta, abertura corporal' },
  { key: 'adaptability',    label: 'Adaptabilidade',          desc: 'fluidez, transições suaves' },
  { key: 'intelligence',    label: 'Inteligência',            desc: 'proporção crânio, brilho dos olhos' },
] as const;

// ============================================================================
// PRNG seedable — mulberry32 (32-bit, rápido, distribuição uniforme aceitável).
// Determinismo é parte do contrato: mesmo seed = mesmo genoma SEMPRE.
// ============================================================================

/**
 * Cria uma função RNG determinística a partir de um seed inteiro.
 * Uso: const rng = mulberry32(42); rng(); // sempre retorna o mesmo valor.
 */
export function mulberry32(seed: number): () => number {
  // Force int32; aceita negativos, NaN/Infinity viram 0
  let s = Math.floor(seed) | 0;
  if (!Number.isFinite(seed)) s = 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp simples ao range [GENE_MIN, GENE_MAX]. */
export function clampGene(v: number): number {
  if (!Number.isFinite(v)) return (GENE_MIN + GENE_MAX) / 2;
  if (v < GENE_MIN) return GENE_MIN;
  if (v > GENE_MAX) return GENE_MAX;
  return v;
}

// ============================================================================
// Geração de genoma
// ============================================================================

/**
 * Gera um Genome novo a partir de um seed inteiro.
 *
 * Distribuição: média de 2 uniformes (beta(2,2)-ish) — favorece valores
 * "com personalidade" sem extremos absolutos. ~18% das vezes empurra
 * gene pra extremo (cria criaturas marcantes).
 *
 * @param seed Inteiro qualquer. NaN/Infinity tratados como 0.
 * @returns Genome com 11 floats em [GENE_MIN, GENE_MAX].
 */
export function generateGenome(seed: number): Genome {
  const rng = mulberry32(seed);
  const out = {} as Genome;
  for (const g of GENE_KEYS) {
    const a = rng();
    const b = rng();
    let v = (a + b) / 2;
    if (rng() < 0.18) {
      v = rng() < 0.5 ? v * 0.3 : 1 - (1 - v) * 0.3;
    }
    out[g] = clampGene(v);
  }
  return out;
}

/**
 * Mistura um genoma com um preset, com variação procedural.
 * Usado pra dar variação a usuários que escolhem mesma personalidade.
 *
 * @param seed Seed determinístico (geralmente derivado de userId)
 * @param preset Genome base (uma das 4 personalidades)
 * @param variance Amplitude da variação por gene (default 0.1)
 */
export function genomeFromPreset(
  seed: number,
  preset: Genome,
  variance = 0.1,
): Genome {
  const rng = mulberry32(seed);
  const safeVariance = Math.max(0, Math.min(0.5, variance));
  const out = {} as Genome;
  for (const g of GENE_KEYS) {
    const drift = (rng() - 0.5) * 2 * safeVariance;
    out[g] = clampGene(preset[g] + drift);
  }
  return out;
}

/** Cria um genoma neutro (todos os genes em 0.5). Útil pra testes. */
export function neutralGenome(): Genome {
  const out = {} as Genome;
  for (const g of GENE_KEYS) {
    out[g] = 0.5;
  }
  return out;
}

// ============================================================================
// Validação e sanitização
// ============================================================================

/** Type guard: payload é um Genome válido? */
export function isGenome(g: unknown): g is Genome {
  if (typeof g !== 'object' || g === null) return false;
  const obj = g as Record<string, unknown>;
  for (const key of GENE_KEYS) {
    const v = obj[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
    if (v < GENE_MIN || v > GENE_MAX) return false;
  }
  return true;
}

/**
 * Sanitiza um payload qualquer em Genome — tolera input corrompido,
 * chaves faltando, valores fora de range, tipos errados.
 *
 * Genes faltando recebem 0.5. Genes inválidos são clampados.
 * NUNCA lança. Garante invariante de tipo na fronteira de persistência.
 */
export function sanitizeGenome(input: unknown): Genome {
  const out = {} as Genome;
  const obj = (typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)
    : {});
  for (const g of GENE_KEYS) {
    const raw = obj[g];
    const n = typeof raw === 'number' ? raw : Number.NaN;
    out[g] = clampGene(n);
  }
  return out;
}

/** Compara dois genomas — true se equivalentes dentro de uma tolerância. */
export function genomesEqual(a: Genome, b: Genome, epsilon = 1e-6): boolean {
  for (const g of GENE_KEYS) {
    if (Math.abs(a[g] - b[g]) > epsilon) return false;
  }
  return true;
}

// ============================================================================
// Arquétipo emergente (gene dominante)
// ============================================================================

export type ArchetypeKey =
  | 'empathy'
  | 'curiosity'
  | 'creativity'
  | 'discipline'
  | 'chaos'
  | 'aggression'
  | 'resilience'
  | 'emotionalDepth'
  | 'socialEnergy'
  | 'adaptability'
  | 'intelligence';

export interface Archetype {
  key: ArchetypeKey;
  name: string;        // "O Acolhedor"
  tag: string;         // "criatura empática"
  tagline: string;     // "aprende observando emoções"
}

const ARCHETYPE_TABLE: Record<GeneKey, Archetype> = {
  empathy:        { key: 'empathy',        name: 'O Acolhedor',     tag: 'criatura empática',       tagline: 'aprende observando emoções' },
  curiosity:      { key: 'curiosity',      name: 'O Explorador',    tag: 'criatura inquieta',       tagline: 'persegue todos os estímulos' },
  creativity:     { key: 'creativity',     name: 'O Sonhador',      tag: 'criatura abstrata',       tagline: 'mutações fora do padrão' },
  discipline:     { key: 'discipline',     name: 'O Refinado',      tag: 'criatura simétrica',      tagline: 'evolução controlada e elegante' },
  chaos:          { key: 'chaos',          name: 'O Errático',      tag: 'criatura imprevisível',   tagline: 'cresce em direções inesperadas' },
  aggression:     { key: 'aggression',     name: 'O Guardião',      tag: 'criatura protetora',      tagline: 'estrutura defensiva' },
  resilience:     { key: 'resilience',     name: 'O Persistente',   tag: 'criatura robusta',        tagline: 'corpo denso e estável' },
  emotionalDepth: { key: 'emotionalDepth', name: 'O Sensível',      tag: 'criatura expressiva',     tagline: 'mudança constante de humor' },
  socialEnergy:   { key: 'socialEnergy',   name: 'O Caloroso',      tag: 'criatura radiante',       tagline: 'aura quente e aberta' },
  adaptability:   { key: 'adaptability',   name: 'O Fluido',        tag: 'criatura mutável',        tagline: 'absorve mudanças sem atrito' },
  intelligence:   { key: 'intelligence',   name: 'O Atento',        tag: 'criatura observadora',    tagline: 'olhar profundo e calculado' },
};

/** Retorna o arquétipo dominante (gene de maior valor). Empate → ordem em GENE_KEYS. */
export function getArchetype(g: Genome): Archetype {
  let bestKey: GeneKey = GENE_KEYS[0];
  let bestVal = g[bestKey];
  for (const k of GENE_KEYS) {
    if (g[k] > bestVal) {
      bestVal = g[k];
      bestKey = k;
    }
  }
  return ARCHETYPE_TABLE[bestKey];
}

// ============================================================================
// Serialização / Hashing
// ============================================================================

/**
 * Serializa um Genome em string compacta determinística.
 * Útil pra logs locais (mas NUNCA enviar pra IA — ver pentest).
 * Formato: "g1,c2,c3,..." com 4 casas decimais.
 */
export function serializeGenome(g: Genome): string {
  return GENE_KEYS.map(k => g[k].toFixed(4)).join(',');
}

/** Deserializa string. Sanitiza. */
export function deserializeGenome(s: string): Genome {
  if (typeof s !== 'string') return neutralGenome();
  const parts = s.split(',');
  const obj: Record<string, number> = {};
  for (let i = 0; i < GENE_KEYS.length; i++) {
    obj[GENE_KEYS[i]] = parseFloat(parts[i] ?? '');
  }
  return sanitizeGenome(obj);
}

/**
 * Hash curto (8 chars hex) do genoma — útil pra identificar criaturas
 * em logs/telemetry SEM expor os valores brutos. Não criptográfico.
 */
export function hashGenome(g: Genome): string {
  let h = 0x811c9dc5; // FNV-1a 32-bit
  const str = serializeGenome(g);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ============================================================================
// Nome procedural (sílabas suaves x duras dependendo do DNA)
// ============================================================================

const SOFT_SYL = ['lu','mi','no','ya','re','si','ka','to','vi','la','no','pa','ze','ji'];
const HARD_SYL = ['kru','grix','zar','vox','tark','myx','dru','skar','vek','nyx','kor','drax'];
const VOWEL_END = ['a','o','i','u','en','el','ia'];

/** Gera nome único a partir do DNA + seed adicional. */
export function generateCreatureName(g: Genome, nameSeed: number): string {
  const rng = mulberry32(nameSeed ^ 0xcafe);
  const softness = (g.empathy + g.adaptability) / 2 - (g.aggression + g.chaos) / 2;
  const pool = softness > 0 ? SOFT_SYL : HARD_SYL;
  const n = 2 + Math.floor(rng() * 2);
  let name = '';
  for (let i = 0; i < n; i++) {
    name += pool[Math.floor(rng() * pool.length)];
  }
  if (rng() < 0.5) {
    name += VOWEL_END[Math.floor(rng() * VOWEL_END.length)];
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}
