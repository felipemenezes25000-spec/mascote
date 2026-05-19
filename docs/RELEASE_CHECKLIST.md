# Checklist de release — Mascote Plus

Use este documento antes de enviar builds à App Store / Play Console.

## 1. Ambiente e variáveis

1. Copie `app/mobile/.env.example` → `app/mobile/.env` (não commitar).
2. Desenvolvimento local: `EXPO_PUBLIC_BILLING_PROVIDER=mock`.
3. Produção (quando SDK estiver integrado):
   - `EXPO_PUBLIC_BILLING_PROVIDER=revenuecat`
   - `EXPO_PUBLIC_REVENUECAT_API_KEY` (ou chaves por plataforma)
   - `EXPO_PUBLIC_RC_ENABLED=true`
   - SKUs alinhados ao dashboard RevenueCat

## 2. RevenueCat

- [ ] Criar projeto em [RevenueCat](https://www.revenuecat.com/)
- [ ] Conectar App Store Connect + Google Play Console
- [ ] Criar produtos: `plus_monthly`, `plus_annual` (IDs iguais ao código em `src/content/billing.ts`)
- [ ] Configurar entitlement `plus` vinculado aos produtos
- [ ] Instalar `react-native-purchases` e completar `RevenueCatBillingProvider.purchase/restore`
- [ ] Testar sandbox iOS + test track Android
- [ ] Trial 7 dias (opcional) no dashboard

## 3. Lojas

- [ ] Screenshots (Home, Evolução, Paywall, Relatório semanal)
- [ ] Política de privacidade URL pública
- [ ] Classificação etária / saúde mental (CVV 188 no app)
- [ ] Descrição destacando evolução procedural (não ranking punitivo)

## 4. Qualidade automatizada

```powershell
cd app\mobile
npm run typecheck
npm test
npm run doctor
```

Meta atual: **1757+** testes Vitest, typecheck limpo.

### ESLint

Não está configurado neste monorepo mobile — qualidade garantida por **TypeScript strict** + **Vitest**. Adicionar ESLint é opcional pós-release; evita nova dependência na fase de hardening.

## 5. Maestro (device / emulador)

Pré-requisitos: [Maestro CLI](https://maestro.mobile.dev/), Expo Go ou build dev no device.

```powershell
cd app\mobile
npx expo start
# outro terminal:
maestro test .maestro/onboarding.yaml
maestro test .maestro/paywall.yaml
maestro test ..\..\scripts\maestro\premium-onboarding.yaml
maestro test .maestro/premium-settings-reports.yaml
```

Ou tag crítica:

```powershell
npm run test:e2e:critical
```

## 6. QA manual (15 min)

Ver `docs/TEST_REPORT.md` — seção **Checklist manual**.

## 7. Pós-submissão

- [ ] Monitorar conversão por trigger (`paywall-triggers.ts`)
- [ ] Validar receipt / entitlement em produção (RevenueCat Customer Info)
- [ ] Smoke test em build TestFlight / Internal Testing
