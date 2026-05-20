# Premium strategy — Mascote (2026-05-20)

Estratégia honesta de monetização: o que é vendido, como, em quê desbloqueia,
e o que NÃO pode ser vendido (segurança, dignidade do usuário).

## Princípios

1. **Free é completo, premium é amplo.** Free tem mascote vivo, evolução,
   missões, IA local. Premium aprofunda — não desbloqueia o "núcleo".
2. **Sem dark patterns.** Não escondemos cancel. Não fingimos urgência falsa.
   Trial é claro. Cancel não exige fricção extra.
3. **Sem promessa médica/terapêutica.** Wellness only.
4. **Modo demo é claramente sinalizado** no app — mock NUNCA finge ser real.

## Tiers (catálogo atual em `src/content/billing.ts`)

| Tier ID | Display | Preço target | Trial | Status |
|---|---|---|---|---|
| `free` | Grátis | R$ 0 | — | ✅ |
| `plus_monthly` | Mascote+ Mensal | R$ 19.90 | 7 dias | 🟡 Mock |
| `plus_annual` | Mascote+ Anual | R$ 149.90 | 7 dias | 🟡 Mock |
| `legendary` | Lendário (futuro) | R$ 49.90/mês | 7 dias | 🔴 Não criado nos stores |

> Preços validados em [plano_mascote/parte_4_monetizacao_e_growth.md](../plano_mascote/parte_4_monetizacao_e_growth.md).

## O que cada tier desbloqueia

### Free (núcleo completo)

- ✅ Mascote único procedural (DNA seedado pelo uid)
- ✅ 4 personalidades + bias gênico
- ✅ Drift de DNA via hábitos (continuamente, sem cap)
- ✅ Missions catalog (303 templates)
- ✅ Streak / XP / coins / wallet
- ✅ IA local (fallback) — todas respostas off-line
- ✅ Memory básica (últimas 50 memórias)
- ✅ Export/import local (backup manual)
- ✅ Safety completo (CRISIS_REPLY sempre disponível — não pode pagar pra ter)

### Plus Monthly / Annual

Aprofundamento sem pay-to-win:
- ➕ IA via proxy (50 turnos/dia, vs BYOK no free)
- ➕ Memory expandida (200 memórias + graph rerank)
- ➕ Mutations raras e épicas (free vê só comum)
- ➕ Personalization avançada (sliders Sims-like)
- ➕ Cenários premium (4 extra)
- ➕ Acessórios premium (catalog +)
- ➕ Relatório semanal narrado pelo mascote
- ➕ Histórico avançado (calendar + heatmap)
- ➕ Sync remoto (multi-device — quando Supabase deployado)
- ➕ Cores e patterns extras de DNA visualization

### Legendary (planejado, não criado)

- ➕ IA via gpt-4o (200 turnos/dia, modelo melhor)
- ➕ Acesso early a eventos sazonais
- ➕ Forma rara desbloqueável (DLI-9)
- ➕ Voz procedural completa (DLI-7 wire nativo)

## O que NUNCA é premium

Hard guarantee:
- ❌ **Safety** — CRISIS_REPLY, CVV 188, SAMU 192 sempre disponíveis pra todos.
- ❌ **Dignidade do mascote** — nenhum tier "destrava" o mascote ficar triste/mal por não-pagar.
- ❌ **Continuidade do progresso** — usuário que cancela mantém DNA, histórico, conquistas.
- ❌ **Export do próprio dado** — LGPD/GDPR exigem.

## Paywall — onde aparece

`paywall-triggers.ts` centraliza decisões. Triggers atuais:

1. **Onboarding day 3** (suave) — banner home, dismissable
2. **Mutação rara unlocked** (contextual) — "quer ver mais variações?"
3. **Streak 7+** (celebrativo) — "esse momento merece mais"
4. **Calendar 30+** (afundado) — usuário engajado, ROI claro

NUNCA:
- Bloquear check-in
- Bloquear ver missão
- Bloquear chat (degrade para fallback local em vez de gate)

## Demo mode honesto

`isDemoBilling()` retorna `true` quando provider != `revenuecat`.
`isMockInProductionBuild()` retorna `true` se NODE_ENV=production E provider=mock.

Quando demo:
- Paywall deve mostrar banner amarelo: "Modo demonstração — nenhuma cobrança real"
- Botão "Assinar" deve dizer "Simular assinatura" em vez de "Pagar R$ 19.90"
- Logger emite warning estruturado uma vez por boot

## RevenueCat — ativação (não está ativo)

Estado atual: `RevenueCatBillingProvider` existe, lê env, mas
**SDK nativo não está vinculado**. Em compras, retorna `{ success: false, error: 'SDK não vinculado' }` — não simula sucesso.

### Checklist de ativação

- [ ] Conta RevenueCat criada
- [ ] App registrado (iOS + Android bundle IDs)
- [ ] Products criados nas lojas (App Store Connect + Play Console)
- [ ] Products mapeados em RevenueCat (offerings + packages)
- [ ] Entitlements configurados (`premium`, `legendary`)
- [ ] Webhook RevenueCat → Supabase Edge Function (atualiza subscription_status)
- [ ] `expo install react-native-purchases` (SDK nativo)
- [ ] Init em `app/_layout.tsx` com keys do env
- [ ] `EXPO_PUBLIC_BILLING_PROVIDER=revenuecat`
- [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxx`
- [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxx`
- [ ] `EXPO_PUBLIC_RC_ENABLED=true`
- [ ] Build EAS preview de teste em TestFlight + Play Internal
- [ ] Validar fluxo de trial 7d → renovação → cancel → restore
- [ ] Validar fluxo de upgrade Monthly → Annual

### Edge cases tratáveis

- Compra durante voo (sem rede) — fila offline + retry
- App killed durante compra — restore on next launch
- Refund silencioso (Apple/Google) — webhook RevenueCat invalida cache local
- Família sharing (iOS) — RevenueCat resolve automaticamente

## Métricas críticas (instrumentadas via [analytics/AnalyticsEvents.ts](../app/mobile/src/analytics/AnalyticsEvents.ts))

| Métrica | Evento | Target beta |
|---|---|---|
| Paywall view rate | `paywall_viewed` | 30% dos usuários ativos D7 |
| Trial start rate | `trial_started` / `paywall_viewed` | ≥ 15% |
| Trial → paid conversion | `purchase_completed` / `trial_started` | ≥ 25% |
| D30 retention paid | `app_opened` em D30+ pra users com tier != free | ≥ 60% |
| Cancel rate Mensal | (cancel events / active subs) | ≤ 10%/mês |

## Cláusulas comerciais a evitar

**Não dizer:**
- "Cure sua ansiedade" — medical claim, sem permissão
- "Mascote inteligente que aprende" — overclaim de ML
- "1000 fases de evolução" — números aspiracionais não-verificáveis
- "Garantia de mais saúde" — promessa de resultado

**Pode dizer (verdadeiro):**
- "Companheiro digital único que evolui com seus hábitos"
- "Mais de 1000 possibilidades de evolução visual e comportamental" (11 genes × 50 estados × 12 mutações × 4 personalidades = combinatória honesta)
- "Acompanhamento gentil pra construir hábitos no seu ritmo"
- "Wellness diário com gamificação saudável (sem culpa, sem pressão)"
