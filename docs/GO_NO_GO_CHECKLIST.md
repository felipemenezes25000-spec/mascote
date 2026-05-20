# Checklist Go / No-Go — Mascote

**Objetivo:** decidir com **evidência** (não feeling) se vale **cobrar assinatura**, abrir beta mais amplo ou pivotar — antes de gastar em marketing ou escala.

**Última revisão:** 2026-05-20  
**Relacionados:** [BETA_RELEASE_CHECKLIST.md](BETA_RELEASE_CHECKLIST.md) · [PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md) · [AnalyticsEvents.ts](../app/mobile/src/analytics/AnalyticsEvents.ts)

> **Importante:** thresholds abaixo são **metas de beta fechado (20–50 testers, 2–4 semanas)**. Ajuste após a primeira rodada com dados reais. Nada aqui é garantia de PMF — é critério de **não se enganar**.

### O que “garantir” significa aqui

| Tipo | Significado |
|------|-------------|
| **Garantia de engenharia** | Comportamento no código + testes automatizados — pode ir pra produção sem beta |
| **Garantia de beta** | Só considerado OK com **evidência** de testers reais em device |
| **Não garantível** | Gosto pessoal, viralidade, receita |

Os **5 pilares de assinatura** (seção dedicada abaixo) misturam os dois primeiros: parte já está no repo; parte **só** se prova no beta.

---

## Como usar

1. Marque **Fase 0** antes de enviar build (TestFlight / Play Internal).
2. Durante o beta, exporte métricas semanalmente (planilha ou PostHog/Firebase).
3. Na **semana 4**, preencha a **matriz de veredito** (final do doc).
4. **GO cobrança** só se **todos** os itens obrigatórios da Fase 2 estiverem verdes, os **5 pilares** sem 🔴, e nenhum bloqueador vermelho ativo.

Legenda por item:

| Símbolo | Significado |
|---------|-------------|
| ✅ | Critério atingido (com evidência anexada) |
| 🟡 | Parcial — pode seguir com ressalva documentada |
| 🔴 | Não atingido — **No-Go** para o gate daquela fase |
| ➖ | N/A nesta rodada (ex.: sync remoto no beta 1) |

---

## Fase 0 — Gate para **iniciar** beta (infra mínima)

Sem isso, métricas de retenção e IA **não validam** o produto que será vendido.

### 0.1 Build e distribuição

| # | Critério | Evidência |
|---|----------|-----------|
| 0.1.1 | `eas.json` configurado + build preview iOS e Android | Links EAS + install em ≥2 devices físicos |
| 0.1.2 | `app.json` version/build incrementados | Screenshot ou log do upload |
| 0.1.3 | Ícone + splash + política de privacidade URL pública | URLs nas configurações da loja / onboarding |
| 0.1.4 | Crash rate baseline < 2% em smoke (10 installs) | Sentry/Crashlytics ou relatório manual 48h |

### 0.2 Experiência que será testada

| # | Critério | Evidência |
|---|----------|-----------|
| 0.2.1 | Onboarding completo sem dead-end (Maestro ou roteiro manual) | Vídeo 2min ou checklist assinado |
| 0.2.2 | Mascote 3D carrega OU fallback 2D em < 3s (cold start mediano) | Log `app_opened` + cronômetro em 3 devices |
| 0.2.3 | Check-in + missão + streak funcionam offline | Teste avião mode 5min |
| 0.2.4 | Export de dados funciona (LGPD) | Arquivo exportado + reimport OK |

### 0.3 IA (escolher **um** modo de beta — documentar qual)

| Modo | Quando usar | Obrigatório |
|------|-------------|-------------|
| **A — Proxy deployado** | Valida Plus “de verdade” | `EXPO_PUBLIC_AI_PROXY_URL` + curl 200 + 20 turnos no app |
| **B — Só fallback local** | Beta 1 mais cedo; **não** valida Plus pago | Banner: “IA cloud na próxima versão” |

