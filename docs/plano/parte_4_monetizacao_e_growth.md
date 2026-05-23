# Parte 4 — Monetização e Growth

Cobre seções 25–32: assinaturas, paywall, landing page, formulário de validação, anúncios, conteúdo orgânico, métricas, analytics.

---

## 25. Assinaturas

### Modelo

| Plano | Preço | Comportamento |
|---|---|---|
| **Free** (post-trial expirado) | R$ 0 | Mascote vira "letárgico". Check-in funciona, mas XP não conta, mascote não evolui. Chat IA limitado a 5 msgs/dia. |
| **Trial** | R$ 0 (7 dias) | Tudo desbloqueado. Cartão exigido pra entrar (reduz volume mas qualifica). |
| **Mensal** | R$ 19,90/mês | Acesso completo. |
| **Anual** | R$ 149/ano (~R$ 12,40/mês, 38% off) | Acesso completo + acessório exclusivo "Veterano". |
| **Vitalício (early)** | R$ 297 1x (só 100 primeiros) | Boost de validação inicial. NÃO escala. |

### Comparativo com mercado

| App | Mensal BR | Anual BR | Trial |
|---|---|---|---|
| Calm | R$ 49 | R$ 320 | 7d sem cartão |
| Headspace | R$ 30 | R$ 199 | 7d com cartão |
| Finch | USD 4,99 | USD 39,99 | 14d sem cartão |
| Replika | USD 7,99 | USD 69,99 | nenhum |
| **Mascote (proposto)** | **R$ 19,90** | **R$ 149** | **7d com cartão** |

Posicionamento: **abaixo de Calm/Headspace, alinhado a Finch BR, acima de apps brasileiros gratuitos.**

### Trial com cartão — justificativa

- Reduz volume (-60% inscrições)
- Mas aumenta qualidade (+3-5x conversão final)
- Reduz fraude (bot/multi-acc)
- Padrão da indústria (Netflix, Disney+ BR têm trial pago no segundo mês)

### Política de cancelamento

- Cancela quando quiser nas configurações
- Período pago até o fim do ciclo
- Anual cancelado: usa até a data + sem reembolso (padrão Apple/Google)
- Refund: aprovação manual nos 7 primeiros dias do mensal/anual (envia para reduzir review negativa)

### Win-back

- 30 dias após churn: oferta -50% no primeiro mês
- 90 dias após churn: oferta -50% trimestre
- Não enviar mais que 2x

### Pricing test (mês 3+)

- Variantes a testar: R$ 14,90, R$ 19,90, R$ 24,90
- Por geografia: capital vs. interior
- Por canal: orgânico vs. ads
- Métrica de decisão: LTV após 6 meses

---

## 26. Paywall

### Princípios

1. **Apareça cedo, não tarde** — paywall logo após onboarding, antes do uso. Eu sei que parece agressivo; mas é mais ético: usuário decide informado, não com gancho.
2. **Permita explorar antes de assinar** — mas não dê tudo de graça. Modelo "preview".
3. **Não use dark patterns** — sem timer, sem "última chance", sem botão fechar escondido.
4. **Honesto sobre o que tem** — lista clara do que assinatura desbloqueia.

### Fluxo proposto

```
Onboarding (4 passos)
  ↓
Pré-paywall ("Vamos começar?")
  ↓
[Paywall 1] R$ 19,90/mês · Trial 7 dias
  ├── [Trial grátis] → captura cartão → entra
  ├── [Anual] → captura cartão → entra
  └── [Continuar limitado] → entra free
       (mascote letárgico, chat 5/dia)
```

### Tela paywall — wireframe

