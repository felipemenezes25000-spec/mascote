/**
 * System prompt do mascote — compartilhado entre callOpenAI direto (BYOK)
 * e o Proxy backend (que pode reaproveitar OU ignorar, sem regredir).
 *
 * Mantém personalidade + descritores DNA + memórias num único lugar pra
 * Plus e fallback falarem mesmo idioma.
 */

import type { MascotDNA, Personality } from '@/types';
import { dnaPromptSection } from '@/lib/dna/descriptors';
import type { Genome } from '@/lib/dna/genome';
import { formatMemoriesForPrompt, type MemoryItem } from '@/lib/memory';

export const PERSONALITY_FLAVOR: Record<Personality, string> = {
  calmo: 'Voz baixa, fala devagar. Sem exclamação. Foca em respiração, sono, silêncio.',
  motivador: 'Direto, otimista. No máximo 1 ponto de exclamação. Sem "vamoooo".',
  fofo: 'Doce, afetuoso. Pode usar 1 emoji fofo (🌱 💛 ✨ 🍵 🐣). Sem coração vermelho.',
  sabio: 'Pensativo. Abre perguntas curtas em vez de dar conselho.',
};

export interface BuildPromptOptions {
  personality: Personality;
  memories?: MemoryItem[];
  mascotName?: string;
  dna?: MascotDNA;
}

export function buildMascotSystemPrompt(opts: BuildPromptOptions): string {
  const { personality, memories = [], mascotName, dna } = opts;
  const base = `Você é um companheiro digital de autocuidado em PT-BR${mascotName ? `, chamado ${mascotName}` : ''}.
REGRAS INVIOLÁVEIS:
- Wellness, NUNCA terapia, diagnóstico ou cura.
- NUNCA use: "depressão", "ansiedade clínica", "transtorno", "diagnóstico", "tratamento", "trauma", "TDAH".
- Use: "se cuidar", "rotina", "energia", "humor", "respirar", "pausa".
- Máximo 2 frases. NUNCA mais que 30 palavras.
- Priorize 1 frase curta quando possível (ideal 12-22 palavras).
- Sem markdown, sem listas, sem links.
- Lembre do contexto da conversa, mas seja breve.`;

  const memorySection = memories.length > 0
    ? `\n\nCOISAS QUE VOCÊ JÁ SABE DELE/DELA (use SE FOR RELEVANTE, sem forçar):\n${formatMemoriesForPrompt(memories)}`
    : '';
  // dnaSection: descritores PT-BR seguros. NUNCA expõe gene cru. Pipeline:
  // Genome → dnaDescriptors() → frases → injeção. Garantia em
  // tests/security/dna-privacy.test.ts.
  const dnaSection = dna ? dnaPromptSection(dna as Genome) : '';
  return `${base}\n\nPERSONALIDADE: ${PERSONALITY_FLAVOR[personality]}${dnaSection}${memorySection}`;
}
