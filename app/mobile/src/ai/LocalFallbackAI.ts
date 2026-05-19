/**
 * Fallback local de alta qualidade — sem API key do usuário.
 */

import { mockReply, classifyIntent } from '@/content/replies';
import type { Personality, SafetyFlag } from '@/types';
import type { AiResponse } from '@/lib/ai';
import type { MemoryItem } from '@/lib/memory';

const MEMORY_TEMPLATES: Record<Personality, (summary: string) => string[]> = {
  calmo: s => [
    `Lembro que você mencionou: ${s}. Isso ainda está comigo.`,
    `Quando você falou sobre ${s}, guardei com carinho.`,
  ],
  motivador: s => [
    `Você já me contou sobre ${s} — bora manter o ritmo!`,
    `${s} ficou na minha memória. Cada passo conta.`,
  ],
  fofo: s => [
    `Ei, lembro de ${s}! 🌱`,
    `Você me contou sobre ${s} e eu guardei no coração.`,
  ],
  sabio: s => [
    `Há um fio entre nós: ${s}. Vale revisitarmos quando fizer sentido.`,
    `Registrei ${s}. Padrões assim costumam importar.`,
  ],
};

const VARIETY_SUFFIX: Record<Personality, string[]> = {
  calmo: ['Respira comigo um instante.', 'Estou aqui, sem pressa.'],
  motivador: ['Você consegue — um hábito de cada vez.', 'Pequeno passo, grande diferença.'],
  fofo: ['Te dou um abraço virtual!', 'Fico feliz em te ver.'],
  sabio: ['Curiosidade é um bom guia.', 'O que importa é a constância gentil.'],
};

function pickFrom<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length] as T;
}

export function localFallbackReply(
  personality: Personality,
  userMessage: string,
  options?: { mascotName?: string; memories?: MemoryItem[] },
): AiResponse {
  const intent = classifyIntent(userMessage);
  let reply = mockReply(personality, intent, options?.mascotName);
  const mem = options?.memories?.[0];
  if (mem?.summary) {
    const templates = MEMORY_TEMPLATES[personality];
    const memLine = pickFrom(templates(mem.summary), userMessage.length + mem.summary.length);
    reply = `${memLine} ${reply}`;
  }
  const suffix = pickFrom(VARIETY_SUFFIX[personality], userMessage.length + reply.length);
  if (!reply.endsWith(suffix)) {
    reply = `${reply} ${suffix}`;
  }
  return {
    reply,
    safety_flag: 'safe' as SafetyFlag,
    source: 'fallback',
  };
}
