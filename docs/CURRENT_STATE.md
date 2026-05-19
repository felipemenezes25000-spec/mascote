# Estado atual real — Mascote (mai/2026)

Documento único de verdade operacional. Auditorias antigas (`AUDIT_AAA_COMPLETO.md`, `VEREDITO-FINAL.md`) são históricas — consulte este arquivo primeiro.

## App mobile (`app/mobile`)

| Área | Estado | Notas |
|------|--------|-------|
| Testes | ✅ ~1767 testes, vitest `run` ~25–35s (node + jsdom seletivo) | `npm test` |
| Typecheck | ✅ | `npm run typecheck` |
| Billing | 🟡 Demo mock padrão; RevenueCat adapter sem SDK nativo | `EXPO_PUBLIC_BILLING_PROVIDER` |
| Sync | 🟡 Local completo via `exportAll` / `localSyncRepo`; Supabase stub | Sem backend live |
| Mutações DNA | ✅ 50+ no catálogo | `lib/dna/mutations*.ts` |
| IA chat | 🟡 Fallback local rico; OpenAI opcional; proxy URL preparado | Sem proxy deployado |
| EAS / loja | 🔴 Sem `eas.json`; build manual | Ver `BETA_RELEASE_CHECKLIST.md` |

## O que funciona de ponta a ponta (offline)

- Onboarding, missões, check-in, streak, XP, evolução procedural
- Mascote 2D/3D, mutações visuais, conquistas, paywall demo
- Export/import de backup incluindo evolução, memória, assinatura, personalização

## O que ainda NÃO é 10/10 de produto

1. Cobrança real App Store / Play (SDK + SKUs + receipt validation)
2. Backend sync multi-dispositivo (Supabase ou equivalente)
3. Proxy de IA em produção (sem chave no cliente)
4. CI Maestro + EAS beta track

## Comandos de verificação

```powershell
cd app\mobile
npm run typecheck
npm test
```
