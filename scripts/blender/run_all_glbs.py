# Pipeline runner: aplica add_shape_keys em todos os 4 GLBs do Mascote.
#
# Pra rodar dentro do Blender (console ou text editor):
#   exec(open(BLENDER_REPO_PATH + 'scripts/blender/run_all_glbs.py').read())
#
# Espera que add_shape_keys.py ja tenha sido exec'd (funcoes carregadas
# no namespace global): add_shape_keys_to_mesh, find_meshes, etc.

import bpy
from pathlib import Path

# Repo path (Windows). Forward slashes pra evitar escape em docstring.
REPO = Path('C:/Users/Felipe/Documents/mascote')
GLB_DIR = REPO / 'app' / 'mobile' / 'assets' / 'mascot-3d'

GLB_FILES = ['bipo.glb', 'zip.glb', 'lulu.glb', 'aro.glb']


def find_all_meshes():
    return [obj for obj in bpy.data.objects if obj.type == 'MESH']


def reset_scene():
    """Limpa scene completamente."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)
    for block in list(bpy.data.images):
        bpy.data.images.remove(block)


def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=str(path))


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format='GLB',
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
        use_selection=False,
    )


def process_glb(name):
    src = GLB_DIR / name
    if not src.is_file():
        print('[run-all] not found:', src)
        return False
    print('\n[run-all] ===', name, '===')
    reset_scene()
    import_glb(src)
    meshes = find_all_meshes()
    print('[run-all]', len(meshes), 'meshes imported')
    if not meshes:
        print('[run-all] no meshes after import - skipping')
        return False
    for m in meshes:
        add_shape_keys_to_mesh(m, SHAPE_KEY_SPECS)
    export_glb(src)
    print('[run-all] saved:', src)
    return True


def main():
    ok = 0
    fail = 0
    for name in GLB_FILES:
        if process_glb(name):
            ok += 1
        else:
            fail += 1
    print('\n[run-all] === summary:', ok, 'ok,', fail, 'fail ===')


main()
