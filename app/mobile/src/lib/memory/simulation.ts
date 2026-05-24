import { listMemories, recall, rememberExplicit, type MemoryItem } from '@/lib/memory';
import type { SimulationEvent } from '@/sim/types';

const MEMORY_WINDOW_MS = 12 * 60 * 60 * 1000;

function summaryFromSimulationEvent(event: SimulationEvent): string | null {
  if (!event.message) return null;
  if (event.kind === 'return_summary') {
    return `Momento de retorno: ${event.message}`;
  }
  if (event.kind === 'while_away_living_moment') {
    return `Momento vivido enquanto estava fora: ${event.message}`;
  }
  if (event.kind === 'while_away_moment') {
    return `Momento em ausência: ${event.message}`;
  }
  if (event.kind === 'while_away_habit_missed') {
    return `Ritmo percebido em ausência: ${event.message}`;
  }
  return null;
}

function isRecentDuplicate(items: readonly MemoryItem[], summary: string, now: Date): boolean {
  const nowMs = now.getTime();
  return items.some(item => {
    if (item.summary !== summary) return false;
    const createdMs = new Date(item.created_at).getTime();
    return nowMs - createdMs >= 0 && nowMs - createdMs <= MEMORY_WINDOW_MS;
  });
}

export async function recordSimulationMemories(
  userId: string,
  events: readonly SimulationEvent[],
  now: Date = new Date(),
): Promise<number> {
  if (events.length === 0) return 0;
  const existing = await listMemories(userId);
  let saved = 0;
  for (const event of events) {
    const summary = summaryFromSimulationEvent(event);
    if (!summary) continue;
    if (isRecentDuplicate(existing, summary, now)) continue;
    const item = await rememberExplicit(userId, summary, 'event', now);
    existing.push(item);
    saved++;
  }
  return saved;
}

export async function recallSimulationMemoryHint(
  userId: string,
  query: string,
): Promise<string | null> {
  const hits = await recall(userId, query, 1);
  const top = hits[0];
  if (!top) return null;
  return top.summary;
}
