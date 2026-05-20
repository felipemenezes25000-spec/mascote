<div align="center">

# 🌱 Mascote

### Uma criatura digital procedural única. Vive, evolui, expressa.

**Um organismo digital com DNA próprio que cresce conforme você cuida de si.**

*Não é Tamagotchi. Não é chatbot. É a primeira plataforma de Digital Living Identity em português.*

---

[![Tests](https://img.shields.io/badge/tests-1779%2F1779-brightgreen?style=for-the-badge)](app/mobile/tests/)
[![CI](https://img.shields.io/badge/CI-typecheck%20%2B%20tests-blue?style=for-the-badge)](.github/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-98.9%25-brightgreen?style=for-the-badge)](app/mobile/vitest.config.ts)
[![Typecheck](https://img.shields.io/badge/typecheck-clean-blue?style=for-the-badge)](app/mobile/tsconfig.json)
[![License](https://img.shields.io/badge/license-private-lightgrey?style=for-the-badge)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-RN%20%2B%20Expo%20%2B%20R3F-purple?style=for-the-badge)](#stack)

[**🎯 Visão**](#-visão) · [**🧬 DNA**](#-sistema-dna) · [**🚀 Quick Start**](#-quick-start) · [**📐 Arquitetura**](#-arquitetura) · [**🛡️ Safety**](#%EF%B8%8F-safety--ética)

</div>

---

## 🎯 Visão

> "Cada usuário possui uma criatura **única, viva, procedural** — impossível de replicar. Não um pet. Não um avatar. Uma **identidade digital biológica**."

O Mascote não tem fases lineares ovo→bebê→criança. Tem **DNA procedural de 11 traits**, **mutações biológicas persistentes**, **comportamentos autônomos por personalidade genética**, e **IA com 3 camadas de safety** que jamais expõe gene cru ao mundo externo.

| Tradição mobile | Mascote |
|---|---|
| Sprite estático | Renderer 3D procedural (React Three Fiber + three.js) |
| Skin reskin | DNA 11-gene → morfologia + paleta + animação derivadas |
| Fases discretas | Evolução **contínua** via drift de hábitos |
| Avatar genérico | 1 criatura única por seed do user_id, **demonstravelmente** diferente |
| Chat solto | IA com descritores semânticos seguros, sem vazar DNA |
| Gamificação punitiva | "Sem culpa" — drift sempre não-negativo, decay nunca cruza 0.5 |

---

## 🧬 Sistema DNA

### O Genoma — 11 Floats em `[0.02, 0.98]`

```ts
interface MascotDNA {
  empathy:        number;  // tamanho dos olhos, inclinação da cabeça
  curiosity:      number;  // antenas reativas, dilatação da pupila
  creativity:     number;  // padrões corporais, cauda, criatividade visual
  discipline:     number;  // simetria, postura ereta, brilho refinado
  chaos:          number;  // assimetria, deformações, membros extras
  aggression:     number;  // espinhos, contornos defensivos
  resilience:     number;  // base densa, robustez
  emotionalDepth: number;  // expressividade, mudanças de cor
  socialEnergy:   number;  // aura, calor da paleta, abertura
  adaptability:   number;  // fluidez de movimento
  intelligence:   number;  // proporção crânio, brilho dos olhos
}
```

**Determinismo absoluto** via `mulberry32(seed)` + FNV-1a hash do `user_id`.
**Variação procedural** garante: 1 milhão de usuários Calmos → 1 milhão de Bipos
**distinguivelmente diferentes**. Não é skin. É genoma.

### Pipeline: Genome → Visual + Comportamento

```
                    ┌──────────────────────┐
                    │   Genome (11 floats)  │
                    └──────────┬───────────┘
                               ▼
        ┌───────────┬──────────┼──────────┬───────────┐
        ▼           ▼          ▼          ▼           ▼
  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌────────┐  ┌──────────┐
  │ Palette  │  │ Morpho- │  │  Mood  │  │ Stories │  │   AI     │
  │  (HSL)   │  │  logy   │  │ score  │  │ (drift) │  │descrip-  │
  └────┬─────┘  │ 33 params│  └────────┘  └────────┘  │ tors PT-BR│
       │        └────┬────┘                            └────┬─────┘
       └─────────┬───┴────┬─────────────────────────────────┘
                 ▼        ▼
            ┌─────────────────┐
            │   Mascot3D      │
            │  (R3F + three)  │
            └─────────────────┘
```

### Hábitos Esculpem Biologia

Cada check-in dispara `applyHabitDrift(genome, habit)` — gradiente não-negativo:

| Hábito | Genes reforçados |
|---|---|
| 💧 Água | resilience, adaptability |
| 😴 Sono | discipline, resilience, emotionalDepth |
| 🏋️ Exercício | resilience, adaptability, socialEnergy |
| 🧘 Meditação | empathy, emotionalDepth, discipline |
| 📖 Leitura | intelligence, curiosity, creativity |
| ✍️ Journaling | emotionalDepth, empathy, intelligence |
| 🌬️ Respiração | empathy, emotionalDepth, discipline |
| 🌳 Outdoor | socialEnergy, adaptability, curiosity |
| ☀️ Sol | resilience, socialEnergy, emotionalDepth |

> **Princípio inviolável**: drift **NUNCA** é negativo. Ausência NUNCA pune.
> Decay temporal puxa extremos em direção a 0.5 mas **nunca atravessa**. Genoma
> neutro (todos 0.5) é ponto fixo. Garantido por property tests com fast-check.

### Mutações Persistentes (7 marcos biológicos)

| Mutação | Raridade | Condição |
|---|---|---|
| 🧱 **Estrutura firme** | Rara | resilience>0.7 + discipline>0.65 + 25× exercise |
| 👁 **Olhar profundo** | Rara | empathy>0.7 + emotionalDepth>0.7 + 20× journaling |
| 🌀 **Padrões emergentes** | Épica | creativity>0.75 + chaos>0.5 + 21 dias |
| 📡 **Antenas reativas** | Comum | curiosity>0.7 + 15× outdoor |
| ✨ **Aura expansiva** | Rara | socialEnergy>0.75 + streak 14 |
| 💎 **Brilho sábio** | Épica | intelligence>0.75 + 20× reading |
| 🌌 **Forma bioluminescente** | **LENDÁRIA** | resilience>0.78 + socialEnergy>0.7 + emotionalDepth>0.7 + streak 30 + 60 dias |

Cada mutação modifica `morphology` em runtime (multipliers visuais), sem mutar o DNA bruto.

### Behavior Engine — Utility AI

6 behaviors com score function. A cada 30s o engine seleciona o de maior utilidade:

| Behavior | Kind | Score |
|---|---|---|
| `milestone.streak_7` | Milestone | `1.0` quando streak%7==0 |
| `reactive.return` | Reactive | `0.7-1.0` proporcional a horas de ausência |
| `dna.social_burst` | DNA-driven | `socialEnergy * 0.5` |
| `dna.quiet_contemplation` | DNA-driven | `(intelligence + discipline) / 2 * 0.5` |
| `temporal.quiet_observation` | Temporal | `0.5` entre 22h e 5h |
| `idle.breath` | Idle | `0.1` (sempre, baseline) |

DNA-driven behaviors fazem **criaturas diferentes se comportarem diferente** no mesmo contexto temporal.

---

## ✨ Premium (Mascote Plus)

Camada premium **100% implementada em código** — billing real depende só de RevenueCat + lojas.

| Recurso | Free | Plus |
|---------|------|------|
| Evolução visual | Até adolescente | Fases completas + mutações lendárias |
| Chat | 10/dia | Ilimitado |
| Relatório semanal | Preview | Narrativa completa + export |
| Cenários | Quarto | Todos |
| Personalização Sims | Básica | Fluxo completo pós-onboarding |

- **Docs:** [`docs/PREMIUM_STRATEGY.md`](docs/PREMIUM_STRATEGY.md), [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)
- **Env:** copie [`app/mobile/.env.example`](app/mobile/.env.example) → `.env` (`mock` local, `revenuecat` em produção)
- **Testes:** `npm test` na raiz ou `cd app/mobile && npm test` (1779)

---

## 🚀 Quick Start

### Na raiz do monorepo (recomendado)

```bash
npm install --prefix app/mobile
npm run web          # Expo web → http://localhost:8081
npm test             # 1779 testes
npm run typecheck
```

### Web (direto em `app/mobile`)

```bash
cd app/mobile
npm install
npx expo start --web
```

Abre em `http://localhost:8081` (ou use `--port 8090` se 8081 estiver ocupada).

### Android / iOS via Expo Go

```bash
cd app/mobile
npx expo start
# Escaneie o QR code com Expo Go
```

### Plugar OpenAI (BYOK opcional)

1. Gere uma key em https://platform.openai.com/api-keys com **spending limit baixo** (R$ 5)
2. App → **Settings** → **API Key**
3. Chat fica em modo "online", IA respeitando system prompt anti-clínico

> 💡 **Sem chave plugada**, o mascote roda em modo mock (sem IA externa) — totalmente funcional.

---

## 📐 Arquitetura

### Stack

| Camada | Tecnologia |
|---|---|
| **UI** | React Native 0.74 + Expo SDK 51 + Expo Router 3.5 |
| **3D** | React Three Fiber 8.18 + three.js 0.166 + expo-gl |
| **Estado** | Zustand 4.5 |
| **Animação** | Reanimated 3 + Gesture Handler |
| **Persistência** | AsyncStorage + SecureStore (BYOK key) |
| **IA** | OpenAI gpt-4o-mini (BYOK) com 3 camadas de safety, fallback mock determinístico |
| **ML on-device** | TF-IDF embeddings, BM25, sentiment, vector store, Naive Bayes, memory graph (Jaccard + temporal) |
| **Voz procedural** | Web Audio API real-time (Web), no-op gracioso em nativo. Modulada por DNA. |
| **Testes** | Vitest 4 (**1.779 testes**, 110 arquivos) + Maestro E2E + fast-check (property tests) |
| **Build** | Expo CLI (web + Android via Gradle + iOS via Xcode) |

### Estrutura do monorepo

```
mascote/
├── package.json                      ← npm test, typecheck, web (delega ao mobile)
├── .github/workflows/ci.yml          ← typecheck + testes em PR
├── app/
│   ├── mobile/                       ← App Expo / React Native (principal)
│   │   ├── app/                      ← Expo Router (~48 rotas)
│   │   ├── src/                      ← DNA, behavior, IA, game, UI
│   │   ├── tests/                    ← 110 arquivos Vitest, 1779 testes
│   │   └── .maestro/                 ← flows E2E Maestro
│   └── web/                          ← Landing Next.js 14 (pt/en)
├── docs/                             ← Índice: docs/README.md
├── plano_mascote/                    ← Plano estratégico (7 partes)
├── scripts/                          ← Smoke Android + Maestro auxiliar
├── validation/                       ← Validação de mercado (landing + survey)
├── video-gen/                        ← Gravação opcional de demos
└── prototipo-criatura-procedural.html  ← Protótipo HTML standalone (referência)
```

---

## 🛡️ Safety & Ética

### IA — 3 camadas de proteção, sem regredir

```
Mensagem do usuário
   │
   ▼
┌─────────────────────────────────────┐
│  Layer 1: Input Classifier          │
│  • Regex (criticalPatterns)         │
│  • Sentiment (lexicon)              │
│  • Naive Bayes (70 exemplos)        │
│  Fusão: max severity                │
└────────────┬────────────────────────┘
             ▼
   ┌────┬────┬────┬────┐
   │ crit│high│watch│safe│
   └─┬──┴─┬──┴──┬─┴──┬─┘
     │    │     │    │
     ▼    ▼     │    ▼
  CRISIS_REPLY  │  ┌─────────────────────────┐
  (CVV 188      │  │  Layer 2: Memory Recall │
   CAPS, SAMU)  │  │  (sem expor DNA)        │
                ▼  └─────────┬───────────────┘
        DIAGNOSIS_            ▼
        REDIRECT       ┌─────────────────────────┐
                       │  Layer 3: OpenAI BYOK   │
                       │  (system prompt blocks  │
                       │   clinical vocabulary)  │
                       └─────────┬───────────────┘
                                 ▼
                       ┌─────────────────────────┐
                       │  Layer 4: Output filter │
                       │  (badOutputPatterns)    │
                       └─────────┬───────────────┘
                                 ▼
                          Resposta segura
```

### Garantias provadas por testes

- ✅ **DNA bruto NUNCA vaza pra OpenAI** — `tests/security/dna-privacy-ai.test.ts` intercepta `fetch` e valida payload
- ✅ **Dois usuários NUNCA geram criaturas idênticas** — fast-check, 200 runs
- ✅ **Ausência NUNCA pune** — property test 300 runs em decay
- ✅ **Customização NUNCA destrói identidade genética** — multipliers clamped em `[0.7, 1.3]`
- ✅ **Mutações NUNCA mutam DNA** — só visual overlay
- ✅ **Anti-attachment classifier** redireciona "te amo, você é minha única amiga" → ATTACHMENT_REPLY

### Posicionamento — o que **NÃO** é o Mascote

- ❌ **Não é** terapia, diagnóstico ou tratamento
- ❌ **Não substitui** profissional de saúde mental
- ❌ **Não usa** vocabulário clínico: depressão, ansiedade clínica, transtorno, TDAH, diagnóstico, tratamento, trauma
- ✅ **Usa**: se cuidar, rotina, energia, humor, respirar, pausa

Em momentos de **crise emocional**, o app entrega imediatamente:
**📞 CVV 188** (24h, gratuito) · **💬 cvv.org.br** · **🏥 CAPS** · **🚨 SAMU 192**

Tudo sem chamar IA, sem delay, sem cobrança.

---

## ✅ O que está pronto

### Core DLI
- ✅ DNA procedural 11-trait com determinismo absoluto + variação por user_id
- ✅ Mascot3D — corpo procedural, eyes com pupila + highlight + eye tracking, blink, breath, mood-driven posture, bounce on tap, **boca expressiva 5-mood**, aura **mood-reactive**, sparkle burst em mood='empolgado', **pattern visual (plain/spots/stripes/fractal/cells)** via material props
- ✅ Sistema de mutações persistentes (7 marcos, 4 raridades, condições compostas)
- ✅ Pipeline check-in transacional com `withLock` per-user (anti-double-spend)
- ✅ **Behavior Engine — 10 behaviors** (idle, return long/short, milestone, social burst, contemplation, morning, evening, quiet, mood recovery), seletor utility AI, hook React `useBehaviorTick` integrado ao Home loop
- ✅ Mascot3D imperative actions (bounce/celebrate/wander/rest/observe)
- ✅ **Voz procedural Web Audio API** — perfil DNA-driven (baseFreq/vibrato/brightness/scale/syllables/decay/spacing), dispara em tap + mutation unlock. Volume cap 0.2 (ambient). No-op gracioso em nativo.
- ✅ **Memory Graph** — edges typed (`precededBy`, `relatedTo`), Jaccard weights, recall re-ranqueado por conectividade (top-3 hits viram seeds; itens conectados ganham boost). Estende `recall()` existente sem breaking change.

### Customização Sims/Spore
- ✅ 6 morph sliders com cap `[0.7, 1.3]` (eye size/spread, body H/W, aura, pattern)
- ✅ Postura discretizada (frente/neutra/trás)
- ✅ Toggles pra esconder partes (cauda, antenas, espinhos) que DNA habilita
- ✅ Preview ao vivo (Mascot3D atualiza enquanto user mexe)
- ✅ Reset all to defaults

### IA
- ✅ OpenAI gpt-4o-mini BYOK + fallback mock determinístico
- ✅ Memória de longo prazo com TF-IDF / embeddings semânticos
- ✅ Descritores semânticos PT-BR seguros (DNA bruto nunca vaza)
- ✅ Safety ensemble (regex + sentiment + Bayes) com 4 níveis (safe/watch/high/critical)
- ✅ Crisis path com CVV/CAPS/SAMU

### Tela de evolução
- ✅ Timeline biológica das transformações recentes
- ✅ Viewer de genoma colapsível (11 traits com labels PT-BR amigáveis)
- ✅ Próximo marco preview (mutation mais próxima de unlock)
- ✅ Card de "identidade procedural" (descritores DNA + traits morfológicos)
- ✅ "Fase X" linear removida da UI principal

### Gamificação
- ✅ XP / Level / Phase (motor interno, UI não promete "fase Y")
- ✅ Streak com grace days (anti-burnout)
- ✅ Combo 1-5× com decay 24h
- ✅ Daily reward D1-D7 + Mystery Box + Wheel of Fortune
- ✅ 14 acessórios, 9 cenários, 17 achievements

### Qualidade
- ✅ **1.779 testes** passando (110 arquivos)
- ✅ **98.9% coverage** em linhas, 97.4% em branches
- ✅ Typecheck limpo (0 errors)
- ✅ `npm ci` limpo (sem `--legacy-peer-deps`)
- ✅ Maestro E2E (8 flows críticos)
- ✅ Schema migrations v0→v3 com tests de pentest

---

## 🚧 Roadmap

**Próximas fases** (ver [BACKLOG_DLI_V2.md](docs/specs/BACKLOG_DLI_V2.md)):

| Spec | Estado | Esforço |
|---|---|---|
| SPEC-5 Mutations integration | ✅ Completo | — |
| SPEC-1 Evolution screen procedural | ✅ Completo | — |
| SPEC-3 Mascot3D animations | ✅ Completo | — |
| SPEC-2 Customization Sims/Spore | ✅ Completo | — |
| SPEC-4 Behavior Engine | ✅ Completo | — |
| 🔜 Push notifications nativos | Pendente | ~1 sem |
| 🔜 Backend Supabase + sync multi-device | Pendente | ~2 sem |
| 🔜 RevenueCat / StoreKit (billing real) | Pendente | ~2 sem |
| ✅ Voz procedural (Web Audio API) | **Entregue DLI-v5** | — |
| ✅ Shader patterns (fractal/spots/stripes/cells) | **Entregue DLI-v4** | — |
| ✅ Memory graph (Jaccard + temporal) | **Entregue DLI-v5** | — |
| 🔜 Voz nativa (expo-av wireup) | Pendente | ~3 dias |

Detalhes completos: [docs/ROADMAP_DIGITAL_LIVING_IDENTITY.md](docs/ROADMAP_DIGITAL_LIVING_IDENTITY.md)

---

## 📚 Documentação

- 📁 [**docs/README.md**](docs/README.md) — Índice de toda documentação
- 📌 [**CURRENT_STATE.md**](docs/CURRENT_STATE.md) — Estado operacional atual (leia primeiro)
- 📊 [**AUDIT_AAA_COMPLETO.md**](docs/AUDIT_AAA_COMPLETO.md) — Auditoria multi-role em 30 seções (CTO + Game Director + UX + AI + Retention…)
- 🗺️ [**ROADMAP_DIGITAL_LIVING_IDENTITY.md**](docs/ROADMAP_DIGITAL_LIVING_IDENTITY.md) — Roadmap 6 meses + 11 specs com esforço estimado
- 📋 [**BACKLOG_DLI_V2.md**](docs/specs/BACKLOG_DLI_V2.md) — Specs executáveis (sequência, definição de pronto, testes obrigatórios)
- 🏛️ [**PLANO_MIGRACAO_PROCEDURAL_3D.md**](docs/PLANO_MIGRACAO_PROCEDURAL_3D.md) — Migração 2D→3D documentada
- 📸 [**screenshots/2026-05-19/**](docs/screenshots/2026-05-19/) — Evidência visual via Playwright

---

## 🎨 Sistema de personalidades base

4 personalidades-preset com perfis genéticos distintos, + variação procedural única por seed do `user_id`:

| Personalidade | Mascote | Empatia | Disciplina | Curiosidade | Inteligência | Para quem |
|---|---|---|---|---|---|---|
| **Calmo** | Bipo 🌙 | 0.82 | 0.70 | 0.45 | 0.62 | busca pausa, sono, respiração |
| **Motivador** | Zip ⚡ | 0.65 | 0.55 | 0.85 | 0.65 | quer rotina, foco e movimento |
| **Fofo** | Lulu 💛 | 0.95 | 0.40 | 0.60 | 0.50 | presença, carinho, leveza |
| **Sábio** | Aro 📚 | 0.75 | 0.82 | 0.78 | 0.95 | reflexão, leitura, autoconhecimento |

Cada preset é genome base + **`genomeFromPreset(seed, preset, variance=0.1)`** garante que dois "Bipos" do mesmo preset sejam visualmente distintos.

---

## 🤝 Contribuir

Esse é um projeto fechado em desenvolvimento ativo. Para questões técnicas, abra issue.

Antes de qualquer PR (veja também [CONTRIBUTING.md](CONTRIBUTING.md)):
```bash
npm run typecheck     # Deve passar 100%
npm test              # 1779/1779
```

---

## 👥 Time

Felipe Menezes · [@felipemenezes25000-spec](https://github.com/felipemenezes25000-spec)
Co-fundador: Renato

---

<div align="center">

**"Cuide de você. Seu Mascote evolui junto."**

*Em 30 segundos por dia, você cuida de você e ela cresce. Sem cobrança, sem culpa, sem terapia.*

</div>
