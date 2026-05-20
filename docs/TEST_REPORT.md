# Test Report — Mascote Mobile

**Data:** 2026-05-20  
**Escopo:** Suite completa pós-transformação premium (AI guards, billing modules, sync engine)

## Comandos

```powershell
cd app\mobile
npm ci
npm run typecheck
npm run lint
npm test
npm run test:ci
npm run test:unit
npm run test:integration
npm run test:security
npm run test:ai
npm run test:game
npm run test:subscription
npm audit
```

## Resultados

| Comando | Status | Detalhe |
|---------|--------|---------|
| `npm ci` | ✅ | exit 0 |
| `npm run typecheck` | ✅ | 0 erros TS strict |
| `npm run lint` | ✅ | 0 erros ESLint |
| `npm test` | ✅ | **1839 testes**, 117 arquivos, ~9s |
| `npm run test:ci` | ✅ | coverage lines **72.85%** (threshold 70%) |
| `npm run test:unit` | ✅ | subset lib/content/store |
| `npm run test:integration` | ✅ | services/components/hooks |
| `npm run test:security` | ✅ | ~1530 testes — core 262 + mass 1269 + matriz 31/31 |
| `npm run test:ai` | ✅ | ai + lib-ai + production-guards |
| `npm run test:game` | ✅ | evolution engine |
| `npm run test:subscription` | ✅ | billing + entitlements |
| `npm audit` | ➖ | Fora do gate — informativo (Expo SDK 51; ver SECURITY_AUDIT.md) |
| Maestro E2E | ⏭ | Requer emulador/device — não roda em CI unit |

## Novos testes (sessão 2026-05-20)

| Arquivo | Testes | Área |
|---------|--------|------|
| `tests/ai/production-guards.test.ts` | 9 | AIRateLimiter, AICostGuard, AIResponseValidator, PersonalityVoice |
| `tests/services/subscription/billing-modules.test.ts` | 8 | PaywallRules, PurchaseErrorMapper, SubscriptionTypes |
| `tests/data/sync-engine.test.ts` | 4 | SyncEngine, SyncQueue, ConflictResolution |

## Hangs / flakes

Nenhum hang detectado. Suite completa finaliza em <15s com `pool=threads`.

## E2E separado

Maestro em `.maestro/` — scripts `test:e2e` e `test:e2e:critical`. **Não** incluído em `npm test`.

## Pendências externas

- [ ] Maestro em CI com emulador
- [ ] RevenueCat sandbox E2E
- [ ] Proxy IA integration test (requer URL deployada)

---

*Gerado após quality gates verificados em 2026-05-20.*
