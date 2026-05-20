/**
 * Voz emocional do mascote — personalidade + tom + memórias recentes.
 * Enriquece respostas locais sem depender de API externa.
 */

import type { Personality } from '@/types';
import { emotionalPrefix, inferEmotionalTone, type EmotionalTone } from './EmotionalMemory';

const PERSONALITY_OPENERS: Record<Personality, string[]> = {
  calmo: ['Respira comigo.', 'Sem pressa.', 'Aqui com você.'],
  motivador: ['Bora cuidar de você.', 'Pequeno passo já conta.', 'Você consegue.'],
  fofo: ['Oie!', 'Que bom te ver.', 'Te abraço com palavras.'],
  sabio: ['O que você sente agora?', 'Interessante.', 'Me conta mais.'],
};

const TONE_CLOSERS: Record<EmotionalTone, string[]> = {
  supportive: ['Estou aqui.', 'Um dia de cada vez.'],
  celebratory: ['Orgulho de você!', 'Isso merece comemorar.'],
  gentle: ['Com carinho.', 'Sem culpa.'],
  curious: ['Me conta depois?', 'Fiquei curioso.'],
};

export interface VoiceContext {
  personality: Personality;
  memoryKinds?: readonly { kind: import('@/lib/memory').MemoryKind }[];
  mascotName?: string;
}

export function buildPersonalityVoice(ctx: VoiceContext): {
  prefix: string;
  closer: string;
  tone: EmotionalTone;
} {
  const tone = inferEmotionalTone(ctx.memoryKinds ?? []);
  const openers = PERSONALITY_OPENERS[ctx.personality];
  const closers = TONE_CLOSERS[tone];
  const prefix = emotionalPrefix(tone) + pick(openers, ctx.mascotName);
  const closer = pick(closers);
  return { prefix, closer, tone };
}

/** Aplica voz em resposta curta (fallback/mock). */
export function applyPersonalityVoice(reply: string, ctx: VoiceContext): string {
  const { prefix, closer } = buildPersonalityVoice(ctx);
  const core = reply.trim();
  if (core.length === 0) return `${prefix} ${closer}`.trim();
  if (core.length > 120) return core;
  return `${prefix}${core} ${closer}`.replace(/\s+/g, ' ').trim();
}

function pick(items: readonly string[], seed?: string): string {
  if (items.length === 0) return '';
  if (!seed) return items[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % items.length;
  return items[h];
}