```
┌────────────────────────────────┐
│  [X]                           │
│                                │
│   [Mascote evoluindo - Rive]   │
│                                │
│  Vamos cuidar de você juntos?  │
│                                │
│  ✓  Mascote evolui de verdade  │
│  ✓  Chat IA ilimitado          │
│  ✓  Missões e relatórios       │
│  ✓  Acessórios e cenários      │
│  ✓  Sem anúncios. Sem culpa.   │
│                                │
│  [💛 Começar trial 7 dias]     │
│  R$ 19,90/mês depois           │
│                                │
│  [💎 Anual R$ 149]             │
│  Economiza 38%                 │
│                                │
│  [Continuar grátis (limitado)] │
│                                │
│  Política · Termos             │
└────────────────────────────────┘
```

### Paywalls contextuais (após onboarding)

Mostrar paywall quando usuário tenta ação premium estando em free:

- **Tentando acessar relatório:** "Relatórios são parte da assinatura. Quer começar trial?"
- **6ª mensagem no chat (free):** "Pip quer continuar conversando, mas precisa da assinatura."
- **Tentando trocar personalidade:** "Trocar personalidade é parte da assinatura."

Cada um com CTA único, dispensável sem culpa.

### A/B testing

| Test | Variante A | Variante B |
|---|---|---|
| Hero copy | "Vamos cuidar de você juntos?" | "Seu Mascote evolui só com você assinante." |
| Ordem de plano | Mensal primeiro | Anual primeiro |
| Trial duração | 7 dias | 14 dias |
| Plano sem cartão | Existe | Não existe |

Decidir via PostHog feature flag.

### Tecnologia

- RevenueCat SDK no app
- Produtos configurados em RevenueCat Console
- Webhooks RevenueCat → Supabase Edge Function atualiza `subscriptions` table
- Apple/Google sandbox para testes

---

## 27. Landing page

### URL

`cuidedevoce.app` (registrar) ou `eumeusmascote.com` ou `meumascote.app`. **Veredito:** `meumascote.app` é claro e tem `.app` que sugere produto.

### Estrutura da landing

```
[Hero]                Cuide de você. Seu Mascote evolui junto.
                      [Entrar na lista do beta]

[Vídeo / Loop]        Mascote animado (Rive embedado web)

[Como funciona]       3 cards: Check-in / Mascote reage / Você evolui

[Personalidades]      4 cards (Calmo, Motivador, Fofo, Sábio)

[Diferenciação]       Por que não é só mais um app?
                      Tabela rápida vs. Habitica, Calm, Finch

[Prova social]        Quotes de beta testers (quando tiver)
                      OU: "1.243 pessoas na lista de espera" (real)

[FAQ]                 8 perguntas (LGPD, cancelamento, idade, terapia)

[CTA final]           [Entrar na lista do beta]

[Footer]              Política, Termos, Contato, @meumascote
```

### Hero — variações para A/B test

| ID | Hero | Sub | CTA |
|---|---|---|---|
| H1 | "Cuide de você. Seu Mascote evolui junto." | "App de assinatura com IA e gamificação." | "Entrar no beta" |
| H2 | "O Tamagotchi adulto que cresce com seus hábitos." | "Cuide de você de 30 segundos por dia." | "Quero ser o primeiro" |
| H3 | "Um bichinho fofo que só evolui quando você se cuida." | "Wellness, gamificação e IA. Sem clínica, sem culpa." | "Garantir vaga" |

Recomendação: começar com H1, A/B contra H2 após 100 visitantes.

### FAQ (modelo)

1. **O Mascote substitui terapia?** Não. É um app de autocuidado, não de saúde mental clínica. Para questões emocionais sérias, busque profissionais.
2. **Quanto custa?** R$ 19,90/mês ou R$ 149/ano, com 7 dias de teste grátis.
3. **Posso cancelar quando quiser?** Sim, a qualquer momento nas configurações da App Store ou Google Play.
4. **Como funciona o trial?** Você cadastra o cartão, usa 7 dias grátis, cancela antes pra não ser cobrada.
5. **Funciona se eu não usar todo dia?** Sim. O streak tem "dias de folga". Você pode pular 2 dias sem perder.
6. **A IA é segura?** Sim. Temos guardrails contra conselho médico, diagnóstico, conteúdo sensível. Em momento de crise, te direcionamos para o CVV.
7. **Meus dados são vendidos?** Não. Seus dados ficam no seu perfil, criptografados, e você pode pedir exclusão a qualquer momento.
8. **Quando lança?** Beta fechado em junho/2026. Lista de espera prioritária.

