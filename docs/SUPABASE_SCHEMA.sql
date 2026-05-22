-- ============================================================================
-- Mascote — Supabase schema (v1.1) — 2026-05-22
-- ============================================================================
-- v1.1 hardening (2026-05-22):
--   * set_updated_at agora tem SET search_path (CVE function_search_path_mutable)
--   * mascots: CHECK constraints em xp/level/energy/health/name (defense in depth)
--   * mission_completions: CHECK em xp/coins_awarded (anti-abuse)
--   * backups: CHECK em payload_size (cap 10MiB)
--   * active_mascots view: security_invoker=on (RLS-aware no Postgres 15+)
--   * +ai_usage table (movida do README) — necessária pro rate-limit do proxy
--   * +safety_flags table — audit server-side de classificações high/critical
-- ============================================================================
--
-- Schema inicial pra sync opcional. App é LOCAL-FIRST: cada tabela aqui é
-- espelho serializável do que mora em AsyncStorage. Sync nunca substitui
-- local — só sincroniza quando o usuário opta-in (settings.sync_enabled).
--
-- Princípios:
--  - **RLS sempre ON.** Sem `bypass_rls`. Cada policy restringe a `auth.uid()`.
--  - **deleted_at + version** em toda tabela de domínio — soft-delete + LWW.
--  - **updated_at via trigger** — não confiar no client pra setar.
--  - **`user_id uuid REFERENCES auth.users(id)`** — usar a auth do Supabase.
--  - **JSONB pra payloads procedurais** (genome, phenotype) — flexibilidade
--    pra evoluir schema sem migration major.
--  - **Snapshots em `backups`** — usuário pode exportar tudo manualmente.
--
-- Aplicar via SQL Editor do Supabase ou `supabase db push`.
-- Após criar, validar:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
--   SELECT * FROM pg_policies WHERE schemaname = 'public';
-- ============================================================================

-- Extensions necessárias --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigger genérico de updated_at -----------------------------------------------
-- SECURITY: search_path explícito previne shadowing (CVE function_search_path_mutable).
-- Sem isso, um schema malicioso no search_path poderia interceptar NOW().
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. user_profiles — extensão de auth.users com prefs/onboarding state
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   text,
  language       text NOT NULL DEFAULT 'pt',
  onboarded_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW(),
  version        int NOT NULL DEFAULT 1
);

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_self" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_self" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_self" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. mascots — registro principal por usuário (1 ativo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mascots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  personality  text NOT NULL CHECK (personality IN ('calmo','motivador','fofo','sabio')),
  phase        text NOT NULL DEFAULT 'ovo'
                 CHECK (phase IN ('ovo','bebe','crianca','adolescente','adulto','evoluido','rara')),
  mood         text NOT NULL DEFAULT 'ok'
                 CHECK (mood IN ('triste','ok','feliz','empolgado','exausto')),
  -- Defense in depth: service_role bypassa RLS, então CHECKs no DB são a
  -- última linha contra estado corrompido (sincs maliciosos, bugs do client).
  xp           int NOT NULL DEFAULT 0     CHECK (xp >= 0),
  level        int NOT NULL DEFAULT 1     CHECK (level >= 1 AND level <= 999),
  energy       int NOT NULL DEFAULT 50    CHECK (energy BETWEEN 0 AND 100),
  health       int NOT NULL DEFAULT 80    CHECK (health BETWEEN 0 AND 100),
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  deleted_at   timestamptz,
  version      int NOT NULL DEFAULT 1     CHECK (version >= 1)
);

