"""
Generate Mascot — gera mascote chibi via Blender Python API.

Rodar:
    blender --background --python scripts/blender/generate_mascot.py -- --preset bipo --out assets/mascot-3d/bipo.glb --render assets/mascot-3d/bipo.png

Cada mascote é composição de PRIMITIVAS (não vertex deformation procedural):
  - Cabeça: UV sphere grande
  - Corpo: UV sphere menor abaixo
  - 2 olhos: spheres brancas + pupila + highlight
  - 2 bochechas: spheres rosadas achatadas
  - Sorriso: bezier curve convertida em mesh
  - 2 bracinhos: spheres alongadas
  - 2 pezinhos: spheres achatadas

Subdivision Surface modifier + Smooth Shading garantem visual smooth profissional
(não low-poly facetado nem blob deformado). Materials PBR com cor neutra branca
+ tints aplicados — quando o app carrega o GLB, modula via `material.color.setHex(tint)`.

4 PRESETS de personality (cores e proporções):
  - bipo (Calmo): paleta pêssego, proporções padrão
  - zip (Motivador): paleta coral, corpo mais alongado vertical
  - lulu (Fofo): paleta rosa, cabeça maior + bochechas mais marcadas
  - aro (Sábio): paleta lilás, olhos maiores
"""

import argparse
import math
import os
import sys

# Blender API
import bpy
import bmesh
from mathutils import Vector


# ============================================================================
# PRESETS — params por personality
# ============================================================================

PRESETS = {
    'bipo': {  # Calmo
        'body_color': (0.96, 0.78, 0.58, 1.0),  # pêssego
        'accent_color': (0.92, 0.62, 0.45, 1.0),  # coral suave
        'glow_color': (1.0, 0.88, 0.68, 1.0),  # cream luminoso
        'cheek_color': (1.0, 0.55, 0.62, 1.0),  # rosa
        'head_scale': 1.0,
        'body_scale': 0.7,
        'eye_scale': 1.0,
        'cheek_intensity': 0.78,
    },
    'zip': {  # Motivador
        'body_color': (0.98, 0.65, 0.45, 1.0),  # coral vívido
        'accent_color': (0.86, 0.48, 0.32, 1.0),  # terracota
        'glow_color': (1.0, 0.78, 0.55, 1.0),  # dourado
        'cheek_color': (1.0, 0.55, 0.55, 1.0),
        'head_scale': 0.95,
        'body_scale': 0.75,  # corpo um pouco maior — postura ereta
        'eye_scale': 1.05,
        'cheek_intensity': 0.65,
    },
    'lulu': {  # Fofo
        'body_color': (1.0, 0.82, 0.86, 1.0),  # rosa pálido
        'accent_color': (1.0, 0.68, 0.74, 1.0),
        'glow_color': (1.0, 0.90, 0.92, 1.0),
        'cheek_color': (1.0, 0.50, 0.60, 1.0),  # rosa mais marcado
        'head_scale': 1.12,  # cabeça maior — chibi extremo
        'body_scale': 0.65,
        'eye_scale': 1.10,
        'cheek_intensity': 0.92,  # bochechas mais visíveis
    },
    'aro': {  # Sábio
        'body_color': (0.84, 0.78, 0.96, 1.0),  # lilás
        'accent_color': (0.72, 0.64, 0.92, 1.0),
        'glow_color': (0.92, 0.86, 1.0, 1.0),
        'cheek_color': (0.95, 0.65, 0.78, 1.0),
        'head_scale': 1.02,
        'body_scale': 0.7,
        'eye_scale': 1.18,  # olhos maiores — contemplativo
        'cheek_intensity': 0.55,
    },
}


# ============================================================================
# UTILS
# ============================================================================

def clear_scene():
    """Limpa tudo da scene default do Blender."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for material in bpy.data.materials:
        bpy.data.materials.remove(material)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh)


def create_pbr_material(name, color, roughness=0.42, metalness=0.08,
                       emissive_color=None, emissive_strength=0.0):
    """Cria material Principled BSDF com PBR setup."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    # Metallic input nome muda entre versões Blender
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = metalness
    if emissive_color and 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = emissive_color
        bsdf.inputs['Emission Strength'].default_value = emissive_strength
    elif emissive_color and 'Emission' in bsdf.inputs:
        bsdf.inputs['Emission'].default_value = emissive_color
    return mat


def add_subdiv_surface(obj, levels=2):
    """Adiciona Subdivision Surface modifier pra suavizar."""
    mod = obj.modifiers.new(name='Subdivision', type='SUBSURF')
    mod.levels = levels
    mod.render_levels = levels + 1
    return mod


def shade_smooth(obj):
    """Aplica smooth shading."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


def create_uv_sphere(name, location, radius=1.0, segments=32, rings=16):
    """Cria UV sphere primitiva."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius,
        segments=segments,
        ring_count=rings,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    return obj


