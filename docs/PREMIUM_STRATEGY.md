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

## Modos de runtime (`lib/billing-config.ts`)

| Modo | `EXPO_PUBLIC_BILLING_PROVIDER` | Compra na UI |
|------|------------------------------|--------------|
| Demo | `mock` (padrão) | Simulada localmente |
| Produção incompleta | `revenuecat` sem keys / `RC_ENABLED` | Bloqueada + banner |
| Produção preparada | `revenuecat` + keys + `RC_ENABLED=true` | Bloqueada até SDK nativo |

O paywall (`app/paywall.tsx`) exibe label e detalhe honestos — **nunca** promove tier em compra falha.

## Passos exatos para produção (loja)

1. Instalar `react-native-purchases` e configurar projetos iOS/Android no RevenueCat
2. Criar produtos `mascote_plus_monthly` e `mascote_plus_annual` nas lojas + dashboard RC
3. `.env` de release:
   ```env
   EXPO_PUBLIC_BILLING_PROVIDER=revenuecat
   EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_...
   EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_...
   EXPO_PUBLIC_RC_ENABLED=true
   ```
4. Implementar `Purchases.purchasePackage` em `RevenueCatBillingProvider.purchase` (ponto marcado no código)
5. Testar restore + cancel + receipt validation em sandbox Apple/Google
6. Só então habilitar `canPurchase` no adapter quando SDK retornar sucesso real

Ver também `docs/BETA_RELEASE_CHECKLIST.md` e `docs/CURRENT_STATE.md`.

## Triggers de paywall

Ver `src/lib/paywall-triggers.ts` — fase bloqueada, limite de chat, cenário premium.
