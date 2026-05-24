# Parte 5 — Execução

Cobre seções 33–42: roadmap 48h, 7 dias, 30 dias, 90 dias, backlog, user stories, PRD, doc dev, doc designer, doc investidor.

---

## 33. Roadmap 48 horas

Foco: validar interesse antes de codar app.

### Dia 0 (hoje, sábado 2026-05-16)

**Bloco 1 (manhã, 3h)**
- [ ] Felipe: registra domínio `meumascote.app` (Namecheap)
- [ ] Felipe: cria projeto Vercel + Backend + GitHub repo
- [ ] Felipe: cria conta Resend (email transacional)
- [ ] Felipe: cria conta TikTok Ads + Meta Business + Google Ads (preparo)
- [ ] Renato: rascunha 3 variações de copy do hero da landing

**Bloco 2 (tarde, 4h)**
- [ ] Felipe: scaffold Next.js da landing (Vercel template)
- [ ] Felipe: copia hero, FAQ, secciona "como funciona"
- [ ] Renato: faz draft visual no Figma (homepage + form)
- [ ] Felipe: configura formulário → Backend tabela `waitlist`

**Bloco 3 (noite, 2h)**
- [ ] Felipe: deploy landing inicial (mesmo que feia)
- [ ] Felipe + Renato: revisam copy junta
- [ ] Felipe: prepara post de pré-lançamento Instagram + Threads

### Dia 1 (domingo)

**Bloco 1 (manhã)**
- [ ] Felipe: polish da landing — design ok, mobile responsivo
- [ ] Renato: cria mockup visual do mascote (mesmo que rough) em Figma
- [ ] Felipe: testa formulário end-to-end (email confirmação chega?)

**Bloco 2 (tarde)**
- [ ] Felipe: cria contas TikTok @meumascote, IG @meumascote
- [ ] Renato: grava 1 vídeo TikTok "POV: descobri um Tamagotchi que..."
- [ ] Felipe: configura Plausible/PostHog na landing

**Bloco 3 (noite)**
- [ ] Felipe: publica 1º TikTok orgânico
- [ ] Felipe: publica post Threads + Instagram com a landing
- [ ] Felipe: envia para 30 contatos pessoais via Whatsapp/DM
- [ ] Meta: 15 inscrições na waitlist nas primeiras 24h

### Critérios de saída 48h

| Critério | Verde |
|---|---|
| Landing ao ar | sim |
| Formulário funciona | sim |
| 1 vídeo orgânico publicado | sim |
| 15+ inscrições | sim |
| Bug crítico no form | nenhum |

Se 3 dos 5 verdes → avança para semana 1. Se não → ajusta antes de gastar $$.

---

## 34. Roadmap 7 dias

Foco: validar com 200 inscrições + 30 entrevistas + 1 conceito de mascote visual.

### Dia 2 (segunda)
- [ ] Reunião 30 min Felipe+Renato: revisar números do fim de semana
- [ ] Ligar TikTok Ads R$ 50/dia (criativo C1)
- [ ] Ligar Instagram Ads R$ 50/dia
- [ ] Renato: começa esboço de mascote — 5 sketches
- [ ] Felipe: agenda 5 entrevistas de validação

### Dia 3 (terça)
- [ ] Felipe: faz 2 entrevistas + transcreve insights
- [ ] Renato: avança 1 mascote escolhido para versão colorida
- [ ] Felipe: cria roteiro do 2º TikTok (C2 antes/depois)
- [ ] Renato: grava 2º TikTok

### Dia 4 (quarta)
- [ ] Felipe: 2 entrevistas
- [ ] Felipe: review métricas ads — pausa criativo se CTR < 1%
- [ ] Renato: começa criar 4 variações de personalidade do mascote (cores)
- [ ] Felipe: publica 2º TikTok + 1 Reels

### Dia 5 (quinta)
- [ ] 2 entrevistas
- [ ] Felipe: começa setup do monorepo (Turborepo + apps/mobile + apps/web)
- [ ] Renato: testa Rive — entender state machines
- [ ] Felipe: prepara questionário pós-entrevista (formal)

