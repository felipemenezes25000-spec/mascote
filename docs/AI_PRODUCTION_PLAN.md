# AI production plan — Mascote (2026-05-20)

Plano honesto de levar a camada de IA do app de "beta forte" pra "produção
segura, custo controlado, falas emocionais consistentes".

## Estado atual

| Camada | Onde | Status |
|---|---|---|
| Fallback local | [src/ai/LocalFallbackAI.ts](../app/mobile/src/ai/LocalFallbackAI.ts) | ✅ Rico — usa templates por personalidade + memória recall |
| Cliente OpenAI BYOK | [src/lib/ai.ts](../app/mobile/src/lib/ai.ts) | ✅ Funciona — usuário cola chave em settings |
| Cliente proxy | [src/ai/ProxyMascotAI.ts](../app/mobile/src/ai/ProxyMascotAI.ts) | ✅ Implementado — falta servidor deployado |
| Safety classifier | [src/lib/ml/safety/classifier.ts](../app/mobile/src/lib/ml/safety/classifier.ts) | ✅ Ensemble regex+Bayes+sentiment |
| Memory recall | [src/lib/memory.ts](../app/mobile/src/lib/memory.ts) | ✅ TF-IDF + graph rerank, 3 memórias top-k injetadas |
| Prompt builder | [src/ai/PromptBuilder.ts](../app/mobile/src/ai/PromptBuilder.ts) | ✅ DNA descritores semânticos (nunca valores brutos) |
| Mission generator | [src/ai/MissionGeneratorAI.ts](../app/mobile/src/ai/MissionGeneratorAI.ts) | ✅ Híbrido (catálogo + variação personalizada) |
| Rate limit / cost guard | — | 🔴 Não existe — perigo em escala |
| Cache de respostas | — | 🔴 Não existe — todo turno é fresh |
| Audit log de uso | — | 🔴 Não existe |

## Bloqueador #1 — proxy backend

**Hoje:** `EXPO_PUBLIC_AI_PROXY_URL` é placeholder. Sem proxy, produção depende
de BYOK (usuário cola sua própria chave). Isso quebra a expectativa premium
("paguei pra ter IA inclusa") e tem 3 problemas:

1. **UX confusa** — onboarding tem que explicar BYOK pra usuário não-técnico.
2. **Não permite cotas por plano** — Plus deve ter mais turnos que free.
3. **Custos não-controláveis** — sem rate limit, um usuário pode esgotar saldo.

### Arquitetura proposta

```
[App RN] → POST /v1/mascot/reply → [Proxy Edge Function] → [OpenAI API]
                                          │
                                          ├─ rate limit por user_id
                                          ├─ cost guard (cents/day por tier)
                                          ├─ cache de respostas similares
                                          ├─ audit log (timestamp + token count)
                                          └─ failover pra Anthropic se OpenAI 5xx
```

**Opções de deploy** (escolher 1):

| Opção | Prós | Contras |
|---|---|---|
| **Supabase Edge Functions** (Deno) | Mesma conta, autenticação pronta | Cold start ~300ms, sem failover trivial |
| **Cloudflare Workers** | Global edge, latência baixa | Conta separada, secrets management |
| **Firebase Cloud Functions** | MCP já carregado nesta sessão | Vendor lock-in, custos pouco previsíveis |

Recomendação: **Supabase Edge Functions** — alinha com a infra de sync que já
está planejada e a auth do user fica automaticamente disponível pra rate-limit.

### Schema da request/response

```ts
// POST /v1/mascot/reply
interface ProxyRequest {
  user_id_hash: string;        // SHA-256 do user_id local
  tier: 'free' | 'plus_monthly' | 'plus_annual' | 'legendary';
  personality: 'calmo' | 'motivador' | 'fofo' | 'sabio';
  dna_descriptors: string[];   // [linguagem semântica], NUNCA valores numéricos
  mood: MascotMood;
  message: string;             // input do usuário (NUNCA inclui PII)
  context_memories: string[];  // top-3 do memory recall
  history: { role: 'user'|'mascot'; content: string }[];  // últimas N=6
  safety_flag: 'safe' | 'watch';  // server REJEITA se 'high'|'critical'
  language: 'pt' | 'en';
}

interface ProxyResponse {
  reply: string;
  source: 'openai' | 'fallback';  // server pode degradar pra fallback se OpenAI down
  tokens_used: number;
  remaining_quota: number;        // turnos restantes no dia
  cached: boolean;
}
```

### Cotas por tier (sugerido)

