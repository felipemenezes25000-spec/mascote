# mascot-reply — Edge Function (Supabase)

Proxy IA do Mascote. Chave OpenAI **NUNCA** vai no cliente — fica como secret aqui.

## Setup (ordem)

1. Tenha um projeto Supabase ativo e o CLI instalado:
   ```powershell
   npm install -g supabase
   supabase login
   ```

2. Link com o projeto:
   ```powershell
   supabase link --project-ref <YOUR_REF>
   ```

3. Crie a tabela `ai_usage` (não está em SUPABASE_SCHEMA.sql porque é específica do proxy):
   ```sql
   CREATE TABLE IF NOT EXISTS public.ai_usage (
     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id     uuid NOT NULL,
     tier        text NOT NULL,
     timestamp   timestamptz NOT NULL DEFAULT NOW(),
     tokens_in   int,
     tokens_out  int,
     latency_ms  int,
     cached      boolean DEFAULT false,
     source      text,
     safety_flag text
   );
   ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
   -- Só service role escreve — política aberta de SELECT pra debug
   CREATE POLICY "ai_usage_read_self" ON public.ai_usage
     FOR SELECT USING (auth.uid()::text = user_id::text);
   CREATE INDEX idx_ai_usage_user_time ON public.ai_usage(user_id, timestamp DESC);
   ```

4. Set secrets:
   ```powershell
   supabase secrets set OPENAI_API_KEY=sk-XXXX
   supabase secrets set OPENAI_MODEL=gpt-4o-mini
   ```

5. Deploy:
   ```powershell
   supabase functions deploy mascot-reply
   ```

6. Anote a URL:
   ```
   https://<project-ref>.functions.supabase.co/mascot-reply
   ```

7. No app/mobile/.env (criar a partir de `.env.example`):
   ```
   EXPO_PUBLIC_AI_PROXY_URL=https://<project-ref>.functions.supabase.co/mascot-reply
   ```

## Validação manual (curl)

```powershell
$body = @{
  user_id_hash = "test-hash"
  tier = "free"
  personality = "calmo"
  dna_descriptors = @("presença acolhedora")
  mood = "ok"
  message = "Bom dia"
  context_memories = @()
  history = @()
  safety_flag = "safe"
  language = "pt"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://<ref>.functions.supabase.co/mascot-reply" `
  -Method POST -ContentType "application/json" -Body $body
```

Resposta esperada:
```json
{
  "reply": "Bom dia. Que bom te ver aqui.",
  "source": "openai",
  "tokens_used": 187,
  "remaining_quota": 4,
  "cached": false
}
```

## Cotas (alinhadas com `docs/PREMIUM_STRATEGY.md`)

| Tier | Turnos/dia |
|---|---|
| free | 5 |
| plus_monthly | 50 |
| plus_annual | 50 |
| legendary | 200 |

Ajustar em `index.ts` → `DAILY_QUOTA`.

## Garantias

- ✅ Chave OpenAI **nunca** sai do servidor
- ✅ Mensagens com `safety_flag` = critical/high são **REJEITADAS** (422). Cliente trata local com CRISIS_REPLY.
- ✅ Audit log em `ai_usage` registra **somente metadados** (tokens, latency, source) — NUNCA o conteúdo
- ✅ Cache 24h reduz custo em saudações repetidas
- ✅ Fallback local quando OpenAI 5xx — usuário NUNCA recebe erro técnico

## Custos esperados

Modelo `gpt-4o-mini` a $0.15/1M input + $0.60/1M output (mai/2026):
- Free 5 turnos/dia × 187 tokens médios = ~$0.0001/dia
- Plus 50 turnos/dia × 500 tokens médios = ~$0.015/dia → ~$0.45/mês

Margem em assinatura R$ 19.90/mês: ~95%.
