# Estado atual real — Mascote (mai/2026)

Documento único de verdade operacional. Auditorias antigas (`AUDIT_AAA_COMPLETO.md`, `VEREDITO-FINAL.md`) são históricas — consulte este arquivo primeiro.

**Última verificação:** 2026-05-24 — `npm test` (**5549 testes / 168 arquivos**), `npm run typecheck` e `npm run test:coverage` reexecutados nesta sessão.

## Monorepo

| Pacote | Pasta | Stack |
|--------|-------|-------|
| App | `app/mobile` | Expo 51, RN 0.74, Vitest |
| Landing | `app/web` | Next.js 14, Tailwind |
| CI | `.github/workflows/ci.yml` | typecheck + lint + `test:coverage` (enforça thresholds) |

Comandos na **raiz**: `npm run quality`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run web`.

## App mobile (`app/mobile`)

| Área | Estado | Notas |
|------|--------|-------|
| Quality gate | ✅ `npm run quality` (typecheck + ESLint + suíte completa / ~12-18s) | Reusado pelo CI |
| Coverage | ✅ 73.61% lines / 67.66% branches (medido 2026-05-24). Threshold enforçado: 70/66/72/70 | Statements 73.37% · Functions 75.84% |
| Test scripts | ✅ test:unit (1211), test:integration (233), test:security (262, matriz 100%), test:ai (208), test:game (21), test:subscription (44), test:ci (full + coverage) | Permite gating granular em CI/pre-commit |
| Mutations | 12 marcos (7 individuais + 5 combo) — não 50+ como dito em iterações anteriores | [src/lib/dna/mutations.ts](../app/mobile/src/lib/dna/mutations.ts) e [mutations-extended.ts](../app/mobile/src/lib/dna/mutations-extended.ts) |
| Analytics layer | ✅ Interface + MockProvider + 16 eventos tipados + consent gating + guard de mock em build de produção | [src/analytics/](../app/mobile/src/analytics/) — provider real (Firebase/PostHog) plugável |
| Billing demo guard | ✅ `isDemoBilling()` + `isMockInProductionBuild()` + warning estruturado | [billing-provider.ts](../app/mobile/src/services/subscription/billing-provider.ts) |
| npm audit | 🟡 25 vulns (15 high, 9 mod, 1 low) — todas tied a Expo SDK 51 chain | [SECURITY_AUDIT.md](SECURITY_AUDIT.md) — fix exige upgrade SDK 51→53 |
| ESLint | ✅ Flat config (`eslint.config.js`) — RN + TS + react-hooks | Migrado de `.eslintrc.cjs` |
| Design tokens | ✅ Tokens semânticos por emotion/rarity/archetype/phase/gamification | `src/lib/themes.ts` + `themes.md` |
| UI primitives | ✅ 24 componentes em `src/components/ui/` (Typography, Input, Badge, …) | Onda A etapa 3 |
| `lib/db.ts` | ✅ 14 linhas (re-export proxy); módulos por domínio em `lib/db/` | Onda A etapa 4 |
| Home | ✅ <600 linhas; hooks em `features/home/`; mascote-centrada | Onda B etapas 5–6 |
| Mascote 3D | ✅ Lazy load + ErrorBoundary com fallback automático para 2D | Onda B etapa 7 |
| Gestos no mascote | ✅ Tap / double / long / pet via `MascotInteractive` | Onda B etapa 7 |
| Missões adaptativas | ✅ `suggestMissionFor` + `MissionGeneratorAI` + bandit feedback | Onda C etapa 8 |
| Memórias | ✅ `HomeMemoriesStrip` + tela `/memories` + milestones em check-in/evolução | Onda C etapa 9 |
| Arquétipos UX | ✅ DNA % por arquétipo na aba Evolução; pill na Home | Onda C etapa 10 |
| IA chat | 🟡 Fallback local rico; OpenAI BYOK opt-in; proxy URL preparado (`EXPO_PUBLIC_AI_PROXY_URL`) | Sem proxy deployado |
| Billing | 🟡 Demo mock padrão; RevenueCat adapter sem SDK nativo | `EXPO_PUBLIC_BILLING_PROVIDER` |
| Sync | ✅ Local completo via `exportAll` / `localSyncRepo` / `SyncEngine` (`local_only`) | Sem backend remoto |
| Mutações DNA | ✅ catálogo ativo com 12 marcos (7 individuais + 5 combo) | `lib/dna/mutations*.ts` |
| Maestro CI | 🟡 Workflow gatado por `vars.CI_E2E=1` | `.github/workflows/maestro.yml` |
| EAS / loja | 🔴 Sem `eas.json` commitado; `eas.json.example` | Ver `BETA_RELEASE_CHECKLIST.md` |
| A11y | ✅ Helpers + testes; `accessibilityLabel`/`Role` em telas críticas | `src/lib/accessibility.ts` |

## O que funciona de ponta a ponta (offline)

- Onboarding completo, missões, check-in, streak, XP, evolução procedural
- Mascote 2D/3D com fallback automático, gestos sensíveis ao toque, mutações visuais, conquistas, paywall demo (`PaywallCard` antes/depois)
- Memórias do mascote: marcos pós check-in/evolução, recall em chat, tela dedicada `/memories`
- Bandit ML alimentado por completion/skip de missões, IA local fallback (`MissionGeneratorAI`)
- Export/import de backup incluindo evolução, memória, assinatura, personalização

## TODOs externos (precisam de credenciais/infra fora do repo)

1. **Proxy IA**: deploy de servidor que aceite `POST /v1/mascot/reply` e use chave OpenAI server-side. Setar `EXPO_PUBLIC_AI_PROXY_URL` no app (cliente já implementado em `ProxyMascotAI.ts`).
2. **RevenueCat real**: linkar SDK nativo, criar produtos no App Store/Play, definir `EXPO_PUBLIC_BILLING_PROVIDER=revenuecat` + `EXPO_PUBLIC_REVENUECAT_API_KEY*` + `EXPO_PUBLIC_RC_ENABLED=true`.
3. **EAS / loja**: criar `eas.json`, configurar credenciais, beta tracks (TestFlight/Play Internal). Ver `BETA_RELEASE_CHECKLIST.md`.
4. **Backend sync**: multi-device (backend remoto ainda não definido).
5. **Maestro em PRs**: setar `gh variable set CI_E2E --body 1` quando o time aceitar o custo (~6min/run).

## Comandos de verificação

```powershell
# na raiz (recomendado)
npm run quality          # typecheck + lint + suíte completa
npm test                 # apenas testes (sem coverage)
npm run test:coverage    # testes + coverage (enforça threshold do CI)
npm run typecheck