| Tier | Turnos/dia | Tokens/turno | Modelo |
|---|---|---|---|
| Free | 5 | 300 input + 200 output | gpt-4o-mini |
| Plus Monthly/Annual | 50 | 600 input + 400 output | gpt-4o-mini |
| Legendary | 200 | 1000 input + 600 output | gpt-4o + fallback gpt-4o-mini |

**Custo estimado** (a $0.15/1M input, $0.60/1M output gpt-4o-mini, mai/2026):
- Free: ~$0.0003/dia → $0.009/mês
- Plus: ~$0.030/dia → $0.90/mês — **margem ~95%** num plano de R$ 19.90
- Legendary: ~$0.20/dia → $6/mês — margem ainda confortável em R$ 49.90

## Bloqueador #2 — cache de respostas

**Hoje:** todo turno é fresh — gasto desnecessário em mensagens repetitivas
("bom dia", "oi", "obrigado").

**Plano:** cache simples no proxy com chave =
`hash(personality, mood, normalized_message_no_punct)`. TTL 24h. Hit rate
esperado: 15-25% (saudações + agradecimentos curtos).

## Bloqueador #3 — audit log

**Hoje:** sem registro de quem chamou o quê, quando.

**Plano:** tabela `ai_usage` no Supabase com:
```sql
CREATE TABLE public.ai_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  tier        text NOT NULL,
  timestamp   timestamptz NOT NULL DEFAULT NOW(),
  tokens_in   int,
  tokens_out  int,
  latency_ms  int,
  cached      boolean,
  source      text,           -- 'openai' | 'fallback'
  flag        text             -- 'safe'|'watch' (nunca conteúdo!)
);
```

NUNCA gravar conteúdo da mensagem — só metadados.

## Falas mais humanas — direção, não ainda implementação

O exemplo no prompt:

> ❌ "Você completou 3 hábitos hoje."
> ✅ "Eu senti isso no meu brilho hoje. Quando você bebeu água e voltou pra missão, minha aura ficou mais forte. Bora manter só mais um passinho amanhã?"

Pra chegar lá, o `PromptBuilder` precisa de:

1. **Inputs contextuais novos** que ainda não são injetados:
   - Hora do dia (manhã/tarde/noite)
   - Hábito mais frequente nos últimos 7 dias
   - Streak atual + maior streak histórico
   - Mood trajectory (subiu? caiu?)
   - Última microevolução vista (referência poética)

2. **Few-shot examples** no system prompt — não vinculados a hábito específico mas a TOM ("eu senti isso no meu brilho").

3. **Voice profile** por personalidade — já existe parcial em `personalities.ts`, mas precisa de mais variação lexical:
   - Calmo: ritmo lento, frases curtas, metáforas de água/ar
   - Motivador: ritmo médio, "bora", "vamos", "topa", energia mas sem urgência
   - Fofo: diminutivos, "passinho", "pedacinho", "voltou aqui"
   - Sábio: pausa, "percebo", "ofereço", referências cíclicas

**Esforço:** ~1 semana de iteração com testes A/B em mensagens reais.
**Bloqueador:** precisa do proxy deployado pra A/B testar com tracking.

## Safety — o que NÃO mudar

Não regredir:
- ✅ Critical → CRISIS_REPLY com canal CVV 188
- ✅ High → mesmo handler que Critical (mai/2026 audit)
- ✅ Diagnostic terms → DIAGNOSIS_REDIRECT (não fingir saber)
- ✅ Attachment patterns → resposta que devolve a relação ("você tem gente que te ama")
- ✅ DNA descritores em vez de valores numéricos no prompt
- ✅ Mensagens classified high/critical NUNCA vão pra OpenAI

## Cronograma sugerido

| Semana | Entrega |
|---|---|
| 1 | Deploy proxy Supabase Edge Function (sem cache) — paridade com BYOK |
| 2 | Rate limit + cost guard + cotas por tier |
| 3 | Cache de respostas (hit rate target ≥ 15%) |
| 4 | Audit log + dashboards básicos |
| 5-6 | Falas mais humanas — A/B testing |
| 7-8 | Failover Anthropic se OpenAI down |

## Comandos de verificação

```powershell
# Validar que nenhuma chave OpenAI saiu pro repo
Get-ChildItem -Path app/mobile -Recurse -Include *.ts,*.tsx |
  Select-String -Pattern "sk-[A-Za-z0-9]{40,}"

# Rodar suite de safety
npm --prefix app/mobile test tests/security/

# Validar prompt builder não expõe valores brutos de DNA
npm --prefix app/mobile test tests/security/dna-privacy-ai.test.ts
```