### Dia 6 (sexta)
- [ ] 2 entrevistas
- [ ] Felipe: sintetiza aprendizados — atualiza personas
- [ ] Renato: 1 mascote finalizado em 4 fases (ovo, bebê, criança, adolescente) na cor "calmo"
- [ ] Felipe: publica 3º TikTok

### Dia 7 (sábado)
- [ ] Felipe: relatório semanal interno
- [ ] Felipe + Renato: review e decisão "vai/não vai" para próxima semana
- [ ] Limpar a lista de waitlist — remover bouncing

### Dia 8 (domingo)
- [ ] Descanso. Não trabalha. Não responde DM.

### Critérios de saída 7 dias

| Critério | Verde | Amarelo | Vermelho |
|---|---|---|---|
| Inscrições waitlist | 200+ | 100-200 | <100 |
| Custo por lead | < R$ 5 | R$ 5-10 | > R$ 10 |
| Entrevistas feitas | 10+ | 5-10 | <5 |
| Insights únicos | 5+ contradições/confirmações importantes | 2-5 | <2 |
| Mascote em 4 fases | sim | parcial | não |

**Decisão semana 2:** se ≥3 verdes, continua. Se ≥2 vermelhos, pausa e refaz hipótese.

---

## 35. Roadmap 30 dias

Meta dos 30 dias: **beta fechado com 50 pessoas usando MVP funcional.**

### Semana 2 (dias 8-14)

**Foco:** começar app + continuar validação

- Setup monorepo (Turborepo + EAS)
- Auth backend funcionando (email magic link + Apple + Google)
- Schema Postgres aplicado
- Tela onboarding (4 passos)
- 1 personalidade implementada (Calmo)
- Edge function `/chat` chamando OpenAI
- 4 fases do mascote ilustradas (1 personalidade)
- Continua ads + 2 TikToks/semana
- 10 entrevistas adicionais

**Saída:** "Felipe + Renato conseguem completar onboarding e mandar 5 mensagens no chat com mascote calmo respondendo."

### Semana 3 (dias 15-21)

**Foco:** core loop completo

- Check-in básico (water, sleep, exercise, breath)
- XP server-authoritative
- Streak forgiving
- Home tela com mascote + chips + missão
- 3 missões pré-cadastradas
- Push notification básico (1 lembrete/dia)
- 4 personalidades de IA (mesmo visual ainda)
- RevenueCat integrado (sandbox)

**Saída:** "Loop completo: onboarding → check-in → ver mascote reagir → fazer missão → receber push amanhã."

### Semana 4 (dias 22-28)

**Foco:** polish para beta

- Paywall implementado (sem cobrar de verdade ainda)
- Relatório semanal (versão simples)
- 4 personalidades com cores distintas no mascote
- Safety: lista de palavras-gatilho + crisis fallback
- Página "Você" com stats
- App Store Connect + Google Play Console: setup conta + screenshots iniciais
- Convite beta para 50 da waitlist (TestFlight + Internal Testing)

**Saída:** "50 pessoas convidadas para beta. Primeiros 10 instalando."

### Semana 5 (dias 29-30) — buffer

- Bug fix do que apareceu
- Análise feedback inicial
- Onboarding ajustado se confuso

### Critérios de saída 30 dias

| Critério | Verde | Vermelho |
|---|---|---|
| Beta ativo (10+ pessoas usando há 3+ dias) | sim | não |
| Crash rate | < 1% | > 3% |
| D3 do beta | > 50% | < 30% |
| Feedback qualitativo positivo | 6+ de 10 amam o conceito | < 3 amam |
| Safety incidents críticos | zero | qualquer |

---

## 36. Roadmap 90 dias

### Mês 2 (dias 31-60) — Beta expandido + iteração

**Foco:** 200 beta testers + métricas claras

- Convidar mais 150 beta da waitlist (total 200)
- Implementar PostHog feature flags
- A/B test 1: onboarding com vs sem quiz de personalidade
- A/B test 2: trial 7d vs 14d
- 4 fases visuais completas para 1 personalidade ÂNCORA (Calmo)
- Personalidade Motivador + Fofo desbloqueadas
- Sistema de missões expandido (20 missões)
- Win-back email para quem parou de usar
- 1ª live com beta (community building)
- Iniciar tratativa com 3 creators