# ou na pasta do mobile
cd app\mobile
npm run quality
```

## Gaps técnicos conhecidos (alvos pra próximas sessões)

- **`noUncheckedIndexedAccess` desligado** — habilitar surfou 271 erros em 60+ arquivos (Mascot3D, insights, kmeans, tokenize, graph). Sweep dedicado pendente.
- ✅ **`useBehaviorTick.ts`** — coberto agora (12 testes, ~100%).
- ✅ **`persistence.ts` (dna)** — coberto agora (11 testes, 100%).
- ✅ **Mascot3D.tsx** — quebrado em [components/mascot-3d/](../app/mobile/src/components/mascot-3d/) (12 subcomponentes, container ficou em 164 linhas).
- **Vulnerabilidades npm (25)** — upgrade Expo SDK 51→53 em projeto dedicado.
- **Proxy IA não deployado** — produção depende de BYOK até deploy. Ver [AI_PRODUCTION_PLAN.md](AI_PRODUCTION_PLAN.md).
- **RevenueCat SDK não vinculado** — `RevenueCatBillingProvider` retorna erro honesto até integração nativa. Ver [PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md).
- **Sync remoto não implementado** — app é 100% local-first. Ver [SYNC_ARCHITECTURE.md](SYNC_ARCHITECTURE.md).
- **Analytics provider real** — só mock por ora. Plugar Firebase/PostHog quando decisão tomada. Ver [src/analytics/](../app/mobile/src/analytics/).

## Beta blockers (snapshot honesto)

- **RevenueCat nativo real** ainda não integrado em produção.
- **Proxy IA server-side** ainda não deployado (cliente pronto com fallback/BYOK).
- **Smoke real de release em device/loja** ainda pendente no gate padrão.
