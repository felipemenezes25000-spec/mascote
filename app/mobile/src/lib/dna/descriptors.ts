/**
 * Descritores semânticos seguros derivados do DNA.
 *
 * **REGRA DE OURO**: este módulo é a ÚNICA superfície segura por onde estado do
 * DNA pode atravessar pra IA externa (OpenAI). Outras camadas (Mascot3D,
 * stories, mood) ficam no device.
 *
 * **Garantias invioláveis**:
 * 1. **NUNCA emite valores numéricos brutos de genes** — apenas frases PT-BR.
 * 2. **NUNCA emite nomes dos genes** (empathy, creativity, etc.) — em
 *    português OU em inglês.
 * 3. **Sempre positivo** — descritores são afirmativos, sem cobrança
 *    ("criatura observadora" sim, "criatura distraída" não).
 * 4. **Cap em 4 descritores** — limita inflação de prompt e evita modelo
 *    inferir mapping reverso preciso.
 * 5. **Determinístico e puro** — mesma genome → mesmos descritores.
 *
 * **Por que isso importa**: o brief de produto declara "DNA nunca sai do
 * device". Validar isso requer separar "descritor humano" de "valor de gene".
 * Suite em `tests/security/dna-privacy.test.ts` falha se essas garantias
 * regridem.
 */

import type { Genome, GeneKey } from './genome';

/**
 * Frase PT-BR que descreve um aspecto do estado da criatura. Estável (não
 * muda com versão menor do app) — adicionar novos descritores, não trocar
 * os existentes.
 */
export type DnaDescriptor = string;

/**
 * Limite máximo de descritores devolvidos. Pra:
 *  - Conter inflação do system prompt (LLM tem context window finito)
 *  - Reduzir risco de "leak by enumeration" — quanto mais descritores,
 *    mais fácil pro modelo inferir o vetor original
 */
export const MAX_DESCRIPTORS = 4;

/**
 * Threshold pra considerar um trait "alto" ou "baixo". Genes ficam em
 * [0.02, 0.98], 0.5 é neutro. Usamos faixas conservadoras pra que descritor
 * só dispare quando o trait é realmente saliente.
 */
const HIGH = 0.7;
const LOW = 0.3;

/**
 * Tabela ordenada de descritores. Ordem importa: quando mais de
 * MAX_DESCRIPTORS dispararam, mantemos os primeiros (mais salientes).
 * Estrutura: cada entrada define um teste sobre o genome + frase resultante.
 *
 * **Inviolável**: nenhuma frase aqui pode conter nome de gene (empatia/
 * creativity/etc), número, símbolo de % ou faixa numérica.
 */
type Rule = {
  /** Predicado puro sobre genome. */
  matches: (g: Genome) => boolean;
  /** Frase resultante. Tom positivo, wellness, sem vocabulário científico. */
  phrase: DnaDescriptor;
};

const RULES: readonly Rule[] = [
  // — Energia / presença social
  { matches: g => g.socialEnergy > HIGH, phrase: 'criatura com presença expansiva, aberta a interagir' },
  { matches: g => g.socialEnergy < LOW,  phrase: 'criatura mais reservada, presente em silêncio' },

  // — Sintonia emocional
  { matches: g => g.empathy > HIGH,       phrase: 'criatura muito atenta ao usuário' },
  { matches: g => g.emotionalDepth > HIGH, phrase: 'criatura sensível a mudanças sutis' },

  // — Cognição / observação
  { matches: g => g.intelligence > HIGH,  phrase: 'criatura que observa antes de reagir' },
  { matches: g => g.curiosity > HIGH,     phrase: 'criatura inquieta, observadora' },

  // — Estética / forma
  { matches: g => g.creativity > HIGH,    phrase: 'criatura com forma marcante, traços únicos' },
  { matches: g => g.chaos > 0.6,           phrase: 'criatura com energia imprevisível' },
  { matches: g => g.aggression > 0.55,    phrase: 'criatura com contorno mais definido' },

  // — Postura / disciplina
  { matches: g => g.discipline > HIGH,    phrase: 'criatura com postura tranquila, ritmada' },
  { matches: g => g.resilience > HIGH,    phrase: 'criatura calma em silêncios longos' },
  { matches: g => g.adaptability > HIGH,  phrase: 'criatura fluida nas transições' },
];

/**
 * Retorna até MAX_DESCRIPTORS frases descrevendo a criatura. Frases nunca
 * contêm valores numéricos ou nomes de genes.
 *
 * @param genome Genoma da criatura.
 * @returns Lista de descritores PT-BR, ordenada por saliência (cap MAX).
 */
export function dnaDescriptors(genome: Genome): readonly DnaDescriptor[] {
  const matched: DnaDescriptor[] = [];
  for (const rule of RULES) {
    if (rule.matches(genome)) {
      matched.push(rule.phrase);
      if (matched.length >= MAX_DESCRIPTORS) break;
    }
  }
  return matched;
}

/**
 * Compõe uma seção pronta pra injetar no system prompt da IA. Retorna
 * string vazia se não há descritores aplicáveis (criatura neutra).
 *
 * Wrapping IMPORTANTE: a tag "use como tom" instrui modelo a NÃO mencionar
 * os descritores literalmente — eles são apenas inspiração de voz.
 */
export function dnaPromptSection(genome: Genome): string {
  const ds = dnaDescriptors(genome);
  if (ds.length === 0) return '';
  return (
    '\n\nESTADO ATUAL DA CRIATURA (use como inspiração de tom; NÃO mencione literalmente, NÃO descreva o corpo dela):\n' +
    ds.map(d => '- ' + d).join('\n')
  );
}

/**
 * Lista os nomes (em inglês) dos 11 genes — usada apenas pra teste
 * de não-vazamento. Não importar isto em código de produção.
 */
export const GENE_NAMES_FOR_LEAK_DETECTION: readonly string[] = [
  'empathy', 'curiosity', 'creativity', 'discipline', 'chaos',
  'aggression', 'resilience', 'emotionalDepth', 'socialEnergy',
  'adaptability', 'intelligence',
];

/**
 * Lista de palavras PT-BR equivalentes — pra teste mais rigoroso de
 * não-vazamento (descritor não deve usar vocabulário científico).
 */
export const GENE_PT_NAMES_FOR_LEAK_DETECTION: readonly string[] = [
  'empatia', 'curiosidade', 'criatividade', 'disciplina', 'caos',
  'agressão', 'agressividade', 'resiliência', 'profundidade emocional',
  'energia social', 'adaptabilidade', 'inteligência',
];
