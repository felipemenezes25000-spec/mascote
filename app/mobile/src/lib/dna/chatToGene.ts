/**
 * Chat → drift de genoma (Fase 2 da evolução visível, spec 2026-06-18).
 *
 * Conversar molda a criatura DEVAGAR e com sentido: cada mensagem do usuário é
 * lida por TEMA (palavras-chave) e por INTENSIDADE EMOCIONAL, reforçando os genes
 * correspondentes — espelha o `HABIT_GENE_MAP`, mas bem mais sutil (conversa é
 * frequente). Hábitos já driftam via `applyHabitDrift`; aqui adicionamos o chat.
 *
 * **Princípios (iguais aos do drift de hábito):**
 * - SEM CULPA: drift sempre ≥ 0. Conversa nenhuma regride a criatura.
 * - Determinístico: mesma mensagem → mesmo drift.
 * - Capado por mensagem (teto por gene) — o teto DIÁRIO vive em `chatDriftBudget`.
 * - Wholesome: temas reforçam traços positivos; desabafar (alta magnitude
 *   emocional, mesmo negativa) aprofunda emotionalDepth — nunca "piora" a criatura.
 */
import { GENE_KEYS, clampGene } from './genome';
import type { GeneKey, Genome } from './genome';
import { analyzeSentiment } from '@/lib/ml/text/sentiment-lex';

/** Drift base por gene quando um tema casa. ~8× menor que um hábito (0.01). */
const THEME_GENE_DELTA = 0.0012;
/** Teto de drift por gene POR MENSAGEM (vários temas no mesmo gene não somam além). */
const PER_MESSAGE_GENE_CAP = 0.003;
/** Peso da intensidade emocional → emotionalDepth (desabafar aprofunda). */
const SENTIMENT_DEPTH_WEIGHT = 0.0008;

interface ChatTheme {
  key: string;
  /** Radicais SEM ACENTO (normalizados) — casam por prefixo de token. */
  stems: readonly string[];
  genes: Partial<Record<GeneKey, number>>;
}

// Radicais escolhidos longos o suficiente pra evitar falso-positivo grosseiro.
// Calibração de palavras é ajustável; drift é lento e não-punitivo, então um
// match a menos não machuca.
const CHAT_THEMES: readonly ChatTheme[] = [
  {
    key: 'feelings',
    stems: ['sentiment', 'senti', 'emoc', 'chora', 'chorei', 'saudade', 'magoa', 'sofr', 'triste', 'angust', 'ansiedad', 'medo', 'amor', 'solid', 'carinho', 'coracao'],
    genes: { emotionalDepth: THEME_GENE_DELTA, empathy: THEME_GENE_DELTA * 0.85 },
  },
  {
    key: 'calm',
    stems: ['calma', 'respir', 'tranquil', 'gratid', 'medita', 'sereno'],
    genes: { empathy: THEME_GENE_DELTA * 0.85, emotionalDepth: THEME_GENE_DELTA * 0.85, discipline: THEME_GENE_DELTA * 0.7 },
  },
  {
    key: 'learning',
    stems: ['aprend', 'estud', 'descobr', 'curios', 'conhec', 'entend', 'livro', 'leitura', 'pergunt', 'duvida'],
    genes: { intelligence: THEME_GENE_DELTA, curiosity: THEME_GENE_DELTA },
  },
  {
    key: 'creativity',
    stems: ['criativ', 'imagin', 'desenh', 'music', 'escrev', 'escrit', 'poesi', 'invent', 'arte', 'pint'],
    genes: { creativity: THEME_GENE_DELTA * 1.2 },
  },
  {
    key: 'social',
    stems: ['amig', 'famil', 'pessoa', 'conversa', 'encontr', 'namor', 'colega', 'galera', 'reuni'],
    genes: { socialEnergy: THEME_GENE_DELTA, empathy: THEME_GENE_DELTA * 0.7 },
  },
  {
    key: 'discipline',
    stems: ['rotina', 'organiz', 'planej', 'disciplin', 'produt', 'consist', 'foco', 'meta', 'habito'],
    genes: { discipline: THEME_GENE_DELTA, resilience: THEME_GENE_DELTA * 0.7 },
  },
  {
    key: 'resilience',
    stems: ['super', 'aguent', 'resist', 'persist', 'desafi', 'consegui', 'venci', 'forca', 'luta', 'firme'],
    genes: { resilience: THEME_GENE_DELTA * 1.2 },
  },
  {
    key: 'adventure',
    stems: ['viaj', 'explor', 'aventur', 'experiment', 'arrisc', 'mudanc'],
    genes: { adaptability: THEME_GENE_DELTA, curiosity: THEME_GENE_DELTA * 0.85 },
  },
  {
    key: 'activity',
    stems: ['trein', 'exerc', 'corrid', 'correr', 'academia', 'espor', 'caminh', 'pedal', 'yoga', 'alongament'],
    genes: { resilience: THEME_GENE_DELTA * 0.85, socialEnergy: THEME_GENE_DELTA * 0.7 },
  },
];

