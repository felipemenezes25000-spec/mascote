# AI Mascot Design

## Camadas

```
User message
    ↓
SafetyRules (classifyInput + ensemble)
    ↓
MascotAI.mascotReply
    ├── Proxy backend (EXPO_PUBLIC_AI_PROXY_URL) via ProxyMascotAI.ts
    ├── OpenAI (se apiKey local) via lib/ai.ts
    └── LocalFallbackAI (templates + memória curta)
    ↓
PromptBuilder (DNA descritores + memórias — nunca genome bruto)
    ↓
EmotionalMemory (tom supportive/celebratory/gentle)
```

## Módulos (`src/ai/`)

| Arquivo | Função |
|---------|--------|
| `MascotAI.ts` | Fachada unificada com fallback |
| `PromptBuilder.ts` | Monta prompt PT-BR seguro |
| `SafetyRules.ts` | Bloqueio crise + redirecionamento clínico |
| `ProxyMascotAI.ts` | POST `/v1/mascot/reply` — chave só no servidor |
| `LocalFallbackAI.ts` | Respostas offline variadas + recall de memória |
| `MissionGeneratorAI.ts` | Missões sugeridas por seed + hábitos recentes |
| `EmotionalMemory.ts` | Tom emocional a partir de memórias |

## Memória

- **Curto prazo**: histórico de chat na sessão
- **Longo prazo**: `lib/memory.ts` — extração por padrões + TF-IDF + embeddings
- **Game layer**: `src/game/memory/MascotMemoryService.ts` — timeline narrativa

## Privacidade DNA

O genoma **nunca** vai bruto para APIs externas. Apenas descritores semânticos via `dnaPromptSection()`. Testado em `tests/security/dna-privacy-ai.test.ts`.

## Integração UI (100%)

| Contexto | Módulo |
|----------|--------|
| Home | `lib/mascot-context-line.ts` + memória emocional |
| Missão concluída | `mission-done.tsx` → fala contextual |
| Relatório semanal | `weeklyReportGenerator.ts` + narrativa |
| Evolução | memórias na aba Evolução via `MascotMemoryService` |

**Produção:** deploy de proxy (`EXPO_PUBLIC_AI_PROXY_URL`) é obrigatório para qualidade sem expor `sk-` no app. Fallback local permanece offline-first.

OpenAI via apiKey do usuário continua opcional em dev.

## Missões IA

Heurística local determinística — sem API. Futuro: ranker ML já existe em `lib/ml/recommend/mission-ranker.ts`.

## Relatório semanal narrado

Pendente: combinar `BehaviorEngine` + `EmotionalMemory` + template narrativo. Dados disponíveis via `buildBehaviorHistory`.
