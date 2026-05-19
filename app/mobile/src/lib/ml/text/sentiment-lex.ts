/**
 * Léxico afetivo PT-BR (LIWC-inspirado) com scoring VADER-like:
 *  - Polaridade [-1, +1]
 *  - Intensidade modulada por intensifiers ("muito", "super") e negation
 *  - Bonus por sinais de pontuação (?, !) e emojis
 *
 * Léxico curado pra wellness/saúde mental — não é genérico de produto.
 * Construído a mão (~250 termos) cobrindo gírias comuns no Brasil.
 *
 * Output: score contínuo + features (intensity, has_negation, polarity_word_count)
 * pra alimentar fusion no `mood.ts`.
 */

import { stripDiacritics } from './tokenize';

/** Score base por palavra. Positivo = bem-estar; negativo = sofrimento. */
const LEXICON: Record<string, number> = {
  // ━━━━ MUITO POSITIVO (+2..+3) ━━━━
  'feliz': 2.5, 'felicidade': 2.5, 'alegre': 2.5, 'alegria': 2.5,
  'maravilhoso': 3, 'maravilha': 3, 'maravilhosa': 3,
  'incrivel': 2.8, 'incriveis': 2.8, 'extraordinario': 2.8,
  'amor': 2.5, 'apaixonado': 2.5, 'apaixonada': 2.5,
  'gratidao': 2.8, 'grato': 2.8, 'grata': 2.8, 'agradecid': 2.5,
  'realizad': 2.5, 'orgulhos': 2.3,
  'paz': 2.5, 'sereno': 2.3, 'serena': 2.3, 'calmo': 1.8, 'calma': 1.8,
  'tranquilo': 2, 'tranquila': 2,
  'descansad': 2, 'energizad': 2.3, 'animado': 2.3, 'animada': 2.3, 'empolgad': 2.5,
  'esperancos': 2.3,

  // ━━━━ POSITIVO LEVE (+1..+2) ━━━━
  'bem': 1.2, 'bom': 1.3, 'boa': 1.3, 'legal': 1.3,
  'gosto': 1.5, 'gostei': 1.5, 'curtir': 1.3, 'curti': 1.3,
  'consegui': 1.8, 'venci': 2, 'ganhei': 1.5,
  'melhor': 1.5, 'melhorou': 1.8, 'evolui': 1.8,
  'rir': 1.5, 'risadinha': 1.3, 'riso': 1.5, 'sorrir': 1.5,
  'leveza': 1.8, 'leve': 1.5,
  'esperanca': 1.8, 'fe': 1.5,
  'amig': 1.5, 'companheir': 1.5,

  // ━━━━ NEUTRO POSITIVO (+0.5..+1) ━━━━
  'ok': 0.5, 'normal': 0.3, 'mediano': 0.3, 'estavel': 0.5,
  'aceitavel': 0.7, 'dav': 0.3,

  // ━━━━ NEGATIVO LEVE (-1..-2) ━━━━
  'cansad': -1.5, 'exaust': -2, 'esgotad': -2.3,
  'estress': -1.8, 'sobrecarregad': -2,
  'preocupad': -1.5, 'apreensiv': -1.5, 'tens': -1.5, 'tensa': -1.5, 'tenso': -1.5,
  'irritad': -1.5, 'brav': -1.3, 'puta': -1.5, 'putoa': -1.5,
  'frustrad': -2, 'decepcionad': -2, 'desapontad': -2,
  'chate': -1.3, 'mal': -1.3, 'pior': -1.5,
  'pesad': -1.5, 'lerd': -1.2, 'desmotivad': -2,

  // ━━━━ NEGATIVO FORTE (-2..-3) ━━━━
  'deprim': -2.5, 'deprimid': -2.5, 'depressa': -2,
  'triste': -2.3, 'tristeza': -2.3, 'chorando': -2.3, 'chorei': -2.3,
  'mag': -1.5, 'lagrim': -2, 'choro': -2,
  'ansios': -2.3, 'ansiedade': -2.3, 'panic': -2.8, 'aflit': -2.3,
  'medo': -2, 'pavor': -2.5, 'terror': -2.8, 'aterroriz': -2.8,
  'solid': -2.3, 'sozinh': -2, 'isolad': -2, 'abandonad': -2.5,
  'culpa': -2, 'culpad': -2, 'mereci': -1.5, 'fracass': -2.3, 'fracas': -2.3,
  'derrotad': -2.3, 'perdid': -2,
  'desesperancado': -2.8, 'desesper': -2.8,
  'vazi': -2.3, 'apatic': -2.3, 'apatia': -2.3,
  'odi': -2.5, 'odeio': -2.5, 'detest': -2,
  'angustia': -2.5, 'angustiad': -2.5,
  'desanimad': -2,

  // ━━━━ CRISE (-3..-4) — flagged separadamente em safety ━━━━
  'suicid': -4, 'morrer': -3, 'matar': -3.5,
  'autodestr': -3.5,
};

/** Intensifiers multiplicam o próximo termo afetivo. */
const INTENSIFIERS: Record<string, number> = {
  'muito': 1.5, 'bem': 1.3, 'super': 1.5, 'mega': 1.6, 'extremamente': 1.8,
  'demais': 1.5, 'completamente': 1.7, 'totalmente': 1.7, 'profundamente': 1.6,
  'meio': 0.6, 'pouco': 0.5, 'levemente': 0.5, 'um pouco': 0.6,
  'tao': 1.4, 'tanto': 1.3, 'puro': 1.4,
};

