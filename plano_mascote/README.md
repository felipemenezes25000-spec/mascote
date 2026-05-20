# Plano Mascote — Documento de Execução Completo

**Data:** 2026-05-16
**Autor:** Comitê de especialistas (CEO, CPO, CTO, PM, UX/UI, Game Designer, IA, LGPD, Stores, RevOps, Growth, Analytics, Investidor cético, Dev mobile, Backend, Branding, Segurança emocional, Copy, QA)
**Para:** Felipe + Renato (fundadores Mascote)
**Origem:** Resposta ao prompt mega `prompt_mega_mascote_100000_linhas.txt`

> **Implementação atual:** código em `app/mobile/`, landing em `app/web/`, estado técnico em `docs/CURRENT_STATE.md`.

---

## Como ler este documento

O plano foi dividido em 7 partes. Cada parte cobre um conjunto coerente das 57 seções obrigatórias. Leia em ordem, mas use o índice abaixo para pular ao módulo que precisa agora.

| Parte | Arquivo | Cobre |
|---|---|---|
| 1 | [parte_1_estrategia.md](parte_1_estrategia.md) | Resumo executivo · pitches (1 frase, 30s, 2min) · posicionamento · público-alvo · personas · JTBD · proposta de valor |
| 2 | [parte_2_mercado_e_stack.md](parte_2_mercado_e_stack.md) | Concorrentes · diferenciação · stack recomendada (sem Flutter) · arquitetura técnica · banco de dados |
| 3 | [parte_3_produto.md](parte_3_produto.md) | Prompt IA · segurança IA · UX/UI · sistema de mascotes · XP · streak · evolução visual · missões · relatórios · push |
| 4 | [parte_4_monetizacao_e_growth.md](parte_4_monetizacao_e_growth.md) | Assinaturas · paywall · landing · formulário de validação · anúncios · conteúdo orgânico · métricas · analytics |
| 5 | [parte_5_execucao.md](parte_5_execucao.md) | Roadmap 48h/7d/30d/90d · backlog · user stories · PRD · doc dev · doc designer · doc investidor |
| 6 | [parte_6_compliance_e_financeiro.md](parte_6_compliance_e_financeiro.md) | LGPD · App Store · Google Play · QA · custos · modelo financeiro · experimentos · riscos · go/no-go |
| 7 | [parte_7_marca_e_fechamento.md](parte_7_marca_e_fechamento.md) | Branding · copywriting · i18n · acessibilidade · ética · crítica do investidor · plano final |

---

## TL;DR (para o Felipe ler em 90 segundos)

**Veredito stack:** A hipótese inicial (React Native + Expo + TypeScript / Firebase / OpenAI / RevenueCat) é **aprovada com 3 ajustes**:
1. Use **Supabase** no lugar do Firebase se quiser SQL relacional (XP/streak/cohort ficam mais fáceis). Firebase ainda é OK se prioridade é velocidade pura.
2. **OpenAI gpt-4o-mini como default** com fallback Claude Haiku via roteador no backend Node. Cacheie respostas frequentes.
3. **Rive** > Lottie para o mascote (state machines = transições emocionais sem código).

**Veredito produto:** O loop "check-in → XP → reação visível do mascote → missão → retorno amanhã" é forte, **mas** o risco fatal é confundir wellness com saúde mental clínica. Linguagem precisa ser policiada por whitelist de palavras a partir do dia 1.

**Veredito go-to-market:** Não construa app antes da validação. **48h:** landing + formulário + 2 anúncios. **7 dias:** 200 inscritos na lista + 30 entrevistas. **30 dias:** beta fechado com 50 pessoas. **90 dias:** soft launch pago se métricas baterem D7 ≥ 25% e LTV/CAC ≥ 1.5.

**Crítica do investidor:** "Por que um Tamagotchi com IA é negócio defensável quando OpenAI pode lançar isso em 6 meses?" → Defesa: dados de hábito longitudinais + IP de personalidades + comunidade. Não defesa: tecnologia.

**Critério de matar o projeto:** se em 30 dias o D7 do beta ficar abaixo de 15%, ou se o CAC blended ficar acima de R$ 80 sem caminho claro para R$ 30, **pivotar ou encerrar**.

---

## Regras de leitura

- Tabelas marcadas **P0/P1/P2/P3** são prioridade absoluta. P0 = bloqueia lançamento. P3 = pós-90 dias.
- Onde aparece "Critério de aceite", trate como Definition of Done. Sem isso pronto, a feature não foi entregue.
- Linguagem proibida no produto: "diagnóstico", "cura", "tratamento", "doença", "transtorno", "depressão", "ansiedade clínica", "TDAH", "psicólogo substituto", "remédio digital". Use whitelist no copy: "autocuidado", "bem-estar", "hábito", "rotina", "companhia", "energia", "humor", "missão", "evolução".
- Onde houver decisão ainda aberta, está marcado como `[DECISÃO PENDENTE]` com opções e recomendação.

---

## Status de decisões críticas

| # | Decisão | Status | Recomendação |
|---|---|---|---|
| D01 | Stack mobile | **Decidido** | React Native + Expo + TypeScript |
| D02 | Backend | `[DECISÃO PENDENTE]` | Supabase (recomendado) ou Firebase |
| D03 | Provedor IA | **Decidido** | OpenAI gpt-4o-mini + fallback Claude Haiku |
| D04 | Animação mascote | **Decidido** | Rive (state machine) |
| D05 | Paywall | **Decidido** | RevenueCat |
| D06 | Push | **Decidido** | Expo Notifications (MVP) → FCM nativo (escala) |
| D07 | Analytics | **Decidido** | Firebase Analytics (MVP) + PostHog (a partir do beta) |
| D08 | Landing | **Decidido** | Next.js 14 + Tailwind, deploy Vercel |
| D09 | Painel admin | **Decidido** | Next.js (mesmo monorepo da landing) |
| D10 | Preço inicial | `[DECISÃO PENDENTE]` | R$ 19,90/mês com trial 7 dias |
| D11 | Personalidade default no onboarding | `[DECISÃO PENDENTE]` | Quiz de 4 perguntas escolhe |
| D12 | Idioma de lançamento | **Decidido** | PT-BR only no MVP, EN no mês 3 |

---

## Como atualizar este documento

Cada parte é um arquivo `.md` editável. Quando uma decisão pendente for resolvida, atualize a tabela acima e o trecho correspondente na parte. Mantenha as datas das decisões no final de cada arquivo.
