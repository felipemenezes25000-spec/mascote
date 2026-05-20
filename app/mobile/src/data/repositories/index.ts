/**
 * Camada data — re-exporta repositórios existentes + sync.
 * Local-first; remoto opcional via env Supabase.
 */

export * from '@/repositories';
export { syncEngine, getSyncMode, type SyncMode } from '../sync/SyncEngine';
export { syncQueue, type SyncOp } from '../sync/SyncQueue';
export { offlineMutationQueue } from '../sync/OfflineMutationQueue';
export { resolveConflict, type ConflictStrategy } from '../sync/ConflictResolution';
