# Checklist — Beta Release (TestFlight / Play Internal)

> Atualizado 2026-05-20. Status real do projeto, **não aspiracional**.

Esse documento é o caminho real pro primeiro beta fechado (20-50 testers).
Cada item tem dono (você ou infra externa), estimativa e link pra detalhe.

## 🟢 PRONTO — não precisa tocar

- [x] Quality gate verde: typecheck + lint + 1808 testes (~9s) + coverage 72.9%
- [x] CI rodando em PR (`.github/workflows/ci.yml`) — typecheck, lint, test:coverage
- [x] Safety classifier completo (regex + Bayes + sentiment, CRISIS_REPLY ativo)
- [x] DNA privacy garantido (pentest cobre interceptação de fetch)
- [x] Idempotência em check-in (`idempotency_key` + `withLock` per-user)
- [x] Export/import local de dados (LGPD básico)
- [x] `.env.example` documentado
- [x] `eas.json.example` documentado
- [x] Telemetria gated por `consent_analytics`
- [x] Mascot3D refatorado em 12 subcomponentes (mantenability)
- [x] Analytics scaffold (interface + mock provider)
- [x] Schema Supabase pronto pra deploy ([SUPABASE_SCHEMA.sql](SUPABASE_SCHEMA.sql))

## 🟡 PREPARADO — precisa decisão/configuração simples

### Variáveis de ambiente (decisão de operação)

- [ ] Criar `.env` em `app/mobile/` (NÃO commitar) baseado em `.env.example`
- [ ] Decidir billing: começar beta com `mock` (mais simples) ou já com `revenuecat`?
- [ ] Decidir provider de analytics (Firebase / PostHog / Amplitude / nenhum no beta?)

### Versionamento

| Campo | Arquivo | Valor atual | Ação |
|-------|---------|-------------|------|
| `version` | `app/mobile/app.json` | 0.1.0 | Bumpar pra 0.1.1 antes de cada build |
| iOS `buildNumber` | `app/mobile/app.json` | 1 | Incrementar a cada upload |
| Android `versionCode` | `app/mobile/app.json` | 1 | Incrementar a cada upload |

### Assets

- [ ] Confirmar ícones em `app/mobile/assets/` (1024×1024 iOS + 512×512 Android)
- [ ] Confirmar splash screens (claro + escuro)
- [ ] Screenshots de loja (6.7" iPhone + 5.5" iPhone + tablet + Android phone + tablet)
- [ ] Texto de loja em PT + EN (descrição curta 80 chars + descrição longa)

### EAS Build

- [ ] Criar conta Expo + organização
- [ ] `eas login` + `eas build:configure`
- [ ] Copiar `eas.json.example` → `eas.json` e ajustar
- [ ] Configurar credentials iOS via `eas credentials` (Apple Developer)
- [ ] Configurar credentials Android (keystore)
- [ ] `eas build --platform android --profile preview` (~15min)
- [ ] `eas build --platform ios --profile preview` (precisa Mac + Xcode na nuvem do EAS)
- [ ] Validar build em dispositivo físico antes de TestFlight/Internal

## 🔴 BLOQUEADORES — precisa infra externa

### Proxy IA (sem isso, premium não entrega IA inclusa)

**Onde:** Supabase Edge Function (recomendado) ou Cloudflare Workers ou Firebase Cloud Functions.
**Esforço:** ~3 dias.
**Detalhe:** [AI_PRODUCTION_PLAN.md](AI_PRODUCTION_PLAN.md)

- [ ] Criar projeto Supabase (se ainda não houver pra sync)
- [ ] Configurar secret `OPENAI_API_KEY` no painel Supabase
- [ ] Criar `supabase/functions/mascot-reply/index.ts`
- [ ] Implementar rate limit por `user_id_hash` + tier
- [ ] Implementar cache (key = hash de personality + mood + msg normalizada)
- [ ] Audit log em tabela `ai_usage` (timestamp + tokens, NUNCA conteúdo)
- [ ] Deploy: `supabase functions deploy mascot-reply`
- [ ] Setar `EXPO_PUBLIC_AI_PROXY_URL=https://<project>.functions.supabase.co/mascot-reply`
- [ ] Validar com curl manual antes de plugar no app
- [ ] Validar via `ProxyMascotAI` em build de teste

