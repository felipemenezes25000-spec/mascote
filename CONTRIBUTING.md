# Contribuir

Monorepo Mascote: app principal em `app/mobile` (Expo + React Native), landing em `app/web` (Next.js).

## Pré-requisitos

- Node.js 20+
- npm

## Comandos (raiz do repositório)

```bash
npm install --prefix app/mobile
npm run typecheck     # tsc --noEmit em app/mobile
npm test              # 1779 testes Vitest (110 arquivos)
npm run web           # Expo web em localhost:8081
npm run test:coverage # cobertura (app/mobile)
```

Equivalente em `app/mobile`: `npm test`, `npm run typecheck`, `npx expo start`.

### Landing (`app/web`)

```bash
cd app/web
npm install
npm run dev           # http://localhost:3000
```

## Antes de abrir PR

1. `npm run typecheck` — zero erros
2. `npm test` — suite verde (1779/1779)
3. Se alterou fluxos críticos de UI: `cd app/mobile && npm run test:e2e:critical` (Maestro + emulador)

## CI

| Workflow | Onde | O quê |
|----------|------|--------|
| **CI** | `.github/workflows/ci.yml` | typecheck + testes unitários em cada PR |
| **Maestro** | `app/mobile/.github/workflows/maestro.yml` | E2E com tag `critical` (mais lento) |

Não commite `.env` com chaves reais. Use `app/mobile/.env.example` como referência.

## Documentação

- Estado atual: [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)
- Índice: [docs/README.md](docs/README.md)
- Visão geral: [README.md](README.md)
