# Garantias de produto — Mascote

> Testes de produto não são UX manual. São **promessas travadas em código**.
> Se um destes testes falhar, o app deixou de cumprir o que dissemos pro usuário.

**Rodar todas:**

```powershell
npm --prefix app/mobile run test:guarantees
```

**Status atual (2026-05-20):** 75/75 passando (16 + 14 + 20 + 25).

---

## As 4 promessas

| # | Promessa | Arquivo | Testes |
|---|---|---|---|
| 1 | "Essa criatura é minha, não é avatar genérico" | [g1-creature-is-mine.test.ts](../app/mobile/tests/guarantees/g1-creature-is-mine.test.ts) | 16 |
| 2 | "Check-in diário leva <60s e não pune" | [g2-checkin-gentle.test.ts](../app/mobile/tests/guarantees/g2-checkin-gentle.test.ts) | 14 |
| 3 | "Chat Plus é útil (não repetitivo) e rápido" | [g3-chat-plus.test.ts](../app/mobile/tests/guarantees/g3-chat-plus.test.ts) | 20 |
| 4 | "Potencial de assinar pós-beta preservado" | [g4-subscription-potential.test.ts](../app/mobile/tests/guarantees/g4-subscription-potential.test.ts) | 25 |

---

## Garantia 1 — criatura única, não genérica

**O que travamos:**

- 200 user_ids → ≥ 180 paletas string distintas (90%+) — criaturas reconhecivelmente diferentes
- 200 user_ids → ≥ 4 buckets de hue (espectro wellness; design intencional)
- 100 user_ids → ≥ 90 morfologias com alguma trait visual diferente
- Mesmo uid → SEMPRE mesma paleta + morfologia (determinismo)
- 20 dias de hábito X → delta de gene **mensurável** (≥ 0.15) — evolução é visível, não cosmética
- Drift NUNCA regride (`fast-check` 100 runs)
- Decay NUNCA cruza 0.5 (`fast-check` 300 runs)
- Archetype determinístico — 4 personalidades preset → ≥ 3 archetypes distintos
- generateCreatureName: 50 seeds → ≥ 25 nomes distintos (não cair em 5 stereotypes)

**Se quebrar, isso voltou a ser um avatar genérico.** Investigue:
- Mudanças em `paletteFromGenome` / `morphologyFromGenome` reduzindo dispersão
- Mudanças em `applyHabitDrift` que regrediram intensidade
- Mudanças em `applyDecay` que cruzaram 0.5

---

## Garantia 2 — check-in gentil, não pune

**O que travamos:**

- `replies.ts` source NUNCA contém padrões punitivos diretos: "deveria ter", "decepcionou", "fracassou", "preguiçoso", "abandonou", "vergonha", "obrigado a", "sua culpa", "você é mau/ruim/terrível", "nunca vai conseguir"
- `safety.ts` (replies de crise) idem
- Decay NUNCA atravessa 0.5 (200 propriedades)
- Genome neutro é PONTO FIXO sob decay (não deriva nem sobe)
- Streak grace cobre 1-2 dias de falta sem zerar
- Streak quebrada reinicia com `INITIAL_GRACE_AFTER_BROKEN=2` (já tem proteção do começo)
- `reactToReturn` behavior em 1d/7d/30d → SEMPRE acolhedor ("bom te ver", "fiquei aqui"), NUNCA cobrança ("cadê você", "desapareceu")
- TODOS os `DEFAULT_BEHAVIORS` passam no scan punitivo
- Drift de hábito ISOLADO (sem streak) ainda reforça o gene — não exige continuidade
- Intensity=0 NÃO penaliza (não há culpa por intensidade baixa)

**Se quebrar, o app virou cobrança.** Investigue:
- Copy nova adicionada em `replies.ts` ou `safety.ts` com termo banido
- Mudança em `applyDecay` quebrando o piso de 0.5
- Mudança em `reactToReturn` que adicionou cobrança
- Mudança em `nextStreakState` que removeu grace

---

## Garantia 3 — Chat Plus útil, não repetitivo, rápido

**O que travamos:**

- **Variedade:** cada personalidade tem ≥ 3 openers distintos
- **Determinismo:** mesmo `mascotName` → mesmo opener (não-random sem seed, debuggável)
- **Conciso:** reply curto vira frase com prefix+closer; reply longo (>120) preserva
- **Rate limit honesto:**
  - free: limite diário > 0 (tem chat) e definido (cota visível)
  - plus_monthly / plus_annual: `limit === null` (ilimitado prático)
