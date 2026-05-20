# Security audit — Mascote (2026-05-20)

Auditoria viva do estado de segurança e vulnerabilidades. Atualizar sempre
que `npm audit` for re-rodado ou que algo no app afetar superfícies de risco.

## TL;DR

- ✅ Nenhuma chave/segredo hardcoded no repo.
- ✅ DNA + memórias do mascote NUNCA saem do device sem opt-in.
- ✅ Telemetria gateada por `consent_analytics` (ver [telemetry.ts](../app/mobile/src/lib/telemetry.ts)).
- ✅ Safety classifier para mensagens (critical/high/watch/safe) com CRISIS_REPLY.
- ✅ Locks per-user (`withLock`) em checkin + memory previnem race + double-spend.
- 🟡 **25 vulnerabilidades npm** — todas tied ao Expo SDK 51. Plano: upgrade pra Expo 53+ em projeto dedicado.
- 🔴 Proxy IA não deployado — em produção, BYOK é a única alternativa segura.

## Resultado de `npm audit` (2026-05-20)

```
25 vulnerabilities (1 low, 9 moderate, 15 high)
```

**Status:** nenhum fix não-breaking aplicável. `npm audit fix` (sem `--force`) não move o número.

### Por categoria

| Severidade | Total | Tipo | Pacotes principais |
|---|---|---|---|
| High | 15 | Transitivas via Expo | `@expo/cli`, `@expo/config`, `expo`, `expo-asset`, `expo-router`, `tar`, `cacache`, `@xmldom/xmldom` |
| Moderate | 9 | RN community CLI | `@react-native-community/cli`, `cli-doctor`, `cli-hermes`, `fast-xml-parser`, `postcss`, `react-native` |
| Low | 1 | Transitiva | `send` |

### Por que não fixei tudo agora

Todos os 22 packages com fix exigem **breaking change da chain Expo/RN**:

- `expo` → `breaking: expo` (upgrade SDK 51 → 53+)
- `react-native` → `breaking: react-native` (0.74 → 0.76+)
- `expo-router` → `breaking: expo-router` (3.x → 4.x)

`npm audit fix --force` faria o upgrade automático mas **quebraria o app** (mudanças de API em Expo SDK, react-native 0.76+ tem Bridgeless mode etc.). Upgrade Expo 51 → 53 é um projeto de 1-3 dias com revalidação de:
- Expo Router 4 (mudou tipos)
- New Architecture obrigatória em RN 0.76+
- Bibliotecas dependentes (react-native-reanimated 4, three.js compatibilidade)

**Decisão:** capturado como item de roadmap (`UPGRADE_EXPO_53.md` — a criar). Até lá, mitigamos via:
1. Não expor superfícies vulneráveis em runtime (proxy IA server-side).
2. Pinned versions no `package-lock.json`.
3. Re-rodar `npm audit` a cada release notes do Expo SDK.

### CVEs notáveis (com mitigação atual)

| CVE | Pacote | Mitigação |
|---|---|---|
| GHSA-vh95-rmgr-6w4m | `xmldom` | Usado só em build-time (expo-cli). Não embarcado no runtime do app. |
| GHSA-c2qf-rxjj-qqgw | `semver` (transitivo) | Idem — build tooling, não runtime. |
| GHSA-3xgq-45jj-v275 | `cross-spawn` | DevDep do CLI. Não afeta produção. |

## Surface checklist (revisão manual 2026-05-20)

### Storage local

- [x] AsyncStorage para estado não-sensível (mascote, missions, XP)
- [x] `expo-secure-store` para tokens/credenciais (ex: chave OpenAI BYOK)
- [x] `prepareDnaForStorage` sanitiza payload antes de persistir
- [x] `readDnaFromStorage` tolera corrupção sem crash
- [x] Locks per-user em escrita concorrente (`withLock`)

### Network / API keys

- [x] Nenhuma chave OpenAI no repo (`grep "sk-" -r src/` retorna 0)
- [x] Cliente `ProxyMascotAI` lê `EXPO_PUBLIC_AI_PROXY_URL` — placeholder até deploy
- [x] BYOK: chave do usuário fica em `expo-secure-store`, nunca em AsyncStorage
- [x] Timeout em fetch (15s default) — não trava UI
- [x] Sem retry agressivo — fallback pra mock se OpenAI falhar

### Dados pessoais (LGPD/GDPR)

- [x] Display name + idade do user nunca enviados pra OpenAI (`dnaPromptSection` envia só descritores semânticos)
- [x] Mensagens do chat ficam em AsyncStorage local — usuário pode apagar via `/settings`
- [x] Telemetria gateada por `consent_analytics` (default false até consentir em onboarding)
- [x] `installTelemetry` é idempotente e checa consent a cada evento
- [x] Memory recall: 3 memórias relevantes injetadas no prompt — sem ID do usuário, só conteúdo

### Safety

- [x] `classifySafetyEnsemble`: regex + Bayes + sentiment vote
- [x] Critical → `CRISIS_REPLY` com CVV 188 + SAMU 192
- [x] High → mesmo handler que Critical (mai/2026)
- [x] Diagnostic patterns → `DIAGNOSIS_REDIRECT`
- [x] Attachment classifier ativo (`detectAttachment` em safety.ts)
- [x] OpenAI nunca recebe pergunta classificada critical/high (fallback local + crisis copy)

### Backup / export

- [x] Export local 100% funcional (`localSyncRepo.exportSnapshot`)
- [x] Payload inclui evolução, memória, subscription, personalization
- [x] Import sobrescreve — usuário ciente via UI antes de aplicar
- [x] Validação básica do payload (schema check) no import

## Itens em ABERTO (não-bloqueantes pra beta, bloqueantes pra escala)

1. **Proxy IA deploy** — sem isso, BYOK é a única forma de IA em produção.
2. **Upgrade Expo SDK 53+** — reduz vulnerabilidades drasticamente.
3. **Webhook RevenueCat → Supabase** — sincroniza tier (hoje só local).
4. **Audit log de safety flags** — guardar timestamps de critical/high (sem conteúdo) pra QA.
5. **Rate limit no proxy IA** — quando deployado, evitar abuso BYOK.

## Comandos de verificação

```powershell
# Rodar audit
npm --prefix app/mobile audit

# Buscar chaves hardcoded (deve retornar 0)
Get-ChildItem -Path app/mobile/src -Recurse -Include *.ts,*.tsx |
  Select-String -Pattern "sk-[A-Za-z0-9]{20,}" -CaseSensitive

# Buscar console.log fora de logger/telemetry
Get-ChildItem -Path app/mobile/src -Recurse -Include *.ts,*.tsx |
  Where-Object { $_.FullName -notlike "*\logger.ts" -and $_.FullName -notlike "*\telemetry.ts" } |
  Select-String -Pattern "console\.(log|warn|error)" -List

# Validar safety patterns ainda triggers
npm --prefix app/mobile test tests/security/
```
