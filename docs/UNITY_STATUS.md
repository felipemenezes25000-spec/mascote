# Unity Status — Snapshot 2026-05-24

## Fonte de verdade de versão

- `unity/MascotUnityCore/ProjectSettings/ProjectVersion.txt`
- Valor atual: **6000.4.8f1**

## Estado atual da integração

### Simulação → render (2026-05-24)

- ✅ `lifeState.energy` / `lifeState.mood` passam para `buildUnityMascotState` (`simEnergy`, `simMood`)
- ✅ `MascotRenderer` lê `lifeState` do store
- ✅ `HomeAwayStrip` na Home exibe living moments / resumo de ausência

### Android

- ✅ Bridge JS/Kotlin presente (`UnityMascotBridge`, `UnityMascotModule.kt`)
- ✅ Contrato RN↔Unity com `schemaVersion: 1`
- ✅ Fallback operacional quando Unity não está embedded
- 🟡 Embed real depende de export do `unityLibrary` final no pipeline Android

### iOS

- 🟡 Documentação e plugin base existem
- 🔴 Bridge nativa final ainda não implementada
- 🔴 Requer fluxo Mac/Xcode + export UnityFramework

### Contrato e robustez (sessão atual)

- ✅ Parse Unity→RN agora valida shape por tipo de mensagem
- ✅ `state.update` inválido é bloqueado no bridge antes de envio
- ✅ Guard de versão de schema ativo (`schemaVersion` esperado = 1)
- ✅ Testes dedicados para contrato adicionados/atualizados

## Gaps imediatos Unity

1. Fechar integração iOS nativa (quando houver ambiente Mac).
2. Completar embed Android com artefato Unity exportado no fluxo de build.
3. Expandir cobertura de testes de integração para `useUnityMascot` em cenários de erro/reconexão.

## Risco atual

Risco **médio**: contrato de mensagens está mais seguro, mas a integração nativa completa ainda depende de passos externos de build/export.