| # | Critério (modo A) | Critério (modo B) |
|---|-------------------|-------------------|
| 0.3.1 | Proxy responde p95 latência < 4s | Fallback sem crash em 50 mensagens |
| 0.3.2 | Rate limit por tier ativo no servidor | `AIRateLimiter` local respeitado |
| 0.3.3 | Zero vazamento de gene cru em logs/rede | Pentest manual ou teste security existente |

### 0.4 Analytics

| # | Critério | Evidência |
|---|----------|-----------|
| 0.4.1 | Provider real (PostHog/Firebase) **ou** export manual de eventos mock | Dashboard ou JSON semanal |
| 0.4.2 | `consent_analytics` respeitado — quem recusa não envia | Teste com 2 contas |
| 0.4.3 | Funil mínimo instrumentado: `onboarding_completed` → `first_mission_completed` → `app_opened` | Query ou planilha |

**Veredito Fase 0:** 🟢 Iniciar beta · 🔴 Corrigir bloqueadores antes de recrutar

---

## Fase 1 — Durante o beta (semanas 1–4)

### 1.1 Retenção (cohort = quem completou `onboarding_completed`)

Benchmarks wellness / pet (conservadores vs. social):

| Métrica | 🟡 Aceitável | ✅ Meta beta | 🔴 No-Go |
|---------|--------------|--------------|----------|
| **D1** (% que `app_opened` no dia seguinte) | ≥ 45% | ≥ 55% | < 35% |
| **D7** | ≥ 22% | ≥ 30% | < 15% |
| **D14** | ≥ 15% | ≥ 20% | < 10% |
| **D30** (se beta ≥ 4 sem) | ≥ 10% | ≥ 15% | < 8% |

**Como calcular:**  
`D7 = usuários com app_opened entre dia 7 e 8 / cohort onboarding_completed no dia 0`

Eventos: `app_opened`, `user_returned_after_absence` (props `days_away`).

### 1.2 Engajamento (qualidade, não só abertura)

| Métrica | 🟡 | ✅ | 🔴 |
|---------|-----|-----|-----|
| **Check-ins/semana** (mediana entre ativos D7) | ≥ 2 | ≥ 4 | < 1 |
| **Missões completadas** (% ativos D7 com ≥1 `mission_completed`) | ≥ 40% | ≥ 55% | < 25% |
| **Primeira microevolução** (% cohort com `first_microevolution_seen` até D3) | ≥ 35% | ≥ 50% | < 20% |
| **Mutação desbloqueada** (% cohort com `mutation_unlocked` até D14) | ≥ 15% | ≥ 25% | < 8% |
| **Streak ≥ 3** (% cohort com `streak_started` length ≥ 3) | ≥ 20% | ≥ 30% | < 10% |

### 1.3 Pesquisa qualitativa (obrigatório)

Enviar **survey curto** no D7 e D14 (Google Form / Typeform). Mínimo **12 respostas** (60% de 20 testers).

| Pergunta | Escala | ✅ Meta |
|----------|--------|---------|
| “Voltaria amanhã só pelo mascote?” | 0–10 | Média ≥ **7.0** |
| “O mascote parece **seu**, não genérico?” | 0–10 | Média ≥ **7.5** |
| “Check-in parece obrigação ou cuidado gentil?” | 0–10 (10 = gentil) | Média ≥ **8.0** |
| NPS: “Recomendaria a um amigo?” | −100 a 100 | **≥ 25** (ótimo ≥ 40) |

**Sinais qualitativos de No-Go** (mesmo com D7 ok):

- ≥ 3 pessoas dizem “esqueci / não senti falta”
- ≥ 3 dizem chat “repetitivo / robô”
- ≥ 2 relatam culpa ou pressão (contradiz promessa “sem culpa”)

### 1.4 IA (só se Fase 0 modo **A** — proxy ativo)

