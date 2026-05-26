"""
Add Shape Keys — adiciona blend shapes (shape keys) a um GLB existente.

Catalogo oficial do Mascote (sincronizado com MORPH_INFLUENCE_KEYS em
src/lib/dna/morphInfluences.ts):

  eye_big          - olho maior (scale +20%)
  eye_small        - olho menor (scale -20%)
  body_tall        - corpo alongado (scale Y +15%)
  body_short       - corpo achatado (scale Y -15%)
  body_wide        - corpo alargado (scale X/Z +15%)
  body_narrow      - corpo afinado (scale X/Z -15%)
  posture_forward  - postura inclinada pra frente (rotacao +8 graus)
  posture_back     - postura inclinada pra tras (rotacao -8 graus)
  aura_strong      - aura intensa (escala uniforme +10%)
  pattern_dense    - padrao denso (placeholder vertex-color, processado em runtime)

USO:
  blender --background bipo.glb --python scripts/blender/add_shape_keys.py -- --out bipo_with_keys.glb

REQUER: Blender 3.6+ com bpy/mathutils. Roda headless (--background).

OUTPUT: GLB com mesh.shape_keys.key_blocks contendo cada shape key acima.
Three.js le via mesh.morphTargetDictionary; Unity le via SkinnedMeshRenderer.

NOTE: Esses sao shape keys SIMPLES (escala + rotacao por vertice). Pra
shape keys ARTISTICAS (ex: olho mais expressivo), o artista deve editar
manualmente apos rodar esse script — esse script garante so que as
chaves existem e sao endereçaveis pelo runtime.
"""

import argparse
import sys
from pathlib import Path

try:
    import bpy
    import mathutils
except ImportError:
    print("[shape-keys] precisa rodar dentro do Blender (bpy nao disponivel)")
    sys.exit(1)


SHAPE_KEY_SPECS = [
    {
        "name": "eye_big",
        "target_substr": "eye",
        "transform": ("scale_uniform", 1.20),
    },
    {
        "name": "eye_small",
        "target_substr": "eye",
        "transform": ("scale_uniform", 0.80),
    },
    {
        "name": "body_tall",
        "target_substr": "body",
        "transform": ("scale_axis", ("Z", 1.15)),
    },
    {
        "name": "body_short",
        "target_substr": "body",
        "transform": ("scale_axis", ("Z", 0.85)),
    },
    {
        "name": "body_wide",
        "target_substr": "body",
        "transform": ("scale_axis_pair", ("X", "Y", 1.15)),
    },
    {
        "name": "body_narrow",
        "target_substr": "body",
        "transform": ("scale_axis_pair", ("X", "Y", 0.85)),
    },
    {
        "name": "posture_forward",
        "target_substr": "body",
        "transform": ("rotate_axis", ("X", 0.14)),  # ~8deg em rad
    },
    {
        "name": "posture_back",
        "target_substr": "body",
        "transform": ("rotate_axis", ("X", -0.14)),
    },
    {
        "name": "aura_strong",
        "target_substr": "aura",
        "transform": ("scale_uniform", 1.10),
    },
    {
        "name": "pattern_dense",
        "target_substr": "body",
        "transform": ("noop", None),  # placeholder, ativacao via shader
    },
]


def find_meshes(substr):
    """Acha meshes cujo nome contem o substring (case-insensitive)."""
    s = substr.lower()
    return [obj for obj in bpy.data.objects
            if obj.type == "MESH" and s in obj.name.lower()]


def ensure_basis(mesh_obj):
    if not mesh_obj.data.shape_keys:
        mesh_obj.shape_key_add(name="Basis", from_mix=False)


def apply_transform(key_block, transform):
    kind, payload = transform
    basis = key_block.data
    if kind == "scale_uniform":
        factor = payload
        for i, v in enumerate(basis):
            v.co.x *= factor
            v.co.y *= factor
            v.co.z *= factor
    elif kind == "scale_axis":
        axis, factor = payload
        idx = {"X": 0, "Y": 1, "Z": 2}[axis]
        for v in basis:
            v.co[idx] *= factor
    elif kind == "scale_axis_pair":
        a1, a2, factor = payload
        i1 = {"X": 0, "Y": 1, "Z": 2}[a1]
        i2 = {"X": 0, "Y": 1, "Z": 2}[a2]
        for v in basis:
            v.co[i1] *= factor
            v.co[i2] *= factor
    elif kind == "rotate_axis":
        axis, angle = payload
        ax = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}[axis]
        rot = mathutils.Matrix.Rotation(angle, 4, mathutils.Vector(ax))
        for v in basis:
            v.co = rot @ v.co
    elif kind == "noop":
        pass
    else:
        print(f"[shape-keys] transform desconhecido: {kind}")


def add_shape_keys_to_mesh(mesh_obj, specs):
    ensure_basis(mesh_obj)
    for spec in specs:
        name = spec["name"]
        if name in mesh_obj.data.shape_keys.key_blocks:
            print(f"[shape-keys] {mesh_obj.name}: {name} ja existe, pulando")
            continue
        # Cria key a partir do basis
        key_block = mesh_obj.shape_key_add(name=name, from_mix=False)
        key_block.value = 0.0
        # Aplica delta a partir das positions do basis
        apply_transform(key_block, spec["transform"])
        print(f"[shape-keys] {mesh_obj.name}: + {name}")


def main():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="GLB output path")
    args = parser.parse_args(argv)

    if not bpy.data.objects:
        print("[shape-keys] cena vazia — abra um GLB antes de rodar")
        sys.exit(2)

    # Agrupa specs por substring alvo + aplica em todos os meshes que batem.
    by_target = {}
    for spec in SHAPE_KEY_SPECS:
        by_target.setdefault(spec["target_substr"], []).append(spec)

    touched = False
    for substr, specs in by_target.items():
        meshes = find_meshes(substr)
        if not meshes:
            print(f"[shape-keys] nenhum mesh com substring '{substr}' — pulando ({[s['name'] for s in specs]})")
            continue
        for m in meshes:
            add_shape_keys_to_mesh(m, specs)
            touched = True

    if not touched:
        print("[shape-keys] nenhum mesh tocado — verifique nomes dos meshes no GLB")
        sys.exit(3)

    out_path = Path(args.out).resolve()
    bpy.ops.export_scene.gltf(
        filepath=str(out_path),
        export_format="GLB",
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
    )
    print(f"[shape-keys] gravado em {out_path}")


if __name__ == "__main__":
    main()
