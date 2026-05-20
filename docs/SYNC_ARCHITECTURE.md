# Sync architecture — Mascote (2026-05-20)

Arquitetura de sincronização local-first do Mascote. **Hoje 100% local**;
Supabase é stub honesto até deploy.

## Princípios

1. **Local-first, sempre.** O app FUNCIONA SEM REDE. AsyncStorage é a fonte
   de verdade no device. Servidor é espelho serializável.
2. **Sync é opt-in.** Usuário ativa em settings após login. Sem login = sem sync.
3. **Sync nunca destrói.** LWW (last-write-wins) com `updated_at`, mas
   conflitos sérios viram backup local antes de aplicar remoto.
4. **Sem perda por falha de rede.** Mutations vão pra queue offline e dão retry.
5. **Backup manual sempre.** Export/import via arquivo JSON funciona sem cloud.

## Estado atual

| Camada | Estado | Onde |
|---|---|---|
| Local repo (todos os domínios) | ✅ Funciona | [src/repositories/local.ts](../app/mobile/src/repositories/local.ts) |
| Local export/import | ✅ Funciona | [src/repositories/sync-local.ts](../app/mobile/src/repositories/sync-local.ts) |
| Supabase client | 🟡 Stub | [src/repositories/supabase-stub.ts](../app/mobile/src/repositories/supabase-stub.ts) |
| Sync queue offline | 🔴 Não existe | a criar |
| Conflict resolution | 🔴 Não existe | a criar |
| Last-synced-at por tabela | 🔴 Não existe | a criar (`sync_metadata` no schema) |

## Modelo de sync proposto

### Domínios sincronizáveis

(Em ordem de prioridade pra ativação)

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
- **settings (theme, locale)** — local, mas pode ir pra `user_profiles` se útil

## Fluxos

### 1. Boot

```
App launches → load local state
            → if user signed in: queue background sync pull
            → app renders com dados locais imediatamente
            → quando pull termina, atualiza UI com merge
```

### 2. User action (check-in, complete mission)

```
User taps "completar" →
  withLock(user) {
    apply local mutation (atomic)
    enqueue sync op { table, op, payload, ts }
    return UI feedback imediato
  }
→ background worker drena queue (retry exponencial até 5 tentativas)
```

### 3. Pull periódico (active app)

```
A cada 60s (com app aberto):
  pull(user, last_synced_at) → list de ops desde then
  for op in ops:
    if op.ts > local.updated_at → apply
    else → discard (já mais novo localmente)
```

### 4. Conflito (mesma chave, ambos atualizados após last sync)

```
Caso: local.updated_at = T1, remote.updated_at = T2, last_sync = T0 < T1, T2
Action:
  1. backup local antes de aplicar (`backups` table, payload = current local)
  2. apply LWW (maior ts vence)
  3. notify user (toast: "Sincronizado de outro dispositivo — backup salvo")
```

## Interface

```ts
// src/data/repositories/*.ts — uma por domínio
export interface MascotRepository {
  get(userId: string): Promise<Mascot | null>;
  save(mascot: Mascot): Promise<void>;
  list(userId: string): Promise<readonly Mascot[]>;
  delete(mascotId: string): Promise<void>;
}

// src/data/sync/SyncEngine.ts
export interface SyncEngine {
  push(userId: string): Promise<SyncResult>;
  pull(userId: string): Promise<SyncResult>;
  /** Full reconciliation — usar com cuidado, depois de muito tempo offline. */
  fullSync(userId: string): Promise<SyncResult>;
  getQueueSize(): Promise<number>;
  /** Subscribe pra UI mostrar status (sincronizando / offline / etc) */
  subscribe(handler: (status: SyncStatus) => void): () => void;
}

// src/data/sync/SyncTypes.ts
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncResult {
  applied: string[];      // table:id que foram aplicados
  skipped: string[];      // table:id que foram pulados (local mais novo)
  conflicts: string[];    // table:id que tiveram conflito (backup feito)
  pushedOps: number;
  pulledOps: number;
  durationMs: number;
}
```

## Schema

Ver [SUPABASE_SCHEMA.sql](./SUPABASE_SCHEMA.sql) — 12 tabelas com RLS, triggers
`updated_at`, índices, `version` + `deleted_at` em domínios de longo prazo.

## Implementação faseada

### Fase 1 — Preparação (sem custo de infra)

- ✅ Schema SQL pronto
- ✅ Stub Supabase honesto (delega pra local se env não set)
- ✅ Local export/import funciona 100%
- [ ] Definir interfaces de Repository (sem refactor ainda)
- [ ] Criar `OfflineMutationQueue` em memory + persistência AsyncStorage
- [ ] Estender `sync_metadata` em AsyncStorage (par com tabela remota)

### Fase 2 — Deploy Supabase (precisa conta)

- [ ] Criar projeto Supabase
- [ ] Rodar `SUPABASE_SCHEMA.sql`
- [ ] Configurar auth (anon key + service role)
- [ ] Validar RLS com testes (postman / SQL)
- [ ] Setar `EXPO_PUBLIC_SUPABASE_URL` + `_ANON_KEY`

### Fase 3 — Auth no app

- [ ] Adicionar Sign in with Apple / Google (Expo AuthSession)
- [ ] Linkar com Supabase auth
- [ ] Onboarding atualizado com opt-in de sync (claro: "Quer sincronizar entre dispositivos?")

### Fase 4 — Implementar SyncEngine

- [ ] `SupabaseMascotRepository` real (substitui stub)
- [ ] `SyncQueue` com persistência
- [ ] `pull()` com cursor e batching
- [ ] `push()` com retry exponencial
- [ ] UI status (badge na home: "Sincronizado" / "Sincronizando..." / "Offline")

### Fase 5 — Conflict resolution + observability

- [ ] LWW com backup automático
- [ ] Toast/UI quando conflito acontece
- [ ] Métricas: sync_latency, queue_depth, conflict_rate

## Testes

```powershell
# Local export/import
npm --prefix app/mobile test tests/repositories/

# Confirmar stub Supabase delega pra local sem env
npm --prefix app/mobile test tests/lib-backend.test.ts
```

## Comandos verificação pós-deploy

```sql
-- Listar tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Validar RLS está ON em todas
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Validar policies por tabela
SELECT * FROM pg_policies WHERE schemaname = 'public';
```
