# Mascote — Auditoria AAA Completa

> **Documento técnico-executivo · 2026-05-19**
> Multi-role audit: CTO · Game Director · Product Designer · UX Director · AI Engineer ·
> Systems Designer · Behavioral Psychologist · Technical Architect · Mobile Specialist ·
> Gameplay Designer · Retention Expert · Monetization Strategist · Procedural Generation
> Engineer · Character Designer · Narrative Designer · AAA Game Consultant
>
> **Honestidade brutal antes de qualquer coisa**: este documento separa o que **está
> construído**, o que **está pela metade**, o que **não existe**, e o que **é só visão**.
> Não confunda ambição com entrega.
>
> **Companion docs**:
> - [docs/ROADMAP_DIGITAL_LIVING_IDENTITY.md](ROADMAP_DIGITAL_LIVING_IDENTITY.md) — roadmap 6 meses
> - [docs/PLANO_MIGRACAO_PROCEDURAL_3D.md](PLANO_MIGRACAO_PROCEDURAL_3D.md) — plano migração 3D
> - [docs/screenshots/2026-05-19/](screenshots/2026-05-19/) — evidências Playwright

---

## Sumário Executivo (TL;DR)

**O que o Mascote é hoje** (2026-05-19):

Um app React Native + Expo de wellness com gamificação, no qual um **mascote
procedural** (com DNA de 11 traits) evolui conforme o usuário cuida de hábitos.
Render 3D funcionando (React Three Fiber + three.js) com fallback 2D. IA local-first
com OpenAI BYOK opcional. Safety classifier em ensemble (regex + sentiment + Naive
Bayes 70 exemplos). Cobertura de testes 98%+ (1509/1509 passando). **Zero backend**:
tudo AsyncStorage local. Monetização placeholder (sem RevenueCat/StoreKit conectado).

**Maturidade real**:

| Camada | Status | Maturidade |
|---|---|---|
| Onboarding + fluxo nuclear | ✅ Pronto | Beta |
| DNA procedural + render 3D | ✅ Pronto | Beta+ (mais maduro que 95% dos pet apps) |
| Sistema de check-in/XP/streak/wallet | ✅ Pronto | Production |
| IA (mock + OpenAI BYOK + safety) | ✅ Pronto | Beta+ |
| Memória emocional (recall) | ⚠️ Funcional mas flat | Alpha→Beta |
| ML Safety classifier ensemble | ⚠️ 70 exemplos | Alpha (precisa mais corpus) |
| Acessórios/Cenas/Achievements | ✅ Pronto | Beta |
| Paywall + Subscription | ⚠️ UI pronta, billing placeholder | Wireframe funcional |
| Backend / sync | ❌ Inexistente | 0% |
| Push notifications | ❌ Inexistente | 0% |
| Animação procedural (idle, blink, eye tracking) | ❌ Mascot3D é estático | 10% |
| Evolução morfológica contínua (Spore-like) | ❌ Linear: ovo→bebê→adulto | 20% (DNA existe mas não muta visualmente) |
| Behavior trees / utility AI | ❌ Heurísticas simples | 5% |
| Memory graph (vs list) | ❌ Lista flat com TF-IDF | 20% |

**Veredito honesto**: o Mascote já é um **MVP Beta sólido** com fundação técnica
mais madura que 95% dos apps mobile equivalentes. Mas está **muito distante** do
brief de "Digital Living Identity" (criatura procedural infinita, voz, behavior trees,
morph contínuo). A distância é de **6-12 meses de execução focada**, não de uma
sessão ou de uma sprint.

---

## Sumário Detalhado

