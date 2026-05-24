# Infra launch playbook — Mascote

> Passo a passo **honesto e ordenado** pra sair de "código pronto" pra "beta
> público pagando". Cada step tem comando pronto pra copy/paste e critério
> de "feito".

**Status do código nesta data:** adapters, configs e snippets estão prontos no
repo. O app é **local-first** (sem backend remoto). O que falta é **executar
com credenciais reais** (proxy IA, RevenueCat, EAS).

---

## Ordem de execução

```
1. Proxy IA backend (15 min)
   └─→ 2. RevenueCat config (30 min — depende de Apple/Google)
        └─→ 3. EAS build setup (30 min)
             └─→ 4. Beta upload (15 min)
```

Tempo total mínimo (sem espera de aprovação Apple): **~2 horas** de execução pura.
Caminho crítico real: ~3-5 dias (espera de propagação loja + revisão Apple).

---

## 1. Proxy IA backend

Deploy de um endpoint que aceita `POST /v1/mascot/reply` e chama OpenAI
server-side. Opções: Cloudflare Workers, Firebase Cloud Functions ou servidor
Node próprio.

```powershell
# Exemplo: validar endpoint após deploy
$body = @{
  user_id_hash = "test-hash"
  tier = "free"
  personality = "calmo"
  dna_descriptors = @("presença acolhedora")
  mood = "ok"
  message = "Oi"
  context_memories = @()
  history = @()
  safety_flag = "safe"
  language = "pt"
} | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.seudominio.com/v1/mascot/reply" `
  -Method POST -ContentType "application/json" -Body $body
```

Detalhe da request/response: [AI_PRODUCTION_PLAN.md](AI_PRODUCTION_PLAN.md).

**Feito quando:** curl retorna `{ reply: "...", source: "openai", remaining_quota: 4 }`.

---

## 2. RevenueCat config

1. Conta: [revenuecat.com](https://revenuecat.com).
2. Criar projeto "Mascote".
3. Adicionar App iOS (precisa bundle ID — escolher e BLOQUEAR aqui pra usar em Apple/EAS).
4. Adicionar App Android (idem package name).
5. **App Store Connect** (Apple Developer account obrigatória):
   - Criar app
   - Em "App Information" → "App-Specific Shared Secret" → gerar → anotar
   - Criar In-App Purchases:
     - `mascote_plus_monthly` — auto-renewable, R$ 19,90 (R$/BRL)
     - `mascote_plus_annual` — auto-renewable, R$ 149,90
   - Configurar grupo de assinatura: "Mascote Plus"
   - Habilitar 7d trial em ambos
6. **Google Play Console** (Google Developer account obrigatória — $25 one-time):
   - Criar app
   - "Monetization" → "Products" → "Subscriptions":
     - `mascote_plus_monthly` — R$ 19,90/mês — base plan + 7d free trial
     - `mascote_plus_annual` — R$ 149,90/ano + 7d free trial
7. **Voltar pro RevenueCat:**
   - Apps → iOS → "Connect to App Store" → cola App-Specific Shared Secret
   - Apps → Android → "Connect to Google Play" → upload service account JSON
   - Products → Import products from stores
   - Offerings → criar "default":
     - package `$rc_monthly` → `mascote_plus_monthly`
     - package `$rc_annual` → `mascote_plus_annual`
   - Entitlements:
     - `premium` → marca ambos products
     - `legendary` → marca só annual (alinha com `TIER_TO_ENTITLEMENTS` em SubscriptionTypes.ts)
     - `ai_plus` → marca ambos
8. **Webhook → backend** (futuro — pra atualizar `subscription_status`):
   - Pode ficar pra depois do beta inicial; cliente local é fonte de verdade no MVP

**Anotar:**
- Public API Key iOS → `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- Public API Key Android → `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`

**Feito quando:** RevenueCat dashboard mostra "Products: 2 active, Offerings: default".

---

## 3. EAS build setup

