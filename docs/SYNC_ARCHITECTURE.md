# Sync architecture — Mascote (2026-05-20)

Arquitetura de sincronização local-first do Mascote. **Hoje 100% local** —
export/import via JSON, sem backend remoto.

## Princípios

1. **Local-first, sempre.** O app FUNCIONA SEM REDE. AsyncStorage é a fonte
   de verdade no device.
2. **Backup manual sempre.** Export/import via arquivo JSON funciona sem cloud.
3. **Sync nunca destrói.** LWW (last-write-wins) com `updated_at`, mas
   conflitos sérios viram backup local antes de aplicar remoto (quando existir).
4. **Sem perda por falha de rede.** Mutations vão pra queue offline e dão retry.

## Estado atual

| Camada | Estado | Onde |
|---|---|---|
| Local repo (todos os domínios) | ✅ Funciona | [src/repositories/local.ts](../app/mobile/src/repositories/local.ts) |
| Local export/import | ✅ Funciona | [src/repositories/sync-local.ts](../app/mobile/src/repositories/sync-local.ts) |
| SyncEngine | ✅ `local_only` | [src/sync/SyncEngine.ts](../app/mobile/src/sync/SyncEngine.ts) |
| Sync queue offline | ✅ AsyncStorage | [src/sync/SyncQueue.ts](../app/mobile/src/sync/SyncQueue.ts) |
| Conflict resolution | ✅ `newest_wins` | [src/sync/ConflictResolution.ts](../app/mobile/src/sync/ConflictResolution.ts) |
| Backend remoto | 🔴 Não existe | — |

## Modelo de sync (futuro multi-device)

### Domínios sincronizáveis

(Em ordem de prioridade pra ativação futura)

1. **subscription_status** — fonte canônica é RevenueCat (via webhook). Cliente lê.
2. **mascots + genotype + phenotype** — núcleo do produto.
3. **mission_completions** — histórico (append-only, fácil).
4. **achievements** — set de IDs (idempotente).
5. **mascot_memories** — diário emocional do mascote.
6. **backups** — snapshots manuais (sob demanda).

### Domínios LOCAL-only (não vão pra cloud)

- **chat history** — sensível, fica no device
- **safety flags log** — só auditoria local
- **AI BYOK key** — secure-store, NUNCA cloud
- **settings (theme, locale)** — local

## Fluxos

### 1. Boot

```
App launches → load local state
            → app renders com dados locais imediatamente
```

### 2. User action (check-in, complete mission)

```
User taps "completar" →
  withLock(user) {
    apply local mutation (atomic)
    enqueue sync op { table, op, payload, ts }
    return UI feedback imediato
  }
→ pushPending no-op em local_only (fila persiste localmente)
```

### 3. Backup manual

```
Settings → Exportar dados → JSON completo (evolução, memória, assinatura, personalização)
Settings → Importar dados → merge com backup local
```

## Interface

```ts
// src/repositories/sync.ts
export interface SyncRepository {
  exportSnapshot(userId: string): Promise<SyncPayload>;
  importSnapshot(payload: SyncPayload): Promise<SyncPullResult>;
  listPendingOps(userId: string): Promise<readonly string[]>;
  ackOp(userId: string, opId: string): Promise<void>;
}

// src/sync/SyncEngine.ts
export type SyncMode = 'local_only';
```

## Implementação faseada

### Fase 1 — Local (concluída)

- ✅ Local export/import funciona 100%
- ✅ `SyncEngine` em modo `local_only`
- ✅ `OfflineMutationQueue` com persistência AsyncStorage
- ✅ Conflict resolution (`newest_wins`)

### Fase 2 — Multi-device (futuro, sem backend definido)

- [ ] Escolher e implementar backend remoto
- [ ] Auth (Sign in with Apple / Google)
- [ ] Onboarding com opt-in de sync ("Quer sincronizar entre dispositivos?")
- [ ] `SyncEngine` com push/pull real
- [ ] UI status (badge na home: "Sincronizado" / "Sincronizando..." / "Offline")

## Testes

```powershell
# Local export/import + SyncEngine
npm --prefix app/mobile test tests/repositories/
npm --prefix app/mobile test tests/sync/sync-engine.test.ts
```
