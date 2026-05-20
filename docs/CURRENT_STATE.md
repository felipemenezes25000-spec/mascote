# Estado atual real — Mascote (mai/2026)

Documento único de verdade operacional. Auditorias antigas (`AUDIT_AAA_COMPLETO.md`, `VEREDITO-FINAL.md`) são históricas — consulte este arquivo primeiro.

## Monorepo

| Pacote | Pasta | Stack |
|--------|-------|-------|
| App | `app/mobile` | Expo 51, RN 0.74, Vitest |
| Landing | `app/web` | Next.js 14, Tailwind |
| CI | `.github/workflows/ci.yml` | `npm run quality` (typecheck + lint + test) |

Comandos na **raiz**: `npm run quality`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run web`.

## App mobile (`app/mobile`)

| Área | Estado | Notas |
|------|--------|-------|
| Quality gate | ✅ `npm run quality` (typecheck + ESLint + 1779 testes / 110 arquivos / ~8s) | Reusado pelo CI |
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
| Sync | 🟡 Local completo via `exportAll` / `localSyncRepo`; Supabase stub | Sem backend live |
| Mutações DNA | ✅ 50+ no catálogo | `lib/dna/mutations*.ts` |
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
4. **Backend sync**: Supabase ou equivalente para multi-device.
5. **Maestro em PRs**: setar `gh variable set CI_E2E --body 1` quando o time aceitar o custo (~6min/run).

## Comandos de verificação

```powershell
# na raiz (recomendado)
npm run quality   # typecheck + lint + 1779 testes
npm test
npm run typecheck

# ou na pasta do mobile
cd app\mobile
npm run quality
```