```powershell
# Copiar template
Copy-Item app/mobile/eas.json.example app/mobile/eas.json

# Editar app/mobile/eas.json com seu Apple ID + ASC App ID + Apple Team ID
# (já tem placeholders YOUR_APPLE_ID@example.com etc)

# Login
cd app/mobile
npx eas login

# Configurar credenciais — segue interativo
npx eas credentials --platform ios
npx eas credentials --platform android

# Criar .env (NUNCA commitar)
Copy-Item .env.example .env
# Editar .env com:
#   EXPO_PUBLIC_AI_PROXY_URL=https://api.seudominio.com/v1/mascot/reply
#   EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_XXXX
#   EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_XXXX
#   EXPO_PUBLIC_RC_ENABLED=true
#   EXPO_PUBLIC_BILLING_PROVIDER=revenuecat

# Instalar SDK nativo RevenueCat
npx expo install react-native-purchases

# Wire-up init — copiar de:
#   src/services/subscription/revenuecat-init.snippet.ts
# Pro app/_layout.tsx (descomentar o bloco)

# Build preview
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview-rc
```

**Feito quando:** download do APK funciona e instala em device Android.

---

## 4. Beta upload

```powershell
# Submit pra Internal Testing
npx eas submit --platform android --profile production --latest
npx eas submit --platform ios --profile production --latest
```

- iOS: TestFlight envia link manual pros testers
- Android: convite via Play Console → "Internal testing" → "Testers"

**Feito quando:** 3+ testers conseguem instalar e abrir o app sem crash.

---

## Smoke test obrigatório antes de liberar pro beta

(Detalhe em [`BETA_RELEASE_CHECKLIST.md`](BETA_RELEASE_CHECKLIST.md))

Em **device físico**:
- [ ] Cold launch sem crash
- [ ] Onboarding completo (1 min)
- [ ] Primeira check-in
- [ ] Chat: BYOK e proxy ambos respondem
- [ ] Mensagem "quero me machucar" → CRISIS_REPLY com CVV 188 (sem chamar OpenAI)
- [ ] Mascot3D renderiza ou cai pro 2D em low-end
- [ ] Paywall sandbox: trial start → renew → cancel → restore
- [ ] Settings → Exportar dados (JSON baixa)

## Critérios de bloqueio (não publicar se algum falha)

- ❌ Crash em cold launch
- ❌ DNA leak em fetch (testar via proxy debug)
- ❌ CRISIS_REPLY não aparece em mensagem crítica
- ❌ Compra real cobrada em mock provider (sanity check)
- ❌ Permission não documentada solicitada

---

## Pendências pós-beta (não bloqueiam o beta, bloqueiam escala)

1. **Webhook RevenueCat → backend** — sincroniza `subscription_status` server-side. Sem ele, cancel + reinstall reseta tier no cliente.
2. **Upgrade Expo SDK 51 → 53+** — resolve 25 vulns do npm audit. Ver `docs/SECURITY_AUDIT.md`.
3. **Audit log de safety flags** — guardar timestamps de critical/high (sem conteúdo) pra revisão de QA.
4. **Multi-device sync real** — app hoje é local-only; ver `docs/SYNC_ARCHITECTURE.md`.
5. **Analytics provider real** (PostHog/Firebase/Amplitude) — scaffold tipado em `src/analytics/`.

---

## Onde acessar tudo

| Recurso | Arquivo |
|---|---|
| Plano de proxy IA | [docs/AI_PRODUCTION_PLAN.md](AI_PRODUCTION_PLAN.md) |
| Snippet RevenueCat init | [src/services/subscription/revenuecat-init.snippet.ts](../app/mobile/src/services/subscription/revenuecat-init.snippet.ts) |
| Template EAS | [app/mobile/eas.json.example](../app/mobile/eas.json.example) |
| Template env | [app/mobile/.env.example](../app/mobile/.env.example) |
| Checklist passo-a-passo | [docs/BETA_RELEASE_CHECKLIST.md](BETA_RELEASE_CHECKLIST.md) |
| Premium tiers + entitlements | [docs/PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md) |
| Security state | [docs/SECURITY_AUDIT.md](SECURITY_AUDIT.md) |
| Garantias travadas em código | [docs/GUARANTEES.md](GUARANTEES.md) |
| Manifesto visual | [docs/LIVING_IDENTITY_DESIGN.md](LIVING_IDENTITY_DESIGN.md) |

---

*Quando você executar este playbook, **anote** desvios e atualize este arquivo
com as armadilhas reais que apareceram. Esse é o tipo de doc que envelhece
mal se ficar sozinho.*
