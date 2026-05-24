# Release Readiness — Snapshot 2026-05-24

## Status geral

**Pronto para beta técnico controlado**, **ainda não pronto para release público amplo**.

## Checklist beta (estado atual)

- ✅ **Gates locais mínimos**: `typecheck` e `npm test` passando (**5549 testes**).
- ✅ **Cobertura formal desta rodada**: `npm run test:coverage` executado com thresholds ok.
- ✅ **Fases 8-10 críticas**: debug panel Home, proxy integration test, sync `life_state`, guard de billing prod e ajuste de foco Home concluídos.
- ✅ **Memória emocional 2.4**: eventos de simulação gravados em memória + recall usado em bubble proativo.
- ✅ **Microevolução fase 3 (mínimo)**: trigger de forma rara adicionado e ligado ao fluxo Home.
- 🟡 **Maestro smoke**: referências ajustadas e novo flow `home-return-sim.yaml` criado; execução real em device/emulador pendente.
- ✅ **Guardrails billing**: build de produção força provider efetivo `revenuecat`.
- ✅ **Perfis EAS**: `development`, `preview`, `preview-unity`, `preview-rc`, `production` presentes e com envs coerentes.
- 🟡 **Submit EAS**: placeholders ainda presentes (`appleId`, `ascAppId`, `appleTeamId`, `serviceAccountKeyPath`) — esperado para ambiente local, precisa preencher no pipeline real.
- ✅ **Varredura de segurança em `src/`**: sem hardcoded keys/tokens e sem `console.log` sensível novo.

### Cobertura real desta rodada

- Statements: **73.37%**
- Branches: **67.66%**
- Functions: **75.84%**
- Lines: **73.61%**

## Bloqueios para release amplo

- 🔴 Proxy IA de produção ainda depende de backend externo estar deployado e validado ponta a ponta.
- 🔴 RevenueCat sandbox/produção ainda precisa de rodada E2E real de compra/restauração em dispositivo.
- 🔴 Smoke Maestro em dispositivo real não executado nesta rodada.
- 🔴 Integração Unity iOS continua parcial/documental.

## Go/No-Go honesto

- **Go** para continuar beta técnico interno com monitoramento.
- **No-Go** para publicação ampla até fechar billing real E2E + proxy server-side + smoke device real.

## Checklist beta técnico (estado atual)

- [x] Gates CI mobile com `typecheck` + `lint` + `test:coverage` em PR.
- [x] Guard de billing em produção (provider efetivo não fica mock).
- [x] Contrato proxy IA tipado no cliente + teste de integração local do payload.
- [x] Home com debug panel Unity opcional por env (`EXPO_PUBLIC_UNITY_DEBUG_PANEL`).
- [x] Export/import local inclui `life_state`.
- [x] Perfis EAS principais presentes (`development`, `preview`, `preview-unity`, `preview-rc`, `production`).
- [ ] RevenueCat nativo validado em sandbox real.
- [ ] Proxy IA de produção deployado e validado ponta-a-ponta.
- [ ] Maestro crítico rodando de forma contínua no CI (hoje depende de `vars.CI_E2E`).
- [ ] Smoke iOS Unity real (pipeline ainda documental).
