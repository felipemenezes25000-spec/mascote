/**
 * Adapter Supabase (stub) — documenta o contrato sem rede em runtime.
 *
 * Migração: implementar com @supabase/supabase-js + RLS por user_id.
 * Até lá, `localSyncRepo` cobre backup via export/import.
 */

import type { SyncRepository, SyncPayload, SyncPullResult } from './sync';
import { localSyncRepo } from './sync-local';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON);
}

export class SupabaseSyncRepositoryStub implements SyncRepository {
  private readonly delegate = localSyncRepo;

  async exportSnapshot(userId: string): Promise<SyncPayload> {
    if (!isSupabaseConfigured()) {
      return this.delegate.exportSnapshot(userId);
    }
    // Futuro: SELECT * FROM mascote_* WHERE user_id = $1
    return this.delegate.exportSnapshot(userId);
  }

  async importSnapshot(payload: SyncPayload): Promise<SyncPullResult> {
    if (!isSupabaseConfigured()) {
      return this.delegate.importSnapshot(payload);
    }
    // Futuro: upsert em lote com conflict on user_id
    return this.delegate.importSnapshot(payload);
  }

  async listPendingOps(_userId: string): Promise<readonly string[]> {
    return [];
  }

  async ackOp(_userId: string, _opId: string): Promise<void> {
    /* no-op até fila remota existir */
  }
}

export const supabaseSyncRepoStub = new SupabaseSyncRepositoryStub();
