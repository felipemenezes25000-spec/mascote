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

3. Aplique o schema canônico (`docs/SUPABASE_SCHEMA.sql`) — `ai_usage` e
   `safety_flags` já estão lá desde v1.1 (2026-05-22).

4. Set secrets:
   ```powershell
   supabase secrets set OPENAI_API_KEY=sk-XXXX
   supabase secrets set OPENAI_MODEL=gpt-4o-mini
   # Em produção, deixe REQUIRE_AUTH=true (default). False só pra dev local.
   # supabase secrets set REQUIRE_AUTH=true
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
- ✅ JWT validado server-side (REQUIRE_AUTH=true). Cliente NÃO escolhe seu próprio tier — é lido de `subscription_status`.
- ✅ NaN guards em `tokens_in/out` (OpenAI já retornou undefined/null em incidentes)
- ✅ Insert errors do Postgres são logados (antes silenciavam via try/catch sem error-check)

## Custos esperados

Modelo `gpt-4o-mini` a $0.15/1M input + $0.60/1M output (mai/2026):
- Free 5 turnos/dia × 187 tokens médios = ~$0.0001/dia
- Plus 50 turnos/dia × 500 tokens médios = ~$0.015/dia → ~$0.45/mês

Margem em assinatura R$ 19.90/mês: ~95%.
