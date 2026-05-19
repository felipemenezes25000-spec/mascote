/**
 * Memória emocional — extrai tom das interações recentes.
 */

import type { MemoryItem, MemoryKind } from '@/lib/memory';

export type EmotionalTone = 'supportive' | 'celebratory' | 'gentle' | 'curious';

export function inferEmotionalTone(
  memories: readonly Pick<MemoryItem, 'kind'>[] | readonly { kind: MemoryKind }[],
): EmotionalTone {
  if (memories.length === 0) return 'gentle';
  const feelingCount = memories.filter(m => m.kind === 'feeling').length;
  const eventCount = memories.filter(m => m.kind === 'event').length;
  if (feelingCount > eventCount) return 'supportive';
  if (eventCount > 2) return 'celebratory';
  return 'curious';
}

export function emotionalPrefix(tone: EmotionalTone): string {
  switch (tone) {
    case 'supportive': return 'Percebo que você tem carregado algumas coisas. ';
    case 'celebratory': return 'Tem coisa boa no ar! ';
    case 'curious': return 'Fiquei pensando em você. ';
    case 'gentle':
    default: return '';
  }
}