### Tech

- Next.js 14 App Router
- Tailwind + Framer Motion
- Hospedagem Vercel
- Forms → Supabase via API route
- Analytics: Vercel Analytics + Plausible/PostHog
- SEO: meta tags + sitemap + robots

### Performance target

- LCP < 2s
- CLS < 0.1
- Lighthouse > 90 mobile

### Localização

- Lançar só PT-BR
- Preparar i18n (next-intl) mas só ativar EN mês 3

---

## 28. Formulário de validação

### Objetivo

Coletar 200+ leads qualificados em 14 dias para validar interesse e segmentar primeiros beta.

### Campos

| Campo | Tipo | Obrigatório | Por quê |
|---|---|---|---|
| Email | text | sim | contato + dedup |
| Nome | text | sim | personalização |
| Idade | range 18-24 / 25-34 / 35-44 / 45+ | sim | segmentação |
| Cidade | text livre | não | demografia |
| "Você já tentou app de hábito?" | sim/não/não lembro | sim | qualificação |
| "Qual?" (se sim) | text | não | benchmark |
| "Por que parou?" | radio (5 opções) | sim | descoberta |
| "Quanto pagaria por mês por um app que te ajuda a cuidar de você?" | R$ 0 / R$ 10 / R$ 20 / R$ 30 / R$ 50+ | sim | sensibilidade preço |
| "Que personalidade prefere?" | mockup 4 fotos | sim | preferência |
| "Topa fazer entrevista de 20 min?" | sim/não | sim | recrutamento qual |
| Aceito termos | checkbox | sim | LGPD |

### "Por que parou"

- "Esqueci e nunca voltei"
- "Achei chato/repetitivo"
- "Não vi resultado"
- "Me senti culpada/o por falhar"
- "Outro motivo"

### Tela de obrigado

```
Tá na lista 💛

Vamos te avisar quando o beta abrir. Posição: #243.

Quer pular a fila? Compartilhe seu link:
[meumascote.app/r/abc123]

Cada amigo te avança 10 posições.
```

(Mecânica viral leve, opt-in.)

### Tech

- Form como Server Action no Next.js
- Salva em Supabase tabela `waitlist`
- Email confirmação via Resend
- Encaminhamento captado por referral code

### Métricas

- Conversão visitante → form submit (meta: 8%+)
- % entrevista aceita (meta: 30%+)
- Distribuição de preço (esperar: pico em R$ 10–R$ 20)
- Distribuição de personalidade (esperar: Fofo mais popular)

---

## 29. Anúncios

### Plataformas

| Plataforma | Por quê | Budget inicial |
|---|---|---|
| **TikTok Ads** | público-alvo concentrado, criativo UGC barato, descoberta | R$ 50/dia |
| **Instagram Ads** | conversão melhor que TikTok para wellness | R$ 50/dia |
| **Meta (Facebook)** | demografia + retargeting | R$ 30/dia |
| **Google Search** (só após landing) | bottom funnel | R$ 20/dia |

Total budget de validação inicial: **R$ 150/dia × 7 dias = R$ 1.050**.

### Criativos TikTok (4 conceitos pra rodar A/B)

**C1 — POV / narrativa pessoal**
```
[Cena: jovem cansada chegando em casa]
Voice: "POV: você descobre que existe um Tamagotchi que evolui quando você se cuida"
[Cena: pega celular, abre app, mascote pula]
Voice: "Você bebe água. Ele fica feliz."
[Cena: outras animações]
Voice: "Dorme 8h. Ele evolui."
[Cena: paywall preview]
Voice: "Mascote — beta abre em junho."
CTA: meumascote.app
```

