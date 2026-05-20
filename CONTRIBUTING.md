# Contribuir

O app principal fica em `app/mobile` (Expo + React Native). A landing está em `app/web`.

## Pré-requisitos

- Node.js 20+
- npm

## Comandos (raiz do repositório)

```bash
npm install --prefix app/mobile
npm test              # 1775+ testes Vitest
npm run typecheck     # tsc --noEmit
npm run web           # Expo web em localhost
```

Equivalente dentro de `app/mobile`: `npm test`, `npm run typecheck`, `npx expo start`.

## Antes de abrir PR

1. `npm run typecheck` — zero erros
2. `npm test` — suite verde
3. Se alterou fluxos críticos de UI: `cd app/mobile && npm run test:e2e:critical` (Maestro + emulador)

## CI

- **CI** (`.github/workflows/ci.yml`): typecheck + testes em cada PR
- **E2E** (`app/mobile/.github/workflows/maestro.yml`): flows Maestro com tag `critical`

Não commite `.env` com chaves reais. Use `app/mobile/.env.example` como referência.
