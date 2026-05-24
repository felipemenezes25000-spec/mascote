# AUDIT REAL ATUAL — Mascote v9

Data: **2026-05-24**  
Escopo: `app/mobile`, `app/web`, `docs/`, CI, Unity

## Comandos executados

```powershell
cd app\mobile
Remove-Item -Recurse -Force node_modules
npm ci
npm run quality
npm run quality:ci
npm audit --omit=dev
```

## Resultados

| Comando | Resultado |
|---------|-----------|
| `npm ci` | ✅ PASS (sem legacy-peer-deps) |
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS (hook condicional Home corrigido) |
| `npm test` | ✅ PASS — **168 files / 5551 testes** |
| `npm run test:coverage` | ✅ PASS — lines **72.99%**, branches **66.96%** |
| `npm audit --omit=dev` | 🟡 **43 vulnerabilities** (15 high) |

## P0 corrigidos nesta sessão

1. **Peer deps drei/fiber** — downgrade `@react-three/drei` 10.7.7 → 9.122.0; pin `react-test-renderer@18.2.0`
2. **Rules of Hooks** — `unityAckStats` useMemo antes do early return em `index.tsx`
3. **RevenueCat readiness** — `ready` só quando SDK inicializado; `sdk_not_linked` nunca é ready
4. **Docs** — CI path Maestro, eas.json, npm ci location corrigidos

## CI

- ✅ `.github/workflows/ci.yml` — mobile quality + unity structure + audit informacional
- ✅ `.github/workflows/unity-ci.yml`
- ✅ `app/mobile/.github/workflows/maestro.yml` (E2E gated)

## Mocks/stubs classificados

| Item | Classificação |
|------|---------------|
| `MockBillingProvider` | dev-only OK |
| `MockAnalyticsProvider` | dev-only OK |
| Unity stub (`UnityMascotModule.kt`) | dev-only OK até export unityLibrary |
| `LocalFallbackAI` | dev/fallback OK |
| RevenueCat sem init nativo | bloqueador loja (honesto na UI) |
| IA proxy não deployado | bloqueador loja (cliente pronto) |

## Riscos remanescentes

| Prioridade | Item |
|------------|------|
| P1 | RevenueCat sandbox E2E em device |
| P1 | Deploy proxy IA produção |
| P1 | Expo SDK 51 vulns → upgrade 53+ |
| P2 | Unity iOS nativo |
| P2 | Design system (452 `<Text>` cru auditados) |