**C2 — Reaction visual**
```
Tela dividida:
[Esquerda] Habitica/Streaks (planilha sem alma)
[Direita] Mascote (bichinho fofo evoluindo)
Texto: "Antes / Depois de eu trocar de app"
CTA: meumascote.app
```

**C3 — Educacional**
```
"3 motivos por que apps de hábito não funcionam:
1. Sem afeto
2. Sem progresso visível
3. Punem você
[Mascote evolui]
Mascote resolve os três."
```

**C4 — Sketch/humor**
```
"Habitica: VOCÊ TIROU -50HP POR NÃO BEBER ÁGUA
Eu: ai meu deus a vida é dura

Mascote: oi, ainda tá tudo bem ✨ bebe água?
Eu: 🥺"
```

### Criativos Instagram

- Reels reaproveitando TikTok
- Carousel estático: 10 cards "personalidades", "como funciona", "diferenciais"
- Story ads com poll "qual personalidade te combina?"

### Texto de anúncio (copy)

**Curto (TikTok):**
> "Um Tamagotchi que cresce quando você se cuida. Beta abrindo em junho."

**Médio (Instagram feed):**
> "Apps de hábito morrem em 2 semanas porque te punem por falhar. O Mascote é diferente: ele evolui com você, e perdoa o dia ruim. Beta em junho — entra na lista."

**Long (FB):**
> "Existe um motivo por que apps de hábito morrem. Eles te tratam como produtividade. Mascote te trata como gente. Você cuida de você, ele evolui na sua frente, com personalidade (Calmo, Motivador, Fofo ou Sábio) e IA que aprende seu ritmo. R$ 19,90/mês, 7 dias grátis. Beta limitado em junho. Entra na lista do site."

### Segmentação inicial

- Idade 22-38
- Brasil capitais
- Interesses: Calm, Headspace, Tamagotchi, Studio Ghibli, Stardew Valley, Animal Crossing, mindfulness, journaling
- Comportamento: tem app de bem-estar instalado, comprou app de assinatura recente

### Métricas e gates

| Métrica | Verde | Amarelo | Vermelho |
|---|---|---|---|
| CPM | < R$ 25 | R$ 25-40 | > R$ 40 |
| CTR | > 2% | 1-2% | < 1% |
| CPC | < R$ 1 | R$ 1-2 | > R$ 2 |
| Landing CR | > 8% | 5-8% | < 5% |
| Custo por lead | < R$ 5 | R$ 5-10 | > R$ 10 |

Se algum estiver vermelho por 3 dias → trocar criativo ou pausar.

---

## 30. Conteúdo orgânico

### Canais

| Canal | Frequência | Tom | Objetivo |
|---|---|---|---|
| **TikTok @meumascote** | 5x/sem | leve, narrativo, UGC | descoberta |
| **Instagram @meumascote** | 3 reels + 5 stories/sem | curado | conversão e brand |
| **Threads / Twitter** | 7-10 posts/sem | conversa, build in public | comunidade |
| **YouTube Shorts** | 2-3/sem | reuso TikTok | descoberta secundária |
| **LinkedIn (founder)** | 2/sem | build-in-public, founder voice | rede + crédito |
| **Newsletter "Cuide-se"** | 1x/sem | reflexivo | retenção pré-launch |

### Pilares de conteúdo

1. **POV / narrativa diária do usuário** (40%) — "POV: você precisa se cuidar e seu Mascote te ajuda"
2. **Educação sobre autocuidado leve** (25%) — "3 hábitos pequenos que mudam seu dia"
3. **Build-in-public** (15%) — "Beta do Mascote tem 47 pessoas hoje. Vamos pra 100?"
4. **UGC e prova** (15%) — repost de beta testers
5. **Memes e humor** (5%) — leveza

### Calendário inicial (semana 1)

