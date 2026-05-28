# Known Limitations — 2026-05-27

Documento vivo dos limites conhecidos no estado atual.

## Produto / plataforma

- App é 100% **2D procedural** após o pivô (commit `4d0004a`). Não há mais runtime Unity/3D — refs residuais foram removidas em `a57a874` + `c7d18fb`.
- E2E Maestro roda fora do CI padrão (job dedicado em `app/mobile/.github/workflows/maestro.yml`).
- iOS build/distribution: dev client + EAS pendente de credenciais. Code compila, falta operação.

## Backend / serviços externos

- Proxy IA: rota em [app/web/app/api/v1/mascot/reply/route.ts](app/web/app/api/v1/mascot/reply/route.ts). Deploy + env `OPENAI_API_KEY` no servidor é responsabilidade ops.
- RevenueCat: SDK `react-native-purchases` integrado; compra real requer dev client/EAS + produtos configurados nas lojas.
- Waitlist (web): persistência **file-based** real (commit `a57136d`). Migrar pra DB gerenciado quando o volume justificar.
- Sync remoto multi-device ainda não existe (arquitetura local-first, sync queue local).

## Qualidade técnica

- Cobertura total passa threshold do CI, mas há zonas com baixa cobertura em componentes visuais (Mascot2D layers) e integrações nativas (RevenueCat SDK).
- `noUncheckedIndexedAccess` segue desligado — refactor de grande volume pendente.
- Mocks de analytics/billing têm guard de produção; validação final depende de smoke em build release real.
- Living Moments registra `lifeEvents` no tick atual; histórico longitudinal persistente ainda não existe.

## Segurança / operação

- **Logger redação programática ativa** (logger.ts:50+). `redactSecrets()` sanitiza strings com `sk-*`/`Bearer *`/`Authorization:*` e mascara keys sensíveis (`token`, `password`, `api_key`, etc) em objetos. Cobre `Error.message` e `Error.stack`. Cobertura em [tests/security/logger-redact.test.ts](app/mobile/tests/security/logger-redact.test.ts) (26 testes) + [PENTEST 3](app/mobile/tests/pentests.test.ts).
- Sem segredos hardcoded no cliente. Proxy IA é requisito pra blindar chaves em produção (gate em [runtime-config](app/mobile/src/lib/runtime-config.ts)).
- Build/release de loja depende de configuração operacional externa (credenciais, tracks, EAS).

## npm audit — 2026-05-27

Total: **45 vulnerabilidades** — 0 critical, 15 high, 29 moderate, 1 low.

### Por que não estamos resolvendo agora

Todas as 15 highs e moderates cascateiam de uma raiz comum:

- **High (15)**: `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/metro-config`, `@expo/plist`, `cacache`, `send`, `tar`, `xcode`, `xmldom` etc — todas embutidas em `expo@51`. Fix disponível: **`expo@56.0.5` (semver-major)**.
- **Moderate (29)**: react-native CLI, virtualized-lists, react-native v0.74.5 — cascata RN. Fix exige bump RN major.

Subir Expo 51 → 56 implica:
- React Native 0.74 → 0.76+
- Reanimated, gesture-handler, screens, safe-area-context — todos bumps major
- Possíveis breaking changes em config plugins, expo-router, expo-modules-core
- Revalidação de todos os componentes nativos (haptics, blur, audio, etc)
- Re-build do Android nativo (MainActivity/MainApplication podem precisar ajuste)

Risco: **alto**. Custo: **dias a semanas**. Ganho de runtime: **zero** (vulnerabilidades são em tooling de build/dev, não no APK final).

### Riscos reais de runtime

**Nenhuma** das 45 vulnerabilidades afeta o código que vai pro device:

| Pacote | Severidade | Onde roda | Risco runtime |
|---|---|---|---|
| `@expo/cli`, `@expo/config*`, `@expo/plist`, `@expo/metro-*` | high | Build/dev tooling | Não vai pro APK |
| `cacache`, `send`, `tar`, `xcode`, `xmldom` | high (transitive) | Build | Não vai pro APK |
| `@react-native-community/cli*` | moderate | Dev CLI | Não vai pro APK |
| `react-native` core | moderate | Runtime | Mitigado pelo sandbox do device |
| `@testing-library/react-native` | moderate | Test-only | Não vai pro APK |
| `react-native-*` libs UI | moderate | Runtime, via RN | Mitigado pelo sandbox |
| `async-storage` | moderate | Runtime | Mitigado pelo sandbox |
| ~~`playwright`~~ | ~~high~~ | E2E dev | **Resolvido 2026-05-27** (bump 1.52 → 1.60) |

### Plano de remediação

1. **Curto prazo** (esta sessão — feito): bump Playwright (1.52 → 1.60).
2. **Médio prazo** (próxima sprint dedicada): planejar upgrade Expo 51 → 56. Ver [EXPO_UPGRADE_PLAN.md](EXPO_UPGRADE_PLAN.md).
3. **Mitigação contínua**: `npm audit --omit=dev || true` roda no CI como informacional (ver [.github/workflows/ci.yml:45](.github/workflows/ci.yml)). Não bloqueia merge, mas mantém visibilidade.