| Métrica | 🟡 | ✅ | 🔴 |
|---------|-----|-----|-----|
| **Taxa de sucesso** (resposta útil / tentativas) | ≥ 90% | ≥ 95% | < 85% |
| **Latência p95** | < 6s | < 4s | > 8s |
| **Fallback involuntário** (% turnos que caíram em local sem querer) | < 15% | < 8% | > 25% |
| **“Resposta ajudou”** (survey pós-chat, 1–5) | média ≥ 3.5 | ≥ 4.0 | < 3.0 |
| **Repetição percebida** (% que marcam “já vi isso antes” em 5+ msgs) | < 30% | < 15% | > 40% |

**Amostra mínima:** ≥ 15 testers com ≥ 10 mensagens cada (150+ turnos totais).

**Eventos recomendados** (adicionar em `AnalyticsEvents.ts` se ainda não existirem):

```ts
// Sugestão — implementar antes do beta modo A
ai_reply_requested: { source: 'proxy' | 'byok' | 'local'; tier: string };
ai_reply_succeeded: { source; latency_ms: number; tokens_est?: number };
ai_reply_failed: { source; reason: string };
ai_reply_rated: { helpful: boolean; repetition: boolean };
```

**Segurança (obrigatório, qualquer modo):**

| # | Critério |
|---|----------|
| 1.4.S1 | Mensagem de crise dispara `CRISIS_REPLY` — testar 3 frases do roteiro de segurança |
| 1.4.S2 | Nenhum log contém DNA bruto nem texto completo de diário (auditoria manual) |

### 1.5 Polish em dispositivo real

Testar em **matriz mínima** (1 aparelho por linha, 30 min cada):

| Tier | Exemplo | Foco |
|------|---------|------|
| iOS recente | iPhone 12+ | 3D + gestos + chat |
| iOS antigo | iPhone SE 2 / 8 | Fallback 2D, memória |
| Android médio | Pixel / Samsung A54 | 3D estável |
| Android fraco | ≤ 3GB RAM | Sem ANR, fallback aceitável |

| Métrica | 🟡 | ✅ | 🔴 |
|---------|-----|-----|-----|
| **Cold start** (até Home interativa) | < 4s | < 2.5s | > 6s |
| **FPS mascote 3D** (percepção 30s) | Raramente trava | Fluido | Inutilizável > 5s |
| **Crash-free sessions** | ≥ 98% | ≥ 99% | < 97% |
| **ANR Android** (se aplicável) | 0 em 30min | 0 | ≥ 1 |
| **Bateria** (30min uso normal) | Aceitável* | Sem aquecimento forte | Dreno > 15% em 30min |

\*Subjetivo — anotar modelo + % bateria no formulário de teste.

**Checklist manual polish (todos ✅ em ≥3/4 devices):**

- [ ] Tap / long-press / pet no mascote respondem sem lag perceptível
- [ ] Teclado não cobre campo de chat
- [ ] Paywall demo mostra banner amarelo se `isDemoBilling()`
- [ ] Textos PT sem truncamento grotesco em telas pequenas
- [ ] Modo escuro legível (se suportado)

---

## Fase 1.6 — Os 5 pilares de assinatura (obrigatório para GO cobrança)

Critérios que respondem: *“eu pagaria R$ 19,90 porque…?”*  
Cada pilar tem **garantia de engenharia** (o que o código já promete) e **prova no beta** (o que precisa de gente real).

**Regra:** para **GO cobrança**, os 5 pilares precisam estar **✅ ou 🟡** — **nenhum 🔴**.

---

### Pilar 1 — A criatura parece **minha**, não avatar genérico

*Por quê:* DNA + gestos + evolução visível.

#### Garantia de engenharia (verificar antes do beta)

