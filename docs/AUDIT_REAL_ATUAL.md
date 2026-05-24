# AUDIT REAL ATUAL — Mascote v8 AAA

Data da auditoria: 2026-05-24  
Escopo: `app/mobile`, `docs/`, contratos Unity RN↔Native↔C#

## 1) Comandos executados (estado real)

Executado em `app/mobile`:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:coverage
```

### Primeira execução (01:40)

- `npm run typecheck`: **falhou** inicialmente com erro em `tests/lib-proactive.test.ts` (iteração sobre retorno incompatível).
- `npm run lint`: **ok**.
- `npm test`: **falhou** inicialmente em testes proativos (`lib-proactive*`), com mismatch de expectativas.
- `npm run test:coverage`: **falhou** inicialmente pelos mesmos testes + `tests/lib/voice/player.test.ts`.

### Reexecução após sincronização do estado local (01:43-01:44)

- `npm run typecheck`: **ok**.
- `npm run lint`: **ok**.
- `npm test`: **ok** — **160 files / 5509 testes passando**.
- `npm run test:coverage`: **ok** — **160 files / 5509 testes passando**.
- Cobertura real atual:
  - Statements: **71.58%**
  - Branches: **66.69%**
  - Functions: **73.62%**
  - Lines: **71.68%**

Resultado: gate atual está verde no workspace auditado, mas houve oscilação inicial (indicando sensibilidade a estado local/arquivos em paralelo).

## 2) Estado dos quality gates (P0)

- TypeScript strict: **PASS**
- ESLint: **PASS**
- Vitest full suite: **PASS**
- Coverage threshold CI: **PASS** (acima dos mínimos 70/66/72/70)
- Workflows presentes:
  - `.github/workflows/ci.yml`
  - `.github/workflows/unity-ci.yml`

## 3) Mapeamento de rotas (app/mobile/app)

Snapshot real: **58 rotas/arquivos** na pasta de rotas, incluindo:

- Tabs: `app/(tabs)/index.tsx`, `app/(tabs)/chat.tsx`, `app/(tabs)/evolution.tsx`, `app/(tabs)/report.tsx`
- Fluxo mascote/unity: `app/mascot.tsx`, `app/mascot-room.tsx`
- Onboarding completo em `app/onboarding/*`
- Funcionais auxiliares: `checkin`, `memories`, `evolution`, `subscription`, `paywall`, `settings`, etc.

## 4) TODO/FIXME/stub/mock/placeholder (mapa de risco)

Busca em `app/mobile/src` com padrão `TODO|FIXME|stub|mock|placeholder`.

Leitura real:

- Existem ocorrências legítimas de testes/mocks de desenvolvimento.
- Riscos produtivos relevantes (não só teste):
  - `src/services/subscription/MockBillingProvider.ts` + `billing-provider.ts` (modo mock ainda suportado).
  - `src/analytics/MockAnalyticsProvider.ts` (provider real pendente).
  - `src/components/unity/*` e plugin iOS ainda em modo stub/fallback.
  - `src/ai/LocalFallbackAI.ts` (fallback local intencional).

### Bloqueio de mocks perigosos em produção

Há proteções implementadas em runtime/env validation (`mock_billing_in_production` etc.), mas ainda existe dependência de configuração correta de ambiente para evitar uso indevido.

## 5) Conferência do que já estava pronto (pedido do plano)

Itens previamente declarados foram **verificados no código** (sem duplicar implementação):

- Simulação: `src/sim/` com `LifeSimulator`, `habitBridge`, `genomeBridge`, `evolutionBridge`, `orchestrate`.
- Comportamento reativo: `src/lib/behavior/reactiveBehaviors.ts` e integração relacionada.
- Camada visual reativa: `MascotAmbient`, `SceneBackground`.
- Trigger proativo: `src/lib/proactive.ts`.
- Bridge Unity Android: módulo Kotlin + ponte JS (ainda com fallback/stub quando Unity embutido não está ativo).

## 6) Conflitos docs vs código (P1/P2)

### P1 — Versão Unity inconsistente

Fonte de verdade:

- `unity/MascotUnityCore/ProjectSettings/ProjectVersion.txt` = **6000.4.8f1**

Conflitos detectados:

- `docs/UNITY_IOS_INTEGRATION.md` citava **2022.3.62f1**
- `docs/UNITY_ASSET_PIPELINE.md` citava **Unity 2022.3**

Status: **corrigido nesta sessão** para 6000.4.8f1.

### P2 — divergência de números históricos

- `docs/CURRENT_STATE.md` e `docs/TEST_REPORT.md` têm snapshots antigos (ex.: 1785/1839 testes), enquanto estado atual auditado apontou 5509 testes.
- Isso não quebra execução, mas causa confusão operacional.

## 7) Gaps priorizados

### P0 (agora)

1. Manter gates verdes após mudanças (feito nesta sessão).
2. Endurecer contrato Unity bridge para evitar payload inválido em runtime (feito parcialmente nesta sessão).

### P1 (curto prazo)

1. Atualizar docs de status/relatório com números atuais unificados.
2. Revisar custo/performance do CI para manter feedback rápido em PRs.
3. Expandir testes de integração para `useUnityMascot` (contrato seq/schema/message).

### P2 (médio prazo)

1. Living Moments dedicado (`MomentGenerator`) caso produto peça camada semântica extra além de `creatureMoments`.
2. Consolidar tokens/design hardcoded residuais.
3. Substituir stubs Unity iOS por integração nativa real quando houver pipeline Mac.

## 8) Implementação feita durante a auditoria (incremental)

Além da documentação, foi feito hardening real no contrato Unity:

- `src/components/unity/unityMessageCodec.ts`
  - parser agora valida shape por `type` (`ready`, `error`, `animation.complete`, `gesture.received`) e rejeita payload parcial/desconhecido.
- `src/components/unity/UnityMascotBridge.ts`
  - bloqueia envio de `state.update` inválido usando `validateUnityMascotState`.
  - valida `schemaVersion` esperado antes de enviar ao native.
- Novos testes:
  - `tests/components/unity/unityBridgeContract.test.ts`
  - extensão de `tests/components/unity/unityMessageCodec.test.ts`

Validação dos ajustes:

- `npm test -- tests/components/unity/unityMessageCodec.test.ts tests/components/unity/unityBridgeContract.test.ts tests/core/mascot-render-contract/validate.test.ts` → **PASS (13 testes)**.
- `npm run typecheck` + `npm run lint` → **PASS**.

## 9) Honestidade operacional

Este audit **não** declara projeto 100% concluído.  
O trabalho cobriu Fase 0 completa com números reais e um avanço técnico parcial em Fase 2 (hardening Unity contract), mantendo o escopo incremental e verificável.