# ============================================================================
# MASCOT BUILD
# ============================================================================

def build_head(preset):
    """Cria cabeça chibi grande."""
    head = create_uv_sphere('head', (0, 0, 0.85), radius=0.7 * preset['head_scale'])
    # Leve achatamento vertical pra parecer "cabeça" não bola
    head.scale.z = 0.96
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    shade_smooth(head)
    add_subdiv_surface(head, levels=2)
    return head


def build_body(preset):
    """Cria corpo menor abaixo da cabeça."""
    body = create_uv_sphere('body', (0, 0, -0.05), radius=0.55 * preset['body_scale'])
    body.scale.z = 1.1  # alonga vertical
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    shade_smooth(body)
    add_subdiv_surface(body, levels=2)
    return body


def build_eye(name, x_offset, preset):
    """Cria 1 olho composto: sclera (branco) + pupila (preta) + highlight.

    Y NEGATIVO = frente (lado da câmera em -3.5).
    Pupila deve ficar MAIS NEGATIVA que sclera (mais perto da câmera).
    """
    eye_size = 0.20 * preset['eye_scale']
    eye_y = -0.62

    # Sclera (branco brilhante)
    sclera = create_uv_sphere(f'{name}_sclera', (x_offset, eye_y, 1.0),
                              radius=eye_size, segments=24, rings=16)
    sclera_mat = create_pbr_material(
        f'{name}_sclera_mat',
        color=(1.0, 1.0, 1.0, 1.0),
        roughness=0.15,
        metalness=0.1,
    )
    sclera.data.materials.append(sclera_mat)
    shade_smooth(sclera)

    # Pupila (preta) — MAIS NEGATIVA Y = mais perto da câmera = visível
    pupil_radius = eye_size * 0.62
    pupil = create_uv_sphere(f'{name}_pupil',
                            (x_offset, eye_y - eye_size * 0.6, 1.0),
                            radius=pupil_radius, segments=18, rings=12)
    pupil_mat = create_pbr_material(
        f'{name}_pupil_mat',
        color=(0.05, 0.05, 0.05, 1.0),  # preto puro pra cartoon definido
        roughness=0.3,
        metalness=0.1,
    )
    pupil.data.materials.append(pupil_mat)
    shade_smooth(pupil)

    # Highlight (catch-light branco) — ainda mais negativo (frente da pupila)
    hl_radius = pupil_radius * 0.45
    hl = create_uv_sphere(f'{name}_hl',
                         (x_offset - pupil_radius * 0.32,
                          eye_y - eye_size * 0.95,
                          1.0 + pupil_radius * 0.30),
                         radius=hl_radius, segments=12, rings=8)
    hl_mat = create_pbr_material(
        f'{name}_hl_mat',
        color=(1.0, 1.0, 1.0, 1.0),
        roughness=0.0,
        metalness=0.0,
    )
    hl.data.materials.append(hl_mat)

    return [sclera, pupil, hl]


def build_cheek(name, x_offset, preset):
    """Cria 1 bochecha rosada na face do mascote.
    Y mais negativo = mais frente = visível pela câmera.
    """
    cheek = create_uv_sphere(name, (x_offset, -0.70, 0.78),
                            radius=0.13, segments=16, rings=12)
    cheek.scale = (1.0, 0.35, 0.7)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    cheek_mat = create_pbr_material(
        f'{name}_mat',
        color=preset['cheek_color'],
        roughness=0.4,
        metalness=0.0,
    )
    cheek.data.materials.append(cheek_mat)
    shade_smooth(cheek)
    return cheek


