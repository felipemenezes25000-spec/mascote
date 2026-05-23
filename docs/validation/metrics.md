# Definições operacionais das métricas

Como cada métrica do `PLAN.md` é calculada na prática. Sem ambiguidade.

---

## Funnel pré-app

### `visit → email captured`
- **Numerador:** submissões válidas da waitlist (email com `@` e domínio de pelo menos 2 chars)
- **Denominador:** sessões únicas na landing (Vercel Analytics / Plausible)
- **Janela:** rolling 7-day
- **Target:** 15%

### `email captured → invite accepted`
- **Numerador:** clicks no link de "convite pra beta" (UTM `?src=invite`)
- **Denominador:** emails enviados na campanha
- **Janela:** 14 dias da data do email
- **Target:** 40%

### `invite accepted → APK installed`
- **Numerador:** primeiro evento `app_opened` por device
- **Denominador:** clicks no link
- **Como medir:** Edge Function que serve o APK loga IP+timestamp; app envia event no first-open
- **Target:** 70%

### `APK installed → onboarding completed`
- **Numerador:** `onboarding_completed` event
- **Denominador:** `app_opened` first-time
- **Target:** 80%

---

## Funnel pós-install (cohort retention)

### Definição de "active user"
- Fez pelo menos 1 check-in (qualquer hábito) OU enviou mensagem pro mascote
- NÃO conta abrir o app sem ação
- NÃO conta passive notification opens

### Retention Dn
- `Dn = users com atividade entre [install+n, install+n+1) / users com install em D0`
- Janela: D1, D3, D7, D14, D30
- Cohorts semanais

### Targets (em ordem decrescente)
| Dn | Target | Verde | Vermelho |
|---|---|---|---|
| D1 | 50% | ≥ 50% | < 35% |
| D3 | 35% | ≥ 35% | < 22% |
| D7 | 25% | ≥ 25% | < 15% |
| D14 | 18% | ≥ 18% | < 10% |
| D30 | 12% | ≥ 12% | < 6% |

---

## Engagement qualitativo

### Avg checkins/active-day
- Total de check-ins na cohort / total de active-days da cohort
- Target ≥ 1.5 (menos = usuário aciona 1 hábito só; loop fraco)

### Streak distribution
- `median(current_streak)` e `p90(current_streak)` em users ativos
- Target: median ≥ 3 dias, p90 ≥ 14 dias após 30 dias de uso

### Personality split
- % cada uma das 4 personalidades dentro do total
- Saudável: nenhuma < 10% nem > 50%
- Alerta: se uma dominar > 60% → quiz está enviesado

---

## Health do produto

### Crash-free rate
- `(active_users - crashed_users) / active_users`
- Crash detectado via `ErrorBoundary` + Sentry (quando configurado)
- Target ≥ 99.5%

### Cold start time
- Tempo entre `app_launch_started` e `home_rendered`
- Medido com `performance.now()` em `_layout.tsx`
- p50 < 2.0s, p95 < 4.0s

### Erros de IA por usuário/dia
- `total_ai_errors_today / active_users_today`
- Erro = exception em `lib/ai.ts` que cai no mock fallback
- Target < 0.05 (1 em 20 users vê 1 erro/dia)

---

## Métricas qualitativas (survey + entrevistas)

### Survey "pagaria por isso"
- % respostas em Q7 com tier ≥ R$ 9,90/mês
- Amostragem mínima: 100 respostas
- Target ≥ 30%

### Persona match
- % respostas em Q10 que selecionam ≥ 1 persona (não "nenhuma")
- Target ≥ 50%

### Entrevista NPS
- Após cada entrevista, perguntar: "De 0 a 10, quão provável você é de recomendar o Mascote?"
- NPS = % promotores (9-10) − % detratores (0-6)
- Target NPS ≥ 30 após 10 entrevistas

---

## Onde os dados vivem (até backend ficar pronto)

| Métrica | Fonte (MVP) | Fonte (escala) |
|---|---|---|
| visit / unique sessions | localStorage + Vercel Analytics | Plausible self-hosted |
| waitlist emails | localStorage da landing | Supabase table `waitlist` |
| install / onboarding events | console.log em DEV; Sentry em PROD | PostHog (a partir do beta) |
| retention | telemetry events com user_id | PostHog cohorts |
| survey responses | Google Forms / Tally | Supabase + Metabase |

**Importante:** consent é checado antes de cada event sair do device.
`settings.consent_analytics` é o toggle real — `lib/telemetry.ts` honra isso.