CREATE INDEX idx_mascots_user ON public.mascots(user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER mascots_updated_at BEFORE UPDATE ON public.mascots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mascots_self" ON public.mascots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. mascot_genotypes — DNA procedural (11 genes), 1-1 com mascot
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mascot_genotypes (
  mascot_id    uuid PRIMARY KEY REFERENCES public.mascots(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- payload validado client-side (GENE_MIN..GENE_MAX); aqui guardamos como JSONB
  -- pra suportar versionamento (v1=11 genes, v2+ pode adicionar)
  genome       jsonb NOT NULL,
  seed         bigint NOT NULL,
  genome_hash  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  version      int NOT NULL DEFAULT 1
);

CREATE INDEX idx_genotypes_user ON public.mascot_genotypes(user_id);

CREATE TRIGGER genotypes_updated_at BEFORE UPDATE ON public.mascot_genotypes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mascot_genotypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "genotypes_self" ON public.mascot_genotypes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. mascot_phenotypes — fenótipo derivado (cache server-side, opcional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mascot_phenotypes (
  mascot_id      uuid PRIMARY KEY REFERENCES public.mascots(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  morphology     jsonb NOT NULL,
  palette        jsonb NOT NULL,
  mutation_ids   text[] NOT NULL DEFAULT '{}',
  customization  jsonb,
  updated_at     timestamptz NOT NULL DEFAULT NOW(),
  version        int NOT NULL DEFAULT 1
);

CREATE TRIGGER phenotypes_updated_at BEFORE UPDATE ON public.mascot_phenotypes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mascot_phenotypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phenotypes_self" ON public.mascot_phenotypes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. evolution_events — auditoria de transformações (mutations, phase changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evolution_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id    uuid NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('mutation','phase','microevolution','rare_form')),
  payload      jsonb NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT NOW(),
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evolution_user_time ON public.evolution_events(user_id, occurred_at DESC);

ALTER TABLE public.evolution_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evolution_self" ON public.evolution_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. missions — catálogo dinâmico de missões geradas pra usuário
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.missions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id     text NOT NULL,
  habit_kind      text,
  title           text NOT NULL,
  description     text,
  xp_reward       int NOT NULL DEFAULT 0,
  coins_reward    int NOT NULL DEFAULT 0,
  duration_minutes int,
  difficulty      text CHECK (difficulty IN ('easy','medium','hard')),
  generated_by    text NOT NULL DEFAULT 'static'
                    CHECK (generated_by IN ('static','ai','bandit')),
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  expires_at      timestamptz
);

CREATE INDEX idx_missions_user ON public.missions(user_id, created_at DESC);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_self" ON public.missions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. mission_completions — registro de cada missão completada/skipada
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mission_completions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id      uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  template_id     text NOT NULL,
  outcome         text NOT NULL CHECK (outcome IN ('completed','skipped','expired')),
  xp_awarded      int NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0 AND xp_awarded <= 10000),
  coins_awarded   int NOT NULL DEFAULT 0 CHECK (coins_awarded >= 0 AND coins_awarded <= 10000),
  completed_at    timestamptz NOT NULL DEFAULT NOW(),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 128),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_completions_user_time
  ON public.mission_completions(user_id, completed_at DESC);

ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_self" ON public.mission_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. achievements — conquistas desbloqueadas (estado, não catálogo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id  text NOT NULL,
  unlocked_at     timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_self" ON public.achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 9. mascot_memories — eventos marcantes guardados pelo mascote
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mascot_memories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  content      text NOT NULL,
  embedding    jsonb,  -- vetor opcional pra similarity search
  occurred_at  timestamptz NOT NULL DEFAULT NOW(),
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  deleted_at   timestamptz
);

CREATE INDEX idx_memories_user_time
  ON public.mascot_memories(user_id, occurred_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE public.mascot_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memories_self" ON public.mascot_memories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 10. subscription_status — espelho serializado do tier (RevenueCat = canônico)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_status (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                 text NOT NULL DEFAULT 'free'
                          CHECK (tier IN ('free','plus_monthly','plus_annual','legendary')),
  is_active            boolean NOT NULL DEFAULT false,
  expires_at           timestamptz,
  rc_customer_id       text,
  rc_entitlement       text,
  trial_started_at     timestamptz,
  last_synced_from_rc  timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT NOW(),
  version              int NOT NULL DEFAULT 1
);

