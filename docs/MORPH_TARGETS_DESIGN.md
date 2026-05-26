# Morph Targets — DNA → geometria real

**Slice:** 2026-05-25 (slice 3 paralelo)

## Problema

Até aqui o DNA influencia o mascote via:
- **Cor** (`MaterialPropertyBlock._BaseColor`, `_EmissionColor`) — visível
- **Escala de bones** (`bone.localScale = scale`) — visível
- **Pattern** (texture roughness) — visível
- **Animação** (mood → idle name) — visível

Mas a **forma da geometria** sempre é a do GLB original (`bipo.glb` é sempre o mesmo formato; cor/escala mudam, shape não). Resultado: 4 silhuetas fixas no mundo todo.

## Solução

**Blend shapes (morph targets)** permitem o GLB declarar variações da mesma mesh ("olho grande", "corpo alto", "postura inclinada") e o runtime mixa via weights [0, 1]. É como sliders em Sims face customization.

Cada gene/morphology → blend shape weight. Mascote vira fisicamente único.

## Catálogo oficial (slice 2026-05-25)

```ts
// app/mobile/src/lib/dna/morphInfluences.ts
MORPH_INFLUENCE_KEYS = [
  'eye_big', 'eye_small',
  'body_tall', 'body_short',
  'body_wide', 'body_narrow',
  'posture_forward', 'posture_back',
  'aura_strong',
  'pattern_dense',
]
```

Pares mutually exclusive (nunca eye_big E eye_small simultâneos).

## Pipeline TS

```
DNA → morphologyFromGenome → applyCustomization → applyMutationVisualImpact
   ↓ (Morphology final)
morphInfluencesFromMorphology(morph)
   ↓ (dict de blend shape weights)
buildUnityMascotState → state.morphology.morphInfluences
   ↓ (JSON)
UnityMascotBridge.postToUnity
   ↓
[Unity] MascotController.ApplyFromState
   ↓
MascotBlendShapeController.ApplyMorphInfluences(dict)
   ↓
SkinnedMeshRenderer.SetBlendShapeWeight(index, weight*100)
```

## Pipeline Three.js (futuro)

Se o GLB carregado via `useGLTF()` tiver blend shapes, o `Creature.tsx` pode aplicar:

```tsx
mesh.morphTargetInfluences[mesh.morphTargetDictionary['eye_big']] = weight01;
```

Esse wiring **não está feito ainda** — slice futuro. Por ora só Unity consome `morphInfluences`. Three.js continua usando escala de bones + tinting.

## Defensive behavior

- **Sem blend shapes na GLB:** `MascotBlendShapeController` loga warning UMA vez por key faltante e ignora. NO-OP silencioso, render funciona normal.
- **`morphInfluences` ausente do state (mascotes antigos):** controller resetalla weights pra 0 e termina.
- **Weight fora de [0, 1]:** clampado pelo `Mathf.Clamp01`.

## O que falta pra funcionar de verdade

⚠️ **GLBs atuais (`bipo.glb`, `zip.glb`, `lulu.glb`, `aro.glb`) NÃO têm blend shapes.** Resultado: pipeline funciona mas controller fica NO-OP até alguém adicionar.

### Checklist Blender (artista 3D)

1. Abrir GLB no Blender
2. Selecionar mesh principal
3. **Properties → Object Data → Shape Keys**
4. Adicionar `Basis` (referência) + os shapes do catálogo:
   - `eye_big` — mover vértices dos olhos pra fora/cima ~15%
   - `eye_small` — mover vértices pra dentro/baixo ~15%
   - `body_tall` — esticar vértices do tronco no eixo Y +25%
   - `body_short` — comprimir Y -25%
   - `body_wide` — esticar X +25%
   - `body_narrow` — comprimir X -25%
   - `posture_forward` — rotacionar coluna ~10° frente
   - `posture_back` — rotacionar ~10° trás
   - `aura_strong` — opcional, mexer em mesh de aura se existir
   - `pattern_dense` — opcional, scale UV pra duplicar pattern
5. Export GLB com **`Include Shape Keys`** marcado
6. Re-importar no Unity Editor → prefab deve mostrar blend shapes no Inspector do SkinnedMeshRenderer

### Validação Unity

```csharp
// No Inspector do prefab, SkinnedMeshRenderer deve listar:
//   BlendShapes (10):
//     0: eye_big
//     1: eye_small
//     ... (todos do catálogo)
```

Se não listar, GLB não foi exportado com shape keys. Re-fazer passo 5.

## Arquivos do slice

| Arquivo | Papel |
|---|---|
| `app/mobile/src/lib/dna/morphInfluences.ts` | Catálogo + função derive |
| `app/mobile/src/core/mascot-render-contract/types.ts` | Campo `morphInfluences?` em `UnityMorphologyParams` |
| `app/mobile/src/core/mascot-render-contract/buildUnityMascotState.ts` | Inclui campo no state |
| `unity/.../State/DTOs/UnityMascotState.cs` | C# DTO espelha o campo |
| `unity/.../Core/MascotBlendShapeController.cs` | Aplica via SkinnedMeshRenderer |
| `unity/.../Core/MascotController.cs` | Auto-wire + chamada após morphology |
| `app/mobile/tests/lib/dna/morph-influences.test.ts` | 9 testes invariantes |

## Próximos slices

- **Three.js consumption** — wirar `morphTargetInfluences` no `Creature.tsx` quando o GLB tiver morphs
- **Blender pipeline** — preparar GLBs com shape keys (artista)
- **Per-personality presets** — Calmo abre mais `body_short`, Motivador abre mais `posture_forward`
- **Mutations → morphs** — algumas mutações poderiam aplicar morph adicional (ex: "deep eyes" = eye_big extra)
