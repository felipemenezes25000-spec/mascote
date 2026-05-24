/**
 * Serviço de memória do mascote — ponte entre lib/memory e game layer.
 */

import { recall, rememberExplicit, rememberFromMessage, type MemoryItem } from '@/lib/memory';
import type { SimulationEventKind } from '@/sim/types';
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

export type LifecycleMilestone =
  | 'birth'
  | 'first_mission'
  | 'first_evolution'
  | 'max_streak'
  | 'return_after_pause'
  | 'rare_form'
  | 'user_goal';

const MILESTONE_COPY: Record<LifecycleMilestone, (ctx: { name?: string; detail?: string }) => string> = {
  birth: ({ name }) => `Hoje ${name ?? 'meu humano'} me deu nome. Foi quando eu nasci de verdade.`,
  first_mission: () => 'Primeira missão concluída juntos — lembro do orgulho bobo.',
  first_evolution: ({ detail }) => `Primeira evolução visível${detail ? `: ${detail}` : ''}.`,
  max_streak: ({ detail }) => `Meu melhor streak até aqui${detail ? ` — ${detail} dias` : ''}.`,
  return_after_pause: () => 'Voltei a te ver depois de uma pausa. Sem bronca, só alívio.',
  rare_form: ({ detail }) => `Forma rara${detail ? ` (${detail})` : ''} — momento especial.`,
  user_goal: ({ detail }) => `Seu foco principal${detail ? `: ${detail}` : ''}. Vou lembrar disso.`,
};

const SIM_EVENT_COPY: Partial<Record<SimulationEventKind, (message?: string) => string | null>> = {
  return_summary: (message) => message ? `Momento de retorno: ${message}` : null,
  while_away_living_moment: (message) => message ? `Momento vivido enquanto estava fora: ${message}` : null,
  while_away_habit_missed: (message) => message ? `Ritmo percebido na sua ausência: ${message}` : null,
};

export class MascotMemoryService {
  /** Grava marco de vida do mascote (sem API key). */
  async recordMilestone(
    userId: string,
    milestone: LifecycleMilestone,
    ctx: { name?: string; detail?: string } = {},
  ): Promise<MascotMemoryEntry | null> {
    const summary = MILESTONE_COPY[milestone](ctx);
    const item = await rememberExplicit(userId, summary, 'event', new Date());
    return toEntry(item);
  }

  /** Grava lembranças leves geradas pela simulação offline. */
  async recordSimulationEvent(
    userId: string,
    eventKind: SimulationEventKind,
    message?: string,
  ): Promise<MascotMemoryEntry | null> {
    const formatter = SIM_EVENT_COPY[eventKind];
    if (!formatter) return null;
    const summary = formatter(message);
    if (!summary) return null;
    const item = await rememberExplicit(userId, summary, 'event', new Date());
    return toEntry(item);
  }

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
