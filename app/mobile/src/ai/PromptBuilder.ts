/**
 * Construtor de prompts para IA do mascote.
 */

import type { Personality } from '@/types';
import type { MascotDNA } from '@/types';
import { dnaPromptSection } from '@/lib/dna/descriptors';
import { formatMemoriesForPrompt } from '@/lib/memory';
import type { MemoryItem } from '@/lib/memory';

export interface PromptContext {
  mascotName: string;
  personality: Personality;
  dna?: MascotDNA;
  memories?: MemoryItem[];
  userMessage: string;
}

export function buildMascotPrompt(ctx: PromptContext): string {
  const parts: string[] = [
    `Você é ${ctx.mascotName}, mascote de wellness com personalidade ${ctx.personality}.`,
    'Tom: acolhedor, sem cobrança, sem diagnóstico clínico.',
    'Respostas curtas (2-4 frases). PT-BR.',
  ];
  if (ctx.dna) {
    parts.push(dnaPromptSection(ctx.dna));
  }
  if (ctx.memories && ctx.memories.length > 0) {
    parts.push(formatMemoriesForPrompt(ctx.memories));
  }
  parts.push(`Usuário: ${ctx.userMessage}`);
  return parts.join('\n\n');
}
