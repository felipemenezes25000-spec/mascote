/**
 * Fila de operações pendentes para push remoto (offline-first).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = (userId: string) => `mascote:sync_queue:${userId}`;

export interface SyncOp {
  id: string;
  table: string;
  action: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string;
}

export class SyncQueue {
  async enqueue(userId: string, op: Omit<SyncOp, 'id' | 'createdAt'>): Promise<SyncOp> {
    const full: SyncOp = {
      ...op,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const list = await this.list(userId);
    list.push(full);
    await AsyncStorage.setItem(QUEUE_KEY(userId), JSON.stringify(list));
    return full;
  }

  async list(userId: string): Promise<SyncOp[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY(userId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as SyncOp[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async ack(userId: string, opId: string): Promise<void> {
    const list = (await this.list(userId)).filter(o => o.id !== opId);
    await AsyncStorage.setItem(QUEUE_KEY(userId), JSON.stringify(list));
  }

  async clear(userId: string): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY(userId));
  }
}

export const syncQueue = new SyncQueue();
