# Parte 2 — Mercado e Stack

Cobre seções 10–14: concorrentes, diferenciação, stack (sem Flutter), arquitetura técnica, banco de dados.

---

## 10. Concorrentes

### Análise quadrante por quadrante

#### Diretos (overlap alto de promessa)

**Finch — Self Care Pet** (EUA, ~10M downloads)
- **O que faz:** Tamagotchi-like onde o pet (passarinho) cresce conforme usuário marca check-in de hábitos
- **Forças:** retenção alta (D30 ~22%), design fofo, brand strong
- **Fraquezas:** chat IA é fraco, push genérico, sem evolução cinematográfica, monetização agressiva
- **Preço:** USD 4,99/mês ou USD 39,99/ano
- **Sinal de sucesso:** USD 30M ARR estimado
- **O que copiamos:** loop visual de evolução, simplicidade de check-in
- **O que fazemos melhor:** personalidade da IA + linguagem PT-BR + integração ritualística
- **Sinal de fracasso a observar:** se entrarem no Brasil em PT-BR antes do nosso mês 6, é problema sério

**Habitica** (mundial, ~3M MAU)
- **O que faz:** RPG de hábitos, party system
- **Forças:** comunidade fiel, gamificação profunda
- **Fraquezas:** UX datado, retenção fraca para casual user, sem IA
- **Preço:** USD 4,99/mês
- **O que copiamos:** XP/level mechanics
- **O que fazemos melhor:** fofura > nerd; emoção > stat optimization

**Stardew Valley life journaling apps + Animal Crossing-inspired pet apps**
- **Risco:** Nintendo lança versão mobile de Animal Crossing wellness-focused (mas eles vão para crianças, não pago recorrente)

#### Indiretos — Wellness/meditação

**Calm** (USD 4B valuation)
- **Posicionamento:** meditação, sleep stories, premium
- **Por que não competimos diretamente:** preço alto (USD 70/ano), público mais velho, sem gamificação
- **Lição:** marca cinematográfica importa

**Headspace** (USD 3B)
- **Posicionamento:** meditação guiada
- **Lição:** branding com mascote (a bolinha laranja) cria recall — confirma nossa tese

**Insight Timer** (free model)
- **Lição:** community-led wellness funciona, mas é difícil monetizar

#### Indiretos — Hábitos

