# Test Report — Evolution & Premium Foundation

**Data:** 2026-05-19 (Fase 4 — audit & ship-ready)  
**Escopo:** Premium completo + hardening produção (sem keys de loja)

## Comandos

```powershell
cd app\mobile
npm run typecheck
npm test
npm run doctor
```

### Maestro (device / emulador + Expo Go)

```powershell
cd app\mobile
npx expo start
# outro terminal:
maestro test .maestro/onboarding.yaml
maestro test .maestro/paywall.yaml
maestro test ..\..\scripts\maestro\premium-onboarding.yaml
maestro test .maestro/premium-settings-reports.yaml
```

## Resultados (Fase 4)

| Comando | Status |
|---------|--------|
| `npm run typecheck` | ✅ |
| `npm test` | ✅ (1757+ testes) |
| ESLint | ⏭ Não configurado — ver `RELEASE_CHECKLIST.md` |

## Fase 4 — correções aplicadas

| Área | O que mudou |
|------|-------------|
| RevenueCat | Falha graciosa sem API key / sem `RC_ENABLED`; não promove tier em compra falha |
| Env | `app/mobile/.env.example` (billing + OpenAI) |
| Evolução | `useEvolutionState`: erro amigável, memo de personalização, visuals memoizados |
| Entitlements | `useSubscriptionTier` refresca ao voltar do paywall (`useFocusEffect`) |
| Paywall | Alert em falha de compra; re-fetch tier após sucesso |
| UX | Empty states: missão, conquistas, coleção; a11y em relatórios/personalização |
| Docs | `RELEASE_CHECKLIST.md`, Maestro `premium-settings-reports.yaml` |

## Checklist manual (QA — ~15 min)

1. **Onboarding** — goal → style → quick → DNA reveal → nome → home com primeira missão.
2. **Primeira missão** — completar água → microevolução visível no mascote.
3. **Personalização** — Configurações → Personalização → alterar vínculo/estilo → Salvar → reabrir app → visual/genótipo refletem.
4. **Paywall** — abrir via fase bloqueada ou relatório → assinar (mock) → voltar → Plus ativo em relatório semanal completo.
5. **Paywall dismiss** — fechar sem comprar → tier continua free; relatório permanece preview.
6. **Conquistas** — desbloquear uma → ver recompensa (XP/moedas/acessório) na coleção ou inventário.
7. **Coleção vazia** — usuário novo vê empty state amigável.
8. **Evolução** — aba carrega mascote com `evolutionVisuals`; sem crash se storage lento.
9. **Relatórios** — semanal (preview free / full Plus), mensal, dark mode se tema escuro ativo.
10. **RevenueCat sem keys** — `EXPO_PUBLIC_BILLING_PROVIDER=revenuecat` sem `.env` → compra mostra alerta, tier não muda.

## Pendências (somente externas)

- [ ] RevenueCat SDK nativo + SKUs reais (App Store / Play)
- [ ] Maestro em CI com emulador dedicado
- [ ] ESLint (opcional pós-launch)

## Arquivos principais (premium)

- `src/game/evolution/*` — motor evolutivo
- `src/hooks/useEvolutionState.ts`, `useSubscriptionTier.ts`
- `src/services/subscription/*` — mock + RevenueCat adapter
- `app/settings/personalization.tsx`, `app/paywall.tsx`
- `app/weekly-report.tsx`, `app/monthly-report.tsx`
- `src/lib/achievement-rewards.ts`, `unlock.ts`
