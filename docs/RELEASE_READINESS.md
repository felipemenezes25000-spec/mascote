# Release Readiness — Snapshot 2026-05-24 (pós P0)

## Status geral

**Pronto para beta técnico interno controlado.**  
**Ainda não pronto para release pública ampla.**

## Checklist beta técnico

- [x] `npm ci` limpo em `app/mobile`
- [x] `npm run quality` verde (typecheck + lint + testes)
- [x] `npm run quality:ci` verde (coverage + thresholds)
- [x] CI GitHub configurado (`.github/workflows/ci.yml`)
- [x] RevenueCat: estados honestos; SDK no package; init em `_layout`
- [x] Paywall não engana (`validateBillingEnv().canPurchase`)
- [x] Unity fallback three/2D operacional
- [x] Simulação → render contract (`simEnergy`/`simMood`)
- [x] Proxy IA: rota Next.js `/api/v1/mascot/reply` (código pronto)
- [ ] Proxy IA deployado + `EXPO_PUBLIC_AI_PROXY_URL` em produção
- [ ] RevenueCat sandbox E2E compra/restore em device
- [ ] Maestro crítico contínuo (`CI_E2E=1`)
- [ ] Smoke iOS Unity real
- [ ] npm audit vulns críticas tratadas ou justificadas (upgrade Expo)

## Cobertura (rodada 2026-05-24)

- Statements: **72.73%**
- Branches: **66.96%**
- Functions: **75.47%**
- Lines: **72.99%**

## Go/No-Go

| Gate | Veredito |
|------|----------|
| Beta interno técnico | **Go** — gates verdes, mocks identificados |
| TestFlight / Play Internal | **Go condicional** — após EAS credenciais + RC sandbox |
| Loja pública | **No-Go** — billing E2E + proxy prod + QA device + SDK upgrade |

## Bloqueios loja pública

1. RevenueCat sandbox validado ponta a ponta
2. Proxy IA em produção (sem OpenAI key no client)
3. QA Android/iOS real + performance Unity
4. Vulnerabilidades npm da cadeia Expo 51