### RevenueCat (sem isso, premium não pode cobrar)

**Onde:** [revenuecat.com](https://revenuecat.com) + App Store Connect + Play Console.
**Esforço:** ~2 dias (configuração) + ~1 dia (integração nativa) + ~3 dias (validação completa).
**Detalhe:** [PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md)

- [ ] Conta RevenueCat criada
- [ ] App registrado (iOS + Android bundle IDs)
- [ ] Products criados nas lojas:
  - [ ] `mascote_plus_monthly` ($3.99/R$ 19.90)
  - [ ] `mascote_plus_annual` ($29.99/R$ 149.90)
  - [ ] (opcional) `mascote_legendary_monthly`
- [ ] Trial 7d configurado nos products
- [ ] Products mapeados em RevenueCat (offerings + packages)
- [ ] Entitlements configurados (`premium`, `legendary`)
- [ ] Webhook RevenueCat → Supabase Edge Function (atualiza `subscription_status`)
- [ ] `npx expo install react-native-purchases`
- [ ] Init em `app/_layout.tsx`:
  ```ts
  import Purchases from 'react-native-purchases';
  Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS : RC_ANDROID });
  ```
- [ ] Setar env:
  - [ ] `EXPO_PUBLIC_BILLING_PROVIDER=revenuecat`
  - [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxx`
  - [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxx`
  - [ ] `EXPO_PUBLIC_RC_ENABLED=true`
- [ ] Validar em sandbox iOS (Apple sandbox account + RC test mode)
- [ ] Validar em Play Console internal testing track
- [ ] Validar fluxos: trial start → renew → cancel → refund → restore
- [ ] Validar upgrade Monthly → Annual

### Supabase sync (sem isso, premium não tem multi-device)

**Esforço:** ~1 sem.
**Detalhe:** [SYNC_ARCHITECTURE.md](SYNC_ARCHITECTURE.md)

- [ ] Criar projeto Supabase
- [ ] Executar [SUPABASE_SCHEMA.sql](SUPABASE_SCHEMA.sql) via SQL Editor
- [ ] Configurar auth (Apple + Google providers no Auth → Providers)
- [ ] Validar RLS com queries manuais
- [ ] Setar `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Substituir `supabaseSyncRepoStub` por implementação real em Repository pattern
- [ ] Adicionar Sign in with Apple/Google via Expo AuthSession
- [ ] Onboarding: opcional opt-in pra sync ("Quer sincronizar entre dispositivos?")
- [ ] Validar conflict resolution com 2 dispositivos simultaneamente

## 📋 Política de privacidade + Termos

**Esforço:** ~2 dias (texto + revisão jurídica).

- [ ] Política de Privacidade publicada (URL pública)
- [ ] Termos de Uso publicados (URL pública)
- [ ] Link no Onboarding + Settings
- [ ] Política cobre: AsyncStorage local, OpenAI BYOK, Supabase opt-in, RevenueCat
- [ ] LGPD: direito de exportar dados (já implementado: export local)
- [ ] LGPD: direito de apagar dados (já implementado: reset de profile)

## 👥 Plano de beta

**Beta fechado: 20-50 testers durante ~2 semanas.**

- [ ] Recrutar testers:
  - [ ] 10 pessoas da rede pessoal (smoke test)
  - [ ] 10-20 do plano_mascote/parte_5_execucao (já mapeados)
  - [ ] 10-20 via Slack/Discord wellness communities
- [ ] Onboarding doc pros testers:
  - [ ] Como instalar TestFlight / Play Internal
  - [ ] O que está faltando (lista honesta)
  - [ ] Como reportar bug (Linear/Notion form)
  - [ ] Feedback survey pós-7-dias + pós-14-dias
- [ ] Métricas de sucesso do beta — **critérios completos (retenção, IA, polish, cobrança):** [GO_NO_GO_CHECKLIST.md](GO_NO_GO_CHECKLIST.md)
  - [ ] D1 ≥ 55% meta (≥ 45% mínimo aceitável)
  - [ ] D7 ≥ 30% meta (≥ 22% mínimo)
  - [ ] D14 ≥ 20% meta (≥ 15% mínimo)
  - [ ] NPS ≥ 25 (≥ 40 ótimo)
  - [ ] Crash-free sessions ≥ 99%
  - [ ] Pelo menos 30% dos testers chegam ao paywall

## 🔒 Segurança pré-publicação

- [ ] Re-rodar `npm audit` e verificar nada novo high/critical
- [ ] Confirmar `grep -r "sk-" src/` retorna 0 (chave OpenAI no repo)
- [ ] Confirmar `.env` no `.gitignore` (não commitar credenciais)
- [ ] Confirmar `eas.json` (com creds) está no `.gitignore`
- [ ] Audit log de safety flags (críticos) — guardar timestamps em local, sem conteúdo
- [ ] Ver [SECURITY_AUDIT.md](SECURITY_AUDIT.md) pro estado completo

## 🚀 Build + upload

Quando todos checks acima estão verdes:

```powershell
# Bumpa versão
$pkg = "C:\Users\Felipe\Documents\mascote\app\mobile\app.json"
# (editar manualmente: version, ios.buildNumber, android.versionCode)

# Build
cd C:\Users\Felipe\Documents\mascote\app\mobile
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview

# Submit (depois do build verde)
npx eas submit --platform android --profile preview
npx eas submit --platform ios --profile preview
```

## ✅ Smoke test pós-upload (DEVE rodar antes de liberar pro beta)

Em dispositivo físico real:

- [ ] Instalar via TestFlight / Play Internal
- [ ] Cold launch sem crash
- [ ] Onboarding completo (1 min)
- [ ] Primeira check-in
- [ ] Chat com fallback local (sem env de IA)
- [ ] Mensagem "quero me machucar" → CRISIS_REPLY aparece com CVV 188
- [ ] Mensagem "tenho depressão" → DIAGNOSIS_REDIRECT aparece
- [ ] Mascot3D renderiza ou cai pro 2D em low-end
- [ ] Paywall abre, mostra banner demo (se ainda em mock)
- [ ] Settings → Exportar dados (JSON baixa)
- [ ] Settings → Apagar dados (volta pra onboarding)
- [ ] Modo escuro / claro
- [ ] Voltar pro app depois de fechar (state persistido)

## 🚨 Critérios de bloqueio (NÃO publicar se algum FALHA)

- ❌ Crash no cold launch
- ❌ DNA leak em fetch (validar via proxy debug em laptop)
- ❌ CRISIS_REPLY não aparece em mensagem crítica
- ❌ Tester consegue ver dado de outro user em qualquer tela
- ❌ Compra real é cobrada em provider=mock (jamais deveria; sanity check)
- ❌ App pede permissão não documentada (camera, location etc — só notification + storage)

## 📞 Suporte ao beta

- [ ] Email: `beta@mascote.app` (criar e monitorar)
- [ ] Formulário de bug report (Notion form ou Linear)
- [ ] Discord/Slack channel privado pros testers
- [ ] Daily standup com Renato durante beta

## Veredito atual de beta-readiness

| Pilar | Status |
|---|---|
| **Código** (app funciona end-to-end) | ✅ Pronto |
| **Qualidade** (tests/typecheck/lint) | ✅ Pronto |
| **Safety** (crisis path) | ✅ Pronto |
| **IA** | 🟡 Funciona via BYOK; proxy é blocker pra premium |
| **Billing** | 🟡 Mock honesto; RevenueCat blocker |
| **Sync** | 🟡 Local-first ok; remoto blocker pra multi-device |
| **EAS / Build** | 🔴 Não configurado |
| **Lojas** (App Store + Play) | 🔴 Não submetido |
| **Política/Termos** | 🔴 Não publicado |
| **Recrutamento testers** | 🔴 Não iniciado |

**Resumo:** **Pronto pra beta IF** EAS + lojas + política são configurados. **NÃO pronto pra cobrar dinheiro** até RevenueCat + proxy IA estarem ativos.