### Mês 3 (dias 61-90) — Soft launch pago

**Foco:** abrir paywall real + cobrar primeiros R$

- Paywall ligado para todos novos
- Trial cobrando R$ 19,90 após 7 dias
- App publicado na App Store + Google Play (rolling release 5%)
- 4 personalidades completas
- 6 acessórios + 2 cenários
- Relatório mensal automatizado
- Sistema de referral (convite vira 1 mês grátis)
- 5 creators ativos
- Newsletter "Cuide-se" lançada

**Eventos importantes mês 3:**
- App Store review pode dar problema (resposta: ter doc LGPD + Termos pronto, e linguagem 100% de wellness)
- Primeiro churn forte vai chegar (D30 dos primeiros pagos) → win-back

### Critérios de saída 90 dias (go/no-go para escala)

| Critério | Verde (continua, escala) | Amarelo (continua, mas ajusta) | Vermelho (pivotar ou parar) |
|---|---|---|---|
| Assinantes pagantes ativos | 150+ | 50-150 | <50 |
| D30 de pagantes | > 70% | 50-70% | < 50% |
| Churn mensal | < 12% | 12-20% | > 20% |
| CAC blended | < R$ 70 | R$ 70-100 | > R$ 100 |
| LTV/CAC | > 1.5 | 1-1.5 | < 1 |
| NPS | > 30 | 10-30 | < 10 |
| Safety incidents críticos | zero | 1-2 | 3+ |

---

## 37. Backlog

Priorizado P0–P3. P0 = bloqueia lançamento, P1 = essencial pós-launch primeiro mês, P2 = mês 2-3, P3 = depois.

### P0 — MVP (mês 1)

| # | Item | Estimativa |
|---|---|---|
| B-001 | Auth backend (email + Apple + Google) | 2d |
| B-002 | Onboarding 4 passos | 3d |
| B-003 | Schema banco (todas tabelas core) | 2d |
| B-004 | Tela home com mascote | 3d |
| B-005 | Rive de 1 mascote em 4 fases | 7d (Renato) |
| B-006 | Edge Function `/chat` com OpenAI | 3d |
| B-007 | 4 personalidades de prompt | 2d |
| B-008 | Safety detector input (regex + tags) | 2d |
| B-009 | Safety detector output | 1d |
| B-010 | Crisis fallback hardcoded | 1d |
| B-011 | Check-in 4 hábitos | 2d |
| B-012 | XP server-authoritative | 2d |
| B-013 | Streak forgiving | 2d |
| B-014 | Tela chat | 2d |
| B-015 | Tela "Você" (stats simples) | 2d |
| B-016 | 3 missões hardcoded | 1d |
| B-017 | Push diário básico (1/dia) | 2d |
| B-018 | RevenueCat sandbox integrado | 3d |
| B-019 | Paywall tela | 2d |
| B-020 | LGPD: política, termos, deleção de conta | 3d |

**Total P0:** ~45 dias-pessoa. Com 2 pessoas dedicadas + algumas tarefas paralelas: ~30 dias calendar.

### P1 — pós-MVP (mês 2)

| # | Item | Estimativa |
|---|---|---|
| B-101 | Mascote em 4 personalidades visuais (cores) | 7d |
| B-102 | Relatório semanal | 3d |
| B-103 | 6 missões adicionais | 1d |
| B-104 | Best-time push algorithm | 3d |
| B-105 | A/B test infra (PostHog FF) | 2d |
| B-106 | Win-back email | 2d |
| B-107 | Settings: timezone, notificações, idioma | 2d |
| B-108 | Onboarding com quiz | 2d |
| B-109 | Compartilhar imagem do progresso | 3d |
| B-110 | Painel admin básico | 5d |

### P2 — mês 3

| # | Item | Estimativa |
|---|---|---|
| B-201 | Mascote fase adolescente + adulto | 10d |
| B-202 | 2 acessórios | 5d |
| B-203 | 2 cenários | 5d |
| B-204 | Relatório mensal | 2d |
| B-205 | Sistema referral | 3d |
| B-206 | Newsletter integration | 2d |
| B-207 | Stripe alt payment (web admin) | 3d |
| B-208 | App Review prep + screenshots | 3d |
| B-209 | Performance: bundle size, cold start | 3d |