CREATE TRIGGER subscription_updated_at BEFORE UPDATE ON public.subscription_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscription_status ENABLE ROW LEVEL SECURITY;
-- Subscription é WRITE-ONLY via webhook RevenueCat. Cliente só lê.
CREATE POLICY "subscription_read_self" ON public.subscription_status
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 11. backups — snapshot completo do estado do usuário (manual export)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload      jsonb NOT NULL,  -- SyncPayload completo
  -- Cap em ~10 MiB pra prevenir backups gigantes (cliente tem cap próprio também).
  payload_size int NOT NULL CHECK (payload_size > 0 AND payload_size <= 10485760),
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backups_user_time ON public.backups(user_id, created_at DESC);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backups_self" ON public.backups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 12. sync_metadata — last sync timestamps + cursor por tabela
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_metadata (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name     text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT NOW(),
  last_cursor    text,
  PRIMARY KEY (user_id, table_name)
);

ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_metadata_self" ON public.sync_metadata
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 13. ai_usage — audit log do proxy IA (cotas por tier + observabilidade)
-- ============================================================================
-- Antes estava só no README do edge function — quem aplicasse o schema sem
-- ler o README quebrava o rate-limit em prod (checkRateLimit falha aberto).
-- Movido pra cá pra ser parte do schema canônico.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,  -- pode ser auth.users.id OU hash (legacy)
  tier         text NOT NULL CHECK (tier IN ('free','plus_monthly','plus_annual','legendary')),
  timestamp    timestamptz NOT NULL DEFAULT NOW(),
  tokens_in    int CHECK (tokens_in IS NULL OR tokens_in >= 0),
  tokens_out   int CHECK (tokens_out IS NULL OR tokens_out >= 0),
  latency_ms   int CHECK (latency_ms IS NULL OR latency_ms >= 0),
  cached       boolean NOT NULL DEFAULT false,
  source       text NOT NULL CHECK (source IN ('openai','fallback','cache')),
  safety_flag  text NOT NULL CHECK (safety_flag IN ('safe','watch','high','critical'))
);

-- Index pro checkRateLimit (filtra por user + dia)
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time
  ON public.ai_usage(user_id, timestamp DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
-- Só service_role escreve (edge function). Cliente pode ler o próprio histórico
-- (debug/quota dashboard).
CREATE POLICY "ai_usage_read_self" ON public.ai_usage
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- 14. safety_flags — auditoria server-side de mensagens classificadas
-- ============================================================================
-- Não armazena CONTEÚDO da mensagem (privacy-first). Só metadados pra:
--  - medir taxa de high/critical (saber se cliente está classificando bem)
--  - detectar abuso (mesmo user_id repetindo critical 50x/dia)
--  - audit pós-incidente (sem PII, só timestamp + classificação)
CREATE TABLE IF NOT EXISTS public.safety_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  flag          text NOT NULL CHECK (flag IN ('safe','watch','high','critical')),
  source        text NOT NULL CHECK (source IN ('client','server')),
  -- Hash do conteúdo (NÃO o conteúdo) — permite deduplicar sem armazenar texto.
  content_hash  text,
  occurred_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_flags_user_time
  ON public.safety_flags(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_flags_flag_time
  ON public.safety_flags(flag, occurred_at DESC)
  WHERE flag IN ('high','critical');

ALTER TABLE public.safety_flags ENABLE ROW LEVEL SECURITY;
-- Usuário lê o próprio histórico de flags (transparência). Service_role escreve.
CREATE POLICY "safety_flags_read_self" ON public.safety_flags
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Views auxiliares
-- ============================================================================

-- mascote ativo (não-deletado) por usuário
-- security_invoker=on faz a view respeitar RLS do caller (Postgres 15+).
-- Sem isso, view roda como o owner (postgres) e BYPASSARIA RLS — vazando
-- todas as mascots de todos os usuários.
CREATE OR REPLACE VIEW public.active_mascots
  WITH (security_invoker = on) AS
  SELECT * FROM public.mascots WHERE deleted_at IS NULL;

-- ============================================================================
-- Próximos passos (não criados aqui — exigem decisão de produto):
--  - chats: messages do usuário com IA (decidir retenção pré-publicação)
--  - feature_flags: gradual rollout de features novas
-- ============================================================================