def build_mouth():
    """Cria sorriso via TorusGeometry parcial.
    Mais simples e robusto que bezier curve. Y bem negativo = frente.
    """
    bpy.ops.mesh.primitive_torus_add(
        location=(0, -0.80, 0.76),
        major_radius=0.10,
        minor_radius=0.012,
        major_segments=20,
        minor_segments=8,
    )
    mouth = bpy.context.active_object
    mouth.name = 'mouth'
    # Rotaciona pra ficar de pé (default torus deita)
    mouth.rotation_euler = (math.radians(90), 0, 0)
    # Achata vertical pra sorriso (não círculo completo)
    mouth.scale = (1.0, 0.55, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mouth_mat = create_pbr_material(
        'mouth_mat',
        color=(0.1, 0.05, 0.03, 1.0),
        roughness=0.4,
        metalness=0.05,
    )
    mouth.data.materials.append(mouth_mat)
    shade_smooth(mouth)
    return mouth


def build_arms(preset):
    """Cria 2 bracinhos esféricos nas laterais do corpo."""
    arms = []
    for sign, name in [(-1, 'arm_L'), (1, 'arm_R')]:
        arm = create_uv_sphere(name, (sign * 0.62, 0, -0.05),
                              radius=0.18, segments=20, rings=14)
        arm.scale = (1.0, 1.0, 1.1)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        shade_smooth(arm)
        add_subdiv_surface(arm, levels=1)
        arms.append(arm)
    return arms


def build_feet(preset):
    """Cria 2 pezinhos achatados embaixo."""
    feet = []
    for sign, name in [(-1, 'foot_L'), (1, 'foot_R')]:
        foot = create_uv_sphere(name, (sign * 0.28, 0.1, -0.65),
                               radius=0.20, segments=20, rings=14)
        foot.scale = (1.0, 1.5, 0.55)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        shade_smooth(foot)
        add_subdiv_surface(foot, levels=1)
        feet.append(foot)
    return feet


def apply_body_materials(head, body, arms, feet, preset):
    """Aplica materials body+accent nos corpos principais."""
    print(f'  body_color: {preset["body_color"]}')
    print(f'  accent_color: {preset["accent_color"]}')
    print(f'  cheek_color: {preset["cheek_color"]}')
    body_mat = create_pbr_material(
        'body_material',
        color=preset['body_color'],
        roughness=0.38,
        metalness=0.06,
        # SEM emissive — estava jogando cor amarela em cima de tudo
    )
    accent_mat = create_pbr_material(
        'accent_material',
        color=preset['accent_color'],
        roughness=0.42,
        metalness=0.08,
    )
    head.data.materials.append(body_mat)
    body.data.materials.append(body_mat)
    for arm in arms:
        arm.data.materials.append(accent_mat)
    for foot in feet:
        foot.data.materials.append(accent_mat)


def setup_lighting():
    """4-light Pixar rig pra renderização final."""
    # Key light
    bpy.ops.object.light_add(type='AREA', location=(3, -3, 4))
    key = bpy.context.active_object
    key.data.energy = 800
    key.data.color = (1.0, 0.97, 0.93)
    key.rotation_euler = (math.radians(50), 0, math.radians(45))

    # Rim light
    bpy.ops.object.light_add(type='AREA', location=(-3, 2, 2))
    rim = bpy.context.active_object
    rim.data.energy = 400
    rim.data.color = (1.0, 0.82, 0.72)
    rim.rotation_euler = (math.radians(70), 0, math.radians(-45))

    # Fill light
    bpy.ops.object.light_add(type='AREA', location=(0, -2, -1))
    fill = bpy.context.active_object
    fill.data.energy = 200
    fill.data.color = (0.72, 0.85, 1.0)

    # Ambient
    bpy.ops.object.light_add(type='AREA', location=(0, 0, 5))
    ambient = bpy.context.active_object
    ambient.data.energy = 250
    ambient.data.color = (1.0, 0.96, 0.92)
    ambient.scale = (5, 5, 5)


def setup_camera():
    """Camera centralizada no mascote, 3/4 angle."""
    bpy.ops.object.camera_add(location=(0, -3.5, 1.5))
    camera = bpy.context.active_object
    camera.rotation_euler = (math.radians(72), 0, 0)
    camera.data.lens = 50  # 50mm
    bpy.context.scene.camera = camera


def setup_render(out_path, resolution=512):
    """Configura render settings — Eevee (rápido e previsível)."""
    scene = bpy.context.scene
    # Eevee Next no Blender 4+/5+ (não 'BLENDER_EEVEE' antigo)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.filepath = out_path
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'


def export_glb(out_path):
    """Exporta toda a scene como GLB."""
    # Seleciona TUDO antes do export
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_yup=True,
        export_apply=True,  # apply modifiers (subdivision)
        export_animations=False,  # sem animations por enquanto
        use_selection=False,
    )


# ============================================================================
# MAIN
# ============================================================================

def main():
    # Parse args (depois do `--` separator do Blender)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--preset', default='bipo', choices=PRESETS.keys())
    parser.add_argument('--out', required=True, help='Output GLB path')
    parser.add_argument('--render', help='Optional preview PNG output')
    args = parser.parse_args(argv)

    preset = PRESETS[args.preset]
    print(f'\n=== Building mascot {args.preset} ===')

    # Build mascote
    clear_scene()
    head = build_head(preset)
    body = build_body(preset)
    eye_L = build_eye('eye_L', -0.22, preset)
    eye_R = build_eye('eye_R', 0.22, preset)
    cheek_L = build_cheek('cheek_L', -0.32, preset)
    cheek_R = build_cheek('cheek_R', 0.32, preset)
    mouth = build_mouth()
    arms = build_arms(preset)
    feet = build_feet(preset)

    apply_body_materials(head, body, arms, feet, preset)

    # Export GLB
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    export_glb(args.out)
    print(f'GLB exported to: {args.out}')

    # Optional render preview
    if args.render:
        setup_lighting()
        setup_camera()
        os.makedirs(os.path.dirname(args.render), exist_ok=True)
        setup_render(args.render)
        bpy.ops.render.render(write_still=True)
        print(f'Preview rendered to: {args.render}')

    print('=== Done ===')


if __name__ == '__main__':
    main()