### P3 — pós-90d

- Múltiplos mascotes
- Sistema social leve (amigos vendo mascote)
- Versão EN
- Web companion
- Apple Watch / Health integration
- Smart home reminders
- Daily journal embutido
- Comunidade in-app
- Eventos sazonais sistematizados
- Marketplace de acessórios pago

---

## 38. User stories

Formato: "Como [persona], eu [ação], para [resultado emocional]."

### Onboarding

- US-001 — Como Carolina nova no app, eu quero entender o app em menos de 60 segundos, para decidir se vale continuar.
- US-002 — Como Mateus, eu quero escolher uma personalidade que me combine, para sentir que o mascote é "meu".
- US-003 — Como Letícia, eu quero dar um nome ao meu mascote, para criar vínculo.

### Home / Loop diário

- US-010 — Como usuário, eu quero abrir o app e ver meu mascote reagindo a mim, para sentir conexão imediata.
- US-011 — Como usuário, eu quero registrar um check-in em 1 toque, para não desistir por preguiça.
- US-012 — Como Carolina, eu quero ver o mascote ficar feliz quando eu cuido de mim, para ter recompensa emocional.
- US-013 — Como usuário, eu quero ver minha missão do dia, para ter objetivo claro.

### Chat

- US-020 — Como usuário, eu quero conversar com o mascote, para sentir companhia.
- US-021 — Como usuário em crise, eu quero acesso imediato a recursos de ajuda, para não me sentir sozinho.
- US-022 — Como usuário, eu quero que minhas conversas sejam privadas, para falar sem medo.

### Progresso

- US-030 — Como usuário, eu quero ver meu streak, para sentir constância.
- US-031 — Como usuário que pulou um dia, eu quero meu streak preservado, para não desistir por culpa.
- US-032 — Como usuário, eu quero ver um relatório semanal, para refletir sobre minha semana.

### Mascote

- US-040 — Como usuário, eu quero ver meu mascote evoluir visualmente, para perceber progresso.
- US-041 — Como usuário, eu quero meu mascote "lembrar" do meu nome e contexto, para sentir personalização.

### Assinatura

- US-050 — Como visitante, eu quero entender claramente o preço e o que tem na assinatura, para decidir informado.
- US-051 — Como assinante, eu quero cancelar sem fricção, para confiar no produto.
- US-052 — Como usuário em trial, eu quero ser avisado antes da cobrança, para não me surpreender.

### Notificação

- US-060 — Como usuário, eu quero receber lembrete no meu horário, para não ser interrompido em momento ruim.
- US-061 — Como usuário ocupado, eu quero pausar notificações temporariamente, para ter controle.

### Segurança / Crise

- US-070 — Como usuário expressando crise, eu quero ver imediatamente recursos profissionais, para não receber resposta inadequada da IA.

### Admin

- US-080 — Como Felipe (admin), eu quero ver flags de safety pendentes, para revisar humanamente.
- US-081 — Como Felipe, eu quero ver MRR e churn em dashboard único, para tomar decisão.

### Acceptance criteria (exemplo expandido para US-011)

**US-011 — Check-in em 1 toque**

| Critério | Como verificar |
|---|---|
| Botão de hábito visível na home, > 44pt | inspeção visual |
| Tap único dispara animação + feedback haptic | teste manual |
| XP atualizado em < 500ms (offline-optimistic) | medição |
| Em rede offline, salva em queue local, sincroniza ao voltar online | teste avião mode |
| Duplo tap acidental não duplica XP (idempotency_key) | teste manual |
| Após 6 check-ins no dia, hábitos extras dão 0 XP mas confirmam visualmente | teste manual |
| Animação respeita Reduce Motion do SO | teste acessibilidade |

---

## 39. PRD (Product Requirements Document)

### PRD — Mascote MVP

**Autor:** Felipe
**Stakeholders:** Felipe, Renato
**Status:** Draft v1.0
**Data:** 2026-05-16

#### 1. Visão

Mascote é um app mobile de assinatura mensal onde um companheiro digital evolui visualmente conforme o usuário realiza ações de autocuidado, com IA conversacional acolhedora em 4 personalidades.

