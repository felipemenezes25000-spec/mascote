# Billing Status — Mascote (2026-05-24)

## Providers

| Provider | Quando | Compras |
|----------|--------|---------|
| `mock` (default dev) | `EXPO_PUBLIC_BILLING_PROVIDER=mock` ou build não-prod | Simuladas localmente |
| `revenuecat` | Prod força `revenuecat`; preview-rc no EAS | Nativas quando SDK init OK |

## Estados RevenueCat (`readiness`)

| Estado | `ready` | `canPurchase` (paywall) | Significado |
|--------|---------|-------------------------|-------------|
| `not_selected` | false | false | Provider não é revenuecat |
| `missing_api_key` | false | false | Falta API key |
| `sdk_disabled` | false | false | `EXPO_PUBLIC_RC_ENABLED` ≠ true |
| `sdk_not_linked` | false | false | Env OK, SDK não inicializado |
| `ready` | true | true | `initRevenueCatSdk()` OK |

## Env vars

```txt
EXPO_PUBLIC_ENV=production|preview|development
EXPO_PUBLIC_BILLING_PROVIDER=mock|revenuecat
EXPO_PUBLIC_REVENUECAT_API_KEY          # fallback genérico
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
EXPO_PUBLIC_RC_ENABLED=true             # após SDK no build
```

Nunca commitar chaves reais.

## SDK

- Pacote: `react-native-purchases@^8.x` em [`app/mobile/package.json`](../app/mobile/package.json)
- Init: [`initRevenueCatSdk()`](../app/mobile/src/services/subscription/revenueCatSdk.ts) no [`app/_layout.tsx`](../app/mobile/app/_layout.tsx) após profile hidratado
- **Expo Go:** módulo nativo ausente → permanece `sdk_not_linked` (honesto)
- **Dev client / EAS:** requer rebuild após adicionar SDK

## Produto RevenueCat (configurar no dashboard)

| Tier app | Package ID esperado |
|----------|---------------------|
| `plus_monthly` | `plus_monthly` |
| `plus_annual` | `plus_annual` |

## Pendências loja

- [ ] Sandbox E2E compra + restore em device real
- [ ] Produtos criados App Store Connect / Play Console
- [ ] Entitlements mapeados no RevenueCat dashboard
