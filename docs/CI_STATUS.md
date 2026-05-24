# CI Status — Mascote (2026-05-24)

## Workflows presentes

| Arquivo | Job | Quando roda |
|---------|-----|-------------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | `mobile-quality` | Todo PR/push em `main`/`master` |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | `unity-structure` | Todo PR/push (via reusable workflow) |
| [`.github/workflows/unity-ci.yml`](../.github/workflows/unity-ci.yml) | Estrutura Unity + grep controllers | PR/push com mudanças em `unity/**` |
| [`app/mobile/.github/workflows/maestro.yml`](../app/mobile/.github/workflows/maestro.yml) | E2E Maestro Android | Manual ou `vars.CI_E2E=1` |

## Comandos do CI mobile

```bash
cd app/mobile
npm ci
npm run typecheck
npm run lint
npm run test:coverage
```

Node: **20**. Cache: `app/mobile/package-lock.json`.

## Local vs CI

| Script | Conteúdo |
|--------|----------|
| `npm run quality` | typecheck + lint + `test` (rápido, sem coverage) |
| `npm run quality:ci` | typecheck + lint + `test:coverage` (espelha CI) |

**Instalação:** `npm ci` roda em `app/mobile` (raiz do monorepo não tem `package-lock.json`).

## Job opcional: npm audit

Informacional — ver [SECURITY_AUDIT.md](SECURITY_AUDIT.md). Fix completo exige upgrade Expo SDK 51→53+.

## Estado atual

- ✅ `npm ci` limpo (sem `--legacy-peer-deps`) após fix `@react-three/drei@9.x`
- ✅ `npm run quality:ci` verde localmente (5551 testes, coverage acima dos thresholds)
- 🟡 Maestro não roda em todo PR (custo ~6min; gated por variável)
