/**
 * Tipos do serviço de memória do mascote (camada game).
 */

import type { MemoryItem, MemoryKind } from '@/lib/memory';

export type { MemoryItem, MemoryKind };

export interface MascotMemoryEntry {
  id: string;
  kind: MemoryKind;
  summary: string;
  emotionalTone: 'warm' | 'neutral' | 'concerned';
  createdAt: string;
  habitContext?: string;
}

export interface MemorySnapshot {
  userId: string;
  entries: MascotMemoryEntry[];
  lastUpdated: string;
}