| Dia | Canal | Conteúdo |
|---|---|---|
| Seg | TikTok | C1 POV (anúncio também) |
| Ter | Instagram Reels | personalidades carousel |
| Qua | Threads | "build in public: hoje a IA reconheceu pela primeira vez que o user tava triste e respondeu certinho" |
| Qui | TikTok | C2 antes/depois |
| Sex | Instagram Stories | poll "qual personalidade?" |
| Sáb | TikTok + IG | reuso UGC primeiros betas |
| Dom | Newsletter | reflexão semanal |

### Estratégia de creators

- Identificar 20 creators wellness BR com 5k-50k seguidores (sweet spot)
- Oferecer: 6 meses grátis + R$ 200 + acessório exclusivo
- Em troca: 2 posts (1 reel + 1 story) + uso real do app
- Tracking: link único por creator

### Comunidade

- Grupo Discord/Telegram beta privado
- Lives mensais com fundadores "Q&A do Mascote"
- Pesquisa quinzenal com beta

---

## 31. Métricas

### North star metric (NSM)

**Daily Care Sessions (DCS)** = número de check-ins únicos por user por dia, com peso (mensal 1.0, anual 1.5, free 0.3).

Por quê: captura essência do produto (user cuidando de si com regularidade), não vaidade (downloads), não puramente receita (que mascara churn).

### Métricas primárias

| Métrica | Definição | Meta MVP | Meta 90d |
|---|---|---|---|
| **D1 retention** | % users que fazem check-in no dia seguinte ao install | 60% | 70% |
| **D7 retention** | % users ativos no dia 7 após install | 25% | 35% |
| **D30 retention** | % users ativos no dia 30 | 12% | 25% |
| **Trial → paid** | % de trials que convertem em assinatura paga | 40% | 55% |
| **Churn mensal** | % de assinantes que cancelam no mês | < 12% | < 8% |
| **ARPU** | receita média por user pagante | R$ 17 | R$ 18 |
| **LTV** | lifetime value médio | R$ 140 | R$ 220 |
| **CAC blended** | custo aquisição médio (ads + orgânico) | < R$ 80 | < R$ 50 |
| **LTV/CAC** | razão | > 1.5 | > 3 |
| **NPS** | score 0-10, % promoter - detractor | > 30 | > 50 |

### Métricas secundárias

| Métrica | Por quê |
|---|---|
| Avg check-ins / DAU | engajamento profundo |
| Mensagens IA / DAU | uso do diferencial |
| Streak médio | aderência |
| Push CTR | qualidade de timing |
| Tempo médio sessão | health check (não otimizar para alto) |
| Crashes / 1k sessões | qualidade |

### Funil de conversão

```
Visitante landing
  → Formulário submetido (8%)
  → Email confirmado (90% dos submitted)
  → Convidado para beta (rate depende)
  → Install (60% dos convidados)
  → Onboarding completo (75% dos install)
  → Primeiro check-in (85% dos onboarded)
  → D7 ativo (40% dos primeiros check-in)
  → Trial iniciado (variável - se trial após onboarding: 50% dos D7)
  → Trial → pago (40-55%)
  → D30 ativo (75% dos pagos)
  → D90 ativo (60% dos D30 pagos)
```

### Alertas (PostHog/Slack)

- D1 abaixo de 50% → investigar onboarding
- Churn mensal acima de 15% → revisar paywall ou produto
- CAC ultrapassando R$ 100 → pausar canal
- Crash rate > 1% → hotfix
- Safety flags `critical` por dia > 5 → escalar (pode ser falha de detector)

### Dashboards

- **Dashboard founder (diário):** DAU, novos installs, trials iniciados, MRR, churn, NPS
- **Dashboard growth (semanal):** funil completo por canal, CAC por canal, retention curve
- **Dashboard produto (semanal):** feature adoption, missões mais feitas, personalidades distribuição
- **Dashboard safety (diário):** flags por severidade, conversas flagadas pendentes de review

---

## 32. Analytics

### Eventos prioritários (taxonomia)

