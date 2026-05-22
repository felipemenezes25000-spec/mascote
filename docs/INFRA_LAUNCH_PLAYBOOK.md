# Infra launch playbook — Mascote

> Passo a passo **honesto e ordenado** pra sair de "código pronto" pra "beta
> público pagando". Cada step tem comando pronto pra copy/paste e critério
> de "feito".

**Status do código nesta data:** todos os adapters, schemas, snippets e configs
estão prontos no repo. O que falta é **executar com credenciais reais**.

---

## Ordem de execução

```
1. Supabase project (10 min)
   └─→ 2. Schema base (5 min)
        └─→ 3. Edge Function proxy IA (15 min)
             └─→ 4. RevenueCat config (30 min — depende de Apple/Google)
                  └─→ 5. EAS build setup (30 min)
                       └─→ 6. Beta upload (15 min)
```

Tempo total mínimo (sem espera de aprovação Apple): **~2 horas** de execução pura.
Caminho crítico real: ~3-5 dias (espera de propagação loja + revisão Apple).

---

## 1. Supabase project

1. Criar conta em [supabase.com](https://supabase.com) (free tier serve pro beta).
2. Criar projeto "mascote-prod" — escolher região mais próxima dos usuários (sa-east-1 pro Brasil).
3. **Anote em local seguro:**
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon key` (settings → API) → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → guardar pra Edge Function (NÃO no cliente)

**Feito quando:** consigo abrir o dashboard e ver "Project Status: Healthy".

---

## 2. Schema base

```powershell
# No SQL Editor do Supabase, cole conteúdo de:
#   docs/SUPABASE_SCHEMA.sql
# Roda em ~2s — 12 tabelas, RLS, triggers, indexes.

# Validar:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
# Deve listar: user_profiles, mascots, mascot_genotypes, mascot_phenotypes,
# evolution_events, missions, mission_completions, achievements,
# mascot_memories, subscription_status, backups, sync_metadata
```

Adicionar tabela do proxy (não está no schema base):

```sql
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  tier        text NOT NULL,
  timestamp   timestamptz NOT NULL DEFAULT NOW(),
  tokens_in   int,
  tokens_out  int,
  latency_ms  int,
  cached      boolean DEFAULT false,
  source      text,
  safety_flag text
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_read_self" ON public.ai_usage
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE INDEX idx_ai_usage_user_time ON public.ai_usage(user_id, timestamp DESC);
```

**Feito quando:** RLS está ON em todas as 13 tabelas (12 base + ai_usage).

---

## 3. Edge Function proxy IA

```powershell
# Instalar Supabase CLI se ainda não tem
npm install -g supabase

# Login + link
supabase login
supabase link --project-ref <YOUR_REF>

# Set secrets (NUNCA commitar)
supabase secrets set OPENAI_API_KEY=sk-XXXXX
supabase secrets set OPENAI_MODEL=gpt-4o-mini

# Deploy a função
supabase functions deploy mascot-reply

# Validar com curl
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
Invoke-RestMethod -Uri "https://<ref>.functions.supabase.co/mascot-reply" `
  -Method POST -ContentType "application/json" -Body $body
```

Função inteira em [`supabase/functions/mascot-reply/`](../supabase/functions/mascot-reply/).
README detalhado: [`supabase/functions/mascot-reply/README.md`](../supabase/functions/mascot-reply/README.md).

**Feito quando:** curl retorna `{ reply: "...", source: "openai", remaining_quota: 4 }`.

---

## 4. RevenueCat config

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
8. **Webhook → Supabase Edge Function** (futuro — pra atualizar `subscription_status`):
   - Pode ficar pra depois do beta inicial; cliente local é fonte de verdade no MVP

**Anotar:**
- Public API Key iOS → `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- Public API Key Android → `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`

**Feito quando:** RevenueCat dashboard mostra "Products: 2 active, Offerings: default".

---

## 5. EAS build setup

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
#   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
#   EXPO_PUBLIC_AI_PROXY_URL=https://<ref>.functions.supabase.co/mascot-reply
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

## 6. Beta upload

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

1. **Webhook RevenueCat → Supabase** — sincroniza `subscription_status` server-side. Sem ele, cancel + reinstall reseta tier no cliente.
2. **Upgrade Expo SDK 51 → 53+** — resolve 25 vulns do npm audit. Ver `docs/SECURITY_AUDIT.md`.
3. **Audit log de safety flags** — guardar timestamps de critical/high (sem conteúdo) pra revisão de QA.
4. **Multi-device sync real** — schema pronto (`SUPABASE_SCHEMA.sql`), falta wiring de repositories remotos (ver `docs/SYNC_ARCHITECTURE.md`).
5. **Analytics provider real** (PostHog/Firebase/Amplitude) — scaffold tipado em `src/analytics/`.

---

## Onde acessar tudo

| Recurso | Arquivo |
|---|---|
| Schema completo | [docs/SUPABASE_SCHEMA.sql](SUPABASE_SCHEMA.sql) |
| Edge Function proxy | [supabase/functions/mascot-reply/index.ts](../supabase/functions/mascot-reply/index.ts) |
| README do proxy | [supabase/functions/mascot-reply/README.md](../supabase/functions/mascot-reply/README.md) |
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
