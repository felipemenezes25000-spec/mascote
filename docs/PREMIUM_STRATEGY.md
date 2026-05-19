# Estratégia Premium — Mascote Plus

## Posicionamento

**"1000+ possibilidades de evolução"** — não "1000 fases". O valor premium é identidade procedural única + acesso completo ao caminho evolutivo.

## Tiers

Definidos em `src/content/billing.ts`:

| Tier | Preço demo | Benefícios-chave |
|------|------------|------------------|
| Free | R$ 0 | Evolução até adolescente, chat 10/dia, cenário room |
| Plus Mensal | R$ 24,90 | Evolução completa, chat ilimitado, todos cenários |
| Plus Anual | R$ 249/ano | Mesmos benefícios + economia ~17% |

## Implementação atual (100% código)

- `SubscriptionService` — get/subscribe/cancel/restore via factory
- `MockBillingProvider` — demo local (padrão)
- `RevenueCatBillingProvider` — falha graciosa sem keys; `EXPO_PUBLIC_RC_ENABLED=true` + SDK nativo para produção
- `billing-provider.ts` — `EXPO_PUBLIC_BILLING_PROVIDER=mock|revenuecat`
- `EntitlementService` — gates por feature (report preview/full, mutações lendárias, cenários)
- `PremiumFeatureGuard` — componente UI centralizado
- `SubscriptionRepository` + `PersonalizationRepository` — AsyncStorage
- `app/settings/personalization.tsx` — fluxo Sims pós-onboarding

## Gates de entitlement

```typescript
entitlementService.canEvolveToPhase(tier, phase)
entitlementService.dailyChatLimit(tier)
entitlementService.canAccessScene(tier, sceneId)
entitlementService.canExportReport(tier)
entitlementService.unlimitedStreakFreeze(tier)
```

## Próximos passos (somente loja / externo)

Ver também `docs/RELEASE_CHECKLIST.md`.

1. Ativar RevenueCat SDK + `EXPO_PUBLIC_RC_ENABLED=true` + SKUs reais (App Store / Play)
2. Paywall A/B com trial de 7 dias (config RevenueCat)
3. Receipt validation em produção
4. Analytics de conversão por trigger (`paywall-triggers.ts`)

## Triggers de paywall

Ver `src/lib/paywall-triggers.ts` — fase bloqueada, limite de chat, cenário premium.