#### 2. Problema

(Resumo da Parte 1 §1 — abreviado aqui)

#### 3. Público

Carolina (persona âncora) e variantes — millennials/Gen Z BR, 22-38, classe B/C+.

#### 4. Objetivos do MVP (90 dias)

- 150+ assinantes pagantes ativos
- D7 > 25%
- Churn mensal < 12%
- LTV/CAC > 1.5
- Zero incidentes críticos de safety

#### 5. Features in-scope (MVP)

- Auth com email magic link + Apple + Google
- Onboarding com escolha de personalidade
- Tela home com mascote + chips de hábito + missão do dia
- Chat com IA (4 personalidades)
- Check-in de 4 hábitos (water, sleep, exercise, breath)
- XP server-authoritative
- Streak forgiving (2 graces)
- Mascote em 4 fases (ovo → adolescente) em 1 personalidade visual
- Push diário básico (1/dia em horário melhor)
- Paywall com trial 7d cartão
- RevenueCat
- Política LGPD + termos + exclusão de conta
- Safety: detector input + output + crisis fallback

#### 6. Features out-of-scope (MVP)

- Múltiplos mascotes
- Comunidade/social
- Loja de acessórios paga
- Versão EN
- Apple Watch
- Web app
- Diário/journal embutido
- Relatório mensal (apenas semanal no MVP)

#### 7. Requisitos não-funcionais

| Categoria | Requisito |
|---|---|
| Performance | Cold start < 3s; tela home < 1.5s; chat response < 4s |
| Disponibilidade | 99.5% mensal |
| Privacidade | LGPD-compliant; exclusão em 30 dias; criptografia em trânsito e at-rest |
| Segurança | RLS em todas tabelas; rotação de keys; sem PII em analytics |
| Acessibilidade | WCAG AA mínimo |
| Idioma | PT-BR only no MVP |
| Plataformas | iOS 15+, Android 9+ |

#### 8. Métricas de sucesso

Ver Parte 4 §31.

#### 9. Riscos

Ver Parte 6.

#### 10. Open questions

- Backend: Backend remoto (a definir) ou Firebase? (decisão antes de codar)
- Trial: 7d ou 14d? (testar em A/B no mês 2)
- Quiz no onboarding ou escolha livre? (testar)

---

## 40. Documento para desenvolvedor (handoff técnico)

### Resumo executivo do dev

Mascote é um app RN + Expo + TS, Backend remoto + Edge Functions, IA OpenAI + Claude, assinatura RevenueCat. Veja Parte 2 §12-§14 para arquitetura completa.

### Setup inicial

```bash
# 1. Pré-requisitos
node 20+
pnpm 9+
expo cli (npx expo --version)
backend CLI
git

# 2. Clone monorepo
gh repo create meumascote/app --private
git clone git@github.com:meumascote/app.git
cd app
pnpm install

# 3. Setup envs
cp .env.example .env
# preencher:
# BACKEND_URL, API_KEY (server only) (server only)
# OPENAI_API_KEY, ANTHROPIC_API_KEY (server only)
# REVENUECAT_PUBLIC_API_KEY_IOS, _ANDROID
# EXPO_TOKEN

# 4. Setup Backend local
local backend start
db reset   # aplica migrations

# 5. Run mobile
cd apps/mobile
pnpm start
# escanear QR com Expo Go ou usar simulador
```

### Estrutura do monorepo

```
apps/
  mobile/             # React Native + Expo
    src/
      app/            # rotas Expo Router
      features/
        home/
        chat/
        checkin/
        onboarding/
        paywall/
      components/     # UI components
      lib/            # api client, helpers
      store/          # Zustand stores
  web/                # Next.js landing + admin
    app/
    components/

packages/
  types/              # Zod schemas + types
  ai/                 # OpenAI client + roteador
  analytics/          # PostHog + Firebase wrapper
  ui/                 # cross-platform componentes (opcional)

backend/
  migrations/         # SQL versionado
  functions/          # Edge Functions Deno
    chat/
    checkin/
    push-scheduler/
    subscription-webhook/

docs/
  adr/                # Architecture Decision Records
  prd/                # Product Requirements
  api/                # OpenAPI specs

.github/
  workflows/
    ci.yml            # lint + types + tests
    eas-build.yml
    deploy-web.yml
```

