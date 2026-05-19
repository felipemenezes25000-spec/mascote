/**
 * Style tracker: aprende qual TOM o mascote deve usar pra cada user.
 *
 * Cada resposta do mascote tem dimensões implícitas (concise/expansivo,
 * encorajador/contemplativo, formal/casual). Quando o user responde
 * com engajamento (continua conversa, faz check-in), reforçamos o tom.
 *
 * Modelo: exponentially-weighted average de scores por dimensão.
 */

export interface StyleVector {
  /** -1 (muito breve) .. +1 (muito expansivo) */
  expansiveness: number;
  /** -1 (contemplativo) .. +1 (encorajador) */
  energy: number;
  /** -1 (formal) .. +1 (casual) */
  casualness: number;
  /** -1 (perguntas) .. +1 (afirmações) */
  assertiveness: number;
  /** Quantos updates já receberam */
  n: number;
}

export function createStyle(): StyleVector {
  return { expansiveness: 0, energy: 0, casualness: 0, assertiveness: 0, n: 0 };
}

/**
 * Score do tom inferido de uma resposta do mascote.
 * Heurísticas:
 *  - expansiveness: comprimento
 *  - energy: pontos de exclamação
 *  - casualness: emojis + gírias
 *  - assertiveness: pontos finais vs interrogações
 */
export function scoreReply(text: string): Omit<StyleVector, 'n'> {
  const len = text.length;
  const expansiveness = Math.tanh((len - 80) / 80); // 80 chars = neutro
  const exclam = (text.match(/!/g) ?? []).length;
  const energy = Math.tanh(exclam / 2);
  const emojis = (text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu) ?? []).length;
  const gírias = /(tô|tá|né|massa|bora|aiii|aii)/i.test(text) ? 1 : 0;
  const casualness = Math.tanh((emojis + gírias) / 2);
  const questions = (text.match(/\?/g) ?? []).length;
  const periods = (text.match(/\./g) ?? []).length;
  const assertiveness = Math.tanh((periods - questions) / 2);
  return { expansiveness, energy, casualness, assertiveness };
}

/**
 * Atualiza o style com um reward [-1, +1]: positivo reforça o tom usado,
 * negativo desencoraja. Reward derivado de:
 *  - usuário respondeu rápido? (+)
 *  - usuário fez check-in depois? (+)
 *  - usuário trocou de assunto / silenciou? (-)
 */
export function updateStyle(
  style: StyleVector,
  replyTone: Omit<StyleVector, 'n'>,
  reward: number,
  learningRate = 0.1
): StyleVector {
  const lr = learningRate * Math.max(-1, Math.min(1, reward));
  return {
    expansiveness: style.expansiveness + lr * (replyTone.expansiveness - style.expansiveness),
    energy: style.energy + lr * (replyTone.energy - style.energy),
    casualness: style.casualness + lr * (replyTone.casualness - style.casualness),
    assertiveness: style.assertiveness + lr * (replyTone.assertiveness - style.assertiveness),
    n: style.n + 1,
  };
}

/**
 * Sugestão textual de tom pra incluir no system prompt da IA.
 */
export function describeStyle(style: StyleVector): string {
  if (style.n < 5) return ''; // amostra insuficiente
  const parts: string[] = [];
  if (style.expansiveness > 0.3) parts.push('respostas mais elaboradas funcionam melhor');
  if (style.expansiveness < -0.3) parts.push('mantenha respostas BEM curtas');
  if (style.energy > 0.3) parts.push('tom encorajador funciona');
  if (style.energy < -0.3) parts.push('tom mais contemplativo funciona');
  if (style.casualness > 0.3) parts.push('linguagem casual com emojis OK');
  if (style.casualness < -0.3) parts.push('linguagem mais formal');
  if (style.assertiveness > 0.3) parts.push('afirmações > perguntas');
  if (style.assertiveness < -0.3) parts.push('perguntas abertas > afirmações');
  return parts.length > 0 ? `Tom calibrado: ${parts.join('; ')}.` : '';
}
