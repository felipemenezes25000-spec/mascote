/**
 * Regression test for Task 2.4 — duplicate memories in `/memories` feed.
 *
 * Audit reported "Momento de retorno: Fiquei aqui 8 dias…" appearing 5-6
 * times. Root cause: `rememberExplicit` had no dedup, and home tab calls
 * `mascotMemoryService.recordSimulationEvent` on every `useFocusEffect` —
 * so each tab switch wrote the same summary again.
 *
 * Fix: 5-min idempotency window inside `rememberExplicit` (memory.ts).
 *
 * Hypothesis matched: A (multiple writes via repeated focus calls).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listMemories, rememberExplicit } from '@/lib/memory';

const UID = 'u_dedup_test';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('rememberExplicit — 5min idempotency window', () => {
  it('3 writes of same summary within 5min → only 1 stored', async () => {
    const summary = 'Momento de retorno: Fiquei aqui 8 dias';
    const now = new Date('2026-05-27T10:00:00.000Z');
    await rememberExplicit(UID, summary, 'event', now);
    await rememberExplicit(UID, summary, 'event', new Date(now.getTime() + 1_000));
    await rememberExplicit(UID, summary, 'event', new Date(now.getTime() + 60_000));
    const list = await listMemories(UID);
    expect(list.filter(m => m.summary === summary).length).toBe(1);
  });

  it('returns the SAME item (same id) for repeated writes within window', async () => {
    const summary = 'Momento de retorno: Fiquei aqui 8 dias';
    const now = new Date('2026-05-27T10:00:00.000Z');
    const first = await rememberExplicit(UID, summary, 'event', now);
    const second = await rememberExplicit(UID, summary, 'event', new Date(now.getTime() + 30_000));
    expect(second.id).toBe(first.id);
    expect(second.created_at).toBe(first.created_at);
  });

  it('write after 5min window elapsed → creates a new memory', async () => {
    const summary = 'Voltei a te ver depois de uma pausa. Sem bronca, só alívio.';
    const now = new Date('2026-05-27T10:00:00.000Z');
    await rememberExplicit(UID, summary, 'event', now);
    // 6 minutes later — outside the idempotency window.
    await rememberExplicit(UID, summary, 'event', new Date(now.getTime() + 6 * 60 * 1000));
    const list = await listMemories(UID);
    expect(list.filter(m => m.summary === summary).length).toBe(2);
  });

  it('distinct summaries within 5min → both stored', async () => {
    const now = new Date('2026-05-27T10:00:00.000Z');
    await rememberExplicit(UID, 'Primeira evolução visível: Forma fluxo.', 'event', now);
    await rememberExplicit(UID, 'Meu melhor streak até aqui — 7 dias.', 'event', new Date(now.getTime() + 1_000));
    const list = await listMemories(UID);
    expect(list.length).toBe(2);
  });

  it('parallel writes of same summary → only 1 stored (lock + dedup)', async () => {
    const summary = 'Momento de retorno: Fiquei aqui 8 dias';
    const now = new Date('2026-05-27T10:00:00.000Z');
    await Promise.all([
      rememberExplicit(UID, summary, 'event', now),
      rememberExplicit(UID, summary, 'event', now),
      rememberExplicit(UID, summary, 'event', now),
      rememberExplicit(UID, summary, 'event', now),
      rememberExplicit(UID, summary, 'event', now),
    ]);
    const list = await listMemories(UID);
    expect(list.filter(m => m.summary === summary).length).toBe(1);
  });
});