### Convenções

- **Linguagem:** TypeScript strict mode em tudo
- **Linting:** ESLint + Prettier; pre-commit hook (husky + lint-staged)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`)
- **Branches:** `main` (prod), `dev` (staging), feature branches `feat/xxx`
- **PRs:** revisão obrigatória + CI verde
- **Imports:** absolute via `@/`, relative só dentro da feature

### Padrões de código

**Componentes RN:**
```tsx
// FunctionalComponent + props tipadas + memo se necessário
type Props = { ... }
export const HabitChip = memo(function HabitChip(props: Props) {
  return ...
})
```

**Estado:**
- Server state: TanStack Query
- Client state local: useState
- Client state global: Zustand
- Form: react-hook-form + zod resolver

**API:**
- Cliente Backend em `lib/api-client.ts`
- Wrappers em `lib/api/*.ts` retornando typed promises
- Zod parse em todas respostas (paranoia)

**Edge Functions:**
- Deno + TypeScript
- Cada function um arquivo `backend/functions/[name]/index.ts`
- Compartilha types via `packages/types`
- Sempre validar input com Zod
- Retorna `Response` JSON com schema definido

### Endpoints — contract resumido

```ts
// POST /checkin
const CheckinRequest = z.object({
  habit_kind: z.enum(['water','sleep','exercise','meditation','reading','journaling','breath','outdoor','sun']),
  value: z.number().optional(),
  unit: z.string().optional(),
  occurred_at: z.string().datetime(),
  idempotency_key: z.string().min(8)
})

const CheckinResponse = z.object({
  checkin_id: z.string().uuid(),
  xp_delta: z.number().int(),
  total_xp: z.number().int(),
  level: z.number().int(),
  leveled_up: z.boolean(),
  new_phase: z.string().nullable(),
  streak: z.number().int(),
  grace_used: z.boolean()
})

// POST /chat
const ChatRequest = z.object({
  message: z.string().min(1).max(500),
  personality: z.enum(['calmo','motivador','fofo','sabio'])
})

const ChatResponse = z.object({
  reply: z.string(),
  safety_flag: z.enum(['safe','watch','high','critical']),
  model: z.string(),
  cached: z.boolean()
})
```

### Testes

| Tipo | Tool | Cobertura alvo |
|---|---|---|
| Unit | Vitest | lógica pura em `packages/types` |
| Integration | Vitest + backend client SDK | edge functions |
| E2E mobile | Detox ou Maestro (preferência Maestro: mais leve) | fluxo principal |
| Smoke web | Playwright | landing + form |

**Mínimo aceitável MVP:** testes unitários da lógica de XP/streak, testes integração `/checkin` e `/chat` (incluindo safety), 1 cenário E2E (onboarding → check-in → ver XP).

### Deploy

- Mobile: `eas build --platform all --profile preview` → instala via QR
- Mobile prod: `eas build --platform all --profile production` + `eas submit`
- Web: push para main → Vercel auto-deploy
- Edge functions: `deploy backend functions chat`

### Observabilidade

- Sentry init em `app/_layout.tsx` (mobile) e `app/layout.tsx` (web)
- PostHog init com user identify pós-login
- Logs Edge Function vão para Backend logs (visível dashboard)

### Segurança

- ⚠️ NUNCA commitar `.env` (gitignore + scan)
- ⚠️ Service role key SÓ em edge functions
- ⚠️ Cliente mobile só usa anon key
- ⚠️ Validar input em TODA edge function
- ⚠️ Rate limit por user nas edge functions sensíveis
- ⚠️ RLS em TODAS tabelas
- ⚠️ Logs com PII vão para tabela separada com retenção 30d

### Como contribuir

1. Pega um item P0 do backlog
2. Cria branch `feat/B-001-auth-backend`
3. Commit pequeno, frequente
4. Abre PR pra `dev` quando pronto
5. Outro revisa, ou self-review com checklist
6. Merge em `dev` → testar em preview build
7. Toda sexta promove `dev` para `main`

---

## 41. Documento para designer

### Resumo executivo do designer

Renato — você está construindo o "rosto" do Mascote. Ilustração + animação + UI. Princípios em Parte 3 §17.

### Entregáveis mês 1

1. **Mascote em 4 fases** (ovo, bebê, criança, adolescente) na personalidade Calmo, em 4 humores cada (triste, ok, feliz, empolgado).
2. **Animação Rive** com state machine: input `mood` (triste/ok/feliz/empolgado) e `phase` (ovo/bebê/criança/adolescente).
3. **Design system mínimo**: cores, tipografia, espaçamento, componentes Card/Button/Chip.
4. **Telas em Figma**: onboarding (4), home, chat, perfil, paywall — todas em mobile portrait.
5. **Ícones do app** iOS + Android (1024x1024 + adaptive).
6. **Screenshots App Store** (6.5" iPhone) — 5 mockups com legenda.

### Ferramentas

- Figma para UI
- Rive para animação (gratuito até 5 files)
- Procreate ou Photoshop para ilustração base
- Figma → exportar SVG → importar em Rive

### Padrões visuais

- **Estilo geral:** ilustração editorial, contornos suaves, paleta cálida, inspiração Studio Ghibli + Honest Co + Hatch
- **Mascote:** silhueta criatura imaginária (não um animal real específico — evitar comparação direta), olhos expressivos, postura mostra humor
- **NÃO:** estilo Memoji (chega cartoon americano), estilo flat sem alma, ilustração CG
- **Cores principais por personalidade:** ver §18 da Parte 3

### Rive — state machine sugerido

```
States:
  Idle_Triste
  Idle_OK
  Idle_Feliz
  Idle_Empolgado
  Idle_Exausto
  Transition_Evolve  (entre fases)

Inputs:
  mood (enum)
  phase (enum)
  trigger_evolve (trigger)
  trigger_react_checkin (trigger - faz mascote pular curto)
```

### Componentes Figma

Criar como variantes/componentes (não duplicar layers):

- Button: primary/secondary/text × default/pressed/disabled
- Card: default/elevated × light/dark
- HabitChip: 9 hábitos × done/undone
- MissionCard: pending/active/completed
- MoodIndicator: 5 moods

### Versionamento

- Figma file `Mascote-MVP-v1`
- Branches para iteração (Figma feature)
- "Marcar pronto pra dev" com label

### Handoff

- Dev usa Figma → CSS / RN style
- Tokens (cores, espaços) exportar via plugin Tokens Studio → JSON → `packages/ui/tokens.ts`

### Inspirações (mood board)

- Finch (referência, mas a gente é mais editorial)
- Pikuniku (ilustração simples expressiva)
- Untitled Goose Game (cor + atmosfera)
- Studio Ghibli (ambiente)
- Hatch (UX da assinatura wellness)
- Cosmos by Particle (animação fluida)
- Linear (UI moderna)

### Riscos e mitigação design

- **Risco:** mascote muito infantil → afasta adulto. **Mitigação:** Renato testa com 5 amigas de 25-35 antes de finalizar.
- **Risco:** Rive performance no Android low-end. **Mitigação:** simplificar fallback Lottie estático na fase ovo/bebê para Android < 8GB RAM.
- **Risco:** ilustração demora mais que estimado. **Mitigação:** começar com 1 personalidade × 4 fases × 4 humores = 16 estados antes de variar cor.

---

## 42. Documento para investidor

### One-pager

```
MASCOTE — wellness gamificado
═══════════════════════════════

Problema
Apps de hábito morrem em 2 semanas (D30 média 6%). Chatbots
wellness viciam mas não geram comportamento. Falta a junção.

Solução
Companheiro digital com IA personalizada (4 personalidades) que
evolui visualmente conforme o usuário pratica autocuidado.

Por que agora
- Mobile wellness é USD 4B+ market, crescendo 20% a/a
- IA conversacional ficou viável em custo (gpt-4o-mini)
- BR é mercado subatendido — Finch/Calm em inglês, sem afeto
- Pós-pandemia consolidou aceitação de companion digital

Mercado
- TAM: 200M usuários globais de wellness apps (2026)
- SAM: 40M brasileiros 22-45 com smartphone e renda B/C+
- SOM ano 1: 5k assinantes ativos (R$ 1M ARR)
- SOM ano 3: 100k (R$ 24M ARR)

Tração (alvo 90 dias)
- 5k waitlist
- 200 beta ativos
- 150 pagantes
- LTV/CAC > 1.5
- NPS > 30

Modelo
- R$ 19,90/mês, R$ 149/ano, trial 7d cartão
- Margem > 90% (assinatura digital)
- Comparável a Finch (USD 30M ARR EUA)

Diferenciação
- Tamagotchi adulto + IA com personalidade + linguagem BR nativa
- Streak forgiving + safety guardrails
- Não é terapia (regulação simples) — é wellness

Time
- Felipe — founder, produto, growth
- Renato — co-founder

Risco principal
OpenAI ou Apple Health lançam algo parecido com 100x distribuição.
Defesa: dados longitudinais + comunidade BR + IP de personalidades.

Pedido
Sem rodada nesse momento. Buscando: 50 beta testers, 5 founders
B2C consumer pra mentoria, intro com 3 investidores anjo BR
ativos em wellness/consumer pra mês 6.
```

### Deck (sugerido — 10 slides)

1. **Hook** — "Um Tamagotchi adulto que cresce com você cuidando de você"
2. **Problema** — Apps de hábito morrem. Chatbots viciam sem mudar a vida. (números)
3. **Solução** — Mascote: visual demo
4. **Por que agora** — IA viável + mercado pronto
5. **Diferenciação** — quadrant chart
6. **Modelo** — assinatura, preços, margens
7. **Tração** — números até hoje (waitlist, beta, MRR)
8. **Mercado** — TAM/SAM/SOM
9. **Time** — Felipe + Renato + planos contratação
10. **Pedido + visão** — onde chegamos em 3 anos

### Tese para o investidor cético

**Pergunta:** "Por que isso não é só mais um app que some?"

**Resposta:**
- **Moat tecnológico:** zero. Aceito.
- **Moat de dado:** depois de 6 meses, temos uma base de eventos comportamentais que nenhum LLM puro tem.
- **Moat de marca:** comunidade BR-PT, linguagem específica, vibe — não copyable em 6 meses.
- **Moat de unit economics:** 90% margem, baixo CAC orgânico via UGC, retenção provada antes de escalar.
- **Defesa final:** se isso vira commodity, ainda assim em 36 meses a gente capturou um pedaço significativo do mercado BR antes do concorrente acordar.

**Pergunta:** "E se OpenAI lançar isso?"

**Resposta:** OpenAI é infraestrutura. Não cuida de UX, brand, localização, distribuição mobile. Eles podem habilitar nossa concorrência, não sermos eles. Companions verticais (não horizontais) tendem a ganhar nichos.

**Pergunta:** "Por que assinatura e não free + ads?"

**Resposta:** wellness e ads não combinam. Anúncio mina o vínculo emocional. Assinatura alinha incentivo: nós ganhamos quando você fica e cuida de você, não quando você vê 30 ads/dia.

### Métricas que importam pro investidor

| Métrica | Por quê |
|---|---|
| Cohort LTV / CAC payback | health unit economics |
| D7, D30 cohort retention | retenção que prediz longevidade |
| Churn voluntário mensal | qualidade do produto |
| % do MRR vindo de anual | confiança e cash flow |
| NPS por cohort | satisfação por temporalidade |
| % usuários com 30+ check-ins/mês | engajamento profundo |

### Contato para investidores

- Email: felipe@meumascote.app (a configurar)
- LinkedIn: /in/felipemenezes (a confirmar)
- Calendar: cal.com/felipe-mascote (a configurar)

---

## Decisões pendentes (Parte 5)

| ID | Decisão | Opções | Prazo |
|---|---|---|---|
| P5.1 | Stack monorepo: Turborepo vs Nx | Turborepo (recomendado) ou Nx | Antes de codar |
| P5.2 | E2E tool | Maestro (recomendado) ou Detox | Antes do beta |
| P5.3 | Promover dev → main weekly ou per PR | Weekly (recomendado MVP) | Antes do beta |

**Atualizado em:** 2026-05-16
