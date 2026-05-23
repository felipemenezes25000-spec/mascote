# Plano de Validação Mascote — Retroativo

**Data:** 2026-05-19
**Status:** Cenário "validação invertida" — o app já está em estado 8.5/10
sem que a validação de mercado tenha sido feita conforme o plano original
(48h: landing + ads; 7d: 200 inscritos; 30d: beta 50). Este documento
endereça esse gap em modo de **validação acelerada paralela ao soft launch**.

---

## O que precisa ser validado AGORA (antes de paid ads)

| # | Hipótese | Como validar | Sucesso |
|---|---|---|---|
| H1 | Existe demanda real por wellness com mascote em PT-BR | Landing + waitlist + traffic orgânico de 100 visitas | ≥ 15% conversão visita→inscrição |
| H2 | Personas (Carolina, Mateus, Letícia) descrevem usuários reais | 10 entrevistas qualitativas com inscritos | ≥ 6/10 ressoam com pelo menos uma persona |
| H3 | Preço R$ 9,90-19,90/mês é defensável | Survey + price-anchoring no funnel | ≥ 30% dizem "pagaria por isso" no range |
| H4 | Loop "check-in → mascote evolui" gera D7 ≥ 25% | Closed alpha 50 testers, 14 dias | D7 ≥ 25%, D14 ≥ 15% |
| H5 | Tom de voz PT-BR é viral em TikTok/Instagram | 5 vídeos orgânicos com mascote/screens | ≥ 1 vídeo com 50k+ views |

---

## Cronograma (4 semanas, paralelo a polish do app)

**Semana 1 (sprint validação):**
- Deploy landing em mascote.app (skeleton em `docs/validation/landing/`)
- Configurar form de waitlist + survey via Tally/Google Forms (template em `survey-template.md`)
- Lançar 1 ad de R$ 200 no Meta para PT-BR feminino 22-38, interesse "self-care"
- Postar 3 vídeos orgânicos no TikTok

**Semana 2:**
- 10 entrevistas qualitativas (~30 min cada) com inscritos da waitlist
- Medir: tempo de leitura na landing, % completion da survey
- Cruzar respostas com persona hypotheses

**Semana 3:**
- Closed alpha: convidar 50 da waitlist com APK signed (EAS Build)
- Instrumentar: D1, D3, D7 (via telemetria local + survey de check-in)
- Coletar feedback qualitativo em DM/email

**Semana 4:**
- Análise consolidada: rodar go/no-go check
- Se D7 ≥ 25% E LTV/CAC ≥ 1.5 → escalar paid ads
- Se D7 < 15% → pivotar mecânica de retenção (Welcome Pack, onboarding curto)
- Entre: ajustar copy, paywall, push frequency

---

## Métricas instrumentadas (acompanhamento contínuo)

### Funnel pré-app (landing → install)
- visit → email captured (target 15%)
- email captured → invite accepted (target 40%)
- invite accepted → APK installed (target 70%)
- APK installed → onboarding completed (target 80%)

### Funnel pós-install (D0 → D30)
- D0: onboarding completion rate (target 80%)
- D1: open the app (target 50%)
- D3: ≥ 1 check-in in last 3d (target 35%)
- D7: ≥ 1 check-in in last 7d (target 25%)
- D14: ≥ 1 check-in in last 14d (target 18%)
- D30: ≥ 1 check-in in last 30d (target 12%)

### Engagement qualitativo
- Avg checkins/active-day (target ≥ 1.5)
- Streak distribution (median, p90)
- Personality split (% Calmo / Motivador / Fofo / Sábio)

### Health do produto
- Crash-free rate (target ≥ 99.5%)
- Cold start time p50/p95 (target < 2.0s / < 4.0s)
- Erros de IA por usuário/dia (target < 0.05)

---

## Critério de go/no-go ao fim do mês 1

| Métrica | Verde | Amarelo | Vermelho |
|---|---|---|---|
| D7 retention | ≥ 25% | 15–24% | < 15% |
| Survey "pagaria" | ≥ 30% | 15–29% | < 15% |
| Persona match | ≥ 6/10 | 3–5/10 | < 3/10 |
| Crash-free | ≥ 99.5% | 98–99.4% | < 98% |

- **Verde:** escalar ads (orçamento R$ 30-50k/60 dias para distribuição)
- **Amarelo:** rodar 1 ciclo de fix (onboarding/welcome pack/paywall) + revalidar em 14 dias
- **Vermelho:** pivotar tese ou encerrar — `docs/plano/parte_6` define gates de morte

---

## Como reportar (consolidação semanal)

A cada sexta-feira, atualizar `docs/validation/results.md` (criar) com:
- Métricas da semana vs anterior
- Trechos qualitativos relevantes (anonimizados)
- Hipóteses fortalecidas / refutadas
- Decisão da semana (manter, ajustar, pivotar)

---

## Arquivos relacionados

- `landing/index.html` — landing page deployável (Vercel/Netlify/GitHub Pages)
- `landing/styles.css` — styles base alinhados à marca
- `survey-template.md` — 14 questões prontas para Tally / Google Forms
- `metrics.md` — definições operacionais de cada métrica

---

## Reconciliação com o plano original

O `docs/plano/parte_5_execucao.md` previa a sequência:
- Dia 1-2: landing + form + 2 ads (NÃO FEITO)
- Dia 3-7: 200 inscritos + 30 entrevistas (NÃO FEITO)
- Dia 8-30: closed beta 50 (NÃO FEITO)
- Dia 31+: paid scale OU pivote (NÃO ATINGIDO)

A construção do MVP foi feita em paralelo, o que **inverteu** a sequência. Este
plano de validação acelerada serve como ponte: fazer em 4 semanas o que deveria
ter sido feito em 30 dias antes do código. **A boa notícia:** o app é
defensável, então a validação serve como gate de scale, não de viabilidade.