| # | Critério | Onde validar |
|---|----------|--------------|
| P1.E1 | Genoma seedado por `user_id` — dois users ≠ mesma criatura | `tests/lib/dna/*`, property tests seed |
| P1.E2 | Drift de hábito **nunca negativo** (sem punir ausência) | `habitToGene.ts`, fast-check `genome.test.ts` |
| P1.E3 | Gestos expostos na Home: tap, double, long, pet | `MascotInteractive` + `HomeHero.tsx` |
| P1.E4 | Microevolução / mutação disparam feedback visual + evento | `first_microevolution_seen`, `mutation_unlocked` |
| P1.E5 | DNA bruto **nunca** sai do device em prompts/rede | `PromptBuilder`, testes security AI |

#### Prova no beta

| Métrica / teste | 🟡 | ✅ | 🔴 |
|-----------------|-----|-----|-----|
| Survey: “O mascote parece **seu**, não genérico?” | ≥ 6.5 | ≥ **7.5** | < 6.0 |
| `first_microevolution_seen` até D3 | ≥ 35% cohort | ≥ **50%** | < 20% |
| `mutation_unlocked` até D14 | ≥ 15% | ≥ **25%** | < 8% |
| **Teste lado a lado:** 2 testers mostram Home — criaturas claramente distintas | 1 par ok | **≥ 3 pares** documentados (foto/vídeo) | Parecem iguais |
| Gestos usados (% ativos D7 com ≥3 interações no mascote) | ≥ 25% | ≥ **40%** | < 15% |

**Evento sugerido:** `mascot_gesture: { kind: 'tap'|'double'|'long'|'pet' }`

**No-Go qualitativo:** ≥ 3 respostas “parece skin / avatar de app genérico”.

---

### Pilar 2 — Check-in diário **< 60s** e não parece dever

*Por quê:* hábito gentil, não culpa.

#### Garantia de engenharia

| # | Critério | Onde validar |
|---|----------|--------------|
| P2.E1 | Drift só reforça genes — sem decay punitivo abaixo de 0.5 | `genome.ts`, comentário “sem culpa” |
| P2.E2 | Notificações sem tom de culpa (“você falhou”) | Revisar `notify.ts`, `proactive.ts` — checklist copy |
| P2.E3 | Streak quebra sem apagar progresso/DNA | Testes streak + export após gap |
| P2.E4 | Fluxo check-in: Home → hábito → confirma sem telas extras obrigatórias | Roteiro Maestro `home-checkin` ou manual |

#### Prova no beta

| Métrica / teste | 🟡 | ✅ | 🔴 |
|-----------------|-----|-----|-----|
| Survey: “Check-in = cuidado gentil?” (0=dever, 10=gentil) | ≥ 7.0 | ≥ **8.0** | < 6.0 |
| **Teste cronometrado** (≥ 8 testers): fluxo completo 1 check-in | mediana ≤ 75s | mediana ≤ **60s** | mediana > 90s |
| % testers com mediana ≤ 60s | ≥ 60% | ≥ **80%** | < 50% |
| Feedback “me sinto culpado se não abro” | ≤ 2 pessoas | ≤ **1** | ≥ 4 |
| Check-ins/semana (mediana ativos D7) | ≥ 2 | ≥ **4** | < 1 |

**Evento sugerido:** `checkin_completed: { habit_kind: string; duration_ms: number; path: 'home'|'mission' }`

**Teste de regressão de culpa (manual, 1x por release):**

- [ ] Ficar 3 dias sem abrir → reabrir → mascote **não** exibe copy punitiva
- [ ] Streak zerado → DNA e conquistas **intactos** (screenshot export antes/depois)

---

### Pilar 3 — Chat Plus **útil**, não repetitivo, **rápido**

*Por quê:* proxy + personalidade — não só fallback local vendido como Plus.

#### Garantia de engenharia

| # | Critério | Onde validar |
|---|----------|--------------|
| P3.E1 | Plus usa `ProxyMascotAI` quando URL configurada | `ProxyMascotAI.ts`, env |
| P3.E2 | `AIRateLimiter` + `AICostGuard` + `AIResponseValidator` antes da API | `tests/ai/production-guards.test.ts` |
| P3.E3 | Fallback local distinto por personalidade (`PersonalityVoice`) | `LocalFallbackAI.ts` |
| P3.E4 | Free não é paywalled no chat — degrada pra local, não bloqueia | `paywall-triggers.ts`, `PREMIUM_STRATEGY.md` |
| P3.E5 | Build cobrado: **proibido** vender Plus com só fallback se copy promete IA inclusa | `isDemoBilling()` false + proxy URL set |