/** Negators invertem polaridade do próximo termo afetivo. */
const NEGATORS = new Set(['nao', 'nunca', 'jamais', 'nem', 'sem', 'nenhum', 'nenhuma']);

/** Emojis com peso afetivo (subset comum). */
const EMOJI_SCORE: Record<string, number> = {
  '💛': 1.5, '❤️': 1.8, '💜': 1.5, '🧡': 1.5, '💚': 1.5, '💙': 1.3, '💗': 1.8,
  '🥰': 2, '😊': 1.8, '😄': 1.8, '😁': 1.8, '🤗': 1.8, '🙏': 1.5,
  '✨': 1, '🌱': 1, '🌟': 1.3, '🌸': 1, '🌞': 1.3, '☀️': 1.3,
  '😢': -1.8, '😭': -2.3, '😞': -1.8, '😔': -1.8, '😟': -1.5,
  '😤': -1.5, '😡': -2, '🤬': -2.5, '😨': -2, '😱': -2.3,
  '💔': -2, '🥺': -1, '😶': -0.5, '😐': -0.3, '🙃': -0.5,
};

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1FAFF}]/gu;

export interface SentimentResult {
  /** Score normalizado em [-1, 1]. */
  score: number;
  /** Score bruto (somatório, antes de normalização). */
  raw: number;
  /** Número de palavras afetivas detectadas. */
  hits: number;
  /** Flag: existem negações modificando termos. */
  hasNegation: boolean;
  /** Magnitude (intensidade absoluta, independente de polaridade). */
  magnitude: number;
  /** Top tokens contribuindo (debug). */
  contributors: Array<{ token: string; weight: number }>;
}

/** Procura match no léxico considerando prefixos (lemmas truncados). */
function lookupLexicon(token: string): number | undefined {
  if (LEXICON[token] !== undefined) return LEXICON[token];
  // tentativa por prefixo (cobrir flexões: "cansada", "cansado", "cansei" → 'cansad')
  for (const key of Object.keys(LEXICON)) {
    if (key.length >= 4 && token.startsWith(key)) return LEXICON[key];
  }
  return undefined;
}

export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return { score: 0, raw: 0, hits: 0, hasNegation: false, magnitude: 0, contributors: [] };
  }
  const normalized = stripDiacritics(text.toLowerCase());
  // captura emojis ANTES de tokenizar (perderiam no split alfanumérico)
  const emojis = Array.from(text.matchAll(EMOJI_REGEX)).map(m => m[0]);

  const words = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  let raw = 0;
  let hits = 0;
  let hasNegation = false;
  let pendingNegation = false;
  let pendingIntensifier = 1;
  const contributors: Array<{ token: string; weight: number }> = [];

  for (const w of words) {
    // negator vira flag, não conta sozinho
    if (NEGATORS.has(w)) {
      pendingNegation = true;
      hasNegation = true;
      continue;
    }
    // intensifier modula o PRÓXIMO afetivo
    if (INTENSIFIERS[w] !== undefined) {
      pendingIntensifier *= INTENSIFIERS[w];
      continue;
    }
    const baseScore = lookupLexicon(w);
    if (baseScore !== undefined) {
      let s = baseScore * pendingIntensifier;
      if (pendingNegation) s = -s * 0.7; // negação não inverte completamente
      raw += s;
      hits += 1;
      contributors.push({ token: w, weight: s });
      pendingNegation = false;
      pendingIntensifier = 1;
    } else {
      // palavra "neutra" passou — reset modificadores depois de gap longo
      if (pendingIntensifier !== 1 || pendingNegation) {
        // reset gradual: cada palavra neutra reduz, depois de 3 esquece
        pendingIntensifier = 1 + (pendingIntensifier - 1) * 0.5;
        if (Math.abs(pendingIntensifier - 1) < 0.05) pendingIntensifier = 1;
      }
    }
  }

  // Emojis somam direto
  for (const e of emojis) {
    const score = EMOJI_SCORE[e];
    if (score !== undefined) {
      raw += score;
      hits += 1;
      contributors.push({ token: e, weight: score });
    }
  }

  // Pontuação: ! e ? aumentam magnitude (mas pouco)
  const exclam = (text.match(/!/g) ?? []).length;
  const quest = (text.match(/\?/g) ?? []).length;
  if (exclam > 0 && raw > 0) raw *= 1 + Math.min(exclam, 3) * 0.05;
  if (exclam > 0 && raw < 0) raw *= 1 + Math.min(exclam, 3) * 0.05;
  if (quest > 1 && raw !== 0) raw *= 1 + Math.min(quest - 1, 2) * 0.03;

  // Normalização: tanh-like clamping pra [-1, 1]
  const normalized_score = raw / Math.sqrt(raw * raw + 15);

  contributors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  return {
    score: normalized_score,
    raw,
    hits,
    hasNegation,
    magnitude: Math.abs(normalized_score),
    contributors: contributors.slice(0, 5),
  };
}

/**
 * Vibe categórica a partir do score contínuo — útil pra compatibilidade
 * com `mood.ts` legado que usava enum.
 */
export function vibeFromScore(score: number): 'muito_positivo' | 'positivo' | 'neutro' | 'negativo' | 'muito_negativo' {
  if (score >= 0.5) return 'muito_positivo';
  if (score >= 0.15) return 'positivo';
  if (score >= -0.15) return 'neutro';
  if (score >= -0.5) return 'negativo';
  return 'muito_negativo';
}
