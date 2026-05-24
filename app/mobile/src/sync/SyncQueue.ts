/**
 * Fila de operações pendentes para push remoto (offline-first).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { withLock } from '@/lib/db';
import { logger } from '@/lib/logger';

const QUEUE_KEY = (userId: string) => `mascote:sync_queue:${userId}`;
// Bound storage growth — a runaway producer can't fill the device. Drops
// oldest with telemetry; production proxy is what should actually deliver.
const MAX_QUEUE_ITEMS = 5_000;

// Monotonic counter eliminates id collisions in the same ms (the old
// `Date.now()-<6 hex>` could collide on rapid enqueues, causing ack(id) to
// remove BOTH entries via the filter pass below).
let opCounter = 0;

export interface SyncOp {
  id: string;
  table: string;
  action: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string;
}

export class SyncQueue {
  async enqueue(userId: string, op: Omit<SyncOp, 'id' | 'createdAt'>): Promise<SyncOp> {
    return withLock(`sync_queue:${userId}`, async () => {
      const full: SyncOp = {
        ...op,
        id: `${Date.now()}-${(++opCounter).toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      const list = await this.listLocked(userId);
      list.push(full);
      if (list.length > MAX_QUEUE_ITEMS) {
        const dropped = list.length - MAX_QUEUE_ITEMS;
        list.splice(0, dropped);
        logger.warn('[sync] queue overflow, dropping oldest', { dropped });
      }
      await AsyncStorage.setItem(QUEUE_KEY(userId), JSON.stringify(list));
      return full;
    });
  }

  async list(userId: string): Promise<SyncOp[]> {
    return this.listLocked(userId);
  }

  private async listLocked(userId: string): Promise<SyncOp[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY(userId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as SyncOp[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      // Quarantine the corrupted blob so it's visible for telemetry but
      // doesn't keep destroying future enqueues silently.
      const safe = err instanceof Error ? err.message : 'unknown';
      logger.warn('[sync] queue parse failed; quarantining', { reason: safe });
      try {
        await AsyncStorage.setItem(
          `${QUEUE_KEY(userId)}:corrupt:${Date.now()}`,
          raw,
        );
        await AsyncStorage.removeItem(QUEUE_KEY(userId));
      } catch {
        /* nothing we can do — return empty and let producers retry */
      }
      return [];
    }
  }

  async ack(userId: string, opId: string): Promise<void> {
    await withLock(`sync_queue:${userId}`, async () => {
      const list = (await this.listLocked(userId)).filter(o => o.id !== opId);
      await AsyncStorage.setItem(QUEUE_KEY(userId), JSON.stringify(list));
    });
  }

  async clear(userId: string): Promise<void> {
    await withLock(`sync_queue:${userId}`, async () => {
      await AsyncStorage.removeItem(QUEUE_KEY(userId));
    });
  }
}

export const syncQueue = new SyncQueue();