Naming: `objeto_acao` em snake_case.

**Acquisition**
- `landing_view` (props: source, campaign)
- `landing_form_submit` (props: source)
- `app_install` (props: source, attribution)
- `app_open` (props: cold/warm)

**Onboarding**
- `onboarding_start`
- `onboarding_quiz_completed` (props: personality_chosen)
- `mascot_named` (props: name_length)
- `onboarding_completed`

**Engagement**
- `home_view`
- `checkin_logged` (props: habit_kind, value, xp_awarded)
- `mission_viewed` (props: mission_id)
- `mission_completed` (props: mission_id, xp_awarded)
- `chat_message_sent` (props: personality, length, safety_flag)
- `mascot_evolved` (props: from_phase, to_phase)
- `report_viewed` (props: kind=weekly/monthly)
- `report_shared` (props: platform)

**Monetization**
- `paywall_viewed` (props: trigger, variant)
- `trial_started` (props: product_id)
- `subscription_started` (props: product_id, trial=true/false)
- `subscription_canceled` (props: product_id, reason if provided)
- `subscription_renewed`

**Notifications**
- `push_sent` (server-side, props: kind, personality)
- `push_received` (props: kind)
- `push_opened` (props: kind)

**Safety**
- `safety_input_flagged` (props: severity, category)
- `safety_output_blocked` (props: model, category)
- `crisis_resources_shown`

### Propriedades de usuário (PostHog person properties)

- `user_id` (= auth.uid)
- `display_name` (não enviar email para PostHog cloud)
- `subscription_status`
- `current_streak`
- `level`
- `phase`
- `personality`
- `cohort_week` (semana de cadastro)

### Cohorts a observar

- Cohort de install semana N → curva retenção 28 dias
- Cohort por canal de aquisição
- Cohort por personalidade escolhida
- Cohort por trial vs. free
- Cohort por persona-fit (matching heuristic)

### LGPD compliance no analytics

- Email/PII nunca em event props
- PostHog: usar `identify(anon_id, properties_safe)`
- Opt-out de analytics em settings (default ON pra novos)
- Deletar dados do PostHog quando user pedir exclusão de conta (existe API)
- Documento DPA com PostHog assinado

### Ferramentas

| Ferramenta | Para | Custo |
|---|---|---|
| Firebase Analytics | funil padrão, attribution mobile | free |
| PostHog | feature flags, session replay, funil custom | free 1M events/mês |
| Sentry | erros | free 5k err/mês |
| RevenueCat dashboards | MRR, churn, cohort revenue | grátis até USD 10k MTR |
| Vercel Analytics | landing | grátis no Pro |
| Plausible | landing (alternativa privacy) | R$ 10/mês |
| Helicone ou PostHog LLM | custo IA por user, latência | free tier |

### Implementação

```ts
// packages/analytics/src/index.ts
import posthog from 'posthog-react-native'
import analytics from '@react-native-firebase/analytics'

export async function track(event: string, props?: Record<string, any>) {
  if (props?.email) delete props.email   // safety net
  posthog.capture(event, props)
  await analytics().logEvent(event, props)
}

export async function identify(userId: string, props: Record<string, any>) {
  posthog.identify(userId, props)
  await analytics().setUserId(userId)
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && k !== 'email') {
      await analytics().setUserProperty(k, v)
    }
  }
}
```

---

## Decisões pendentes (Parte 4)

| ID | Decisão | Opções | Prazo |
|---|---|---|---|
| P4.1 | Preço final | R$ 19,90 (recomendado) ou variantes | Antes da landing |
| P4.2 | Trial com cartão ou sem | Com (recomendado) ou sem | Antes do MVP |
| P4.3 | Plano vitalício early ou não | Sim 100 vagas (recomendado) ou não | Antes do beta |
| P4.4 | Domínio | meumascote.app, cuidedevoce.app, ou outro | Antes da landing |

**Atualizado em:** 2026-05-16