#### Prova no beta (modo A obrigatório para GO cobrança)

| Métrica | 🟡 | ✅ | 🔴 |
|---------|-----|-----|-----|
| Latência p95 proxy | < 6s | < **4s** | > 8s |
| Taxa sucesso resposta | ≥ 90% | ≥ **95%** | < 85% |
| Fallback involuntário | < 15% | < **8%** | > 25% |
| Survey: “Chat ajudou / não repetitivo” (1–5) | ≥ 3.5 | ≥ **4.0** | < 3.0 |
| % com “já vi essa frase” em 5+ msgs | < 30% | < **15%** | > 40% |
| Turnos Plus/tester (amostra) | ≥ 100 total | ≥ **150** | < 50 |

**No-Go:** vender Plus com modo B (só local) sem atualizar App Store / paywall.

Ver também **§ 1.4 IA**.

---

### Pilar 4 — Relatório semanal com **insight** (não só contador)

*Por quê:* justifica R$ 19,90 — algo que Notes não dá sozinho.

#### Garantia de engenharia

| # | Critério | Onde validar |
|---|----------|--------------|
| P4.E1 | Gerador narrativo existe | `weeklyReportGenerator.ts` |
| P4.E2 | Free = prévia; completo = Plus | `PaywallRules` → `full_weekly_report` |
| P4.E3 | Evento `weekly_report_viewed` com `week_iso` | `AnalyticsEvents.ts` |
| P4.E4 | Relatório usa padrões da semana (streak, hábitos, tom) — não só “você fez N check-ins” | Revisão manual de 3 relatórios gerados |

#### Prova no beta

| Métrica | 🟡 | ✅ | 🔴 |
|---------|-----|-----|-----|
| % ativos D7 que abriram relatório (`weekly_report_viewed`) | ≥ 30% | ≥ **45%** | < 20% |
| Survey (quem abriu): “Aprendi algo que não colocaria no Notes” (0–10) | ≥ 6.0 | ≥ **7.0** | < 5.0 |
| Survey: “Vale pagar só pelo relatório?” (trial/Plus) | ≥ 40% sim/talvez | ≥ **55%** | < 25% |
| **Blind review:** 2 relatórios anonimizados — time marca ≥1 insight acionável cada | 1/2 | **2/2** | 0/2 |

**No-Go qualitativo:** ≥ 3 respostas “é só gráfico / contador de streak”.

**Plus em GO cobrança:** relatório **completo** desbloqueado e export se prometido no paywall.

---

### Pilar 5 — Cancelar é **trivial** e **não perco** DNA / histórico

*Por quê:* confiança — promessa explícita do produto.

#### Garantia de engenharia

| # | Critério | Onde validar |
|---|----------|--------------|
| P5.E1 | Cancel = fluxo da loja (Apple/Google); app não cria fricção extra | `SubscriptionService.cancel` → provider |
| P5.E2 | Mensagem honesta se user cancela compra | `PurchaseErrorMapper` — “mascote continua do jeitinho que estava” |
| P5.E3 | Downgrade tier **não** apaga genoma, streak histórico, conquistas | Teste integração: tier free após cancel mock + `exportAll` |
| P5.E4 | Export sempre disponível (LGPD) | `settings.tsx` + `exportAll` |
| P5.E5 | Copy paywall: “Cancele quando quiser” + link política | [COMMERCIAL_COPY.md](COMMERCIAL_COPY.md) |
| P5.E6 | Restore purchases funcional com RC ativo | `RestorePurchasesService.ts` + sandbox |

#### Prova no beta (obrigatório antes de GO cobrança)