**Streaks** (App Store editor's choice)
- **O que faz:** habit tracker iOS bonito
- **Fraqueza:** sem componente emocional
- **Lição:** UX clean é hygiene factor

**Productive** (~5M downloads)
- **Fraqueza:** muito utilitário, sem afeto

#### Indiretos — Chatbots wellness

**Replika** (50M+ downloads, controversial)
- **O que faz:** companion AI, virou romântico-coercivo
- **Forças:** engajamento absurdo (90min/dia para power users)
- **Fraquezas:** sem ação offline; processos legais; questões éticas pesadas
- **O que NÃO fazemos:** não somos companion romântico, não criamos dependência

**Wysa** (BR ainda pequeno)
- **O que faz:** CBT-style chatbot
- **Posicionamento:** clinical-adjacent, parceria com NHS UK
- **Lição:** se você flerta com clínico, vai precisar de evidência clínica (não é nosso jogo)

**Youper** (BR tem)
- **O que faz:** AI mental health assistant
- **Risco:** se pivotarem para wellness gamificado, são ameaça

#### Indiretos — Tamagotchi/pet sims

**Tamagotchi Smart, Hatch, Pou** (saudade brand, baixo engajamento moderno)
- **Lição:** brand nostalgia sozinha não retém

**MeowTalk, BarkHappy** (pet IA)
- **Não compete:** é sobre pet real

### Tabela comparativa resumida

| App | Categoria | Preço | Mascote? | IA? | Gamificação? | Ação offline? | Foco BR? |
|---|---|---|---|---|---|---|---|
| **Mascote (nós)** | wellness + companhia + hábito | R$ 19,90/mês | sim | sim | sim | sim | sim |
| Finch | self-care pet | USD 4,99/mês | sim | fraco | sim | sim | en-only |
| Habitica | RPG hábito | USD 4,99/mês | avatar | não | sim profundo | sim | parcial |
| Calm | meditação | USD 70/ano | não | não | leve | sim | parcial |
| Headspace | meditação | USD 13/mês | mascote brand | não | não | sim | parcial |
| Streaks | hábito iOS | USD 4,99 one-time | não | não | sim minimalista | sim | en |
| Replika | chatbot | USD 8/mês | avatar | forte | leve | não | en |
| Wysa | CBT | freemium | mascote leve | forte | não | sim | en |
| Youper | mood | freemium | avatar | forte | não | leve | sim |
| Tamagotchi | pet sim | retail | sim | não | sim | não | parcial |

### Análise de moat por concorrente

| Concorrente | Quão fácil ele copia o Mascote? | Quão fácil nós copiamos ele? |
|---|---|---|
| Finch | médio (eles têm escala mas baixa velocidade) | baixo (PT-BR localizado é nossa vantagem) |
| Replika | alto (eles têm IA superior) | médio (precisaríamos de mais dado) |
| Habitica | baixo (cultura nerd, lento) | médio |
| Calm | alto (tem dinheiro infinito) | difícil (sem dinheiro) |

**Conclusão estratégica:** moat real do Mascote é **comunidade BR-PT + personalidades fortes + UGC narrativo brasileiro**. Tecnologia não defende. Dados longitudinais + brand defendem.

---

## 11. Diferenciação

### Os 3 pilares de diferenciação (memorize, use em pitch)

**P1. Evolução visual cinematográfica do mascote**
- Rive state machine permite transições suaves: triste → ok → feliz → empolgado
- 6 fases de evolução visual: ovo → bebê → criança → adolescente → adulto → "evoluído"
- Acessórios desbloqueáveis, cenários trocáveis, ambiente reage ao clima emocional
- **Por que é defensável:** investimento em arte/animação acumula; cada release fica visualmente melhor

**P2. IA com 4 personalidades distintas em PT-BR**
- Calmo, Motivador, Fofo, Sábio — cada um com tom, gírias, jeito de falar próprio
- Localização BR não é tradução, é cultural (gírias paulistas, mineiras, cariocas adaptáveis)
- **Por que é defensável:** prompts curados + base de exemplos + feedback loop com usuário cria conjunto de dados único

**P3. Loop curto e perdoador (não vicia, mas prende)**
- Check-in de 30 segundos
- Streak forgiving (perde só com 3 dias seguidos faltando)
- Notificação no horário certo (não 9h padrão)
- **Por que é defensável:** muitos competidores escolhem entre "engajante" ou "saudável" — escolhemos os dois

### Tabela: características vs. concorrentes

| Característica | Mascote | Finch | Replika | Calm | Habitica |
|---|---|---|---|---|---|
| Evolução visual rica | ✅ | parcial | ❌ | ❌ | ❌ |
| 4 personalidades IA | ✅ | ❌ | 1 | ❌ | ❌ |
| Linguagem PT-BR nativa | ✅ | ❌ | ❌ | ❌ | ❌ |
| Check-in < 1 min | ✅ | ✅ | ❌ | ❌ | ✅ |
| Streak forgiving | ✅ | ❌ | ❌ | ❌ | ❌ |
| Push contextual (IA) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Relatório semanal narrativo | ✅ | parcial | ❌ | ❌ | ❌ |
| Sem linguagem clínica | ✅ | ✅ | ❌ | ✅ | ✅ |
| Trial 7 dias com cartão | ✅ | ❌ | ❌ | ✅ | ❌ |

### Mensagem de diferenciação por canal

- **TikTok:** "POV: seu app de hábito vira o Tamagotchi que você sempre quis"
- **Instagram:** "O bichinho fofo só evolui quando você se cuida. Veja o seu crescer."
- **Pitch para investidor:** "Finch + Replika + linguagem brasileira + retenção comprovada"
- **Landing hero:** "Cuide de você. Seu Mascote evolui junto."

---

## 12. Stack recomendada (sem Flutter / sem FlutterFlow)

### Veredito: hipótese do Felipe é APROVADA com 3 ajustes

| Camada | Recomendado | Por quê |
|---|---|---|
| **Mobile** | **React Native + Expo + TypeScript** | Cross-platform, ecossistema enorme, Rive/Lottie nativos, OTA updates via EAS, contratação fácil, OpenAI SDK first-class |
| **Backend** | **Backend (a definir)** (decisão recomendada) ou Firebase | Postgres/SQL relacional facilita XP/streak/cohort + RLS poderoso. Firebase: velocidade pura, mas Firestore complica analytics de hábito |
| **IA** | **Backend Node/TS chamando OpenAI gpt-4o-mini** com fallback Claude Haiku via roteador próprio | Custo (gpt-4o-mini ~USD 0.15/1M input), latência boa, qualidade suficiente para companion casual; Haiku como fallback de safety |
| **Assinatura** | **RevenueCat** | Webhook → backend, paywall A/B nativo, abstrai StoreKit/Google Billing |
| **Push** | **Expo Notifications** (MVP) → **FCM nativo** (após 10k usuários) | Expo Notifications é "good enough" até ~5k usuários ativos |
| **Animação** | **Rive** (não Lottie) | State machine = transições emocionais sem código mobile, peso menor, performance superior em RN |
| **Analytics** | **Firebase Analytics** (MVP) + **PostHog** (a partir do beta) | Firebase pro funil padrão; PostHog para feature flags, session replay e funil customizado |
| **Landing** | **Next.js 14 + Tailwind**, deploy Vercel | SEO, edge funcs, integração formulário Backend |
| **Painel admin** | **Next.js** mesmo monorepo da landing | Reutiliza Auth backend, baixo custo |
| **Monorepo** | **Turborepo + pnpm** | apps/mobile, apps/web, packages/shared, packages/types |
| **Tipos compartilhados** | **Zod** schemas + tipos derivados | Validação em runtime + tipo em compile-time |
| **CI/CD** | **EAS Build** (mobile) + **Vercel** (web) + **GitHub Actions** (testes) | Standard, baixa configuração |
| **Erros** | **Sentry** | Free tier serve para MVP |
| **Observabilidade IA** | **PostHog LLM observability** ou **Helicone** | Cache, custo por user, qualidade |

### Comparação obrigatória pedida no prompt

| Stack | Avaliação para Mascote | Quando usar | Quando NÃO usar | Veredito |
|---|---|---|---|---|
| **React Native + Expo + TS** | ⭐⭐⭐⭐⭐ | MVP cross-platform, time pequeno, integração rica com OpenAI/Stripe | nunca (para este caso) | **ESCOLHIDO** |
| React Native CLI + TS | ⭐⭐⭐ | quando precisa nativo profundo | MVP com 2 pessoas | overkill |
| SwiftUI | ⭐⭐ | iOS only, qualidade visual máxima | quando precisa Android (precisamos) | rejeitar |
| Kotlin + Jetpack Compose | ⭐⭐ | Android only | quando precisa iOS (precisamos) | rejeitar |
| Kotlin Multiplatform + Compose Multiplatform | ⭐⭐⭐ | quando time já é Kotlin sênior | time pequeno sem experiência KMP | rejeitar (curva) |
| Ionic React + Capacitor | ⭐⭐ | webdev forte, mobile-first não crítico | jogos/animações pesadas (Rive em webview) | rejeitar |
| Next.js PWA + Capacitor | ⭐⭐ | landing com mobile wrapper | UX nativa importa (importa) | rejeitar |
| NativeScript | ⭐ | legacy | nunca | rejeitar |
| .NET MAUI | ⭐ | shop Microsoft | wellness consumer | rejeitar |
| Unity | ⭐⭐⭐ | jogo 3D pesado | retenção de hábito (overkill, lento de iterar) | rejeitar |
| Godot | ⭐⭐ | jogo 2D indie | app comercial mobile (ecossistema mobile fraco) | rejeitar |

### Backend — análise

| Stack | Avaliação | Quando usar | Quando NÃO | Veredito |
|---|---|---|---|---|
| **Backend (a definir)** | ⭐⭐⭐⭐⭐ | Postgres + Auth + Realtime + Storage out-of-box, RLS forte | quando não conhece SQL | **RECOMENDADO** |
| Firebase | ⭐⭐⭐⭐ | velocidade pura, ecossistema Google | analytics relacional de hábito | **alternativa válida** |
| Node.js + TypeScript (Express/Fastify) | ⭐⭐⭐⭐ | API de IA, webhooks | substituir Auth backend (ruim) | usar para **edge functions/IA** |
| NestJS | ⭐⭐⭐ | quando time vem de Java/.NET | MVP rápido (overhead) | rejeitar para MVP |
| Python + FastAPI | ⭐⭐⭐ | data/ML pesado | quando time é TS | rejeitar |
| Go | ⭐⭐⭐ | performance extrema | MVP | rejeitar |
| Spring Boot (Kotlin) | ⭐⭐ | empresarial | startup wellness | rejeitar |
| Servidor próprio (EC2 + manual) | ⭐ | quando você odeia tempo livre | nunca | rejeitar |

### Tecnologias "parecem boas, evite agora"

- **Edge Functions Vercel para IA** — limite de 25s mata respostas longas; use Edge Function backends ou Node próprio
- **GPT-4o full (não mini)** — 10x mais caro, marginal melhor para chat casual; usar apenas em conversas críticas
- **Realtime WebSocket** para chat IA — overhead grande; HTTP request/response basta
- **Self-hosted LLM** — custo absurdo para MVP
- **Notion/Airtable como backend** — escala mata
- **NoCode (Glide, Adalo)** — paywall e RevenueCat exigem custom
- **Unity para UI** — overhead, time-to-iterate ruim
- **Branch.io para deep link** — Expo Linking basta no MVP
- **Algolia para search** — Postgres full-text basta no MVP
- **Stripe direto** — RevenueCat é melhor para mobile assinatura

### Stack final consolidada (cole no doc do dev)

```
MONOREPO: turborepo + pnpm
├── apps/
│   ├── mobile/                    React Native + Expo SDK 51 + TypeScript 5
│   ├── web/                       Next.js 14 (App Router) + Tailwind
│   └── admin/                     Next.js 14 (rotas /admin/* no mesmo app web)
├── packages/
│   ├── types/                     Zod schemas + tipos compartilhados
│   ├── ai/                        cliente OpenAI/Claude + roteador
│   ├── analytics/                 wrapper Firebase + PostHog
│   └── ui/                        componentes RN compartilhados (opcional)

BACKEND: (a definir)
├── Postgres (banco principal)
├── Auth (email + Apple + Google)
├── Storage (assets de mascote, avatares)
├── Realtime (não usar no MVP)
└── Edge Functions (Deno) → orquestra chamadas IA

IA PIPELINE
└── Edge Function /chat → roteador → OpenAI gpt-4o-mini (default)
                                  ↓ fallback se safety flag
                                  → Claude Haiku 4.5
                                  ↓ guardrails antes de retornar
                                  → resposta + safety check + cache

ASSINATURA
└── RevenueCat → webhook → Edge Function backend /subscription-webhook
                          → atualiza tabela subscriptions

PUSH
└── Expo Notifications API → device token guardado em devices table
                          → cron Edge Function backend /push-scheduler

ANALYTICS
└── Firebase Analytics (eventos padrão funil)
└── PostHog (feature flags, session replay, custom funnels)
└── Logs IA → PostHog LLM ou Helicone

CI/CD
└── EAS Build (mobile prod/preview)
└── Vercel (web prod/preview por PR)
└── GitHub Actions (lint, types, tests)

ERROS / OBSERVABILIDADE
└── Sentry (mobile + web)
└── Backend logs + Axiom (opcional pós-MVP)
```

### Custo mensal estimado (em ordem de magnitude)

| Item | Pré-MVP | 100 usuários | 1.000 | 10.000 |
|---|---|---|---|---|
| Backend | free | free | USD 25 | USD 100 |
| OpenAI gpt-4o-mini | USD 0 | USD 20 | USD 200 | USD 1.500 |
| RevenueCat | free | free | free | USD 0 (até USD 10k MTR) |
| Expo EAS | USD 0 | USD 0 | USD 29 | USD 99 |
| Vercel | free | free | USD 20 | USD 20 |
| Firebase Analytics | free | free | free | free |
| PostHog | free (1M events) | free | USD 0–50 | USD 200 |
| Sentry | free | free | USD 26 | USD 80 |
| **Total** | **~USD 0** | **~USD 25** | **~USD 350** | **~USD 2.000** |

Receita projetada com 10.000 ativos pagantes a R$ 19,90 ≈ R$ 199.000/mês (~USD 40.000) → margem **>90%**.

---

## 13. Arquitetura técnica

### Diagrama lógico

```
┌────────────────┐         ┌──────────────────┐       ┌──────────────────┐
│  iOS / Android │ ───────▶│ Backend Edge Fn │ ────▶ │  OpenAI / Claude │
│  (Expo RN)     │ ◀───────│  /chat /missions │ ◀──── │  (com roteador)  │
└────────────────┘         └──────────────────┘       └──────────────────┘
        │                          │
        │                          │
        │                          ▼
        │                  ┌──────────────────┐
        │                  │  Backend        │
        │                  │  Postgres + RLS  │
        │                  │  Auth + Storage  │
        │                  └──────────────────┘
        │                          ▲
        │                          │
        ▼                          │
┌────────────────┐         ┌──────────────────┐
│  Expo          │         │  RevenueCat      │
│  Notifications │         │  Webhook         │
└────────────────┘         └──────────────────┘
        ▲                          │
        │                          │
        └──────── push scheduler ──┘ (Edge Function cron)


┌─────────────────┐
│  Next.js Web    │  ──▶  Auth backend (admin)
│  (landing+admin)│  ──▶  Postgres (admin views)
└─────────────────┘
```

### Princípios arquiteturais

1. **Edge-first IA**: chamadas IA passam SEMPRE pelo backend (Edge Function). Mobile NUNCA chama OpenAI direto. Razões: rotacionar key, aplicar guardrails, cache, custo.
2. **RLS sempre on**: nenhuma tabela acessível sem Row Level Security ativo. Default deny.
3. **Server-authoritative para XP/streak**: cliente nunca calcula XP final. Cliente envia evento, server valida e responde com novo estado.
4. **Cache agressivo de IA**: respostas comuns ("oi", "to mal", "to bem") cacheadas com prefixo de personalidade. ~30% das mensagens viram cache hit.
5. **Eventos analytics no servidor**: cliente envia o evento ao backend, backend dispara para Firebase/PostHog. Razão: bot/spoof e LGPD (eventos sem PII).
6. **Idempotência de check-in**: cada check-in tem `idempotency_key` (deviceId + dia + hábito). Evita XP duplicado em rede ruim.
7. **Migrations versionadas**: DB migrations + GitHub. Banco nunca alterado manualmente em produção.
8. **Feature flags via PostHog**: paywall, prompts, streak forgiving — tudo trocável sem deploy.
9. **OTA com EAS Update**: bug crítico não esperar review da Apple, pushar JS update em horas.
10. **Disclaimer hard-coded**: linguagem de safety NÃO vem do servidor (não pode ser desativada por bug). Hardcoded no app.

### Camadas

| Camada | Responsabilidade | Tech |
|---|---|---|
| **Apresentação** | telas, gestos, animações | RN + Reanimated + Rive |
| **Estado** | local store, query cache | Zustand + TanStack Query |
| **Domínio** | regras de XP, streak, missão (cópia leve client-side só para UX otimista) | TS puro em `packages/types` |
| **Rede** | requests para Backend | backend client SDK + fetch |
| **Persistência local** | tokens, último check-in offline | MMKV ou expo-secure-store |
| **Edge** | endpoints `/chat`, `/checkin`, `/streak`, `/push` | Edge Function backends (Deno) |
| **Domínio backend** | regras canônicas de XP/streak | TS shared via `packages/types` (compartilhado mobile/edge) |
| **Persistência** | dados | Postgres + RLS |

### Endpoints principais

| Endpoint | Método | Função |
|---|---|---|
| `/auth/*` | POST | login via Auth backend (email magic link + Apple + Google) |
| `/checkin` | POST | registra check-in de hábito, retorna XP/streak/mascot state |
| `/chat` | POST | envia mensagem para personalidade do mascote, retorna resposta + safety flag |
| `/mascot/state` | GET | estado atual do mascote (XP, fase, humor, acessórios) |
| `/missions/today` | GET | missões do dia |
| `/missions/:id/complete` | POST | marca missão como completa |
| `/report/weekly` | GET | gera relatório narrativo da semana (pode ser cached 24h) |
| `/subscription/webhook` | POST | RevenueCat → atualiza status |
| `/push/schedule` | POST internal | agenda push contextual |
| `/admin/users` | GET | painel (admin role only) |

### Fluxos críticos

**Check-in (caminho feliz):**
1. User clica em "bebi água" no app
2. Mobile envia `POST /checkin {habit:"water", idempotency_key}`
3. Edge Function valida idempotency, calcula XP, atualiza streak, retorna `{xp_delta, streak, mascot_humor, mascot_phase}`
4. Mobile atualiza estado local + Rive state machine reage ("happy" trigger)
5. Mobile faz "fire-and-forget" analytics event `habit_checked_in` para PostHog

**Chat com IA:**
1. User digita mensagem
2. Mobile envia `POST /chat {message, personality}` com last 5 mensagens de contexto
3. Edge Function: (a) cache lookup pelo hash da mensagem (b) safety check input (regex + heurística) (c) call OpenAI gpt-4o-mini (d) safety check output (e) salva conversa (f) retorna
4. Se safety output flag = high → fallback Claude Haiku com prompt mais conservador
5. Se ambos falham → resposta hardcoded "estou aqui pra te acompanhar, mas se você precisa de ajuda profissional, considere..."

**Push contextual:**
1. Cron Edge Function backend roda 5x/dia
2. Para cada user ativo, calcula "melhor janela" baseado no histórico de check-in (média + std dev)
3. Se janela atual está dentro do critério E user não fez check-in hoje E não recebeu push hoje → manda push
4. Push texto personalizado pela personalidade
5. Métrica de abertura → ajusta janela individual

### Decisões arquiteturais "registradas" (ADRs)

| ADR | Decisão | Status |
|---|---|---|
| ADR-001 | Cross-platform com React Native + Expo | accepted |
| ADR-002 | Backend como BaaS principal | proposed |
| ADR-003 | IA passa sempre pelo backend | accepted |
| ADR-004 | RLS ativado em todas tabelas, default deny | accepted |
| ADR-005 | Server-authoritative para XP | accepted |
| ADR-006 | Rive em vez de Lottie | accepted |
| ADR-007 | RevenueCat para assinatura | accepted |
| ADR-008 | Push: Expo no MVP, FCM nativo na escala | accepted |
| ADR-009 | Monorepo com Turborepo | accepted |
| ADR-010 | OpenAI gpt-4o-mini default | accepted |

Cada ADR vira um arquivo `.md` em `docs/adr/` no repositório real.

---

## 14. Banco de dados

### Schema PostgreSQL (backend) — versão MVP (48h–7 dias)

```sql
-- ============= USERS / AUTH =============
-- auth.users é tabela built-in do Auth backend.
-- Estendemos com:

CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  timezone     TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  locale       TEXT NOT NULL DEFAULT 'pt-BR',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============= MASCOTS =============
CREATE TYPE mascot_personality AS ENUM ('calmo', 'motivador', 'fofo', 'sabio');
CREATE TYPE mascot_phase AS ENUM ('ovo','bebe','crianca','adolescente','adulto','evoluido');
CREATE TYPE mascot_mood AS ENUM ('triste','ok','feliz','empolgado','exausto');

CREATE TABLE public.mascots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Mascote',
  personality  mascot_personality NOT NULL,
  phase        mascot_phase NOT NULL DEFAULT 'ovo',
  mood         mascot_mood NOT NULL DEFAULT 'ok',
  xp           INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level        INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  energy       INT NOT NULL DEFAULT 100 CHECK (energy BETWEEN 0 AND 100),
  health       INT NOT NULL DEFAULT 100 CHECK (health BETWEEN 0 AND 100),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)  -- 1 mascote por user no MVP
);

CREATE INDEX idx_mascots_user ON mascots(user_id);

-- ============= CHECKINS =============
CREATE TYPE habit_kind AS ENUM (
  'water','sleep','exercise','meditation','reading','journaling','breath','outdoor','sun'
);

CREATE TABLE public.checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_kind      habit_kind NOT NULL,
  value           NUMERIC,                       -- ex: copos de água, minutos
  unit            TEXT,                          -- 'cups', 'minutes'
  occurred_on     DATE NOT NULL,                 -- dia local do user
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded      INT NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_checkins_user_date ON checkins(user_id, occurred_on DESC);
CREATE INDEX idx_checkins_user_kind_date ON checkins(user_id, habit_kind, occurred_on DESC);

-- ============= XP EVENTS (auditoria) =============
CREATE TYPE xp_reason AS ENUM ('checkin','mission','streak_bonus','first_login','manual_adjust');

CREATE TABLE public.xp_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mascot_id   UUID NOT NULL REFERENCES mascots(id) ON DELETE CASCADE,
  amount      INT NOT NULL,
  reason      xp_reason NOT NULL,
  reference   JSONB,        -- ex: {checkin_id:"..."} ou {mission_id:"..."}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_user_time ON xp_events(user_id, created_at DESC);

-- ============= MISSIONS =============
CREATE TYPE mission_status AS ENUM ('pending','active','completed','skipped','expired');

CREATE TABLE public.missions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  habit_kind    habit_kind,
  target_value  NUMERIC,
  xp_reward     INT NOT NULL DEFAULT 10,
  status        mission_status NOT NULL DEFAULT 'pending',
  scheduled_for DATE NOT NULL,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_missions_user_date ON missions(user_id, scheduled_for DESC);

-- ============= STREAKS =============
CREATE TABLE public.streaks (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak   INT NOT NULL DEFAULT 0,
  longest_streak   INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  grace_days_left  INT NOT NULL DEFAULT 2,        -- "streak forgiving": pode pular até 2 dias sem perder
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============= SUBSCRIPTIONS =============
CREATE TYPE sub_status AS ENUM ('active','trial','grace','past_due','canceled','expired');

CREATE TABLE public.subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rc_user_id          TEXT NOT NULL,        -- RevenueCat user id
  product_id          TEXT NOT NULL,        -- 'monthly_basic', 'annual'
  status              sub_status NOT NULL,
  current_period_end  TIMESTAMPTZ,
  trial_end           TIMESTAMPTZ,
  raw                 JSONB NOT NULL,       -- payload completo do webhook
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_rc ON subscriptions(rc_user_id);

-- ============= CONVERSATIONS / MESSAGES =============
CREATE TABLE public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at   TIMESTAMPTZ
);

CREATE TYPE msg_role AS ENUM ('user','mascot','system');

CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            msg_role NOT NULL,
  content         TEXT NOT NULL,
  tokens_in       INT,
  tokens_out      INT,
  model           TEXT,
  cached          BOOLEAN NOT NULL DEFAULT false,
  safety_flag     TEXT,           -- 'safe','watch','high'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_user_safety ON messages(conversation_id) WHERE safety_flag IN ('watch','high');

-- ============= NOTIFICATIONS =============
CREATE TABLE public.devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  push_token  TEXT NOT NULL,
  platform    TEXT NOT NULL,     -- 'ios','android'
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, push_token)
);

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,     -- 'reminder','streak','missiona','re-engage'
  sent_at     TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============= REPORTS =============
CREATE TABLE public.reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  narrative    TEXT NOT NULL,         -- texto curto gerado pela IA
  stats        JSONB NOT NULL,        -- {checkins:N, xp:N, missions:N, streak:N}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

-- ============= EXPERIMENTS / FEATURE FLAGS =============
CREATE TABLE public.experiments (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  variant    TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- ============= SAFETY FLAGS =============
CREATE TABLE public.safety_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,     -- 'chat','checkin_value','manual_report'
  severity    TEXT NOT NULL,     -- 'watch','high','critical'
  detail      TEXT,
  reference   JSONB,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Exemplos JSON por coleção

**profile**
```json
{
  "id": "8f1a...",
  "display_name": "Carolina",
  "email": "carolina@email.com",
  "timezone": "America/Sao_Paulo",
  "locale": "pt-BR"
}
```

**mascot**
```json
{
  "id": "m1...",
  "user_id": "8f1a...",
  "name": "Pip",
  "personality": "calmo",
  "phase": "crianca",
  "mood": "feliz",
  "xp": 1240,
  "level": 6,
  "energy": 78,
  "health": 92
}
```

**checkin**
```json
{
  "id": "c1...",
  "user_id": "8f1a...",
  "habit_kind": "water",
  "value": 6,
  "unit": "cups",
  "occurred_on": "2026-05-16",
  "xp_awarded": 10,
  "idempotency_key": "deviceA-2026-05-16-water"
}
```

**mission**
```json
{
  "id": "ms1...",
  "user_id": "8f1a...",
  "title": "Respira fundo 3 vezes",
  "description": "Pausa de 60 segundos pra respirar",
  "habit_kind": "breath",
  "target_value": 3,
  "xp_reward": 15,
  "status": "active",
  "scheduled_for": "2026-05-16"
}
```

**subscription**
```json
{
  "id": "s1...",
  "user_id": "8f1a...",
  "rc_user_id": "rc_abc",
  "product_id": "monthly_basic",
  "status": "trial",
  "current_period_end": "2026-06-16T12:00:00Z",
  "trial_end": "2026-05-23T12:00:00Z"
}
```

**message**
```json
{
  "id": "msg1...",
  "conversation_id": "conv1...",
  "role": "mascot",
  "content": "Que bom que você apareceu hoje. Bebeu água?",
  "model": "gpt-4o-mini",
  "tokens_in": 80,
  "tokens_out": 22,
  "cached": false,
  "safety_flag": "safe"
}
```

### Row Level Security (RLS) — políticas

```sql
-- Habilitar RLS em todas tabelas user-owned
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascots ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_flags ENABLE ROW LEVEL SECURITY;

-- Padrão: user só vê o próprio dado
CREATE POLICY "self-read" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "self-insert" ON checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- (Repetir padrão equivalente para cada tabela)

-- Admin: role custom 'admin' bypassa via SECURITY DEFINER em views
```

### Migrations (backend CLI)

```
db migration new initial_schema
# preenche o arquivo SQL acima
db push     # aplica em prod via CI/CD
```

### Schema escalável (90+ dias)

Ao crescer, adicionar:

- **friendships** (user_id_a, user_id_b, status) — quando lançar componente social leve
- **inventory** (user_id, accessory_id, owned, equipped) — quando lançar loja de acessórios
- **scenes** (mascot_id, scene_id, unlocked_at) — cenários
- **cohort_assignments** (user_id, cohort_key) — para análise
- **events_audit** (user_id, event, ts, props) — espelho do PostHog para análise SQL
- **prompts_versions** (id, personality, content, active) — versionamento de prompts curados

### Estratégia de backup

- Backend Pro tier inclui backup diário automático com retenção 7 dias
- Snapshot manual antes de migration em prod
- Export CSV semanal para S3 cold storage (LGPD: dados de usuário deletado vão para `archived/` por 30 dias antes de purga definitiva)

---

## Decisões pendentes (Parte 2)

| ID | Decisão | Opções | Prazo |
|---|---|---|---|
| P2.1 | Backend remoto ou Firebase | Backend remoto (a definir) ou Firebase | Antes de começar código |
| P2.2 | 1 mascote por user ou múltiplos | 1 (MVP) ou múltiplos (escala) | Antes do MVP |
| P2.3 | Hábitos pré-definidos ou customizáveis | Pré (recomendado MVP) ou custom | Antes do MVP |

**Atualizado em:** 2026-05-16
