/**
 * Contratos sync-ready — implementação local hoje; Supabase no futuro.
 */

import type { PersistedEvolution } from '@/game/evolution/EvolutionPersistence';
import type { StoredPersonalization } from './personalization';
import type { BillingTierId } from '@/content/billing';

export interface SyncPayload {
  userId: string;
  exportedAt: string;
  tables: Record<string, unknown[]>;
  evolution: PersistedEvolution | null;
  memory: unknown[] | null;
  memoryTfidf: unknown | null;
  subscription: { tier: BillingTierId; updatedAt?: string } | null;
  personalization: StoredPersonalization | null;
}

export interface SyncPullResult {
  applied: string[];
  skipped: string[];
}

export interface SyncRepository {
  /** Exporta snapshot completo para backup ou migração. */
  exportSnapshot(userId: string): Promise<SyncPayload>;
  /** Importa snapshot (sobrescreve dados locais do usuário). */
  importSnapshot(payload: SyncPayload): Promise<SyncPullResult>;
  /** Placeholder — fila de operações pendentes para push remoto. */
  listPendingOps(userId: string): Promise<readonly string[]>;
  /** Placeholder — marca operação como sincronizada após Supabase. */
  ackOp(userId: string, opId: string): Promise<void>;
}
