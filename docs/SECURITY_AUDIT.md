# Security audit — Mascote

**Gate oficial de segurança do app:** pentests automatizados. Tudo o resto neste doc é contexto ou roadmap — **não bloqueia** release/beta se `test:security` estiver verde.

**Última execução:** 2026-05-20 — `npm run test:security` → **1531 testes, 0 falhas** (16 arquivos, inclui massa).

---

## Gate (único comando obrigatório)

```powershell
npm --prefix app/mobile run test:security
```

| Métrica | Valor |
|---------|--------|
| Testes | 1531 (1269 mass + 262 core) |
| Matriz de superfície | 31/31 (`tests/security/pentest-matrix.test.ts`) |
| PENTEST numerados | 1–22 + **MASS 1–16** (`pentest-mass.test.ts`) |

### O que o gate cobre

| Pacote de testes | Foco |
|------------------|------|
| `tests/pentests.test.ts` | Injection, XSS, secrets, storage, XP/wallet, idempotência, concorrência, attachment, output safety |
| `tests/security/pentest-surface.test.ts` | Telemetria, export LGPD, proxy, PII, timeout/retry OpenAI, db adversarial, rate/cost guards, sync |
| `tests/security/pentest-mass.test.ts` | **1269** casos adversariais (corpus + fast-check) |
| `tests/security/adversarial-corpus.ts` | Gerador programático de inputs |
| `tests/security/dna-*.test.ts` | DNA nunca cru na rede; migration; sanitização |
| `tests/security/pentest-matrix.test.ts` | Regressão: 31 superfícies mapeadas |
| `tests/safety.test.ts` | Classifier + crisis/diagnosis |
| `tests/lib-secureStore.test.ts` | BYOK Keychain |
| `tests/lib-memory.test.ts` | Memória adversarial |
| `tests/lib-ml-embedding-openai.test.ts` | Embeddings sem vazamento |
| `tests/lib-telemetry.test.ts` | `consent_analytics` |
| `tests/content-billing.test.ts` | Integridade de preços/tiers |
| `tests/ai/production-guards.test.ts` | Rate limit, cost guard, validator |
| `tests/lib/dna/persistence.test.ts` | `prepareDnaForStorage` / `readDnaFromStorage` |
| `tests/repositories/sync-local.test.ts` | `exportSnapshot` sem secrets |

---

## Ignorado no gate (não rodar como bloqueador de PR)

Estes itens **não entram** na matriz de pentest e **não devem** impedir beta/merge se os testes acima passarem:

| Item | Motivo |
|------|--------|
| `npm audit` (43 vulns Expo SDK 51) | Toolchain de **build/dev** — fix = upgrade SDK 53+ (projeto separado). Medido 2026-05-24. |
| Proxy IA deployado | Infra/ops — coberto por testes de **cliente** (`ProxyMascotAI` sem `Authorization` no device). |
| Smoke manual em device | GO/NO-GO Fase 0 — fora de Vitest. |
| `grep sk-` / `console.log` no repo | Higiene pontual; pentest 3 já valida redaction em runtime. |
| RevenueCat webhook, audit log safety, rate limit no proxy | Roadmap pós-beta — ver seção abaixo. |
| Checklist manual linha-a-linha | Substituído pela matriz `PENTEST_MATRIX` (31 ids). |

### npm audit (só informativo)

```
43 vulnerabilities (1 low, 27 moderate, 15 high) — 2026-05-24
```

`npm audit fix` sem `--force` não altera o número. `--force` quebraria Expo 51. **Aceito** até migração SDK 53+.

CVEs em `xmldom` / `tar` / `semver`: uso em **build-time**, não no bundle entregue ao usuário.

---

## Matriz de superfície (100% → pentest)

Referência: `app/mobile/tests/security/pentest-matrix.test.ts`

| ID | Superfície |
|----|------------|
| S1–S5 | AsyncStorage, SecureStore, DNA persist, locks |
| N1–N5 | Secrets, proxy, export, timeout, sem retry |
| L1–L4 | PII, mensagens, telemetria, memória no prompt |
| F1–F5 | Injection, XSS, output, attachment, critical sem OpenAI |
| B1–B2 | Export/import |
| E1–E5 | XP, idempotência, rate/cost, billing |
| D1–D3 | DNA OpenAI, migration, sanitize |
| I1–I2 | Embeddings, guards IA |

---

## Garantias validadas pelos pentests (resumo)

- Chave OpenAI **nunca** no payload de export/sync nem em logs estruturados típicos.
- Gene bruto **nunca** no body enviado à OpenAI/proxy (só descritores semânticos).
- `display_name` / `age_band` **não** vão no prompt da API.
- Critical/high → `CRISIS_REPLY` **sem** chamar OpenAI.
- Corrupção de JSON no storage → fallback, sem crash.
- Wallet/XP/check-in → sem saldo negativo, cap diário, idempotência.
- Telemetria → silenciada sem `consent_analytics`.

---

## Roadmap (fora do pentest, pós-beta)

1. Deploy proxy IA + rate limit server-side  
2. Upgrade Expo SDK 53+ (reduz vulns npm)  
3. Webhook RevenueCat → backend  
4. Audit log local de safety flags (timestamp only)  

---

## Comandos úteis (opcionais)

```powershell
# Gate (obrigatório antes de release)
npm --prefix app/mobile run test:security

# Informativo — NÃO é gate
npm --prefix app/mobile audit
```
