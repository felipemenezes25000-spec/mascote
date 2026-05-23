# Mascote — app mobile (Expo)

App principal: criatura procedural, hábitos, evolução, chat com IA (mock ou BYOK), gamificação e premium demo — **offline-first** com persistência local.

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
npm test              # 1779 testes · 110 arquivos · ~11s
npm run test:coverage
npm run test:e2e:critical   # Maestro (emulador)
```

CI na raiz: `.github/workflows/ci.yml`. E2E Maestro: `.github/workflows/maestro.yml` (nesta pasta).

## Arquitetura (resumo)

```
app/mobile/
├── app/                    # Expo Router (~48 rotas)
│   ├── onboarding/         # signup, age, goal, quiz, meet, push, notice…
│   ├── (tabs)/             # home, chat, evolution, report
│   └── …                   # paywall, customize, missions, rewards…
├── src/
│   ├── components/         # Mascot 2D/3D, UI, guards
│   ├── lib/dna/            # genome, morphology, mutations, palette
│   ├── lib/behavior/       # utility AI
│   ├── lib/ml/             # safety, embeddings, memory
│   ├── game/               # evolution engine, memory service
│   ├── ai/                 # MascotAI, fallback local, proxy stub
│   ├── repositories/       # local + sync stub
│   └── store.ts            # Zustand
├── tests/                  # Vitest
└── .maestro/               # flows E2E
```

## Configuração

- Copie `.env.example` → `.env` (`EXPO_PUBLIC_BILLING_PROVIDER=mock` por padrão)
- OpenAI (opcional): Settings → API Key no app
- EAS: veja `eas.json.example`

## Docs relacionados

- [docs/CURRENT_STATE.md](../../docs/CURRENT_STATE.md) — estado real e gaps
- [docs/PREMIUM_STRATEGY.md](../../docs/PREMIUM_STRATEGY.md)
- [docs/BETA_RELEASE_CHECKLIST.md](../../docs/BETA_RELEASE_CHECKLIST.md)
- [README.md](../../README.md) — visão do monorepo

## O que ainda não é produção

- Cobrança real (RevenueCat SDK + SKUs nas lojas)
- Sync multi-dispositivo (Supabase stub)
- Proxy de IA em produção
- Push nativo completo

Landing de marketing: `../web/`. Plano de negócio: `../../docs/plano/`.
