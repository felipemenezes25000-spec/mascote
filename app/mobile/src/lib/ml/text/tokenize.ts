/**
 * Tokenização PT-BR para pipelines de ML.
 *
 * - Lowercase + remoção de diacríticos (NFD)
 * - Split por não-alfanuméricos (preserva emojis opcionalmente)
 * - Remoção de stopwords PT
 * - Stemming simples (sufixos comuns) — Porter-light pra português
 * - Negation handling: "não gosto" → "não_gosto" (preserva polaridade)
 *
 * Tradeoff: stemmer é heurístico (não rspamd-quality), mas zero deps.
 */

const STOPWORDS_PT = new Set([
  'a','o','as','os','um','uma','uns','umas',
  'de','do','da','dos','das','em','no','na','nos','nas',
  'pra','para','por','pelo','pela','pelos','pelas',
  'com','sem','sob','sobre','até','ate','após','apos','antes',
  'e','ou','mas','porém','porem','que','se','quando','onde','como','porque','pois',
  'eu','tu','você','voce','ele','ela','nós','nos','vós','vos','eles','elas',
  'me','te','se','lhe','nos','vos','lhes',
  'meu','minha','meus','minhas','seu','sua','seus','suas','nosso','nossa',
  'esse','essa','isso','este','esta','isto','aquele','aquela','aquilo',
  'aqui','lá','la','aí','ai','já','ja','agora','depois','antes','sempre','nunca',
  'muito','pouco','mais','menos','também','tambem','só','so','apenas',
  'tá','ta','tô','to','né','ne','tipo','assim',
  'foi','vai','vou','vão','vou','tem','tenho','têm','ter','tinha','será','sera',
  'sou','é','são','sao','está','esta','estão','estao','estou','seja','sejam',
  'fazer','fiz','faz','fez','feito',
  'do','dum','duma','duns','dumas',
  'pelo','pela',
  'aos','das','dos',
]);

const NEGATION_WORDS = new Set(['não', 'nao', 'nunca', 'jamais', 'nenhum', 'nenhuma', 'nem']);

const PRESERVE_NEGATIONS = true;

/** Remove diacríticos: "ansiosa" → "ansiosa", "não" → "nao" */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036F]/g, '');
}

/**
 * Porter-light pra PT: corta sufixos comuns de flexão.
 * Conservador — só remove se a raiz fica com 3+ chars.
 */
const SUFFIXES = [
  // verbos infinitivo
  'ando', 'endo', 'indo',     // gerúndio
  'aram', 'eram', 'iram',     // pretérito perfeito 3pl
  'asse', 'esse', 'isse',     // imperfeito subjuntivo
  'aria', 'eria', 'iria',     // futuro pretérito
  'amos', 'emos', 'imos',
  'ar', 'er', 'ir',           // infinitivo
  'ou', 'ei',                  // pretérito perfeito sing
  // substantivos / adjetivos
  'mente',                    // advérbio
  'ções', 'coes', 'ção', 'cao',
  'idade', 'idades',
  'ismos', 'ismo',
  'istas', 'ista',
  'inhas', 'inhos', 'inha', 'inho',
  'osas', 'osos', 'osa', 'oso',
  'esse', 'essa',
  // plural simples
  'es', 'os', 'as', 'ns',
  's',
];

export function stem(word: string): string {
  if (word.length <= 4) return word;
  for (const suf of SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      return word.slice(0, word.length - suf.length);
    }
  }
  return word;
}

export interface TokenizeOptions {
  removeStopwords?: boolean;
  stem?: boolean;
  handleNegation?: boolean;
  minLength?: number;
  keepEmojis?: boolean;
}

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;

export function tokenize(text: string, opts: TokenizeOptions = {}): string[] {
  const {
    removeStopwords = true,
    stem: doStem = true,
    handleNegation = PRESERVE_NEGATIONS,
    minLength = 2,
    keepEmojis = false,
  } = opts;

  const emojis: string[] = keepEmojis ? Array.from(text.matchAll(EMOJI_REGEX)).map(m => m[0]) : [];
  const cleaned = stripDiacritics(text.toLowerCase());
  const rawTokens = cleaned.split(/[^a-z0-9_]+/).filter(t => t.length >= minLength);

  const out: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];

    // Negation: "nao gosto" → "nao_gosto" (preserva polaridade junta)
    if (handleNegation && NEGATION_WORDS.has(t) && i + 1 < rawTokens.length) {
      const next = rawTokens[i + 1];
      if (!STOPWORDS_PT.has(next)) {
        out.push(`${t}_${doStem ? stem(next) : next}`);
        i++; // pulamos o próximo
        continue;
      }
    }

    if (removeStopwords && STOPWORDS_PT.has(t)) continue;
    out.push(doStem ? stem(t) : t);
  }
  for (const e of emojis) out.push(e);
  return out;
}

/**
 * Hashing trick: mapeia token → bucket fixo. Permite "embedding"
 * dimensional sem manter vocabulário (constante memória).
 * Usa FNV-1a 32-bit.
 */
export function hashToken(token: string, dim: number): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash % dim;
}

/** Cosine similarity de dois vetores densos. */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

/** Cosine similarity de dois maps esparsos (token → weight). */
export function cosineSparse(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, va] of a) {
    na += va * va;
    const vb = b.get(k);
    if (vb !== undefined) dot += va * vb;
  }
  for (const vb of b.values()) nb += vb * vb;
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}
