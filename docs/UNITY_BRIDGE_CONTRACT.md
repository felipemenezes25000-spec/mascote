# Contrato bridge RN ↔ Unity

## Estado: `UnityMascotState` (schemaVersion: 1)

Schema JSON: `app/mobile/src/core/mascot-render-contract/schema/unity-mascot-state.v1.json`

Campos principais:

- `identity` — id, name, personality (`calm|motivator|cute|wise`), seed, baseModel (`bipo|zip|lulu|aro`)
- `progression` — phase (`egg`…`evolved`), level, xp, energy, health
- `state` — mood, animation, reduceMotion, lastSeenAt
- `dna` — 11 genes em `[0, 1]` (normalizados do genoma RN)
- `visuals` — tints hex, pattern, evolution opcional
- `morphology` — boneScales + parâmetros derivados
- `accessories` — ids Unity (`cap_classic`, …)
- `mutations` — ids desbloqueados
- `environment` — sceneId, tint, quality
- `pendingEvent?` — habit / phase.advanced / mutation.unlocked / …

## Mensagens RN → Unity

| type | Payload |
|------|---------|
| `state.update` | `{ state, seq }` |
| `event.play` | `{ event, seq }` |
| `gesture` | `{ gesture: pet\|tap\|poke }` |
| `quality.set` | `{ quality }` |

Regras de robustez RN→Unity:

- `seq` é **monotônico crescente** para `state.update` e `event.play`.
- Mensagens com `seq` inválido ou não monotônico são rejeitadas no bridge.
- RN mantém pendência por `seq` e aguarda `ack`; sem ACK aplica retry com backoff linear e limite de tentativas.
- Em timeout final de ACK, o bridge emite `error` recoverable (`UNITY_ACK_TIMEOUT`) para fallback.
- Em falha de `postMessage` nativo, o bridge emite `error` recoverable para fallback.

Implementação stub: `src/components/unity/UnityMascotBridge.ts`

## Mensagens Unity → RN

| type | Uso |
|------|-----|
| `ready` | Runtime carregado (`version`) |
| `error` | Falha (`recoverable` → fallback three) |
| `animation.complete` | Fim de clip |
| `gesture.received` | Tap no mascote 3D |
| `ack` | Confirma processamento de `state.update`/`event.play` por `seq` |

## Mapeamentos PT → EN

`src/core/mascot-render-contract/mappings.ts` — fases, moods, hábitos, acessórios (`cap` → `cap_classic`).

## Builder

`buildUnityMascotState(mascot, context?)` reutiliza `dnaToMaterialBindings`, `dnaToBoneScales`, `dnaToAnimationState`, `phenotypeToMascotVisuals` (via context).
