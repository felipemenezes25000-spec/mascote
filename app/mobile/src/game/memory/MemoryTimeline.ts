/**
 * Timeline narrativa de memórias do mascote.
 */

import type { MascotMemoryEntry } from './MemoryTypes';

export interface MemoryTimelineEvent {
  id: string;
  label: string;
  at: string;
  kind: MascotMemoryEntry['kind'];
}

export function buildMemoryTimeline(entries: readonly MascotMemoryEntry[]): MemoryTimelineEvent[] {
  return [...entries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(e => ({
      id: e.id,
      label: e.summary,
      at: e.createdAt,
      kind: e.kind,
    }));
}