| Teste | Critério |
|-------|----------|
| **Roteiro cancel (≥ 3 testers)** | Iniciar trial → usar app 3 dias → cancelar na loja sandbox → reabrir app |
| DNA após cancel | Hash/export do genoma **idêntico** antes/depois (diff vazio em `genome`) |
| Histórico | `totalCheckins`, conquistas, memórias locais **preservados** |
| UX cancel | ≤ 3 taps até instrução “gerenciar assinatura na loja” em Settings |
| Restore | 1 tester cancela → reinstall → restore → tier Plus volta |
| Survey: “Confio que mantenho minha criatura se cancelar” (0–10) | ✅ ≥ **8.0**, 🟡 ≥ 7.0, 🔴 < 6.5 |

**Eventos sugeridos:**

```ts
subscription_cancelled: { tier: string; via: 'store' | 'expiry' };
subscription_restored: { tier: string; success: boolean };
```

**No-Go:** qualquer tester perde DNA, streak ou conquistas após cancel/expire em sandbox.

---

### Resumo dos 5 pilares (preencher na semana 4)

| Pilar | Engenharia (pré-beta) | Beta (evidência) | Status |
|-------|------------------------|------------------|--------|
| 1 — Criatura minha | P1.E1–E5 | Survey + evolução + gestos | ⬜ |
| 2 — Check-in gentil | P2.E1–E4 | Cronômetro + survey culpa | ⬜ |
| 3 — Chat Plus | P3.E1–E5 | Modo A + latência + repetição | ⬜ |
| 4 — Relatório insight | P4.E1–E4 | Abertura + survey + blind review | ⬜ |
| 5 — Cancel / manter DNA | P5.E1–E6 | Roteiro sandbox 3+ testers | ⬜ |

---

## Fase 2 — Gate **cobrança real** (RevenueCat + lojas)

**Pré-requisito:** Fase 1 com pelo menos 🟡 em retenção **e** nenhum 🔴 em segurança/polish.

### 2.1 Infra de monetização (todos obrigatórios)

| # | Item | Ref |
|---|------|-----|
| 2.1.1 | RevenueCat SDK linkado + sandbox iOS/Android OK | [PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md) |
| 2.1.2 | Trial 7d → renovação → cancel → **restore** testados | Log + screenshot RC |
| 2.1.3 | Webhook atualiza `subscription_status` no backend | Teste refund simulado |
| 2.1.4 | Paywall **sem** mock em build de produção (`isDemoBilling() === false`) | Build release |
| 2.1.5 | Copy App Store alinhado a [COMMERCIAL_COPY.md](COMMERCIAL_COPY.md) | Revisão jurídica leve |

### 2.2 Métricas de monetização (beta com cobrança ou trial real)

Cohort = usuários que viram `paywall_viewed` pelo menos 1×.

| Métrica | 🟡 | ✅ | 🔴 |
|---------|-----|-----|-----|
| **Paywall view rate** (ativos D7) | ≥ 25% | ≥ 35% | < 15% |
| **Trial start / paywall view** | ≥ 10% | ≥ 15% | < 5% |
| **Trial → paid** (D14 após trial) | ≥ 15% | ≥ 25% | < 8% |
| **Restore success** (testes forçados) | 100% em lab | 100% | qualquer falha silenciosa |

**Preço de referência:** Plus R$ 19,90/mês · R$ 149,90/ano ([PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md)).

**Regra de ouro:** se D7 < 20%, **não** escalar ads pagos — arrumar retenção antes.

### 2.3 Valor percebido do Plus (obrigatório antes de GO)

Survey só para quem iniciou trial (mín. 8 respostas):

| Pergunta | ✅ |
|----------|-----|
| “O Plus vale o preço?” | ≥ 60% “sim” ou “talvez” |
| “Cancelaria se fosse R$ 19,90 hoje?” | ≤ 40% “sim, cancelaria” |

**Funcionalidades Plus que precisam funcionar no build cobrado:**