- **Cost guard:**
  - free budget conservador (≥ 5 turnos, < 50k tokens)
  - plus budget ≥ 100k tokens (proteção runaway, nunca alcança uso humano legítimo)
  - Gastar tudo → razão honesta (não "ERROR 500")
- **Validator de resposta:**
  - Vazia → SAFE_FALLBACK + flag watch
  - URL → rejeitada (anti-phishing)
  - ```` ``` ```` (markdown code) → rejeitada
  - `<script>` → rejeitada (XSS guard)
  - Resposta saudável → passa
  - `toAiResponse` marca `source=fallback` se inválida
- **Performance:**
  - `PROXY_TIMEOUT_MS` ≤ 30s (UX: nunca trava)
  - `AbortController` usado (cancela request em timeout)

**Se quebrar, chat virou ChatGPT genérico ou lento.** Investigue:
- `PERSONALITY_OPENERS` foi enxugado pra < 3 por personalidade
- `applyPersonalityVoice` deixou de variar com seed
- Rate limit/cost guard tiveram defaults perigosos
- Timeout aumentou demais ou `AbortController` foi removido

---

## Garantia 4 — vontade de assinar não morre antes da hora

**O que travamos:**

- **Free nunca bloqueado:**
  - Check-in não gateia por entitlement
  - Preview de relatório semanal sempre OK
  - Cenário padrão (`room`) sempre OK
  - Chat existe (com cota, não bloqueio)
  - Evolução até `adolescente` sem barreira
- **Trial mock end-to-end:**
  - `subscribe('plus_monthly')` em demo → success simulado
  - Tier persiste em local repo
  - `hasEntitlement('plus_monthly', 'premium' | 'ai_plus')` true
  - `hasEntitlement('plus_annual', 'legendary')` true
  - cancel volta pra free, **mantém dados**
- **Restore preserva tier:**
  - Em demo: mensagem honesta ("Modo demo: ... sem cobrança real")
  - Em demo sem assinatura: "Nenhuma assinatura salva neste dispositivo"
- **Cancel preserva DNA + memórias + progresso:**
  - Mascote (xp, level, phase) persiste após cancel
  - Memórias, achievements isolados de tier
- **Demo mode honesto:**
  - `isDemoBilling()` true em test/dev
  - `isMockInProductionBuild()` false em test (NODE_ENV != production)
  - `evaluatePaywall().demoMode` true em test (UI pode banner)
- **Erros viram mensagem amigável (PT-BR):**
  - `user_cancelled` → "Compra cancelada. Seu mascote continua do jeitinho que estava."
  - `network_error` → fala de conexão, sugere retry
  - código desconhecido → fallback amigável (NUNCA `SOMETHING_UNKNOWN_XYZ`)
  - NENHUMA mensagem vaza jargão inglês ("error", "failed", "cancelled", "please try")
- **Paywall ético:**
  - NUNCA dispara em `phase=ovo` (onboarding)
  - NUNCA dispara em `phase=bebe` com level=1
  - DISPARA em streak 7 (momento de alto valor)
  - NUNCA dispara se já assinante
  - Copy NUNCA usa "agora ou nunca", "última chance", "você perdeu", "deveria"

**Se quebrar, o paywall vai bagunçar o trial e queimar conversão.** Investigue:
- Novo gate de paywall em check-in ou chat seguro
- Erro genérico vazando código pro usuário
- `shouldTrigger` disparando em onboarding
- Mensagem de paywall com pressão

---

## Quando rodar

- **Sempre antes de commit em arquivos sensíveis:**
  - `src/lib/dna/**` → G1
  - `src/content/replies.ts` ou `safety.ts` → G2
  - `src/ai/**` ou `src/services/subscription/PaywallRules.ts` → G3, G4
  - `src/lib/paywall-triggers.ts` → G4
- **No CI:** `test:guarantees` é subset rápido (~2s). Vale adicionar como gate separado pra ter falha legível.

## O que estes testes NÃO cobrem

Honestidade: estes testes garantem **invariantes técnicas** das promessas. Eles
NÃO substituem:

- Beta com pessoas reais (vontade subjetiva de assinar)
- Validação em dispositivo (60s real depende de latência e UX visual)
- A/B test de copy (estes testes garantem que copy não é tóxica — não que é a melhor)
- Métricas D1/D7/D30 reais (precisa de analytics provider real)

São o **piso**, não o teto.
