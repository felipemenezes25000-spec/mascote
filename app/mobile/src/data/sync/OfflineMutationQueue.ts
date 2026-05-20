/**
 * Mutações offline enfileiradas — alias semântico sobre SyncQueue.
 */

import { syncQueue, type SyncOp } from './SyncQueue';

export type OfflineMutation = SyncOp;

export class OfflineMutationQueue {
  enqueue = syncQueue.enqueue.bind(syncQueue);
  list = syncQueue.list.bind(syncQueue);
  ack = syncQueue.ack.bind(syncQueue);
  clear = syncQueue.clear.bind(syncQueue);
}

export const offlineMutationQueue = new OfflineMutationQueue();
