# Estado atual real — Mascote (mai/2026)

Documento único de verdade operacional. Auditorias antigas são históricas — consulte este arquivo primeiro.

**Última verificação:** 2026-05-24 — `npm ci`, `npm run quality`, `npm run quality:ci` verdes em `app/mobile`.

## Monorepo

| Pacote | Pasta | Stack |
|--------|-------|-------|
| App | `app/mobile` | Expo 51, RN 0.74, Vitest |
| Landing + proxy IA | `app/web` | Next.js 14, API `/api/v1/mascot/reply` |
| CI | `.github/workflows/ci.yml` | typecheck + lint + `test:coverage` |

**Instalação:** `npm ci` e quality gates rodam em `app/mobile` (raiz delega via `npm --prefix app/mobile`).

Comandos na **raiz**: `npm run quality`, `npm run quality:ci`, `npm test`, `npm run typecheck`, `npm run lint`.

## App mobile (`app/mobile`)

| Área | Estado | Notas |
|------|--------|-------|
| Quality gate | ✅ `npm run quality` verde | typecheck + ESLint + 5551 testes |
| CI espelho | ✅ `npm run quality:ci` | inclui `test:coverage` + thresholds |
| npm ci | ✅ Limpo sem `--legacy-peer-deps` | `@react-three/drei@9.122` + fiber 8.x + React 18 |
| Coverage | ✅ 72.99% lines / 66.96% branches | Threshold CI: 70/66/72/70 |
| Billing | 🟡 RevenueCat SDK no package; init em runtime | Compra real requer dev client/EAS rebuild |
| IA proxy | 🟡 Rota Next.js pronta | Deploy + `EXPO_PUBLIC_AI_PROXY_URL` pendente |
| Unity | 🟡 Core + bridge; Android stub sem unityLibrary | Ver [UNITY_STATUS.md](UNITY_STATUS.md) |
| Maestro CI | 🟡 `app/mobile/.github/workflows/maestro.yml` | Gated por `vars.CI_E2E=1` |
| EAS | ✅ `app/mobile/eas.json` commitado | Perfis development/preview/preview-unity/preview-rc/production |
| npm audit | 🟡 43 vulns (15 high, 27 mod, 1 low) | Cadeia Expo 51 — ver [SECURITY_AUDIT.md](SECURITY_AUDIT.md) |

## Simulação → render

- `lifeState` (energy/mood) alimenta `buildUnityMascotState` via `simEnergy`/`simMood`
- `HomeAwayStrip` exibe living moments / resumo de ausência na Home
- Memórias de simulação gravadas em check-in de retorno

## Comandos de verificação

```powershell
cd app\mobile
npm ci
npm run quality        # rápido
npm run quality:ci     # espelha CI
```

## Docs relacionados

- [CI_STATUS.md](CI_STATUS.md)
- [BILLING_STATUS.md](BILLING_STATUS.md)
- [RELEASE_READINESS.md](RELEASE_READINESS.md)
- [AUDIT_REAL_ATUAL.md](AUDIT_REAL_ATUAL.md)
