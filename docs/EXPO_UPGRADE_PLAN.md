# Expo Upgrade Plan (SDK 51 -> 53)

## Objetivo

Atualizar o app mobile de Expo SDK 51 para SDK 53 com risco controlado, sem bloquear o desenvolvimento corrente.

## Escopo e estratégia

- Upgrade em duas etapas: `51 -> 52` e depois `52 -> 53`.
- Cada etapa com branch dedicada, gates completos (`typecheck`, `lint`, `test`, `test:coverage`, smoke Maestro).
- Sem mudança funcional de produto no mesmo PR do upgrade.

## Pré-requisitos

- Node e tooling alinhados com recomendação oficial do Expo para SDK 53.
- Limpeza de build cache local e CI antes de validar regressões.
- Inventário de plugins nativos atuais (`withUnityAndroid`, billing, notifications).

## Passo a passo sugerido

### Fase 1 — Baseline e preparação

1. Congelar baseline:
   - Rodar `npm run quality` e `npm run test:coverage` em `app/mobile`.
   - Exportar snapshot de métricas (tempo de teste, cobertura, contagem de testes).
2. Validar dependências críticas:
   - `expo`, `react-native`, `expo-router`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`.
3. Revisar plugins custom:
   - `app/mobile/plugins/withUnityAndroid.js`.

### Fase 2 — Upgrade SDK 52

1. `npx expo install --fix` após ajustar `expo` para SDK 52.
2. Reconciliar mudanças de config (`app.json`/plugins).
3. Rodar:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run test:coverage`
4. Smoke local:
   - Onboarding
   - Home
   - Check-in
   - Chat
   - Evolution

### Fase 3 — Upgrade SDK 53

1. Repetir processo para SDK 53.
2. Revalidar integrações nativas:
   - Unity Android bridge
   - Billing provider selection
   - Notifications/proactive flows
3. Reexecutar suíte completa e Maestro crítico.

## Matriz de risco

| Área | Risco | Impacto | Mitigação |
|---|---|---|---|
| Unity bridge Android | Médio | Alto | Smoke em `mascot-room`, Home Unity e testes de contrato bridge |
| Navegação (`expo-router`) | Médio | Médio | Smoke de tabs + deep links e revisão de redirects |
| Reanimated/Gesture | Médio | Médio | Teste manual de animações principais e interações do mascote |
| Billing/RevenueCat path | Baixo | Alto | Garantir guard de produção + teste de seleção de provider |
| CI/workflows | Baixo | Médio | Rodar pipeline completo em PR de upgrade |
| Maestro | Médio | Médio | Ajustar seletores quebrados e manter flow crítico mínimo |

## Checklist de teste (go/no-go)

- [ ] `npm run typecheck` verde
- [ ] `npm run lint` verde
- [ ] `npm test` verde
- [ ] `npm run test:coverage` verde (thresholds mantidos)
- [ ] Maestro critical (`onboarding`, `checkin`, `chat-crisis`) verde
- [ ] Smoke manual Android (dev/preview)
- [ ] Smoke manual iOS (quando disponível)
- [ ] Sem regressão em Home cinematográfica e render de mascote
- [ ] Sem regressão no fluxo de assinatura/paywall

## Critério de sucesso

- SDK 53 ativo com todos os gates verdes e sem regressões P0/P1 em fluxo principal.
- Vulnerabilidades conhecidas da cadeia SDK 51 reduzidas após upgrade.
