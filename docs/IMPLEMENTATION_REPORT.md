# Implementation Report — Mascote v9 Produção (2026-05-24)

## Resumo executivo

Sprint 0 (P0) concluído: dependências reprodutíveis, quality gate verde, RevenueCat com semântica honesta, docs alinhados com o repo. Sprints 1–5 entregaram integração `react-native-purchases`, proxy IA mínimo, sim→render, `HomeAwayStrip`, CI audit e documentação operacional.

## Comandos executados

```powershell
cd app\mobile
npm ci
npm run quality
npm run quality:ci
npm audit --omit=dev
```

## P0 corrigidos

| Item | Status |
|------|--------|
| npm ci limpo | ✅ |
| Hook condicional Home | ✅ |
| drei/fiber peer deps | ✅ drei 9.122 + fiber 8.18 |
| RevenueCat ready | ✅ |
| Docs honestos | ✅ |

## P1 entregues

| Item | Status |
|------|--------|
| react-native-purchases | ✅ package + init + purchase/restore |
| quality:ci espelha CI | ✅ |
| npm audit documentado | ✅ 43 vulns |
| Sim → render contract | ✅ simEnergy/simMood |
| Proxy IA código | ✅ Next.js route |

## Arquivos alterados (principais)

- `app/mobile/package.json`, `package-lock.json`
- `app/mobile/app/(tabs)/index.tsx`
- `app/mobile/src/services/subscription/RevenueCatBillingProvider.ts`
- `app/mobile/src/services/subscription/revenueCatSdk.ts`
- `app/mobile/src/lib/billing-config.ts`
- `app/mobile/src/components/MascotRenderer.tsx`
- `app/mobile/src/core/mascot-render-contract/buildUnityMascotState.ts`
- `app/mobile/src/features/home/components/HomeAwayStrip.tsx`
- `app/mobile/app/_layout.tsx`
- `app/web/app/api/v1/mascot/reply/route.ts`
- `.github/workflows/ci.yml`
- `docs/*` (CURRENT_STATE, AUDIT, RELEASE_READINESS, CI_STATUS, BILLING_STATUS, UNITY_STATUS, …)

## Testes

- **5551** testes passando
- Novos: RevenueCat readiness, buildUnity sim override

## Status final

| Área | Status |
|------|--------|
| npm ci | ✅ |
| npm run quality | ✅ |
| CI | ✅ configurado |
| RevenueCat | 🟡 SDK integrado; sandbox E2E pendente |
| Unity | 🟡 Core + fallback; embed nativo pendente |
| IA proxy | 🟡 Código pronto; deploy pendente |
| Beta interno | Go condicional |
| Loja pública | No-Go |

## Próximos passos

1. EAS build com RevenueCat + sandbox purchase test
2. Deploy proxy (`app/web`) + `EXPO_PUBLIC_AI_PROXY_URL`
3. Export Unity android unityLibrary
4. Upgrade Expo SDK 51→53 (vulns)
5. Habilitar Maestro CI (`CI_E2E=1`)
