/**
 * Serviço de memória do mascote — ponte entre lib/memory e game layer.
 */

import { recall, rememberFromMessage, type MemoryItem } from '@/lib/memory';
import type { MascotMemoryEntry, MemorySnapshot } from './MemoryTypes';
import { buildMemoryTimeline } from './MemoryTimeline';

function toEntry(item: MemoryItem): MascotMemoryEntry {
  const tone =
    item.kind === 'feeling' ? 'concerned'
    : item.kind === 'event' ? 'warm'
    : 'neutral';
  return {
    id: item.id,
    kind: item.kind,
    summary: item.summary,
    emotionalTone: tone,
    createdAt: item.created_at,
  };
}

export class MascotMemoryService {
  async remember(userId: string, message: string, apiKey?: string): Promise<MascotMemoryEntry | null> {
    const items = await rememberFromMessage(userId, message, new Date(), apiKey ? { apiKey } : undefined);
    const item = items[0];
    return item ? toEntry(item) : null;
  }

  async recallRelevant(userId: string, query: string, apiKey?: string): Promise<MascotMemoryEntry[]> {
    const items = await recall(userId, query, 5, new Date(), apiKey ? { apiKey } : undefined);
    return items.map(toEntry);
  }

  async snapshot(userId: string, query = ''): Promise<MemorySnapshot> {
    const items = query
      ? await recall(userId, query, 20)
      : await recall(userId, 'você', 20);
    const entries = items.map(toEntry);
    return {
      userId,
      entries,
      lastUpdated: new Date().toISOString(),
    };
  }

  timeline(entries: readonly MascotMemoryEntry[]) {
    return buildMemoryTimeline(entries);
  }
}

export const mascotMemoryService = new MascotMemoryService();