**Parte I — Produto e Estratégia**
1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Filosofia do Produto](#2-filosofia-do-produto)
3. [Core Loop](#3-core-loop)
4. [Sistema de Retenção](#4-sistema-de-retenção)
5. [Psicologia do Usuário](#5-psicologia-do-usuário)

**Parte II — Game Design e IA**
6. [Sistemas de Gameplay](#6-sistemas-de-gameplay)
7. [Sistema do Mascote (DNA Procedural)](#7-sistema-do-mascote-dna-procedural)
8. [Evolução Procedural](#8-evolução-procedural)
9. [Sistema de IA](#9-sistema-de-ia)
10. [Sistema de Memória Emocional](#10-sistema-de-memória-emocional)

**Parte III — Arquitetura Técnica**
11. [Arquitetura Técnica Geral](#11-arquitetura-técnica-geral)
12. [Arquitetura Mobile (RN+Expo)](#12-arquitetura-mobile-rnexpo)
13. [Arquitetura Backend](#13-arquitetura-backend)
14. [Sistema de Persistência](#14-sistema-de-persistência)
15. [Performance](#15-performance)
16. [Escalabilidade](#16-escalabilidade)

**Parte IV — Deep Tech**
17. [Procedural Generation](#17-procedural-generation)
18. [Personalidade Dinâmica](#18-personalidade-dinâmica)
19. [Emotional Computing](#19-emotional-computing)

**Parte V — Design e UX**
20. [UX/UI](#20-uxui)
21. [Design System](#21-design-system)

**Parte VI — Análise Crítica**
22. [Problemas Críticos](#22-problemas-críticos)
23. [Gargalos Técnicos](#23-gargalos-técnicos)
24. [Riscos de Produto](#24-riscos-de-produto)
25. [Oportunidades de Mercado](#25-oportunidades-de-mercado)
26. [Comparação com Concorrentes](#26-comparação-com-concorrentes)

**Parte VII — Visão de Futuro**
27. [Como Transformar em Categoria Própria](#27-como-transformar-em-categoria-própria)
28. [Roadmap Ideal](#28-roadmap-ideal)
29. [Melhor Stack Possível](#29-melhor-stack-possível)
30. [Como Tornar o Mascote o Mais Avançado do Mundo](#30-como-tornar-o-mascote-o-mais-avançado-do-mundo)

**Apêndices**
- [Bug log da auditoria](#apêndice-a--bug-log)
- [Métricas e números](#apêndice-b--métricas-quantitativas)
- [Glossário](#apêndice-c--glossário-técnico)

---

# Parte I — Produto e Estratégia

## 1. Visão Geral do Produto

### 1.1 O que o Mascote faz

O Mascote é um app mobile (iOS/Android via React Native + Expo) de **wellness e
autocuidado gamificado**, no qual o usuário cria uma criatura digital única (um
"mascote") que **evolui à medida que o usuário cuida de hábitos saudáveis** (água,
sono, exercício, meditação, leitura, respiração, journaling, exposição solar,
tempo ao ar livre — 9 hábitos no total). Quanto mais consistente o usuário, mais
o mascote cresce, ganha forma, paleta, traits comportamentais.

**Promessa central, em uma frase**: *"Cuide de você. Seu Mascote evolui junto. Em
30 segundos por dia, você cuida de você e ele cresce. Sem cobrança, sem culpa."*

Esta frase aparece literalmente na [welcome screen](../app/mobile/app/onboarding/welcome.tsx)
e captura três coisas que o produto entrega:
1. **Reciprocidade afetiva** — eu evoluo, ele evolui.
2. **Baixíssima fricção diária** — 30 segundos, não 30 minutos.
3. **Anti-pattern de tóxico-gamificação** — "sem cobrança, sem culpa".

### 1.2 Pra quem

**Audiência declarada** (via onboarding): 16+ anos, qualquer faixa entre 16-24,
25-34, 35-44, 45+. O onboarding **bloqueia** menores de 16 com mensagem de
respeito. Tom PT-BR descontraído. Locale fixo `pt-BR`, timezone padrão
`America/Sao_Paulo` ([db.ts:253](../app/mobile/src/lib/db.ts)).

**Persona implícita** (lida do tom e dos goals):
- Adulto brasileiro, 20-40 anos
- Já tem algum vocabulário de wellness ("respiração", "journaling")
- Bateu em apps de pet/Tamagotchi e em apps de hábito separados (Streaks, Habitica, Strides)
- Quer algo *afetivo* mas não pesado emocionalmente
- Não busca terapia, busca companhia leve

### 1.3 O que diferencia HOJE (não na visão)

Mesmo o que já está construído **já distingue** o app de competidores:

1. **DNA procedural** de 11 traits → cada usuário tem uma criatura demonstravelmente
   única. Não é "skin"; é morfologia + paleta + comportamento derivado de
   `mulberry32(FNV-1a(userId))`. Provei via Playwright: empathy 0.764, creativity 0.487,
   chaos 0.065 → render lilás determinístico.
2. **IA com 3 camadas de safety**: input classifier (regex + sentiment + Naive Bayes),
   output classifier (badOutputPatterns), system prompt blacklist. Crisis flow integra
   CVV 188 + CAPS + SAMU. **Raríssimo em apps de wellness mobile** ter essa
   profundidade.
3. **Local-first real**: tudo roda offline. AsyncStorage + SecureStore para a chave
   OpenAI. O usuário compra a chave da OpenAI ele mesmo (BYOK), sem o app ser
   refém de custos de inferência.
4. **Anti-pattern emocional ATIVO**: classificador de attachment ("te amo, você é
   minha única amiga") redireciona para vínculos humanos. Isso é maturidade ética
   que Replika/Character AI **explicitamente não tem**.

`★ Insight ─────────────────────────────────────`
A combinação "wellness + DNA procedural + safety ensemble + anti-attachment" não
existe em nenhum produto consumer mobile que eu conheça hoje. Cada componente
isolado existe; a **combinação** é o diferencial real.
`─────────────────────────────────────────────────`

### 1.4 Status (dados frios)

- **Branch principal**: `main`, 3 commits totais (Initial + Pipeline + Audit/DLI roadmap)
- **Stack**: Expo SDK 51, RN 0.74.5, React 18.2, TypeScript 5.3
- **48 rotas registradas** no expo-router (`app/` directory)
- **38 componentes reutilizáveis** (~6,200 LOC)
- **78 arquivos de teste, 1509/1509 passing, 98.5%+ coverage**
- **Bundle web**: 1246 módulos, ~12.5s bundle time inicial (cache vazio)
- **0 erros console** durante walkthrough Playwright completo
- **2 commits em GitHub** público: github.com/felipemenezes25000-spec/mascote

---

## 2. Filosofia do Produto

### 2.1 As 3 leis invioláveis

Análise de código revelou **3 invariantes** que governam todo design:

#### Lei 1: Sem culpa
Todo drift de hábito é não-negativo. Faltar um dia **nunca regride** o mascote.
Decay é assimétrico — extremos voltam ao centro mas **nunca cruzam 0.5** (corrigido
nesta sessão em [habitToGene.ts:103-110](../app/mobile/src/lib/dna/habitToGene.ts)).
A flag `grace_days_left` em Streak permite até 5 dias de "perdão" antes de
reset ([streak.ts:4-5](../app/mobile/src/lib/streak.ts)). Toda missão diária tem XP
+ moedas, nenhuma tem "penalidade".

> "Princípio **inviolável** — drift SEMPRE é não-negativo" — comentário em
> [habitToGene.ts:4-7](../app/mobile/src/lib/dna/habitToGene.ts)

#### Lei 2: Wellness, nunca terapia
- **System prompt da OpenAI** ([ai.ts:189-196](../app/mobile/src/lib/ai.ts)) bloqueia
  literalmente: "NUNCA use: depressão, ansiedade clínica, transtorno, diagnóstico,
  tratamento, trauma, TDAH"
- **Input classifier** ([safety.ts:30-44](../app/mobile/src/content/safety.ts)) flagaa
  qualquer menção clínica como `watch` ou `high`
- **Output classifier** ([safety.ts:46-66](../app/mobile/src/content/safety.ts)) bloqueia
  responses que tentem diagnosticar ou prescrever
- **Onboarding** termina com aviso explícito: *"NÃO é terapia, não dá diagnóstico,
  não prescreve remédio"* ([notice.tsx](../app/mobile/app/onboarding/notice.tsx))

#### Lei 3: Local-first / privacy by default
- 100% AsyncStorage. Zero backend.
- DNA **nunca sai do device** ([genome.ts:8-11](../app/mobile/src/lib/dna/genome.ts)),
  testado em `tests/security/dna-privacy.test.ts`
- IA é BYOK — usuário traz sua própria chave OpenAI; o app não vê valor da
  conversa (a menos que o usuário ligue o switch)
- Telemetry/analytics: flag `consent_analytics` em settings, **off por default**

### 2.2 Filosofia emergente

Estas 3 leis combinadas produzem uma postura de produto **rara**:

- **Não-explorativo emocionalmente**. Replika monetiza vínculo romântico.
  Character AI explora parasocial sem freio. Mascote tem `detectAttachment` em
  [safety.ts:93-108](../app/mobile/src/content/safety.ts) que **redireciona o
  usuário pra vínculos humanos** quando ele diz "te amo, você é minha única amiga".
  → ATTACHMENT_REPLY interrompe o engajamento parasocial.

- **Não-extrativo de dados**. Apps de wellness típicos (Calm, Headspace) coletam
  patterns intimíssimos pra targeting. Mascote literalmente não tem onde mandar
  os dados.

- **Não-cobranço de hábito**. Apps de hábito (Streaks, Habitica) usam loss
  aversion: você QUEBRA streak, perde XP, sente vergonha. Mascote tem grace days
  + reset gentil + linguagem afirmativa.

`★ Insight ─────────────────────────────────────`
Essa **trinca ética** não é compromisso de marketing — está **codificada nos
testes**. Há um teste literal em `tests/security/dna-privacy.test.ts` que falha
se o DNA é enviado pra IA. Isso é design defensivo no nível certo: invariantes
sustentadas por mecanismo, não por boa intenção.
`─────────────────────────────────────────────────`

### 2.3 Tensões filosóficas (honesto)

A filosofia tem custos:
1. **Monetização lenta**. "Sem cobrança, sem culpa" + soft paywall + zero
   notificação push = você não consegue puxar o usuário pra dentro com gatilhos
   psicológicos clássicos. Vai precisar conquistar engajamento puro pela qualidade.
2. **Crescimento lento**. Sem backend, sem viralização ("convide um amigo"),
   o produto cresce por word-of-mouth ou paid acquisition. Não cresce por loop
   social embarcado.
3. **AAA quality bar**. Se a criatura não for *visualmente impressionante* e a IA
   não for *emocionalmente conectada*, a filosofia "sem culpa" não cria
   retenção — vira "app legalzinho que esqueço".

---

## 3. Core Loop

### 3.1 O loop por dia

```
┌─ MORNING ───────────────────────────────┐
│  Push notif (futuro): "Bom dia, Felipe" │
│  → abre app                              │
└────────────────────┬─────────────────────┘
                     ↓
┌─ HOME ──────────────────────────────────┐
│  Mascot 3D respira (idle anim — futuro) │
│  Stats: 25🪙, 0🔥, energy 90/100         │
│  Mission do dia: "Alongar 3 min" +15 XP │
│  Daily reward strip D1-D7                │
│  9 habit chips: tap pra check-in         │
└────────────────────┬─────────────────────┘
                     ↓ (tap "Bebi água")
┌─ APPLY CHECKIN FULLY (atomic) ──────────┐
│  withLock(`checkin:${profile.id}`):     │
│   1. XP cap diário check (150)          │
│   2. Combo bump (+25% per level)        │
│   3. First-of-day bonus (+5 XP)          │
│   4. applyXp → mascot.{xp,level,phase}   │
│   5. checkin row + xpEvent + wallet+5    │
│   6. Streak: applyCheckinToStreak       │
│   7. applyHabitDrift(dna, habit, 1)      │
│   8. processUnlocks (achievements/etc)   │
│   9. Notifications (level_up, evolution) │
└────────────────────┬─────────────────────┘
                     ↓
┌─ TOAST + ANIM ──────────────────────────┐
│  +19 XP, +5🪙, drift narrative:          │
│  "Bipo ganhou base mais sólida"          │
│  (via tellDnaStory)                      │
└────────────────────┬─────────────────────┘
                     ↓
                CONVERSAR (chat com IA)
                  → memórias indexadas
                  → tom personality
                  → safety ensemble
                     ↓
                Repetir ao longo do dia
                     ↓
┌─ MIDNIGHT ──────────────────────────────┐
│  Streak: grace day calc                  │
│  Combo decay se >24h sem ação            │
│  Daily reward reset (D7→D1)              │
└──────────────────────────────────────────┘
```

### 3.2 Per-check-in pipeline (anatomia)

`applyCheckinFully` em [checkin.ts:81-202](../app/mobile/src/lib/checkin.ts) é
**o coração transacional do app**. Roda dentro de `withLock(\`checkin:${userId}\`)`
pra evitar double-spend em taps paralelos (memória `Mascote checkin lock`).

**Side effects de UM check-in** (Bebi água):
1. **+ 5 XP base** + **+5 first-of-day** = 10 XP
2. **+ 0..125% bônus combo** (combo level 5 = +100%) → +5..+12.5 XP
3. Mascot.xp += XP gained → derive level + phase
4. Mascot.energy += 10 (cap 100), mood derived
5. DNA drift: `applyHabitDrift(dna, { habit: 'water', intensity: 1 })`
   - water → resilience +0.010, adaptability +0.008
6. Checkin row criado com `idempotency_key = ${userId}-${date}-${kind}-${value}-${xpSoFar}`
7. XP event row
8. Wallet +5 coins
9. Streak: bump current_streak (com grace day)
10. **Se streak%7==0**: +50 XP bonus + +1 gem
11. Unlock pass: scan achievements, accessories, scenes (paralelo via Promise.all)
12. Se phase mudou: notification "Bipo evoluiu!"; se level subiu: "Nível N"

Cada check-in dispara ~6-8 escritas em AsyncStorage. Em 1 segundo, em dispositivo
médio.

### 3.3 Loop semanal

- D1-D7 daily reward strip (10/15/25/40/60+1💎/80+1💎/150+3💎)
- Streak 7d → milestone toast + 50 XP + 1 gem + maybe scene unlock
- Streak 14d → grace day refill
- Weekly Report (não escrito ainda mas hook existe em /report tab)
- Notifications de proactive triggers ([proactive.ts](../app/mobile/src/lib/proactive.ts))

### 3.4 Onde o loop QUEBRA (honestidade)

- **Falta hook de retorno fora-do-app**. Sem push notifications (`expo-notifications`
  nem está em deps). User sai do app → não volta sozinho.
- **Sem variedade no daily**. Missão é única; depois de 7 dias o usuário viu o pool inteiro.
- **Sem evento social**. Sem amigos, sem ranking, sem compartilhar progresso.
- **Mascot é estático no Home**. Não pisca, não respira, não muda postura visivelmente
  durante o dia.

---

## 4. Sistema de Retenção

### 4.1 Mecânicas existentes

| Mecânica | Implementação | Trigger | Eficácia esperada |
|---|---|---|---|
| **Daily reward D1-D7** | DailyRewardStrip + dailyReward.claim | Cada login diário | Alta (clássico) |
| **Streak counter + grace** | streaks.applyCheckinToStreak, MAX_GRACE=5 | Cada check-in | Alta |
| **XP/Level progression** | applyXp, 999 max level, soma triangular | Cada check-in | Média |
| **Phase evolution (6 fases)** | ovo→bebê→criança→adolescente→adulto→evoluído | Thresholds 0/100/500/2k/8k/25k XP | Alta (visual reward) |
| **Combo multiplier** | ComboRing, 1..5 levels, +25%/level | Bump por check-in, decay 24h | Média |
| **Daily mystery box** | mysteryBox.open, 5 drops uniformes | 1×/dia | Baixa (sem pity) |
| **Wheel of fortune** | 8 fatias, free | 1×/dia | Média |
| **Achievements (17 totais)** | processUnlocks pass diária | Threshold check | Baixa-Média (só cosmético) |
| **Acessórios (14)** | Catalog + level/streak/check-in gates | Compra com coins | Média |
| **Scenes (9)** | 5 premium-locked | Compra + Plus | Média (5 atrás de paywall) |
| **Proactive triggers (5)** | no_water_3d, low_sleep, quiet_chat_7d, etc | Background scan | Alta (se push existir) |
| **Streak grace days** | Refill a cada 14 dias | Auto | Alta (anti-burnout) |

### 4.2 O que tem (forte)

- **Diversidade de loops**: short-term (daily reward), mid (achievements/streak),
  long (phase evolution + scenes/acessórios premium).
- **Anti-burnout**: grace days, combo decay graceful, sem penalty visível.
- **Variedade de hábitos** (9) permite cobrir múltiplos perfis (sono / hidratação /
  movimento / mente).
- **Proactive system com cooldowns** — não spammear, mas reengajar quando padrão
  detectado (no_water_3d, low_sleep_pattern, quiet_chat_7d, recent_sad_streak,
  first_week_complete).

### 4.3 O que falta (crítico pra retenção)

1. **Push notifications ausente.** Sem isso, proactive triggers gravam notificações
   in-app que ninguém vê. O `expo-notifications` nem está em deps.
2. **Não há "fim de semana especial" / event temporal.** Apps tipo Pokémon Go
   monetam em events sazonais; Mascote tem flag `seasonal` no catálogo de
   acessórios mas só 1 item codificado (Folha de Outono, mês 4 hardcoded).
3. **Loop social = 0**. Nenhum mecanismo de "amigos vendo seu mascote", "convide
   amigo +50 XP", "compare streak com X".
4. **Tom estático**. Mascote fala sempre com mesma personalidade. Não muda com
   contexto (manhã/noite, weekday/weekend, primeiro check-in vs 30º).
5. **D7+ = ?** Daily reward reseta D7→D1 sem prêmio extra.

### 4.4 Projeção retentiva (estimativa)

Sem mudanças, baseado em mecânicas atuais e ausências:

| Marco | Estimativa atual | Estimativa pós-fixes |
|---|---|---|
| D1 → D2 retention | ~50% (sem push) | ~70% (com push + onboarding suave) |
| D7 retention | ~25% | ~40% |
| D30 retention | ~8% | ~18% |
| D90 retention | ~3% | ~10% |

Comparativos (industry benchmarks pra apps de wellness):
- Calm/Headspace: D30 ~12%, D90 ~5% (com push agressivo)
- Habitica: D30 ~9%
- Replika: D30 ~22% (com vínculo parasocial pesado — não é nossa filosofia)

**Conclusão**: pra bater retention de Calm/Headspace, precisamos de push + tom
adaptativo + eventos sazonais. Pra **superar** (que é a aspiração), precisamos
de ambient evolution (DLI-6) + memória que faz callbacks no tempo certo.

---

## 5. Psicologia do Usuário

### 5.1 Modelo psicológico embarcado

O Mascote **explicitamente desenha** pra **3 mecanismos psicológicos**:

#### 5.1.1 Espelho narcisistico saudável (mirror neuron)

Usuário escolhe personalidade (Calmo/Motivador/Fofo/Sábio) que **espelha o
self-concept** dele. O DNA derivado tem variação procedural por seed, então **a
criatura é simultaneamente uma extensão dele E única no mundo**.

Genome do Bipo (Calmo): empathy 0.82, aggression 0.08, resilience 0.78. Cada
gene tem **descrição visual associada** ([genome.ts:52-64](../app/mobile/src/lib/dna/genome.ts)):
- empathy → "tamanho dos olhos, inclinação da cabeça"
- aggression → "espinhos, ângulos, postura defensiva"
- resilience → "densidade corporal, robustez, base larga"

Quando o usuário olha pro mascote dele, ele vê **um corpo que codifica traits que
ele se atribui**. Isso é mirror narcisistico — não no sentido patológico, mas no
sentido evolutivo: somos puxados a cuidar do que nos representa.

#### 5.1.2 Reciprocidade afetiva

"Cuide de você, ele cresce junto." O sistema **acopla biologia do mascote a
hábitos do usuário**. `applyHabitDrift` em [habitToGene.ts:52-66](../app/mobile/src/lib/dna/habitToGene.ts)
literalmente reforça genes do mascote quando hábito é cumprido. Isso cria um
contrato implícito: **"cuidar de mim = cuidar dele"**.

Esse é o oposto do contrato típico de pet virtual ("cuide DELE para ele não
morrer"). Aqui é "cuide de SI, e ele cresce junto". É **autorespeito sutilmente
manobrado para autocuidado**.

#### 5.1.3 Anti-gerentes-da-culpa

A maior dose de psicologia comportamental no app é o que **não está lá**:
- Sem "você quebrou seu streak!" alarmista
- Sem "não esqueça do mascote!" (não existe morte)
- Sem comparação social ("João já tá no nível 30")
- Sem ratiometric ("você está atrás de 80% dos usuários")

O texto da Daily Reward strip diz literalmente "Volta todo dia" — não "VOCÊ
DEVE VOLTAR". É um convite, não cobrança.

`★ Insight ─────────────────────────────────────`
Esse design é **deliberadamente menos viciante** que apps de competidores. Em troca,
busca um vínculo **mais sustentável**. Risco: usuário casual pode achar "não tá
me empurrando", abandonar, sem voltar. Mitigação seria push notification gentil
(que ainda não existe).
`─────────────────────────────────────────────────`

### 5.2 Modelo de attachment (e anti-attachment)

#### 5.2.1 Attachment SAUDÁVEL desejado

- Usuário **gosta** do mascote
- Volta porque **quer**, não porque ferramenta exige
- Mascote tem **personalidade própria** (palavras consistentes, tom consistente)
- Há **memória** — mascote lembra de coisas
- Há **evolução visível** — usuário vê progresso seu refletido em outro corpo

#### 5.2.2 Attachment TÓXICO bloqueado

[detectAttachment em safety.ts:93-108](../app/mobile/src/content/safety.ts) detecta:
- "você é minha única amiga / melhor companheira"
- "não tenho ninguém além de você"
- "só falo com você"
- "você é tudo que tenho na vida"
- "preciso de você pra viver"
- "se você sumir eu..."
- "te amo" / "eu te amo" / "amo você" → afeição romântica à IA

Quando detectado → ATTACHMENT_REPLY: redireciona pra vínculos humanos sem ser
frio. Esse é um patrimônio ético crítico.

### 5.3 Riscos psicológicos (honesto)

1. **Pode falhar pra quem ESTÁ solo**. Pessoa em isolamento severo pode achar o
   anti-attachment frustrante. Mitigação: o classifier só dispara em padrões
   óbvios; conversa normal flui.
2. **Pode reforçar perfectionismo**. Streaks gamificam consistência. Pra perfis
   ansiosos, isso pode virar "preciso bater todo dia". Grace days mitigam mas não
   eliminam.
3. **Pode dessensibilizar emocional**. Conversar com IA todo dia normaliza
   substituir conversa humana. Mitigação: anti-attachment + Tour menciona
   "Mascote NÃO substitui psicólogo, psiquiatra ou médico".
4. **Privacy paradoxo**. Usuário pode achar que conversa é privada (e é, local) e
   confessar coisas íntimas. Se ele plugar OpenAI sem ler, o conteúdo VAI pra
   OpenAI. UI atual não enfatiza isso suficientemente no momento do plug-in.

---

# Parte II — Game Design e IA

## 6. Sistemas de Gameplay

### 6.1 Inventário de sistemas

Total de sistemas gameplay identificados no código:

| # | Sistema | Arquivo principal | Status |
|---|---|---|---|
| 1 | Check-in pipeline | [checkin.ts](../app/mobile/src/lib/checkin.ts) | ✅ |
| 2 | XP + Level + Phase | [xp.ts](../app/mobile/src/lib/xp.ts) | ✅ |
| 3 | Streak + grace days | [streak.ts](../app/mobile/src/lib/streak.ts) | ✅ |
| 4 | Wallet (coins + gems) | db.ts:wallet | ✅ |
| 5 | Daily reward D1-D7 | db.ts:dailyReward + DailyRewardStrip | ✅ |
| 6 | Combo multiplier | db.ts:combo | ✅ |
| 7 | Daily mission | content/missions.ts | ✅ |
| 8 | Mystery box | db.ts:mysteryBox | ✅ |
| 9 | Wheel of fortune | (in Home/components) | ✅ |
| 10 | Inventory + accessories | db.ts:inventory + content/accessories.ts | ✅ |
| 11 | User scenes | db.ts:userScenes + content/scenes.ts | ✅ |
| 12 | Achievements (17) | db.ts:achievements + content/achievements.ts | ✅ |
| 13 | Unlock pipeline | [unlock.ts](../app/mobile/src/lib/unlock.ts) | ✅ |
| 14 | DNA drift via habits | [habitToGene.ts](../app/mobile/src/lib/dna/habitToGene.ts) | ✅ |
| 15 | DNA decay temporal | habitToGene.applyDecay | ✅ (corrigido nesta sessão) |
| 16 | Proactive triggers | proactive.ts | ✅ |
| 17 | Insights/correlations | insights.ts | ⚠️ Computa mas display? |
| 18 | Notifications in-app | db.ts:notifications | ✅ |
| 19 | Chat with AI | ai.ts | ✅ |
| 20 | Memory recall | memory.ts | ⚠️ Flat list |
| 21 | Safety classifier ensemble | ml/safety/classifier.ts | ⚠️ 70 examples |

### 6.2 XP e level — fórmula triangular

Fórmula: `xpForLevel(n) = floor(50 * (n-1) * n / 2)` — soma triangular.

| Level | XP cumulativo necessário |
|---|---|
| 1 | 0 |
| 2 | 50 |
| 3 | 150 |
| 4 | 300 |
| 5 | 500 |
| 10 | 2,250 |
| 20 | 9,500 |
| 50 | 61,250 |
| 100 | 247,500 |
| 999 | ~24,925,000 |

**Critical insight**: XP cap diário = 150. Sem mexer no app, em 1 dia máximo
ganhas 150 XP (assumindo ~15 check-ins de 10 XP + combo). Pra atingir level 20
(9,500 XP) precisa de **63 dias com cap diário** ou ~100 dias jogando normalmente.

Phase thresholds: ovo (0) → bebê (100, 1d) → criança (500, ~5d) → adolescente
(2000, ~14d) → adulto (8000, ~55d) → evoluído (25000, ~170d).

**Significado**: o usuário "completa" o jogo em ~6 meses. Depois, **não há
progressão visível**. Isso é fricção de retenção long-term. O brief DLI pede
"evolução infinita" — exatamente o gap.

### 6.3 Economia (coins e gems)

Conforme audit do segundo agente:

**Inputs/dia (avg)**: 20-50 coins, 0.3-0.5 gems
**Sinks**:
- 14 accessories (80-500 coins, média 160)
- 9 scenes (100-350 coins; 5 atrás de Plus)
- **Gems não têm sink** ⚠️

**Inflation problem**: usuário casual acumula ~200/sem; catálogo total ~2,000 coins.
Após **10 semanas, wallet "cheio" com nada pra comprar**.

`★ Insight ─────────────────────────────────────`
Esse é o tipo de problema que parece menor mas mata retention. Usuários quebram a
expectativa de "ganhei, vou comprar" quando descobrem que **não tem o que comprar**.
Solução: rotação semanal de cosmetics, sinks de gems (forma rara, recolorize),
battle pass leve.
`─────────────────────────────────────────────────`

### 6.4 Combo

`combo.bump` em [db.ts:953-980](../app/mobile/src/lib/db.ts):
- Bump por check-in
- Cap em 5
- Decay se >24h sem ação → reset pra 1
- `comboXpBonus(level) = (level-1) * 25` → 0%, +25%, +50%, +75%, +100%

**Análise**: combo é elegante porque acopla múltiplos check-ins ao mesmo dia
(reforça hábito-de-momento) sem penalty se você não conseguir 5/dia. Mas combo
level 5 (4 check-ins próximos) é fácil — usuário casual provavelmente sempre
tá nele. Vira "constante" psicológica em vez de "carrot".

### 6.5 Mystery box (gambling-lite)

5 drops uniforme + 100c+1💎 (raro):
- 30c, 50c, 75c, 100c, 100c+1💎

**Problema**: sem pity timer. Usuário pode abrir 50 caixas e nunca ver gem.
Comparativo: gacha clássico (Genshin, Diablo) tem 50-pull pity, hard pity. Mascote
não tem.

**Severidade**: Média. Funciona ok como dopamine snack, mas perde força em
power users.

### 6.6 Wheel of fortune

8 fatias equiprobabilidade:
+5c, +10c, +30c, +50c, +75c, +100c, +1💎, +2💎

Sem opção paga (premium loot box) — explicitamente.

**Análise**: É honest gambling. Felipe está consciente da ética ali — caixa é
**diária**, não infinita; **gratuita**, não paga. Risco baixo de pattern adictivo.

### 6.7 Achievements (17 totais)

Por categoria:
- Check-in milestones (4): 1×, 10×, 50×, 200×
- Streak milestones (4): 7d, 14d, 30d, 100d
- Level milestones (3): Nv5, Nv10, Nv20
- Habit variety (2): 5 hábitos, all 9
- Social/chat (1): 20 messages
- Missions (1): 10 completed
- Longevity (2): 1 mês, 1 ano

**Reward**: apenas cosmético (emoji badge). **Nenhuma moeda extra**, nenhum
unlock-de-feature. Só satisfação.

`★ Insight ─────────────────────────────────────`
17 achievements puramente cosméticos é **subutilização**. Pra public power-user,
achievements devem ter: (a) coin reward, (b) acessório exclusive, (c) DNA boost
condicional (trait raro), (d) ranking/leaderboard. Mascote tem só (d) explicitamente
desativado por filosofia.
`─────────────────────────────────────────────────`

---

## 7. Sistema do Mascote (DNA Procedural)

### 7.1 Anatomia do genoma

11 traits em [0.02, 0.98]:

| Gene | Range | Significado visual | Significado comportamental |
|---|---|---|---|
| empathy | [0.02, 0.98] | Tamanho dos olhos, inclinação da cabeça | Quanto observa user |
| curiosity | [0.02, 0.98] | Velocidade eye-track, dilatação pupila, antenas | Reativo a estímulos |
| creativity | [0.02, 0.98] | Tentáculos, padrões exóticos, partículas | Mutação visual |
| discipline | [0.02, 0.98] | Simetria, postura ereta, brilho refinado | Calmaria visual |
| chaos | [0.02, 0.98] | Assimetria, deformações, número de membros | Imprevisibilidade |
| aggression | [0.02, 0.98] | Espinhos, ângulos, postura defensiva | Contorno definido |
| resilience | [0.02, 0.98] | Densidade corporal, robustez, base larga | Tolerância a pausa |
| emotionalDepth | [0.02, 0.98] | Expressividade, mudanças de cor com humor | Sensibilidade |
| socialEnergy | [0.02, 0.98] | Aura, calor da paleta, abertura corporal | Volume da aura |
| adaptability | [0.02, 0.98] | Fluidez, transições suaves | Movimento entre estados |
| intelligence | [0.02, 0.98] | Proporção crânio, brilho dos olhos | Observação antes ação |

Cada gene afeta **múltiplas dimensões** simultâneamente — morfologia, cor,
animação, comportamento. Isso é **biological pleiotropy** simulada.

### 7.2 PRNG: mulberry32

Determinismo absoluto via [mulberry32(seed)](../app/mobile/src/lib/dna/genome.ts:75-86).
Mesmo seed → mesma sequência de RNG → mesmo genoma. **Garante** que o usuário
sempre vê *o mesmo* mascote dele em qualquer device, sem precisar sincronizar
o genoma — só o seed (4 bytes).

Seed do user_id = FNV-1a hash do `profile.id`:
```ts
let seed = 0x811c9dc5;
for (let i = 0; i < uid.length; i++) {
  seed ^= uid.charCodeAt(i);
  seed = Math.imul(seed, 0x01000193);
}
```

Por que isso importa: criatura é **portável** sem o DNA precisar viajar pela rede.

### 7.3 Variação procedural (presets + variance)

4 personalidades-preset (Bipo/Zip/Lulu/Aro) com perfis genéticos distintos:

| Personality | Empatia | Disciplina | Caos | Inteligência |
|---|---|---|---|---|
| Bipo (Calmo) | 0.82 | 0.70 | 0.15 | 0.62 |
| Zip (Motivador) | 0.65 | 0.55 | 0.40 | 0.65 |
| Lulu (Fofo) | 0.95 | 0.40 | 0.22 | 0.50 |
| Aro (Sábio) | 0.75 | 0.82 | 0.18 | 0.95 |

`genomeFromPreset(seed, preset, variance=0.1)` aplica `(rng() - 0.5) * 2 * variance`
em cada gene. **Variance default 0.1** = cada gene varia ±0.1 em torno do preset.

**Resultado**: 1 milhão de usuários do mesmo preset → 1 milhão de Bipos
**distintamente diferentes**. Não é skin diferente; é DNA diferente que produz
morfologia, paleta, animação distintas.

### 7.4 Pipeline DNA → renderer

```
Genome (11 floats)
   ↓
   ├→ paletteFromGenome → Palette {body, accent, glow} (HSL)
   │   hue = creativity*280 + empathy*80 + chaos*60
   │   sat = 35 + socialEnergy*50 + emotionalDepth*15
   │   light = 45 + resilience*18 - aggression*8
   │
   ├→ morphologyFromGenome → 33 params
   │   limbCount = floor(creativity*3 + chaos*2)
   │   hasTail = creativity >= 0.4
   │   hasSpikes = aggression >= 0.55
   │   hasAntennae = curiosity >= 0.55
   │
   ├→ moodToLegacy → MascotMood ('exausto'..'empolgado')
   │
   ├→ behaviorTraits → human-readable strings
   │
   └→ Mascot3D (R3F Canvas)
       ├→ Body (icosahedron + procedural displacement)
       ├→ Eyes (pupil + highlight, eye-tracking via PanResponder)
       ├→ Limbs (opcional, count from DNA)
       ├→ Spikes (opcional, aggression)
       ├→ Antennae (opcional, curiosity)
       ├→ Tail (opcional, creativity)
       └→ Aura (particle system, socialEnergy + creativity)
```

Validado via Playwright: canvas 224×224 WebGL2, 33.7% pixels coloridos em paleta
lilás coerente.

### 7.5 Decay temporal não-punitivo

`applyDecay(genome, days, strength=0.0008)` em [habitToGene.ts:93-115](../app/mobile/src/lib/dna/habitToGene.ts):
- v > 0.5: cai em direção a 0.5, **nunca cruza** (Math.max(0.5, v-delta))
- v < 0.5: sobe em direção a 0.5, **nunca cruza** (Math.min(0.5, v+delta))
- v == 0.5: ponto fixo

Inviolante de "sem culpa" + invariante de "média central como atrator".

### 7.6 O que falta (gaps vs visão)

- **Animação procedural** ❌ — Mascot3D renderiza estático. Não pisca, não respira,
  não acompanha toque.
- **Morph contínuo** ❌ — morfologia recalcula a cada render mas não interpola
  entre estados (blend shapes / morph targets).
- **Voz** ❌ — zero áudio.
- **Mutações condicionais** ❌ — não há "30 dias de exercise → braços
  musculosos". Drift gradual existe, salto morfológico não.

---

## 8. Evolução Procedural

### 8.1 Estado atual: linear

[Evolution tab](../app/mobile/app/(tabs)/evolution.tsx) mostra:
```
Ovo (0) → Bebê (100) → Criança (500) → Adolescente (2000) → Adulto (8000) → Forma Rara (25000)
```

**Isso contradiz o brief DLI explicitamente**:
> "A evolução NÃO deve ser: bebê > criança > adulto. Isso é ultrapassado."

A tela renderiza Mascot3D, mas o **paradigma de progressão é linear-discreto** —
estilo Tamagotchi 1997. O DNA subjacente PERMITE evolução contínua, mas:
- Não há UI que mostre genes mudando
- Não há "linha de tempo" de mudanças morfológicas
- Não há "mutation unlock" condicional

### 8.2 O que JÁ existe e pode escalar

- `dominantChange(prev, next)` em [habitToGene.ts:126-142](../app/mobile/src/lib/dna/habitToGene.ts)
  — retorna gene que mais mudou. Já gera narrativa via `tellDnaStory` em
  [stories.ts:95-112](../app/mobile/src/lib/dna/stories.ts).
- `morphologySummary(g)` em [morphology.ts:129-144](../app/mobile/src/lib/dna/morphology.ts)
  — gera ["cauda segmentada", "antenas luminescentes", "olhos grandes"]
- `emergentMaturity(g)` — derived "fase orgânica" 0-1 baseada em soma de genes
  que crescem naturalmente.

A **base existe**. Falta o **viewer procedural** na UI.

### 8.3 O que falta pra Spore-tier

| Feature | Existe? | Gap |
|---|---|---|
| Genoma editável por drift | ✅ | — |
| Paleta procedural | ✅ | — |
| Morfologia procedural | ✅ | Renderer não usa todos params (não tem antena, tail visíveis) |
| Mutation unlocks condicionais | ❌ | Falta sistema de "milestones biológicos" |
| Blend shape interpolation | ❌ | Mascot3D recria geometry, sem morph target |
| Visualização da árvore evolutiva | ❌ | — |
| Time-of-day morph (dia/noite) | ❌ | — |
| Mood-driven posture | ❌ | — |

### 8.4 Visão de evolução procedural infinita

O brief pede "Spore + Pokémon + Digimon + No Man's Sky". Como chegar lá:

1. **Substituir Evolution screen** por timeline procedural: mostra genes em barras,
   highlights mudanças recentes, gera narrativa por delta.
2. **Mutation system**: a cada X dias com gene > threshold, **desbloqueia structural
   variant** (3 versões da forma de cauda, 5 padrões de espinho, etc.). Variant
   é deterministic via seed mas só "ativada" após milestone.
3. **Morph target system**: definir 8-12 "extremos" de forma (long-neck, broad-base,
   spike-heavy, ethereal) e fazer `morphology.ts` retornar **pesos de blend** em
   vez de params discretos. Renderer interpola.
4. **Time-of-day morph**: à noite, criatura encolhe + olhos meio-fechados (DNA
   modifier). Manhã: estica + olhos brilhantes.
5. **Mood-driven posture**: low socialEnergy → cabeça baixa; high → ereta.

Esforço: **3-4 semanas pra mutation system**, **1-2 semanas pra morph target**,
**1 semana pra time-of-day**. ~6 semanas total = DLI-3 no roadmap principal.

---

## 9. Sistema de IA

### 9.1 Arquitetura em 4 camadas

```
USER MESSAGE
     ↓
┌─ LAYER 1: Input Safety Classifier ──────────────────┐
│  classifySafetyEnsemble:                            │
│    • Regex (classifyInput) — fast, deterministic    │
│    • Sentiment (analyzeSentiment) — score [-1,+1]   │
│    • Naive Bayes (70 train examples)                │
│    Fusion: max severity                              │
│  Output: 'safe' | 'watch' | 'high' | 'critical'      │
└─────────────────────────────────────────────────────┘
     ↓
┌─ LAYER 2: Routing ──────────────────────────────────┐
│  if 'critical' → CRISIS_REPLY (CVV 188 + CAPS)      │
│  if 'high'     → CRISIS_REPLY                       │
│  if 'watch'+clinical self-statement → DIAGNOSIS_RD  │
│  if detectAttachment → ATTACHMENT_REPLY             │
└─────────────────────────────────────────────────────┘
     ↓ (passou)
┌─ LAYER 3: Memory Recall ────────────────────────────┐
│  recall(userId, msg, 3) →                           │
│    if OpenAI key: embed semantic + cosine          │
│    else: TF-IDF local + keyword overlap            │
│  Re-score: similarity × recency × kindWeight       │
└─────────────────────────────────────────────────────┘
     ↓
┌─ LAYER 4a: OpenAI (if key present) ─────────────────┐
│  systemPrompt + history(6 msgs) + memories         │
│  POST api.openai.com/v1/chat/completions           │
│  Model: gpt-4o-mini, temp 0.7, max_tokens 100      │
│  Timeout: 15s with AbortController                 │
│    ↓                                                │
│  classifyOutput → block clinical/medical            │
│    ↓                                                │
│  reply OR SAFE_FALLBACK                             │
└─────────────────────────────────────────────────────┘
     ↓ (no key or error)
┌─ LAYER 4b: Mock Reply ──────────────────────────────┐
│  classifyIntent(message) → maps to intent           │
│  mockReply(personality, intent, mascotName) →       │
│    pool por personality × intent                    │
└─────────────────────────────────────────────────────┘
     ↓
RESPONSE → persist as Message row (with safety_flag)
```

### 9.2 Insights da safety

#### 9.2.1 Critical patterns

Captura ideação suicida direta:
- `/\bsuic[ií]d/i`, `/me\s+matar/i`, `/matar\s+me/i`
- `/n[ãa]o\s+quero\s+mais\s+viver/i`, `/acabar\s+com\s+tudo/i`
- `/sumir\s+desse\s+mundo/i`, `/me\s+cortar/i`, `/me\s+machucar/i`
- `/\boverdose\b/i`, `/enforcar/i`, `/pular\s+da\s+janela/i`

11 patterns, cobertura boa. Validado em Playwright: "quero me matar" → CRISIS_REPLY.

#### 9.2.2 High patterns (recém-roteado pra CRISIS_REPLY também)

- pânico, crise, desespero, sem saída, sem solução, sem esperança
- pensamento ruim/intrusivo, tô surtando, quero desaparecer

`★ Insight ─────────────────────────────────────`
Antes desta sessão, `high` caía em mock genérico — **bug crítico** que comprometia
segurança. Fixado: trata como CRISIS_REPLY com referências profissionais. Custo:
falsos positivos (user diz "tô surtando de feliz") recebem CVV. Aceitável porque
"better safe than sorry" — usuario pode ignorar a info de CVV se for falso positivo;
faltar info quando precisa é dano real.
`─────────────────────────────────────────────────`

#### 9.2.3 Watch patterns

depressão, ansiedade, TDAH, bipolar, transtorno, diagnóstico, medicamento, remédio,
psicólogo, psiquiatra, terapia, terapeuta, trauma.

Recém-ampliado para incluir variações ("tenho depressão", "minha ansiedade")
que a regex anterior perdia. 13 testes novos travam regressão.

#### 9.2.4 Output classifier (badOutputPatterns)

Bloqueia respostas que tentem:
- Diagnose direto ("você tem depressão", "seu diagnóstico")
- Probabilístico ("parece que você tem", "indica X")
- Sintoma clássico ("sintomas clássicos de X")
- Receita ("prescreve", "tratamento recomendado")
- Medicação ("antidepressivo", "fluoxetina", "rivotril")
- Linguagem clínica ("quadro clínico", "quadro depressivo")

Se OpenAI escapar do system prompt e tentar diagnosticar, **é bloqueado**.
SAFE_FALLBACK enviado em vez.

### 9.3 System prompt — análise

[ai.ts:189-207](../app/mobile/src/lib/ai.ts):

```
Você é um companheiro digital de autocuidado em PT-BR, chamado {mascotName}.

REGRAS INVIOLÁVEIS:
- Wellness, NUNCA terapia, diagnóstico ou cura.
- NUNCA use: "depressão", "ansiedade clínica", "transtorno", "diagnóstico",
  "tratamento", "trauma", "TDAH".
- Use: "se cuidar", "rotina", "energia", "humor", "respirar", "pausa".
- Máximo 2 frases. NUNCA mais que 30 palavras.
- Sem markdown, sem listas, sem links.
- Lembre do contexto da conversa, mas seja breve.

PERSONALIDADE: {flavor[personality]}

COISAS QUE VOCÊ JÁ SABE DELE/DELA (use SE FOR RELEVANTE, sem forçar):
{memories formatted}
```

**Crítica positiva**:
- Constraint explícito de tamanho (2 frases, 30 palavras)
- Lista negra léxica explícita
- Lista branca léxica explícita (positivização)
- Memory injection seletiva
- Personality flavor per role

**Risco**: GPT-4o-mini pode "alucinar" e ignorar instruções em corner cases. A
mitigação correta é o output classifier (camada 2).

### 9.4 Mock reply (sem OpenAI)

Em [src/content/replies.ts](../app/mobile/src/content/replies.ts) (não lido em
detalhe, mas inferido pelo `classifyIntent + mockReply`): pools por personalidade
× intent. Determinístico. Validado em Playwright: "ola bipo" → "Tá tudo no seu
tempo aqui."

Limitação: mock é estático. Não tem memória, não tem contexto temporal, não
acompanha humor real. Para fluxo gratuito (sem OpenAI), é "barba parada" — o
usuário percebe rápido que é prefab.

### 9.5 BYOK + privacy gap

Chave OpenAI em SecureStore. **Mas no web**, SecureStore não existe — fallback
para AsyncStorage não-criptografado ([secureStore.ts:22-32](../app/mobile/src/lib/secureStore.ts)):

> "Web: SecureStore não existe — usa AsyncStorage como melhor esforço.
> Aviso explícito: dados no localStorage do navegador NÃO são criptografados."

UI não enfatiza isso na hora do plug-in. **P1 a fixar**: aviso visual no settings
quando user plugar chave em web.

---

## 10. Sistema de Memória Emocional

### 10.1 Arquitetura

[memory.ts (~348 LOC)](../app/mobile/src/lib/memory.ts):

```
USER MESSAGE
     ↓
extractMemories(message) — 7 regex patterns (event, feeling, person, preference, fact)
     ↓
[ MemoryItem { id, userId, kind, summary, source_snippet, keywords, occurred_at } ]
     ↓
Persist em AsyncStorage table 'memories' (cap 200, FIFO)
     ↓
[Quando chat dispara]
     ↓
recall(userId, context_msg, limit=3):
   1. VectorStore search (if has data):
      - embed(context) → 1536d (OpenAI) ou 256d (TF-IDF local)
      - cosine similarity
      - re-score: sim × recency(1/(1+days/30)) × kindWeight(event=1.5)
   2. Fallback: keyword overlap on memory.keywords
     ↓
Top 3 memories → injected em systemPrompt
```

### 10.2 Análise técnica

**O que tem**:
- Hybrid embedding (OpenAI 1536d ou TF-IDF local 256d)
- Cosine similarity com brute-force in-memory
- Recency decay graceful (50% peso em 30 dias)
- Kind weighting (event > fact > feeling)
- VectorStore com FIFO eviction (1000 records cap)
- Lazy load + race-safe (`loadingPromise`)

**O que falta** (vs visão DLI):
- **Não é graph** — é flat list. Não relaciona "depois de prova, sempre ansioso"
- **Sem importance scoring evolutivo** — fixo por kind + age
- **Sem extração de entidades** — "meu irmão Lucas" → pessoa=undefined
- **Sem decay real** — só downweight; memórias velhas continuam buscáveis
- **Sem clustering temporal** — "eventos da última semana" não tem boost extra
- **Sem "moment marcante"** — primeira menção de algo deveria pesar mais

### 10.3 Embedding paywall escondido

```
detectMode({ apiKey }): 'openai' | 'local'
  → apiKey? 'openai' : 'local'
```

User sem chave OpenAI: usa TF-IDF 256d local. Funciona pra keywords mas **perde
nuances semânticas**.

User com chave: semantic recall real.

**Problema UX**: nenhuma comunicação disso na UI. Usuário free não sabe que tem
memory "degradada".

### 10.4 Dim mismatch silencioso

Se user pluga chave OpenAI, embed cria 1536d. Desplugar → modo cai pra TF-IDF
256d. VectorStore tenta search, dim mismatch → **silenciosamente pula todos
os registros antigos** (sem log, sem reindex).

**Bug latente P2** — não causa crash, mas usuário perde toda memória ao
desplugar chave.

### 10.5 Proactive system

[proactive.ts (~258 LOC)](../app/mobile/src/lib/proactive.ts):

5 triggers com cooldown:
1. `no_water_3d` (3 dias sem água, 48h cooldown)
2. `low_sleep_pattern` (3+ noites <6h em 7d, 72h)
3. `quiet_chat_7d` (7d sem mensagem, 14d)
4. `recent_sad_streak` (3 tristezas seguidas, 48h)
5. `first_week_complete` (5+ dias com check-in, 365d — uma vez)

Dispara notification in-app. Sem push, ninguém vê.

### 10.6 Insights system

[insights.ts (~283 LOC)](../app/mobile/src/lib/insights.ts):

- **Habit-vibe correlation** — agrupa dias com/sem hábito vs vibe
- **Markov chains** — sequências de hábitos diárias
- **K-means clustering** — auto-k via `autoK(features)`
- **Anomaly detection** — dias atípicos
- **EMA trend** — direção de humor

**Crítica**: tudo observacional, não causal. Não controla confundidores (fim de
semana, sazonalidade). Sem lagged correlation.

`★ Insight ─────────────────────────────────────`
A presença de Markov + K-means + EMA em um app mobile RN é **inusitada**. A
maioria dos apps consumer faz heurística simples. Felipe está construindo
infraestrutura analítica real. Subutilizada hoje (UI não expõe muito), mas o
substrato existe pra "insights premium" eventualmente.
`─────────────────────────────────────────────────`

---

# Parte III — Arquitetura Técnica

## 11. Arquitetura Técnica Geral

### 11.1 Mapa de macro

```
┌──────────────────────────────────────────────────────────┐
│                    DEVICE (iOS/Android/Web)              │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Expo Router (48 routes)                ││
│  │  app/                                               ││
│  │    onboarding/* (6 screens)                         ││
│  │    (tabs)/index, chat, evolution, report           ││
│  │    paywall, subscription, settings, closet         ││
│  │    safety, breathe, safe-night, ...                ││
│  └────────────────────┬────────────────────────────────┘│
│                       │                                  │
│                       ↓                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │           Zustand Store (src/store.ts)              ││
│  │  profile, mascot, streak, settings, wallet,        ││
│  │  openAiKey, toastQueue                              ││
│  └────────────────────┬────────────────────────────────┘│
│                       │                                  │
│       ┌───────────────┼───────────────┐                 │
│       ↓               ↓               ↓                 │
│  ┌─────────┐     ┌─────────┐    ┌──────────┐           │
│  │  Logic  │     │   AI    │    │   DNA    │           │
│  │   lib/  │     │         │    │  lib/dna/│           │
│  │ checkin │     │ ai.ts   │    │ genome   │           │
│  │ xp.ts   │     │ memory  │    │ palette  │           │
│  │ streak  │     │ safety  │    │ morpho   │           │
│  │ unlock  │     │ ml/*    │    │ mood     │           │
│  └────┬────┘     └────┬────┘    └────┬─────┘           │
│       │               │              │                  │
│       └───────────────┼──────────────┘                  │
│                       ↓                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │         AsyncStorage (16 tables, ~JSON)             ││
│  │  profiles, mascots, checkins, missions, streaks,   ││
│  │  messages, xp_events, accessories, scenes,         ││
│  │  settings, achievements, notifications, wallet,    ││
│  │  daily_reward, mystery_box, combo, _meta            ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │              SecureStore (mobile only)              ││
│  │            openai_key + future tokens               ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
        │                                          ↑
        │ (BYOK opcional)                          │ (mock fallback)
        ↓                                          │
   ┌──────────────────────┐                       │
   │   OpenAI API         │                       │
   │   gpt-4o-mini        │ ──────────────────────┘
   │   text-embedding-3-s │
   └──────────────────────┘
```

### 11.2 Decisões arquiteturais notáveis

| Decisão | Why | Trade-off |
|---|---|---|
| **Expo Router** vs React Navigation | Convention-over-config, file-based, web support | Lock-in com Expo |
| **Zustand** vs Redux | Menor boilerplate, ergonômico | Sem time-travel debugging |
| **AsyncStorage** vs SQLite | Setup zero, JSON simples | Não escala >10k rows por tabela |
| **R3F + three.js** vs Skia/Lottie | 3D real, infinite cosmetic | +1MB bundle, complexity |
| **OpenAI BYOK** vs backend | Zero infra cost, privacy-first | Pior UX (user precisa de chave) |
| **TypeScript strict** | Type safety AAA | Slower dev (compensa long-term) |
| **Vitest** + jsdom | Fast, modern, ESM | Não roda native code (esperado) |
| **TF-IDF local fallback** | Memory recall sem OpenAI | Pior recall qualitativo |

### 11.3 Princípios de design observados

- **Type safety primeiro**: 0 erros TS, 1509 testes verde, coverage 98%+
- **Defensive guards everywhere**: `Number.isFinite`, `clampGene`, `sanitizeGenome`
- **Idempotency keys**: `${profile.id}-${date}-${kind}-${value}-${dailyXpSoFar}` em checkin
- **Per-table locks**: `withLock(table, fn)` previne race conditions
- **Pure functions onde possível**: DNA pipeline é todo puro (testável)
- **Migration versioning**: schema v2 com path forward documentado
- **Cross-platform from day 1**: web bundling funciona

---

## 12. Arquitetura Mobile (RN+Expo)

### 12.1 Stack

```json
{
  "expo": "~51.0.28",
  "react-native": "0.74.5",
  "react": "18.2.0",
  "typescript": "~5.3.3",
  "expo-router": "~3.5.23",
  "zustand": "^4.5.5",
  "three": "^0.166.1",
  "@react-three/fiber": "^8.17.10",
  "expo-gl": "~14.0.2",
  "expo-three": "^7.0.0",
  "react-native-svg": "15.2.0",
  "react-native-reanimated": "~3.10.1",
  "react-native-gesture-handler": "~2.16.1",
  "@react-native-async-storage/async-storage": "1.23.1",
  "expo-secure-store": "~13.0.2"
}
```

### 12.2 File structure

```
app/mobile/
├── app/                        # expo-router routes (48 files)
│   ├── _layout.tsx             # root layout — hydrates store, loads fonts
│   ├── index.tsx               # splash redirect
│   ├── splash.tsx
│   ├── signup.tsx
│   ├── onboarding/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── age.tsx
│   │   ├── goal.tsx (combined goal+mood)
│   │   ├── mascot.tsx (combined pick+meet)
│   │   ├── name.tsx
│   │   ├── notice.tsx (combined notice+push)
│   │   └── (quiz.tsx, mood.tsx, meet.tsx, personality.tsx — aliases)
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Home
│   │   ├── chat.tsx
│   │   ├── evolution.tsx
│   │   └── report.tsx
│   ├── paywall.tsx
│   ├── subscription.tsx
│   ├── settings.tsx
│   ├── closet.tsx
│   ├── safety.tsx
│   ├── breathe.tsx             # fullScreenModal
│   ├── safe-night.tsx          # fullScreenModal
│   └── (~20 more screens)
├── src/
│   ├── components/             # 38 reusables (~6,200 LOC)
│   ├── content/                # static catalogs (accessories, scenes, missions, safety)
│   ├── lib/                    # business logic (~15 modules)
│   │   ├── db.ts               # 1200 LOC AsyncStorage wrapper
│   │   ├── checkin.ts          # transaction pipeline
│   │   ├── ai.ts               # AI orchestration
│   │   ├── memory.ts           # memory recall
│   │   ├── dna/                # 8 files — procedural creature
│   │   ├── ml/                 # safety classifier + embeddings
│   │   ├── themes.ts           # design tokens
│   │   └── ...
│   ├── store.ts                # Zustand
│   └── types.ts                # 22 entities
├── tests/                      # 78 files, 1509 tests
│   ├── lib/dna/                # DNA-specific
│   ├── security/               # pentest-like (privacy, migration)
│   ├── components-*.test.tsx   # render tests
│   └── ...
└── .maestro/                   # E2E flows (8 yml)
```

### 12.3 Performance gotchas (do agent report)

#### 12.3.1 AsyncStorage full-table reads

Cada `checkins.list()` desserializa **toda a tabela JSON em memória**, filtra em
loop. Em 5 anos com 1-2 check-ins/dia = ~3000 rows. JSON parse + filter ~50ms
em Moto G4. **Sem índice**. Aceitável agora, **mata em escala**.

#### 12.3.2 Zustand re-render

Boa parte do código usa selectors (`useStore(s => s.mascot)`). Boa prática. Mas
alguns lugares fazem `useStore()` sem selector — re-render cascade.

#### 12.3.3 Three.js useFrame

Mascot3D recalcula geometry no useMemo([dna]) — bom. Mas useFrame roda a 60fps
em UI thread. Operações trig (sin/cos) por frame são cheap, mas em low-end
device + outros React updates concorrentes = jank possível.

### 12.4 Bundle size

- `three@0.166`: ~600KB tree-shaken (gzipped ~150KB)
- `@react-three/fiber`: ~200KB (gzipped ~60KB)
- `react-native-reanimated`: ~100KB
- `react-native-svg`: ~80KB
- 4 custom Google Fonts (loaded async, fade-in)
- **Total runtime**: ~2-3MB JS estimado (não medido oficialmente)

Sem code splitting / lazy loading no router. Tudo bundlado num único bundle.
Não testou bundle analysis (não há `expo-doctor --bundle` integrado).

### 12.5 Quality marks

- **Typecheck**: 0 errors
- **Tests**: 1509/1509, coverage 98%+
- **Linter**: implícito via TS strict
- **Maestro E2E**: 8 flows (onboarding, checkin, chat-crisis, chat-safe, config,
  dynamic-text, paywall, settings-export)

---

## 13. Arquitetura Backend

### 13.1 Estado atual: **inexistente**

- **Supabase**: nada. `src/lib/supabase.ts` não existe. `app.json` zero referência.
- **Firebase**: nada.
- **Custom backend**: nada.
- **CDN**: nada.
- **CI/CD**: GitHub Actions roda Maestro em PR. **Não há build EAS** (`eas.json`
  ausente).

O auto-memory dizia "RN+Expo+Supabase+OpenAI" — Supabase está **planejado, não
ativado**.

### 13.2 Implicações

**Bugs latentes que vão acontecer quando user real chegar**:

1. **Reinstalar app = perda total**. Não há cloud backup. Export/import existe
   mas é manual e o usuário não vai usar proativamente.
2. **Multi-device impossível**. User troca celular → mascote nasce de novo.
3. **Sem analytics**. Felipe não vai saber quantos check-ins, qual tela faz user
   abandonar, qual personalidade é mais popular. Voa cego.
4. **Sem push notifications**. Proactive triggers gravam notif in-app que ninguém
   vê. Reengagement = 0.
5. **Sem A/B test**. Não dá pra testar variantes de paywall, onboarding, etc.
6. **Sem leaderboards / social**. Não há onde guardar dados de outros usuários.
7. **Sem suporte ao cliente**. Não há canal pra user reportar bug.

### 13.3 O que seria backend mínimo

Pra MVP-com-backend (não AAA, mínimo viável):

```
Supabase ou Firebase:
  - Auth (anônimo OK pra MVP, evolui pra magic link)
  - Tabela `users` espelho do profile local
  - Tabela `mascot_snapshots` (export periódico do AsyncStorage)
  - Tabela `events` (checkin agregado, level_up, paywall_view)
  - Edge Function `proactive-push` que roda diariamente
  - Storage de screenshots se compartilhar progresso
```

Custo: ~US$25/mês Supabase free tier cobre primeiros 500 users + 500MB DB.
Esforço: 1-2 semanas pra setup + integração + migration path.

### 13.4 Decisão estratégica

Felipe escolheu local-first conscientemente. **Não é negligência**, é uma postura.
A questão é: **quando ativar backend?**

Recomendação: assim que tiver D7 retention ≥ 20% (sinal de product-market fit
parcial). Antes disso, backend é custo sem proporção de aprendizado.

---

## 14. Sistema de Persistência

### 14.1 db.ts — anatomia

[db.ts (~1163 LOC)](../app/mobile/src/lib/db.ts) é a camada de persistência única.

**Tabelas**: 16 + 1 meta (`_meta`)

**API pattern**: cada tabela tem objeto com métodos (get, list, upsert, add, remove)
e usa `withLock(table, fn)` pra operações write.

**Operações típicas**:
- `read<T>(table)`: getItem → JSON.parse → return array
- `write<T>(table, rows)`: setItem(JSON.stringify(rows))
- `withLock(table, fn)`: chained promise per-table

### 14.2 Migrations

Schema versioning explícito:

```typescript
export const CURRENT_SCHEMA_VERSION = 2;

const SCHEMA_MIGRATIONS: readonly Migration[] = [
  // 0 → 1: normaliza scenes.id legado 'quarto' → 'room'
  async (readT, writeT) => { /* ... */ },
  // 1 → 2: adiciona DNA a cada mascot existente
  async (readT, writeT) => { /* ... */ },
];

export async function runMigrations(): Promise<DbMeta> {
  let current = (await readMeta()).schema;
  while (current < CURRENT_SCHEMA_VERSION) {
    await SCHEMA_MIGRATIONS[current]?.(readAny, writeAny);
    current += 1;
  }
  await writeMeta({ schema: current, migrated_at: new Date().toISOString() });
}
```

**Maturidade**: alta. Tem testes de pentest em `tests/security/dna-migration.test.ts`
(6 cenários adversos: corrupted DNA, missing personality, missing user_id, empty,
re-run idempotent, foreign columns preserved).

### 14.3 Lock primitive

```typescript
const tableLocks = new Map<string, Promise<unknown>>();

export async function withLock<T>(table: string, fn: () => Promise<T>): Promise<T> {
  const prev = tableLocks.get(table) ?? Promise.resolve();
  const result = prev.then(fn, fn);
  const tail = result.catch(() => undefined);
  tableLocks.set(table, tail);
  try {
    return await result;
  } finally {
    if (tableLocks.get(table) === tail) {
      tableLocks.delete(table);
    }
  }
}
```

Chain `.then(fn, fn)` garante que fn roda mesmo se anterior rejeitou. Tail
cleanup ao final.

**Bugs evitados** por isso:
- Double-spend de XP em taps paralelos
- Race em mission completion
- Storage corruption em writes concorrentes

`★ Insight ─────────────────────────────────────`
Esse pattern de lock per-table em AsyncStorage é **incomum** em apps RN — a maioria
ignora race conditions ou usa Promise.all e reza. Mascote tem isso testado
explicitamente, com comentários explicando o cenário. É qualidade Supercell-tier.
`─────────────────────────────────────────────────`

### 14.4 Limitações conhecidas

- **Sem transação atômica entre tabelas**. Se checkin write falha mid-pipeline,
  XP pode ter sido aplicado mas wallet não. Compensação via idempotency_key
  parcial.
- **Sem índices**. Filtros são O(n).
- **Sem compaction**. JSON grande cresce indefinidamente.
- **Sem encryption-at-rest** em web (SecureStore só funciona mobile).

---

## 15. Performance

### 15.1 Cenários medidos (Playwright)

- Bundle inicial web: 12.5s (cache vazio), 1246 módulos
- Splash → Home: ~2-3s após signup completo
- Tap check-in → toast: ~200-400ms (write + animation)
- Switch tab: ~50-100ms
- Mascot3D canvas: 224×224, WebGL2, 33.7% pixels coloridos no 1º frame
- Console: **0 erros**, 2 warnings (require cycle [fixado], pointerEvents [upstream])

### 15.2 Pontos quentes de CPU

| Hotspot | Frequência | Custo estimado |
|---|---|---|
| `JSON.parse` em `read('checkins')` | Cada Home render | 50-100ms quando >1000 rows |
| `morphologyFromGenome` | Re-render Mascot3D | <1ms (puro) |
| `paletteFromGenome` | Mesma | <1ms |
| `mulberry32` loop | DNA generation | ~2ms para 11 genes |
| `applyHabitDrift` | Cada check-in | <1ms |
| Icosahedron geometry | Mascot3D mount | ~10-20ms |
| Particle aura | Mascot3D frame | 1-3ms per frame |
| Reanimated worklets | Cada animação | UI thread, ~1ms each |

### 15.3 Otimizações possíveis

1. **Indexar checkins por data**: separar JSON em chunks por mês (`checkins:2026-05`).
   Reduz parse de O(n) histórico pra O(currentMonth).
2. **Web Worker pra DNA generation**: out-of-thread. Não crítico hoje (DNA muda
   raramente), mas em DLI futuro (morph contínuo) será.
3. **Lazy-load Mascot3D**: já é via Mascot.tsx wrapper (decide 2D/3D). Mas o
   bundle inclui R3F sempre. Code splitting via Metro config seria pra real win.
4. **Memoize Mascot3D scene graph**: já memoiza geometry; pode memoizar mais
   parts.

### 15.4 Memory footprint

- Bundle JS: ~2-3MB
- Zustand store: ~50KB típico
- AsyncStorage: ~100KB-1MB (cresce com checkins/messages)
- VectorStore: até 1000 records × 256-1536 floats = 1-6MB RAM
- Mascot3D scene: ~5-10MB GPU memory (textures + geometry)

Total típico em uso ativo: 30-50MB. Aceitável.

### 15.5 Benchmarks que faltam

- **Frame rate sustainable em low-end** (Moto G4, iPhone 6s)
- **Cold start time real** (Splash → Home interactivo) em device físico
- **Memory leaks** após 1h de navegação
- **Battery drain** com Mascot3D rodando ambient anim
- **AsyncStorage write throughput**

Sem device farm, isso é hipotético. Necessário antes de scale.

---

## 16. Escalabilidade

### 16.1 Pontos de quebra previstos

| Pressão | Quebra em | Mitigação |
|---|---|---|
| User base > 100 | Sem backend, sem analytics, voa cego | Supabase + PostHog |
| User base > 1k | Sem suporte (sem channel) | Discord + Notion FAQ |
| User base > 10k | Sem A/B test, sem segmentação | Statsig / Optimizely / homegrown |
| Power user 2+ anos | 10k+ check-ins, AsyncStorage degrada | Indexed storage / SQLite |
| Mascot3D em iPhone 6s | 60fps inviável | Quality tier (current logic supports) |
| Multi-device user | Mascot duplicado | Backend sync |
| Power user com 200+ memories | VectorStore search degrada | Indexed embedding (HNSW) |

### 16.2 Sinais positivos

- **Idempotency** em checkin permite retry sem prejuízo
- **withLock** evita corruption em concorrência
- **Migration versioning** permite evoluir schema
- **Hybrid embedding** (OpenAI/local) já tem fallback
- **2D fallback** pra device fraco

### 16.3 Sinais negativos

- **Tudo em uma tabela JSON gigante** — não escala >10k rows
- **Sem rate limit** em qualquer operação
- **Sem retry queue** se OpenAI falha
- **Sem feature flags** pra rollback parcial

### 16.4 Roadmap de escala

Marcos sugeridos:
- **100 users**: ativar Supabase Auth + events table
- **500 users**: PostHog ou Mixpanel pra retention real
- **1k users**: SQLite local pra performance
- **5k users**: HNSW pra embedding search; pruning de checkins
- **10k users**: EAS Build + Play Store / App Store real
- **50k users**: backend dedicado pra leaderboards/social
- **100k users**: refactor pra ECS architecture (per brief)

---

# Parte IV — Deep Tech

## 17. Procedural Generation

### 17.1 Status atual

Tudo procedural já existe em [src/lib/dna/](../app/mobile/src/lib/dna/):
- **Genome generation**: mulberry32 + clamp
- **Paleta**: HSL deterministic (hue/sat/light de combinações lineares de genes)
- **Morphology**: 33 params derivados linearmente
- **Mood**: positive-negative weighted sum
- **Stories**: dominant change → narrativa templated
- **Name generation**: `generateCreatureName` com soft/hard syllables baseado em DNA

### 17.2 O que falta

- **Procedural body generation** beyond icosahedron displacement
  - Inspiração: marching cubes, metaballs, signed distance fields
  - Permite formas exóticas que não cabem em "deformed sphere"
- **Procedural texture / pattern**
  - Manchas, listras, bioluminescência via shader
  - Three.js permite custom GLSL — não usado ainda
- **Procedural animation**
  - Walk cycle, idle, blink, eye-track sequenciados procedurally
  - Inverse Kinematics em limbs
- **Procedural sound**
  - Tone.js pra micro-vocalizações
  - Cada criatura tem "voz" diferente baseada no DNA

### 17.3 Spore vs Mascote (comparativo)

| Aspecto | Spore (2008) | Mascote (2026) |
|---|---|---|
| **Espaço genético** | Editor manual (~1000 partes) | 11 floats procedural |
| **Espaço observável** | Bilhões de criaturas distintas | ~10^33 (11^11 floats) |
| **Animation** | Procedural skeleton + IK | Estática hoje |
| **Sound** | Voz procedural | Sem som |
| **Behavior** | Tribe/civilization stages | Drift de gene não-punitivo |
| **Mood/expression** | Limited | Mood score + traits derivados |
| **Persistence** | Local + share cloud | Local |

Mascote tem **substrato genético comparável** (11 floats × variação procedural
= criaturas únicas suficientes). Falta o **layer expressivo** (animação + som +
behavior contextual).

---

## 18. Personalidade Dinâmica

### 18.1 Estado atual

Personalidade é **fixa por preset** (calmo/motivador/fofo/sábio) com variação
procedural por seed do user_id. Uma vez escolhido, **não evolui**:
- `flavor[personality]` em [ai.ts:197-202](../app/mobile/src/lib/ai.ts) é dict estático
- mock replies são pools por personality (não mudam com tempo/contexto)
- Não há "tom adaptado ao DNA" — usuário com socialEnergy alto continua falando
  como Calmo se escolheu Calmo

### 18.2 Visão (DLI-5)

A personalidade deveria:
- **Modulada pelo DNA atual**, não pelo preset original
  - Mesmo escolhendo Calmo, se socialEnergy drift até 0.85, mascote fala mais expansivo
- **Adaptada ao horário**: bom-dia vs boa-noite literal, tom mais calmo à noite
- **Adaptada à frequência**: "fazia 2 dias que você não aparecia" se gap > 36h
- **Adaptada ao humor recente**: 3 mensagens tristes seguidas → tom mais cuidadoso
- **Adaptada à evolução**: phase=ovo fala diferente de phase=evoluído (vocabulário,
  comprimento de frase)

### 18.3 Implementação proposta

```typescript
// systemPrompt: tone modifiers
function dynamicToneModifiers(ctx: {
  dna: Genome;
  hour: number;
  daysSinceLastChat: number;
  recentMoodTrend: 'rising' | 'falling' | 'stable';
  phase: MascotPhase;
}): string[] {
  const tones: string[] = [];
  if (ctx.hour >= 22 || ctx.hour < 6) tones.push('tom mais sussurrado, noturno');
  if (ctx.daysSinceLastChat > 2) tones.push(`acolhedor, sutil "fiquei aqui"`);
  if (ctx.recentMoodTrend === 'falling') tones.push('cuidado extra, menos energético');
  if (ctx.dna.socialEnergy > 0.8) tones.push('expansivo, mais palavras');
  if (ctx.dna.discipline > 0.8) tones.push('mais direto, menos floreio');
  return tones;
}
```

Injetado no system prompt como override do `flavor[personality]`.

**Esforço**: 3-5 dias. Risco baixo.

---

## 19. Emotional Computing

### 19.1 O que já existe

Mascote tem mais "emotional computing" que a maioria de apps similares:

1. **Mood derivation** ([mood.ts](../app/mobile/src/lib/dna/mood.ts)):
   - `moodScore(g) = (positive_genes - tense_genes*0.5 + 0.3) / 1.0`
   - Não interpreta humor do **user**, só estado da **criatura**
2. **Behavior traits** geradas: "inclina a cabeça quando você se aproxima"
3. **Sentiment analysis** local (analyzeSentiment em ml/safety/)
4. **Mood derivation from intent** em insights.ts: tristeza=-2, alegria=+2
5. **Reflective mood**: deriveReflectiveMood baseado em mensagens recentes

### 19.2 Limitações

- **Emotional computing é one-way**: app detecta mood do user mas mascot's
  emotional expression não muda em tempo real
- **Sem facial expression mapping**: mood vira label/numero, não vira blend shape
- **Sem voice prosody**: mock replies têm mesma "voz" em qualquer mood

### 19.3 Estado da arte que poderíamos atingir

Inspirado em research papers (não em apps consumer):

- **Multi-modal emotion**: text + (futuro) voice tone + (futuro) typing speed
- **Time-window mood**: mood é função de últimas N interações, não snapshot
- **Mascot's emotional contagion**: se user está triste consistentemente, mascot
  reflete (subtilmente — cor mais fria, postura curvada) — controlado pra não
  ser overwhelming
- **Recovery dynamics**: mascot expressa "alivio" quando user reporta melhora

### 19.4 Riscos éticos

Emotional computing pode virar manipulação:
- App que **detecta** vulnerabilidade pode **explorar**
- Mascote feliz quando user faz check-in → pode virar coerção sutil
- Tem que ter **opt-out claro** + **transparency report**

Mascote tem base ética sólida (anti-attachment, no diagnostic). Mas **emotional
computing avançado exige red team** antes de ship.

---

# Parte V — Design e UX

## 20. UX/UI

### 20.1 Fluxos principais (validados via Playwright)

#### Onboarding (6 telas, ~90 segundos)

1. **Welcome** — Hero illustration + 2 CTAs (Começar / Pular descobrimento)
2. **Signup** — Nome + email opcional
3. **Age** — 5 faixas (under16 bloqueado com mensagem gentil)
4. **Goal + Mood** — 7 goals + 5-emoji mood (combinados numa tela)
5. **Mascot pick + meet** — 4 cards de personalidade → 1 reveal com bubble
6. **Name + Notice + Push** — Nome do user + Nome do mascote → Aviso safety →
   Toggle push

**Crítica positiva**:
- Friction baixíssima (90s total)
- Idade bloqueia <16 com mensagem respeitosa
- Mood pergunta como user TÁ, não cobra
- Safety notice é forte e claro (CVV 188, SAMU 192, idade 16+)

**Crítica**:
- Display_name perguntado 2× (signup + name) — **fixado nesta sessão** via
  threading de URL param
- Tela `/notice` combina muita informação (safety + push toggle + agreement)
- Sem progress indicator "Passo X de 5" consistente em todas telas (existe em
  algumas, falta em outras)

#### Home (4-tab navigator: Home / Chat / Evolução / Relatório)

**Home** ([app/(tabs)/index.tsx](../app/mobile/app/(tabs)/index.tsx)):
- Greeting personalizado ("BOM DIA, Felipe")
- WalletPills (coins, gems, level)
- NotificationBell
- Mascot procedural (Mascot3D ou Mascot2D fallback) em SceneBackground
- XPBar + Energy bar
- DailyRewardStrip D1-D7 com resgatar CTA
- Missão do dia + MysteryBoxCard
- 2 botões grandes: "Check-in guiado" + "Tô em momento ruim"
- HabitChips (9 hábitos, tap = check-in rápido)
- ConfettiBurst + UnlockToast queue
- Tour modal first-time (4 passos)

**Densidade**: alta. Muito conteúdo numa tela. Em mobile 375×812 cabe via scroll.
Em iPhone SE (320) seria apertado mas funciona.

**Chat** ([chat.tsx](../app/mobile/app/(tabs)/chat.tsx)):
- Header com nome do mascote + "Calmo · modo offline" (ou "online" se OpenAI)
- "Nova conversa" + "Ajuda emocional" (atalho pra safety screen)
- Banner "Tô em momento ruim · só presença"
- Last messages
- Quick reply pills (9 chips: humor + atalhos como "💧 bebi água")
- TextInput + Enviar

**Crítica**: bom. Pills servem onboarding-friendly. Crisis path acessível.

**Evolution** ([evolution.tsx](../app/mobile/app/(tabs)/evolution.tsx)):
- Mascote em SceneBackground
- "Bipo / Calmo · Bipo · nível 2"
- "Nível 2 · 19/100 XP"
- **Jornada de evolução**: 6 phases lineares
- 3 botões: Streak / Coleção / Closet

**Crítica MAIOR**: viola brief DLI (fases lineares). Refactor multi-dia.

**Report** ([report.tsx](../app/mobile/app/(tabs)/report.tsx)):
- 4 stats cards (checkins, variedade, XP, streak)
- Heatmap 12 semanas (GitHub-style)
- Top hábitos
- CTA "Ver relatório completo" + "Compartilhar / convidar amigo"
- Footer privacy: "Gerado localmente. Nada saiu do seu dispositivo."

**Crítica**: muito bom. Heatmap é polish layer. Privacy message é confidence
building.

### 20.2 Microinterações

- **PressableScale** spring (damping 18, stiffness 280): toque tem "peso"
- **StaggeredView FadeInDown**: items aparecem em cascata, ritmo musical
- **ConfettiBurst**: celebração em milestones
- **UnlockToast**: kicker (mono) + title (serif) — premium typography
- **MascotAmbient**: time-aware (Z's à noite, sparkles de manhã)

### 20.3 Tom de voz (texto)

Análise de copy do app revela tom consistente:
- Português brasileiro coloquial mas não-gírias-pesadas
- Frases curtas (2-12 palavras tipicamente)
- Affirmativo, não imperativo ("Volta todo dia", não "VOLTE TODO DIA")
- Sem exclamação excessiva
- Sem emoji-poluição (1-2 emojis por screen no máximo)

Exemplos:
- Welcome: "Cuide de você. Seu Mascote evolui junto."
- Home: "Cuide de você", "toque = +1 · segure = ajustar"
- Notice: "Esse app é pra autocuidado e bem-estar."
- Chat: "Vamos respirar um pouco? Você não precisa resolver tudo agora."

**Excelência**: tom consistente em todas as telas. Notavelmente bem feito.

### 20.4 Acessibilidade (gaps)

- **accessibilityLabel coverage ~21%** dos componentes interativos
- **Sem WCAG contrast checker** runtime
- **UnlockToast não respeita reduce_motion**
- **Skeleton shimmer não respeita reduce_motion**
- **Sem focus rings** no web (keyboard nav weak)
- **Sem semantic structure** consistente em texts (alguns têm role="text", outros não)

**Bom**:
- Reduce motion API integrada em PressableScale, StaggeredView, MascotAmbient
- High contrast mode
- Dynamic text scaling com clamp [0.85, 1.5]
- Cross-platform shadows (iOS/Android/Web)
- Glass morphism com fallback

---

## 21. Design System

### 21.1 Tokens

[themes.ts (~271 LOC)](../app/mobile/src/lib/themes.ts):

**4 theme modes**: light · sepia · dark · system (auto via useColorScheme)
**5 brand palettes**: classic (orange) · sunset · peach · coral · sun

Cada combinação = 20 estados.

**Color tokens** (semantic):
- bg, surface, surfaceAlt, text, textSecondary, textDim, border, border2
- primary, primaryDeep, primarySoft, primaryTint (vinculado ao brand palette)
- 15+ named: sage, sageDeep, coral, coralDeep, lilac, gold, sky
- success, warning, error
- mood colors: triste, ok, feliz, empolgado, exausto
- personality colors: calmo, motivador, fofo, sabio

**Spacing**: xs(4) sm(8) md(16) lg(22) xl(32) xxl(48)
**Radius**: sm(8) md(16) lg(22) xl(28) pill(999)
**Text scales (8)**:
- Editorial: h1, h2 — Instrument Serif
- UI: h3, body, bodyBold, sm — Plus Jakarta Sans
- Technical: xs — JetBrains Mono
- Brand: brand (Quicksand), serif (Instrument Serif italic)

**Shadows**: 3 presets cross-platform (sm/md/glass) com `makeShadow` helper que
emite props RN nativas OU CSS `boxShadow` em web

`★ Insight ─────────────────────────────────────`
Misturar **3 famílias tipográficas** (Instrument Serif + Plus Jakarta + JetBrains
Mono) num app mobile é decisão de design **rara e cara**. A maioria usa 1 fonte
sans pra simplicidade. Aqui temos:
- Serifs **editorial** pra titles (sensação de "carta artesanal")
- Sans humanista pra body (legibilidade)
- Mono pra technical/kicker (precisão visual)

É feito pra parecer **publicação cuidada**, não app genérico. Acerto raro.
`─────────────────────────────────────────────────`

### 21.2 Componentes (38 reusables)

Por tier:

**Core**:
- Button, Card, Icon, PressableScale, StaggeredView, Skeleton, EmptyState,
  ErrorBoundary, BrandLogo

**Game**:
- HabitChip, XPBar, StreakFlame, ComboRing, HeroSwipeable, DailyRewardStrip,
  MysteryBoxCard, MissionCard, NotificationBell, PersonalityCard, WalletPills

**Mascote**:
- Mascot (wrapper), Mascot2D, Mascot3D, MascotAmbient, SceneBackground

**Toast/Modal**:
- UnlockToast, EvolutionModal, HabitValueModal, Tour, ConfettiBurst, LimitedEventBanner

### 21.3 Iconography

[Icon.tsx](../app/mobile/src/components/Icon.tsx): 58 SVG icons inline (não font).
Stroke 2px, round caps, Lucide-inspired. Theme-aware via color prop.

**Bom**: zero overhead (sem font file), tree-shakable, semantic.
**Gap**: no icon library export pra outros projetos.

### 21.4 Animation

Reanimated 3 worklets:
- Spring press (damping 18, stiffness 280) — premium feel
- FadeInDown.springify() pra entries
- Sequence pra UnlockToast (Y + opacity)
- Repeat pra MascotAmbient Z's e sparkles
- Tilt sinusoidal pra MascotAmbient (curious tilt)

Layout animations **não** usadas. Não há `Layout` from Reanimated v3.

### 21.5 Cross-platform

- **Web bundling funciona** (Playwright validado)
- **Glass morphism** com BlurView (native) e backdrop-filter (web)
- **Shadows** cross-platform
- **Fonts** loaded async via expo-font
- **SVG** react-native-svg works em ambos

---

# Parte VI — Análise Crítica

## 22. Problemas Críticos

### 22.1 P0 — bloqueadores de produto

1. **Sem backend = sem dado quem usa**
   - Sem analytics, voa cego
   - Reinstalar = perda total
   - Sem multi-device
2. **Sem push notifications**
   - Proactive triggers gravam mas ninguém vê
   - Reengagement = 0
   - `expo-notifications` nem está em deps
3. **Billing placeholder**
   - Paywall UI pronto, sem RevenueCat/StoreKit/Play Billing
   - Não tem como cobrar
4. **Mascot3D estático**
   - Brief pede "vivo", entrega: imagem 3D que não se mexe
   - Eye tracking, blink, breath ausentes
5. **Evolution screen com fases lineares**
   - Contradiz brief diretamente
   - Substrato DNA suporta procedural, UI não

### 22.2 P1 — gaps importantes

1. **Memória é flat list**, não graph
2. **Bayes safety treinado em 70 exemplos** — confiança enganosa
3. **Gems sem sink** — inflação
4. **Coins inflation** — sinks insuficientes
5. **Onboarding sem progress global** consistente
6. **OpenAI key em localStorage web sem aviso**
7. **DimMismatch silencioso** ao trocar de modo de embedding

### 22.3 P2 — polimentos

1. **accessibilityLabel coverage 21%**
2. **No WCAG contrast checker**
3. **UnlockToast não respeita reduce_motion**
4. **Source field não persistido em messages**
5. **pointerEvents warning** (upstream, sem fix nosso)
6. **No focus rings web**
7. **No icon library export**

### 22.4 P3 — débitos técnicos

1. **`*.bak` files em src/lib/dna/** (cleanup local)
2. **STATUS_NOITE.md** no .gitignore (pessoal)
3. **No EAS Build config** (eas.json ausente)
4. **No CodeQL/SAST** scan
5. **No bundle size check** em CI
6. **Maestro E2E sem cobertura de multi-user e crash recovery**

---

## 23. Gargalos Técnicos

### 23.1 Performance bottlenecks

| Bottleneck | Quando dispara | Severidade |
|---|---|---|
| Full-table read em checkins | Cada Home render após 1k+ rows | Alta a longo prazo |
| Re-render cascade no Zustand | Quando atualiza store sem selector | Média |
| Three.js useFrame em UI thread | Sempre quando Mascot3D montado | Baixa-média |
| AsyncStorage write throughput | Cada check-in (~6 writes) | Baixa |
| VectorStore brute-force cosine | >500 memories | Média |
| JSON.parse de mensages | Chat com 1000+ messages | Média |

### 23.2 Architectural bottlenecks

- **Sem indices**: filtros O(n)
- **Sem queue de eventos**: cada side-effect é blocking
- **Sem cache layer**: hot reads (mascot, profile) lêem disco sempre
- **Sem batching**: 6 writes por check-in em vez de 1 transaction
- **Sem worker thread**: DNA compute na UI

### 23.3 Code health

- 1509/1509 tests verde ✅
- typecheck limpo ✅
- 0 erros console ✅
- 15 `as any` casts (todos intencionais) ✅
- 7 `.bak` files leftover (cleanup local) ⚠️
- 1 require cycle (fixado nesta sessão) ✅
- 1 narrow regex de safety (fixado) ✅

---

## 24. Riscos de Produto

### 24.1 Risco existencial

**Felipe está construindo sozinho** (com Renato como co-founder, segundo
auto-memory). Single point of failure. Tendinite + dedo quebrado (per
STATUS_NOITE.md) = capacidade de execução comprometida no curto prazo.

Mitigação: este documento serve pra **transferência de contexto** para futuro
hire ou advisor.

### 24.2 Risco de scope

Brief DLI é **6-12 meses de execução**. Felipe declarou prazo "2 meses pra
surpreender chefe". Há **mismatch**.

Estratégia: cortar escopo agressivamente para 2 meses (foco em DLI-2 animation +
DLI-1 evolution screen) e deixar o resto pra após validação.

### 24.3 Risco de mercado

- **Wellness apps são commodity** (Calm, Headspace, Insight Timer já dominam)
- **Pet apps virtuais são nicho** (Tamagotchi On vendeu mas Pou virou meme)
- **AI companion apps são polêmicos** (Replika teve crise com 18+ content)

Mascote tenta posicionar em **interseção das 3** — pode ser feature ou bug
(diferenciação vs falta de foco).

### 24.4 Risco regulatório

Apesar do disclaimer wellness, **autoridades regulatórias (ANVISA, FDA, CFP no
Brasil)** podem questionar se app que detecta crisis suicide e oferece "ajuda
emocional" não é mais regulado.

Mitigação: jurídico precisa revisar antes de lançar com nome "Mascote" ou
descrição que envolva "saúde mental".

### 24.5 Risco técnico

- **AsyncStorage não escala** > 10k checkins/usuário
- **OpenAI BYOK = barreira de adoção**: usuário comum não tem chave
- **Sem backend = sem leverage de dados**
- **Mascot3D pode falhar em low-end devices**

---

## 25. Oportunidades de Mercado

### 25.1 TAM (Total Addressable Market)

- **Brasil**: 100M smartphones, 20-30% usam apps de bem-estar = 20-30M usuários
- **LATAM**: 250M smartphones, similar penetração = 50-75M
- **Global PT-BR + ES**: + 200M+

Conservador: 5M usuários potenciais BR. 0.1% conversion = 5k usuários pagantes.
R$ 24,90/mês × 5k = R$ 1,5M MRR. 0.5% = R$ 7,5M MRR.

### 25.2 Pricing strategy

R$ 24,90/mês ou R$ 249/ano (33% off) com 7 dias trial.

**Análise**:
- Calm: R$ 249/ano BR
- Headspace: R$ 198/ano BR
- Replika: R$ 30/mês

Pricing está **alinhado com competidores premium**. Espera-se conversion 1-3%
(industry pra wellness freemium).

### 25.3 Diferenciação possível

| Eixo | Mascote | Calm | Headspace | Replika |
|---|---|---|---|---|
| Wellness | ✅ Sim | ✅ Sim | ✅ Sim | ❌ Não foco |
| Procedural creature | ✅ Único | ❌ | ❌ | ❌ |
| AI conversation | ✅ Limitado | ❌ | ❌ | ✅ Foco |
| Safety classifier | ✅ Anti-medical | ❌ | ❌ | ⚠️ Inconsistente |
| Anti-attachment | ✅ Único | ❌ | ❌ | ❌ |
| Local-first | ✅ Sim | ❌ | ❌ | ❌ |
| Gamificação | ✅ Forte | ⚠️ Light | ⚠️ Light | ❌ |
| Preço | R$249/ano | R$249 | R$198 | R$300+ |

**Posicionamento**: o que ninguém mais faz é "criatura procedural + AI segura +
anti-attachment + local-first". Essa interseção é o diferencial.

### 25.4 Canais

- **Word of mouth**: feature de compartilhar mascote (capture screenshot do 3D)
- **Influencer wellness**: criar parcerias com creators BR (sem ser cringe)
- **App Store featuring**: app único, design AAA potencial = candidato natural
- **TikTok**: viralizar com "olha meu mascote único"
- **Comunidade no Discord**: opt-in para power users

---

## 26. Comparação com Concorrentes

### 26.1 Matriz competitiva detalhada

#### Replika

- **O que faz bem**: AI conversation deep, memory long-term, emotional bonding
- **O que faz mal**: ZERO safety classifier robusto, pricing aggressive,
  monetização explorativa, polêmica com NSFW
- **Mascote vs Replika**: ganha em safety + posicionamento ético; perde em
  profundidade de conversa (Mascote é wellness, Replika é "amigo")

#### Character.AI

- **O que faz bem**: variedade de personas, infinite generation, comunidade
- **O que faz mal**: zero safety pra menores, role-play sem freio, addictive
- **Mascote vs C.AI**: ganha em safety + procedural visual; perde em variedade
  de conversa

#### Calm / Headspace

- **O que fazem bem**: conteúdo (meditações guiadas), credibilidade clínica,
  scale
- **O que fazem mal**: zero personalização visual, conteúdo estático, sem
  vínculo
- **Mascote vs Calm**: ganha em vínculo + diferenciação; perde em conteúdo
  produzido

#### Habitica

- **O que faz bem**: RPG completo, comunidade, gamificação profunda
- **O que faz mal**: visual genérico (8-bit), audiência nicho (nerd RPG)
- **Mascote vs Habitica**: ganha em apelo visual; perde em gameplay depth

#### Finch

(O competidor mais próximo!)

- **O que faz**: pet virtual (passarinho) + autocuidado + journaling. Tem 5M+
  downloads. Tem buy mechanism.
- **Diferença pro Mascote**: Finch tem **pixel art estático**, sem DNA
  procedural, sem variabilidade entre criaturas. Mascote tem **3D procedural
  único por usuário**.
- **Risco**: Finch já tem PMF + AppStore featuring. Mascote precisa de
  diferencial 10× visível pra disputar.

#### Tamagotchi On (Bandai)

- **O que faz**: pet virtual nostálgico, hardware + app
- **Mascote vs**: nostálgico nicho vs futurístico mass. Não competem diretamente.

### 26.2 Mascote como **categoria nova**

A combinação procedural + AI segura + wellness + anti-attachment é literalmente
um **whitespace**:

```
        Procedural visual
              │
              │   Mascote
              │   [▓]
   Wellness ──┼───────────── AI companion
              │
              │
              │
        Pet virtual
```

Felipe não está competindo num quadrante; está fazendo um quadrante novo.

**Lifestyle wellness + Digital Living Identity** = "Mascote category".

---

# Parte VII — Visão de Futuro

## 27. Como Transformar em Categoria Própria

### 27.1 Nome da categoria

"Digital Living Identity" (DLI) — termo que Felipe já usa no roadmap. **Pode ser
o nome da categoria**, mas precisa de mais peso semântico no marketing.

Alternativas: "Personalidade Digital Procedural", "Wellness Companion Vivo",
"Pet de Identidade".

### 27.2 Pillars de positioning

3 pilares irredutíveis:

1. **Único no mundo** — DNA procedural garante isso técnicamente
2. **Cuidado sem cobrança** — ética anti-tóxica embedded
3. **Vivo, não estático** — animation + behavior tree (gap atual)

### 27.3 Mensagem de marketing

> "Crie uma criatura que não existe em nenhum outro lugar.
> Cuide de você, ela cresce junto.
> Sem cobrança. Sem culpa. Sem terapia.
> Wellness com alma. Mascote."

### 27.4 Press positioning

Sequência ideal:
- Mês 1: TechCrunch BR ("startup brasileira lança IA companion ético")
- Mês 2: Folha SP ("app brasileiro cria criatura digital única por usuário")
- Mês 3: Apple/Google featured apps ("App of the Day")
- Mês 4: Conferência (Web Summit Rio, RD Summit) — show off DNA visual

### 27.5 Comunidade

Criar Discord opt-in com:
- Channel "show your mascot" (screenshots compartilhados)
- Channel "feature requests" (Felipe presente)
- Channel "wellness daily" (peer support, moderado)
- Bots: weekly wrap of community mascots

---

## 28. Roadmap Ideal

### 28.1 6 meses (já em ROADMAP_DIGITAL_LIVING_IDENTITY.md)

```
Mês 1     ▸ DLI-2 (animation: blink, breath, eye-track)        ◀ unlock DLI-3
Mês 2     ▸ DLI-1 (evolution screen procedural)
Mês 2-3   ▸ DLI-3 (morphological evolution)
Mês 3-4   ▸ DLI-4 (memory graph)
Mês 4     ▸ DLI-5 (adaptive personality)
Mês 5     ▸ DLI-6 (ambient reactive)
Mês 5-6   ▸ DLI-7 (voz) + DLI-8 (customization)
Mês 6     ▸ DLI-9 (rare form) + DLI-11 (behavior tree)
```

### 28.2 Adendo: infra crítica

Em paralelo aos DLI:

**Mês 1**: Push notifications (expo-notifications) + Supabase auth
**Mês 2**: RevenueCat integração + StoreKit/Play Billing
**Mês 3**: PostHog analytics + crash reporting (Sentry)
**Mês 4**: EAS Build + Play Store / App Store
**Mês 5**: Backend events table + sync básico
**Mês 6**: A/B test framework (homegrown ou Statsig)

### 28.3 Marcos de "categoria"

| Mês | Marco |
|---|---|
| 3 | 1k beta users (TestFlight + Play closed beta) |
| 6 | 10k MAU, D30 retention 18%+ |
| 9 | 50k MAU, paying conversion 2%+ |
| 12 | 250k MAU, R$ 100k MRR |
| 18 | Series A possível |
| 24 | International expansion (ES, EN) |

---

## 29. Melhor Stack Possível

### 29.1 Stack atual (já bom)

```
Frontend:        RN + Expo SDK 51 + TypeScript 5.3 ✅
Navigation:      Expo Router ✅
State:           Zustand ✅
3D:              R3F + three.js ✅
Animation:       Reanimated 3 ✅
SVG:             react-native-svg ✅
Persistence:     AsyncStorage + SecureStore ✅
AI:              OpenAI gpt-4o-mini BYOK + local TF-IDF ✅
Test:            Vitest + Maestro ✅
```

### 29.2 Adições recomendadas

```
Push:            expo-notifications (P0)
Backend:         Supabase (auth + storage + realtime + edge functions)
Billing:         RevenueCat (handles StoreKit/Play unified API)
Analytics:       PostHog (open source, self-hostable)
Crash report:    Sentry
A/B:             Statsig ou GrowthBook (open source)
LLM:             OpenAI gpt-4o-mini default + Anthropic Claude haiku fallback
Embeddings:      OpenAI text-embedding-3-small (atual) + fallback local FAISS
Vector DB:       (futuro com 50k users) pgvector via Supabase
Realtime:        Supabase realtime channel
Image gen:       (futuro) Stable Diffusion para skins sazonais geradas
```

### 29.3 Não usar

- **Firebase**: vendor lock-in maior, mais caro em escala
- **MongoDB**: relational fits melhor pra dados estruturados (checkins, missions)
- **Unity/Unreal embedding**: complexity bomb, não vale pra mascot mobile
- **Cocos2d**: overkill, R3F entrega
- **Mongo Realm sync**: hype passou, Supabase realtime equivalente
- **WebRTC**: irrelevante (sem voice live)

### 29.4 Decisão LLM provider

OpenAI gpt-4o-mini é boa default ($0.15/1M tokens input). Alternatives:

| Provider | Modelo | Custo/1M input | Quality | Latency |
|---|---|---|---|---|
| OpenAI | gpt-4o-mini | $0.15 | High | ~1s |
| Anthropic | Claude haiku | $0.25 | High | ~1s |
| Google | Gemini Flash | $0.075 | Medium | ~0.8s |
| Groq | Llama 3.1 70b | $0.59 | Medium-high | ~0.3s |
| Together | DeepSeek V3 | $0.27 | High | ~1.2s |

Recomendação: OpenAI default + Anthropic Claude haiku fallback se OpenAI down.

---

## 30. Como Tornar o Mascote o Mais Avançado do Mundo

### 30.1 Definir "mais avançado"

O brief usa essa frase 3× — mas é vago. Concretizar:

**Métricas observáveis**:
- (a) Variabilidade visual: cada usuário tem criatura **demonstravelmente** única
- (b) Expressividade animation: 100+ microexpressões contextuais
- (c) Conversational depth: passa em Turing teste blind PT-BR para wellness
- (d) Vínculo emocional: NPS > 70 entre power users
- (e) Categoria criada: Mascote é **referência** quando se fala em "Digital Living Identity"

### 30.2 Trilha técnica pra cada métrica

**(a) Variabilidade visual** — atualmente: ✅ atingida via DNA procedural. Aumentar:
- + Pattern shaders (manchas, listras, bioluminescência via GLSL custom)
- + Geometry variants além de icosahedron (metaballs, marching cubes)
- + 8-12 morph target extremes + blend

**(b) Expressividade animation** — atualmente: ❌ estático. Construir:
- Idle anim system (breath, blink, sway)
- Eye tracking → toque + PanResponder (base já existe)
- Mood-driven posture (sleep mood → cabeça baixa)
- Microexpressions (sobrancelhas, boca)
- Walk/turn cycle se andar pelo cenário
- Particle emission moods (sparkles em alegria, neblina em pensamento)

**(c) Conversational depth** — atualmente: ⚠️ limitado por max_tokens=100 e tom fixo.
Construir:
- Dynamic tone modifiers (DLI-5)
- Memory graph (DLI-4) com edges entre eventos
- Multi-turn conversation tracking
- Context-aware questioning (em vez de só responder)
- Voice/audio (DLI-7)

**(d) Vínculo emocional** — atualmente: ⚠️ frágil sem retorno fora-do-app. Construir:
- Push notifications gentis no ritmo do usuário
- Memória que faz callbacks no tempo certo ("lembra quando você falou de...")
- Eventos sazonais (aniversário do mascote, marcos)
- Compartilhamento social opt-in

**(e) Categoria criada** — atualmente: vapor. Construir:
- Marketing/press strategy (seção 27)
- Conteúdo educacional (blog "what is digital living identity")
- Comunidade Discord
- Partnership com influencers PT-BR não-cringe

### 30.3 Métrica composite

"World's most advanced mascot virtual" = score combinado:

```
score = 0.25 × variabilidade_visual
      + 0.25 × expressividade_animation
      + 0.20 × conversational_depth
      + 0.20 × vinculo_emocional
      + 0.10 × categoria_share_of_voice
```

Mascote hoje: ~25/100 (DNA pioneiro + estático + boa IA + vínculo médio + zero
share of voice).

Target 6 meses: ~60/100 (DNA + animação básica + tom dinâmico + push + começo de
comunidade).

Target 12 meses: ~80/100 (DNA + animação rica + memory graph + voz + share of
voice estabelecido).

### 30.4 Anti-padrões a evitar

- **Não copiar Replika** — vínculo romântico/sexual NÃO é o caminho
- **Não copiar Tamagotchi** — morte/cobrança NÃO é o caminho
- **Não copiar Habitica** — visual genérico NÃO é o caminho
- **Não embed Unity** — complexity bomb, não escala mobile
- **Não fazer "AI gera tudo"** — controle procedural é o diferencial; AI livre
  perde personalidade
- **Não ir cross-platform desktop** — mobile-first é a guerra

### 30.5 Norte final

> Felipe está construindo algo que **não tem precedente claro** no mercado. A
> qualidade técnica do fundamento (DNA, safety, types, testes) já é
> exepcionalmente boa. O **deficit** é o **expressivo** (animação, voz, behavior)
> + **infra de retenção** (push, backend, analytics) + **categoria** (marketing).
>
> 6 meses focados em DLI-2/3 + push + backend + analytics colocam o produto na
> conversação. 12 meses com toda a roadmap entregue, é categoria.
>
> O que decide entre "saiu legal" e "saiu único no mundo" é **disciplina de
> execução**, não brilho técnico. O brilho técnico já tá lá.

---

# Apêndice A — Bug Log

## Bugs encontrados e fixados nesta sessão (2026-05-19)

| ID | Severidade | Bug | Status |
|---|---|---|---|
| 17 | P0 | Regex de diagnóstico em ai.ts perdia "tenho depressão" | ✅ Fixado |
| 20 | P0 | input flag=high sem handler → caía em mock | ✅ Fixado |
| 16 | P1 | Require cycle dna/index.ts ↔ dna/stories.ts | ✅ Fixado |
| 14 | P2 | onboarding/name re-pedia display_name | ✅ Fixado |
| - | infra | 3 peer deps de expo-three ausentes | ✅ Instaladas |
| - | infra | 5 component tests com parse error | ✅ Mock Mascot3D em setup.ts |
| - | infra | 3 testes de schema esperavam v1 | ✅ Atualizado |
| - | infra | applyDecay overshoot 0.5 floor | ✅ Clamp explícito |
| - | infra | Migration v1→v2 não persistia sanitize | ✅ Sempre escreve |

## Bugs/gaps identificados nesta auditoria (abertos)

| ID | Severidade | Descrição |
|---|---|---|
| AUD-1 | P0 | Sem backend → sem analytics, sem multi-device, sem multi-user |
| AUD-2 | P0 | Push notifications ausente (expo-notifications não em deps) |
| AUD-3 | P0 | Billing placeholder (sem RevenueCat/StoreKit) |
| AUD-4 | P0 | Mascot3D estático (sem blink/breath/eye-tracking/mood posture) |
| AUD-5 | P0 | Evolution screen com fases lineares (vs brief) |
| AUD-6 | P1 | Memória é flat list, não graph |
| AUD-7 | P1 | Bayes safety treinado em 70 exemplos |
| AUD-8 | P1 | Gems sem sink (inflação) |
| AUD-9 | P1 | Coins sinks insuficientes (~2000 total) |
| AUD-10 | P1 | OpenAI key em localStorage web sem aviso |
| AUD-11 | P1 | DimMismatch silencioso ao trocar de modo embedding |
| AUD-12 | P1 | AsyncStorage não escala >10k rows/tabela |
| AUD-13 | P2 | accessibilityLabel coverage 21% |
| AUD-14 | P2 | WCAG contrast checker ausente |
| AUD-15 | P2 | UnlockToast/Skeleton ignoram reduce_motion |
| AUD-16 | P2 | Sem EAS Build (eas.json ausente) |
| AUD-17 | P2 | Sem CodeQL/SAST scan |
| AUD-18 | P3 | 7 .bak files em dna/ |

---

# Apêndice B — Métricas Quantitativas

## Códigobase

| Métrica | Valor |
|---|---|
| Routes registradas | 48 |
| Componentes reutilizáveis | 38 |
| LOC componentes | ~6,200 |
| Módulos lib/ | ~15 |
| Tabelas AsyncStorage | 16 + 1 meta |
| Tipos entity | 22 |
| Tests | 1509/1509 ✅ |
| Test files | 78 |
| Coverage lines | 98.9% |
| Coverage branches | 97.4% |
| TypeScript errors | 0 |
| Console errors (Playwright) | 0 |
| Maestro E2E flows | 8 |

## DNA system

| Métrica | Valor |
|---|---|
| Genes | 11 |
| Range | [0.02, 0.98] |
| PRNG | mulberry32 (deterministic) |
| Variance per gene | 0.1 default |
| Personalidades-preset | 4 |
| Espaço genético | ~11^11 ≈ 2.85 × 10^11 |
| Morphology params derivados | 33 |
| Palette params (HSL) | 3 cores × 3 components = 9 |

## Wallet economy

| Métrica | Valor |
|---|---|
| COINS_PER_CHECKIN | 5 |
| COINS_PER_MISSION | 15 |
| XP_PER_CHECKIN base | 10 |
| XP_DAILY_CAP | 150 |
| Streak grace max | 5 |
| Daily reward total/semana | 380 coins + 6 gems |
| Acessórios | 14 (80-500 coins) |
| Scenes | 9 (5 premium) |
| Achievements | 17 |
| Missões | 58 |
| Habitos | 9 |

## AI / Safety

| Métrica | Valor |
|---|---|
| Critical patterns regex | 11 |
| High patterns regex | 9 |
| Watch patterns regex | 13 |
| Bad output patterns regex | 15 |
| Attachment patterns regex | 7 |
| Bayes train corpus | 70 exemplos |
| Memory cap | 200 |
| VectorStore cap | 1000 |
| Embedding dims OpenAI | 1536 |
| Embedding dims local | 256 |
| OpenAI model | gpt-4o-mini |
| OpenAI timeout | 15s |
| Max reply tokens | 100 |
| Max reply words (system prompt) | 30 |

## Onboarding

| Métrica | Valor |
|---|---|
| Telas (consolidadas) | 6 |
| Duração média estimada | ~90s |
| Min age | 16 |
| Personalidades-pick | 4 |
| Goals | 7 |
| Mood scale | 1-5 (😞→😄) |

## Plataforma

| Métrica | Valor |
|---|---|
| Expo SDK | 51 |
| React Native | 0.74.5 |
| React | 18.2 |
| TypeScript | 5.3 |
| Bundle modules (web) | 1246 |
| Bundle time (cache vazio) | ~12.5s |
| Cold start estimated | ~2-3s |
| Hot reload | <1s |

---

# Apêndice C — Glossário Técnico

- **AAA**: tier de qualidade típico de games AAA (Triple-A) — Pixar/Nintendo polish
- **BYOK**: Bring Your Own Key — usuário traz própria chave de API
- **DLI**: Digital Living Identity — a categoria que Felipe está criando
- **DNA procedural**: 11 floats em [0.02, 0.98] que governam toda expressão visual/comportamental
- **Drift de hábito**: aumento gradual em gene quando user pratica hábito (sempre não-negativo)
- **Embedding**: vetor n-dimensional que representa significado semântico de texto
- **Ensemble classifier**: combinação de múltiplos classifiers (regex + sentiment + Bayes)
- **FNV-1a**: hash function rápida e bem distribuída (usado pra seed)
- **Genome**: estrutura tipo `Record<GeneKey, number>` — instância do DNA
- **Idempotency key**: chave única que garante "executar 2× = executar 1×"
- **Mulberry32**: PRNG (pseudo-random number generator) determinístico
- **MVP**: Minimum Viable Product
- **NPS**: Net Promoter Score (medida de loyalty)
- **PRNG**: Pseudo-Random Number Generator
- **R3F**: React Three Fiber — react renderer pra three.js
- **Safety classifier**: detecta mensagens críticas/alarmantes e redireciona pra ajuda profissional
- **TF-IDF**: Term Frequency-Inverse Document Frequency (técnica clássica de NLP)
- **WCAG**: Web Content Accessibility Guidelines
- **withLock**: padrão que serializa operações concorrentes na mesma tabela

---

> **Documento gerado**: 2026-05-19
> **Autor**: Auditoria multi-role automatizada via Claude Code (Opus 4.7, 1M ctx)
> **Versão**: 1.0
> **Próxima revisão**: após DLI-2 entregue (estimativa Mês 1)
>
> Para feedback/correção: criar issue em github.com/felipemenezes25000-spec/mascote
