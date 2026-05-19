# Checklist — build beta (TestFlight / Play Internal)

## Pré-requisitos

- [ ] Conta Apple Developer + Google Play Console
- [ ] `eas.json` criado (`eas build:configure`)
- [ ] Ícones e splash conferidos (`app/mobile/assets/`)
- [ ] `.env` de produção **fora do git** (copiar de `.env.example`)

## Versão

| Campo | Arquivo | Valor atual |
|-------|---------|-------------|
| `version` | `app/mobile/app.json` | 0.1.0 |
| iOS `buildNumber` | `app/mobile/app.json` | 1 |
| Android `versionCode` | `app/mobile/app.json` | 1 |

Incrementar a cada build enviado às lojas.

## Variáveis de ambiente (beta)

```env
EXPO_PUBLIC_BILLING_PROVIDER=mock
# ou revenuecat + keys quando SDK estiver no app
EXPO_PUBLIC_AI_PROXY_URL=https://...
```

## QA mínimo antes do upload

- [ ] `npm run typecheck` e `npm test` verdes
- [ ] Onboarding completo → home → primeira missão
- [ ] Paywall mostra banner demo vs produção correto
- [ ] Export/import de dados nas Configurações
- [ ] `npx expo-doctor`

## Build (quando EAS existir)

```powershell
cd app\mobile
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
```

## Pós-upload

- [ ] TestFlight / Internal testing com 3+ dispositivos
- [ ] Verificar paywall **não** simula compra real se `BILLING_PROVIDER=revenuecat` sem SDK