| Feature | Beta 1 pode ser N/A? |
|---------|----------------------|
| IA via proxy (cotas Plus) | **Não** — bloqueador |
| Memória expandida | Não |
| Mutações raras/épicas visíveis | Não |
| Relatório semanal Plus | 🟡 preview ok se core ok |
| Sync multi-device | 🟡 pode adiar **se** comunicado na loja |

---

## Fase 3 — Gate **loja pública** (opcional pós-cobrança)

| # | Critério |
|---|----------|
| 3.1 | 2 rodadas de beta sem regressão de crash |
| 3.2 | D30 ≥ 12% em cohort pago ou orgânico ≥ 100 installs |
| 3.3 | Cancel rate mensal Plus ≤ 12% |
| 3.4 | npm audit crítico resolvido ou plano SDK upgrade documentado |
| 3.5 | Suporte: email ou form com SLA < 48h úteis |

---

## Matriz de veredito (preencher na semana 4)

| Dimensão | Status | Notas / link evidência |
|----------|--------|-------------------------|
| Fase 0 — Infra beta | ⬜ | |
| Retenção D1/D7/D14 | ⬜ | |
| Engajamento hábitos | ⬜ | |
| Survey qualitativo | ⬜ | |
| **Pilar 1** — Criatura minha | ⬜ | |
| **Pilar 2** — Check-in gentil | ⬜ | |
| **Pilar 3** — Chat Plus | ⬜ | |
| **Pilar 4** — Relatório insight | ⬜ | |
| **Pilar 5** — Cancel / DNA | ⬜ | |
| Polish dispositivos | ⬜ | |
| Segurança / ética | ⬜ | |
| Monetização (se aplicável) | ⬜ | |

### Decisões

| Veredito | Condição |
|----------|----------|
| **GO — cobrar assinatura** | Fase 0 ✅ · Retenção sem 🔴 · Engajamento ≥ 🟡 · **5 pilares sem 🔴** (P3 exige modo A) · Polish sem 🔴 · Fase 2 infra ✅ · Trial→paid ≥ 🟡 |
| **GO — mais beta, sem cobrar** | Retenção promissora mas IA ou RC não prontos — estender 2 semanas |
| **NO-GO — não cobrar ainda** | Qualquer 🔴 em retenção D7, segurança, crash, ou IA prometida quebrada |
| **PIVOT** | D7 < 15% **e** NPS < 10 **e** feedback “não sinto falta” dominante — revisar loop core (mascote ↔ hábito) antes de preço |

---

## Template semanal (copiar para planilha)

| Semana | Installs | Onboarding OK | D1 | D7 | P1 minha | P2 <60s | P3 chat | P4 report | P5 cancel OK | Crashes | Notas |
|--------|----------|---------------|----|----|----------|---------|---------|-----------|--------------|---------|-------|
| 1 | | | | | | | | | | | |
| 2 | | | | | | | | | | | |
| 3 | | | | | | | | | | | |
| 4 | | | | | | | | | | | |

---

## O que **não** está neste checklist (de propósito)

- Garantia de receita ou LTV — depende de aquisição e preço
- Comparação direta com Finch/Habitica em números públicos
- Aprovação editorial App Store
- Escala 10k+ usuários (ver upgrade Expo SDK em [SECURITY_AUDIT.md](SECURITY_AUDIT.md))

---

## Próximos passos sugeridos no repo

1. Plugar analytics real (PostHog/Firebase) e validar eventos da Fase 1 em staging.
2. ~~Adicionar eventos `ai_reply_*`, `checkin_completed`, `mascot_gesture`, `subscription_*`~~ ✅ + UI `ChatReplyRating` no chat (`ai_reply_rated`).
3. ~~Teste integração **P5**~~ ✅ `tests/subscription/pillar5-cancel-dna.test.ts`
4. Roteiro Maestro ou PDF **cronômetro P2** (check-in < 60s) para testers.
5. Após beta 1, revisar thresholds com dados reais e commitar ajuste datado no topo deste arquivo.
