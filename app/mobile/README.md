# Mascote — app mobile (Expo)

App principal: criatura procedural, hábitos, evolução, chat com IA (mock ou BYOK), gamificação e premium demo — **offline-first** com persistência local.

Estado validado em 2026-05-24: `npm run typecheck` ✅ e `npm test` ✅ (**5549 testes / 168 arquivos**).

## Rodar

Na **raiz do monorepo** (recomendado):

```bash
npm install --prefix app/mobile
npm run web          # da raiz: Expo web
```

Ou nesta pasta:

```powershell
cd app\mobile
npx expo start --web
```

- Web: `http://localhost:8081` (porta padrão do Metro)
- Expo Go: `npx expo start` e escanear QR (mesmo Wi‑Fi)
- Android: `npx expo start --android` ou `npm run android`

## Qualidade

```bash
# na raiz
npm run typecheck
npm test

# aqui
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e:critical   # Maestro (emulador)
```

CI principal na raiz: `.github/workflows/ci.yml`.
E2E Maestro: `.github/workflows/maestro.yml` (nesta pasta).

## Arquitetura

```
app/mobile/
├── app/                      # Expo Router (rotas)
│   ├── onboarding/
│   ├── (tabs)/               # home, chat, evolution, report
│   └── …                     # paywall, customize, missions…
├── src/
│   ├── components/           # UI compartilhada (mascot 2D, design system)
│   ├── features/             # fatias por tela (ex.: home/)
│   ├── services/             # orquestração de negócio (home, missions, subscription)
│   ├── repositories/         # persistência local + contratos de sync
│   ├── sync/                 # fila offline, motor de export/import
│   ├── lib/                  # db, dna, behavior, ml, utilitários
│   ├── game/                 # evolução, memória do jogo
│   ├── ai/                   # safety, proxy, fallback, prompts
│   ├── hooks/                # hooks globais (tier, evolution, pip)
│   ├── content/              # catálogos estáticos (missões, billing, acessórios)
│   ├── analytics/
│   ├── design-system/
│   └── store.ts              # Zustand
├── tests/                    # Vitest (espelha domínios: lib/, sync/, ai/, …)
├── docs/                     # guias locais (E2E, IA-procedural, RevenueCat)
├── assets/
├── scripts/
└── .maestro/                 # flows E2E
```

**Fluxo de dependências:** `app/*` → `features` / `services` / `hooks` → `repositories` / `lib` / `sync`. Rotas não importam `@/lib/db` diretamente nas telas novas — use services.

## Configuração

- Copie `.env.example` → `.env` (`EXPO_PUBLIC_BILLING_PROVIDER=mock` por padrão)
- OpenAI (opcional): Settings → API Key no app
- EAS: veja `eas.json.example`
- RevenueCat (futuro): [docs/REVENUECAT_INTEGRATION.md](./docs/REVENUECAT_INTEGRATION.md)

## Docs relacionados

- [docs/CURRENT_STATE.md](../../docs/CURRENT_STATE.md) — estado real e gaps
- [docs/AUDIT_REAL_ATUAL.md](../../docs/AUDIT_REAL_ATUAL.md) — auditoria técnica recente
- [docs/RELEASE_READINESS.md](../../docs/RELEASE_READINESS.md) — go/no-go de release
- [docs/KNOWN_LIMITATIONS.md](../../docs/KNOWN_LIMITATIONS.md) — limites atuais
- [docs/PREMIUM_STRATEGY.md](../../docs/PREMIUM_STRATEGY.md)
- [docs/BETA_RELEASE_CHECKLIST.md](../../docs/BETA_RELEASE_CHECKLIST.md)
- [README.md](../../README.md) — visão do monorepo

## O que ainda não é produção

- Cobrança real (RevenueCat SDK + SKUs nas lojas)
- Proxy de IA em produção
- Push nativo completo

Landing de marketing: `../web/`. Plano de negócio: `../../docs/plano/`.
