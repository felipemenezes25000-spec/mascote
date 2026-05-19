# AI Mascot Design

## Camadas

```
User message
    ↓
SafetyRules (classifyInput + ensemble)
    ↓
MascotAI.mascotReply
    ├── OpenAI (se apiKey) via lib/ai.ts
    └── LocalFallbackAI (mockReply + classifyIntent)
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
| `LocalFallbackAI.ts` | Respostas offline |
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

Fallback local sempre disponível; OpenAI opcional via apiKey.

## Missões IA

Heurística local determinística — sem API. Futuro: ranker ML já existe em `lib/ml/recommend/mission-ranker.ts`.

## Relatório semanal narrado

Pendente: combinar `BehaviorEngine` + `EmotionalMemory` + template narrativo. Dados disponíveis via `buildBehaviorHistory`.