/** Remove acentos e baixa caixa — robusto a quem digita sem acento. */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function tokenize(message: string): string[] {
  return normalize(message).split(/[^a-z]+/).filter(t => t.length >= 2);
}

/** Temas detectados numa mensagem (por prefixo de token). */
export function detectChatThemes(message: string): string[] {
  const tokens = tokenize(message);
  if (tokens.length === 0) return [];
  const hits: string[] = [];
  for (const theme of CHAT_THEMES) {
    if (tokens.some(tok => theme.stems.some(stem => tok.startsWith(stem)))) {
      hits.push(theme.key);
    }
  }
  return hits;
}

export interface ChatDriftResult {
  genome: Genome;
  /** true se algum gene mudou. */
  changed: boolean;
  /** Temas detectados (debug/narrativa). */
  themes: string[];
}

/**
 * Aplica o drift de UMA mensagem de chat sobre o genoma. Puro, não-negativo,
 * capado por gene/mensagem. NÃO aplica o teto diário (isso é do caller via
 * `chatDriftBudget`) nem checa crise (caller pula mensagens críticas).
 */
export function chatDrift(genome: Genome, message: string): ChatDriftResult {
  const tokens = tokenize(message);
  if (tokens.length === 0) return { genome: { ...genome }, changed: false, themes: [] };

  // Acumula deltas por gene a partir dos temas casados.
  const deltas: Partial<Record<GeneKey, number>> = {};
  const themes: string[] = [];
  for (const theme of CHAT_THEMES) {
    if (!tokens.some(tok => theme.stems.some(stem => tok.startsWith(stem)))) continue;
    themes.push(theme.key);
    for (const [gene, d] of Object.entries(theme.genes) as [GeneKey, number][]) {
      deltas[gene] = (deltas[gene] ?? 0) + d;
    }
  }

  // Intensidade emocional → emotionalDepth (desabafar aprofunda; sem polaridade).
  const sentiment = analyzeSentiment(message);
  if (sentiment.magnitude > 0 && sentiment.hits > 0) {
    const depthBoost = Math.min(1.5, sentiment.magnitude) * SENTIMENT_DEPTH_WEIGHT;
    deltas.emotionalDepth = (deltas.emotionalDepth ?? 0) + depthBoost;
  }

  const keys = Object.keys(deltas) as GeneKey[];
  if (keys.length === 0) return { genome: { ...genome }, changed: false, themes };

  const next = { ...genome };
  let changed = false;
  for (const k of keys) {
    const capped = Math.min(PER_MESSAGE_GENE_CAP, deltas[k] ?? 0);
    if (capped <= 0) continue;
    const updated = clampGene(next[k] + capped);
    if (updated !== next[k]) {
      next[k] = updated;
      changed = true;
    }
  }
  return { genome: next, changed, themes };
}
