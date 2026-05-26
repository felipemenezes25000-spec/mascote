# Shape Keys — adicionar morph targets aos GLBs

Antes de rodar Mascot3DAsset + Unity (que usam `morphTargetInfluences` /
`SetBlendShapeWeight`), os GLBs precisam ter os shape keys do catalogo
oficial. O script `add_shape_keys.py` adiciona programaticamente os 10
nomes esperados (`eye_big`, `eye_small`, `body_tall` etc).

## Rodar

```bash
cd /path/to/mascote
blender --background \
  unity/MascotUnityCore/Assets/Mascote/StreamingAssets/mascot-3d/bipo.glb \
  --python scripts/blender/add_shape_keys.py \
  -- \
  --out unity/MascotUnityCore/Assets/Mascote/StreamingAssets/mascot-3d/bipo.glb

# repetir para zip, lulu, aro
for m in zip lulu aro; do
  blender --background \
    unity/MascotUnityCore/Assets/Mascote/StreamingAssets/mascot-3d/$m.glb \
    --python scripts/blender/add_shape_keys.py \
    -- \
    --out unity/MascotUnityCore/Assets/Mascote/StreamingAssets/mascot-3d/$m.glb
done
```

## O que o script faz

Cria 10 shape keys com transformacoes algoritmicas SIMPLES:
- `eye_big` / `eye_small`: scale uniforme em meshes contendo "eye"
- `body_tall` / `body_short`: scale Y em meshes contendo "body"
- `body_wide` / `body_narrow`: scale X+Y em meshes contendo "body"
- `posture_forward` / `posture_back`: rotacao X (~8 graus) em meshes "body"
- `aura_strong`: scale uniforme em meshes "aura"
- `pattern_dense`: placeholder (ativacao via shader)

Esses sao starting points algoritmicos. Pro polish artistico (ex: olhos
mais expressivos), o artista pode abrir o GLB no Blender e editar as
deformations manualmente — os shape keys ja existirao com nomes corretos.

## Validar no Unity

Apos importar no Unity Editor:
1. Inspect o GLB no Project view.
2. Expand o prefab → SkinnedMeshRenderer.
3. Em "BlendShapes", deve listar os 10 nomes do catalogo.
4. Mexer o slider de cada um deve animar o mesh.

Se algum nome estiver faltando, ver o log do Blender: provavelmente o
mesh nao bate o substring esperado (`body`, `eye`, `aura`).

## Sincronia com TS

O catalogo eh definido em UM lugar so:
`app/mobile/src/lib/dna/morphInfluences.ts` → `MORPH_INFLUENCE_KEYS`.

Se voce adicionar/remover um shape key:
1. Atualize o array `SHAPE_KEY_SPECS` em `add_shape_keys.py`.
2. Atualize `MORPH_INFLUENCE_KEYS` em `morphInfluences.ts`.
3. Re-export os GLBs.
4. Re-build o Unity AAR (que consome o nome via `SetBlendShapeWeight`).
