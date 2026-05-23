"""
Generate Mascot v2 — Blender Python API, FULL PREMIUM SETUP.

Stack de qualidade visual (cada item soma camada):
  1. SSS (Subsurface Scattering) — luz penetra/espalha dentro do material
     (look gel/skin Slime Rancher / Pixar)
  2. Clearcoat 0.85 — camada laqueada brilhante por cima
  3. Sheen 0.4 — velvet rim glow nas bordas (silhueta destaca)
  4. Cycles renderer 256 samples + denoising — qualidade premium
  5. Compositor bloom — glow ao redor das partes brilhantes (olhos, sorriso)
  6. 5-point lighting rig (key + 2 rim + fill + bottom bounce)
  7. HDRI-style world background (gradient + ambient occlusion)
  8. Camera com Depth of Field (bokeh sutil no background)
  9. Pestanas + sobrancelhas (mesh extras pra expressão facial)
 10. Procedural texture sutil no body (noise variation, evita "perfeito demais")

Rodar:
    blender --background --python scripts/blender/generate_mascot.py -- \\
        --preset bipo --out app/mobile/assets/mascot-3d/bipo.glb \\
        --render app/mobile/assets/mascot-3d/bipo-preview.png
"""

import argparse
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector


# ============================================================================
# PRESETS — params por personality
# ============================================================================

PRESETS = {
    'bipo': {  # Calmo
        'body_color': (0.96, 0.78, 0.58, 1.0),
        'accent_color': (0.92, 0.62, 0.45, 1.0),
        'glow_color': (1.0, 0.88, 0.68, 1.0),
        'cheek_color': (1.0, 0.55, 0.62, 1.0),
        'sss_color': (1.0, 0.72, 0.50, 1.0),  # sangue/luz interna pêssego
        'sss_radius': (0.4, 0.25, 0.15),
        'head_scale': 1.0,
        'body_scale': 0.7,
        'eye_scale': 1.0,
        'cheek_intensity': 0.78,
    },
    'zip': {  # Motivador
        'body_color': (0.98, 0.65, 0.45, 1.0),
        'accent_color': (0.86, 0.48, 0.32, 1.0),
        'glow_color': (1.0, 0.78, 0.55, 1.0),
        'cheek_color': (1.0, 0.55, 0.55, 1.0),
        'sss_color': (1.0, 0.55, 0.35, 1.0),
        'sss_radius': (0.45, 0.22, 0.12),
        'head_scale': 0.95,
        'body_scale': 0.75,
        'eye_scale': 1.05,
        'cheek_intensity': 0.65,
    },
    'lulu': {  # Fofo
        'body_color': (1.0, 0.82, 0.86, 1.0),
        'accent_color': (1.0, 0.68, 0.74, 1.0),
        'glow_color': (1.0, 0.90, 0.92, 1.0),
        'cheek_color': (1.0, 0.50, 0.60, 1.0),
        'sss_color': (1.0, 0.72, 0.78, 1.0),
        'sss_radius': (0.5, 0.3, 0.28),
        'head_scale': 1.12,
        'body_scale': 0.65,
        'eye_scale': 1.10,
        'cheek_intensity': 0.92,
    },
    'aro': {  # Sábio
        'body_color': (0.84, 0.78, 0.96, 1.0),
        'accent_color': (0.72, 0.64, 0.92, 1.0),
        'glow_color': (0.92, 0.86, 1.0, 1.0),
        'cheek_color': (0.95, 0.65, 0.78, 1.0),
        'sss_color': (0.75, 0.70, 0.95, 1.0),
        'sss_radius': (0.35, 0.30, 0.45),
        'head_scale': 1.02,
        'body_scale': 0.7,
        'eye_scale': 1.18,
        'cheek_intensity': 0.55,
    },
}


# ============================================================================
# UTILS
# ============================================================================

def clear_scene():
    """Limpa tudo da scene default."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light)


def create_premium_material(name, base_color, sss_color=None, sss_radius=None,
                            roughness=0.32, metalness=0.05,
                            clearcoat=0.85, sheen=0.4, sheen_color=None):
    """
    Material PBR PREMIUM com full stack:
      - SSS (subsurface scattering) pra look gel/skin
      - Clearcoat pra camada laqueada brilhante
      - Sheen pra velvet rim glow
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']

    # Base
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = metalness

    # SSS — subsurface scattering pra look gel/jelly
    if sss_color and sss_radius:
        if 'Subsurface Weight' in bsdf.inputs:
            bsdf.inputs['Subsurface Weight'].default_value = 0.4
        elif 'Subsurface' in bsdf.inputs:
            bsdf.inputs['Subsurface'].default_value = 0.4
        if 'Subsurface Radius' in bsdf.inputs:
            bsdf.inputs['Subsurface Radius'].default_value = sss_radius
        if 'Subsurface Color' in bsdf.inputs:
            bsdf.inputs['Subsurface Color'].default_value = sss_color
        # Blender 4+ usa Subsurface Scale em vez de Radius
        if 'Subsurface Scale' in bsdf.inputs:
            bsdf.inputs['Subsurface Scale'].default_value = 0.15

    # Clearcoat — laca brilhante por cima
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = clearcoat
        bsdf.inputs['Coat Roughness'].default_value = 0.1
    elif 'Clearcoat' in bsdf.inputs:
        bsdf.inputs['Clearcoat'].default_value = clearcoat
        bsdf.inputs['Clearcoat Roughness'].default_value = 0.1

    # Sheen — velvet rim glow
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = sheen
        if sheen_color and 'Sheen Tint' in bsdf.inputs:
            bsdf.inputs['Sheen Tint'].default_value = sheen_color
    elif 'Sheen' in bsdf.inputs:
        bsdf.inputs['Sheen'].default_value = sheen

    return mat


def create_simple_material(name, color, roughness=0.4, metalness=0.05,
                          emissive_color=None, emissive_strength=0.0):
    """Material simples sem SSS — pra olhos, sorriso, etc."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = metalness
    if emissive_color:
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emissive_color
            bsdf.inputs['Emission Strength'].default_value = emissive_strength
        elif 'Emission' in bsdf.inputs:
            bsdf.inputs['Emission'].default_value = emissive_color
    return mat


def add_subdiv_surface(obj, levels=2):
    mod = obj.modifiers.new(name='Subdivision', type='SUBSURF')
    mod.levels = levels
    mod.render_levels = levels + 1
    return mod


def add_bevel(obj, width=0.02, segments=3):
    """Bevel modifier suaviza arestas. Faz tudo parecer 'modelado' não 'colado'."""
    mod = obj.modifiers.new(name='Bevel', type='BEVEL')
    mod.width = width
    mod.segments = segments
    return mod


def shade_smooth(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


def create_uv_sphere(name, location, radius=1.0, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius, segments=segments, ring_count=rings, location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    return obj


# ============================================================================
# MASCOT BUILD
# ============================================================================

def build_head(preset):
    head = create_uv_sphere('head', (0, 0, 0.85), radius=0.7 * preset['head_scale'])
    head.scale.z = 0.96
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    shade_smooth(head)
    add_subdiv_surface(head, levels=2)
    return head


def build_body(preset):
    body = create_uv_sphere('body', (0, 0, -0.05), radius=0.55 * preset['body_scale'])
    body.scale.z = 1.1
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    shade_smooth(body)
    add_subdiv_surface(body, levels=2)
    return body


def build_eye(name, x_offset, preset):
    """Olho composto cartoon-style com material premium pro highlight."""
    eye_size = 0.20 * preset['eye_scale']
    eye_y = -0.62

    # Sclera (branco brilhante)
    sclera = create_uv_sphere(f'{name}_sclera', (x_offset, eye_y, 1.0),
                              radius=eye_size, segments=32, rings=20)
    sclera_mat = create_simple_material(
        f'{name}_sclera_mat',
        color=(1.0, 1.0, 1.0, 1.0),
        roughness=0.08,
        metalness=0.1,
        emissive_color=(1.0, 1.0, 1.0, 1.0),
        emissive_strength=0.15,
    )
    sclera.data.materials.append(sclera_mat)
    shade_smooth(sclera)

    # Pupila preta (cartoon definida)
    pupil_radius = eye_size * 0.62
    pupil = create_uv_sphere(f'{name}_pupil',
                            (x_offset, eye_y - eye_size * 0.6, 1.0),
                            radius=pupil_radius, segments=24, rings=18)
    pupil_mat = create_simple_material(
        f'{name}_pupil_mat',
        color=(0.05, 0.05, 0.05, 1.0),
        roughness=0.2,
        metalness=0.4,
    )
    pupil.data.materials.append(pupil_mat)
    shade_smooth(pupil)

    # Highlight (catch-light com emissive forte pra "vida")
    hl_radius = pupil_radius * 0.45
    hl = create_uv_sphere(f'{name}_hl',
                         (x_offset - pupil_radius * 0.32,
                          eye_y - eye_size * 0.95,
                          1.0 + pupil_radius * 0.30),
                         radius=hl_radius, segments=12, rings=8)
    hl_mat = create_simple_material(
        f'{name}_hl_mat',
        color=(1.0, 1.0, 1.0, 1.0),
        roughness=0.0,
        metalness=0.0,
        emissive_color=(1.0, 1.0, 1.0, 1.0),
        emissive_strength=3.0,  # forte pra bloom captar
    )
    hl.data.materials.append(hl_mat)

    return [sclera, pupil, hl]


def build_eyelash(name, x_offset, preset):
    """Pestana superior — curva acima do olho. Mesh simples deformado."""
    eye_size = 0.20 * preset['eye_scale']
    eye_y = -0.62
    bpy.ops.mesh.primitive_torus_add(
        location=(x_offset, eye_y - 0.04, 1.0 + eye_size * 0.7),
        major_radius=eye_size * 1.05,
        minor_radius=0.012,
        major_segments=20,
        minor_segments=4,
    )
    lash = bpy.context.active_object
    lash.name = f'{name}_lash'
    # Rotaciona pra vertical e achata pra ficar só topo
    lash.rotation_euler = (math.radians(90), 0, 0)
    lash.scale = (1.0, 0.32, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # Material preto
    mat = create_simple_material(f'{name}_lash_mat',
                                color=(0.05, 0.04, 0.06, 1.0),
                                roughness=0.4, metalness=0.1)
    lash.data.materials.append(mat)
    shade_smooth(lash)
    return lash


def build_cheek(name, x_offset, preset):
    """Bochecha rosada com emissive sutil."""
    cheek = create_uv_sphere(name, (x_offset, -0.70, 0.78),
                            radius=0.13, segments=20, rings=14)
    cheek.scale = (1.0, 0.35, 0.7)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    cheek_color = preset['cheek_color']
    cheek_mat = create_simple_material(
        f'{name}_mat',
        color=cheek_color,
        roughness=0.4,
        metalness=0.0,
        emissive_color=cheek_color,
        emissive_strength=0.35,
    )
    cheek.data.materials.append(cheek_mat)
    shade_smooth(cheek)
    return cheek


def build_mouth():
    """Sorriso via torus parcial."""
    bpy.ops.mesh.primitive_torus_add(
        location=(0, -0.80, 0.76),
        major_radius=0.10,
        minor_radius=0.012,
        major_segments=24,
        minor_segments=8,
    )
    mouth = bpy.context.active_object
    mouth.name = 'mouth'
    mouth.rotation_euler = (math.radians(90), 0, 0)
    mouth.scale = (1.0, 0.55, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mouth_mat = create_simple_material(
        'mouth_mat',
        color=(0.1, 0.05, 0.03, 1.0),
        roughness=0.45,
        metalness=0.05,
    )
    mouth.data.materials.append(mouth_mat)
    shade_smooth(mouth)
    return mouth


def build_arms(preset):
    arms = []
    for sign, name in [(-1, 'arm_L'), (1, 'arm_R')]:
        arm = create_uv_sphere(name, (sign * 0.62, 0, -0.05),
                              radius=0.18, segments=24, rings=18)
        arm.scale = (1.0, 1.0, 1.1)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        shade_smooth(arm)
        add_subdiv_surface(arm, levels=1)
        arms.append(arm)
    return arms


def build_feet(preset):
    feet = []
    for sign, name in [(-1, 'foot_L'), (1, 'foot_R')]:
        foot = create_uv_sphere(name, (sign * 0.28, 0.1, -0.65),
                               radius=0.20, segments=24, rings=18)
        foot.scale = (1.0, 1.5, 0.55)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        shade_smooth(foot)
        add_subdiv_surface(foot, levels=1)
        feet.append(foot)
    return feet


def add_attachment_points():
    """Empty objects nomeados como anchors pra acessórios.
    GLB exporta empties como nodes na scene graph — viewer encontra por nome
    e parenta accessories ali. Resolve posicionamento sem precisar rigging full.

    Slots:
      anchor_head: topo da cabeça (cap, crown, halo, flame_mane)
      anchor_face: frente do rosto (sunglasses, monocle, mask)
      anchor_neck: pescoço (scarf, cape, bow_tie)
      anchor_back: atrás do corpo (wings, sword)
      anchor_aura: centro pra particles (aura_cosmic, heart_glow)
    """
    # Anchors tunados v2 (2026-05-23): head abaixado pro topo real do cap
    # (era 1.45 = ABOVE the head 1.42 → cap voava). Face mais perto da
    # superfície frontal. Back atrás mas dentro do bbox do body.
    anchors = {
        'anchor_head': (0, 0, 1.25),    # topo da cabeça onde cap encaixa
        'anchor_face': (0, -0.55, 0.95), # frente da face onde óculos sentam
        'anchor_neck': (0, 0, 0.28),     # entre cabeça e corpo
        'anchor_back': (0, 0.25, 0.25),  # atrás dentro do bbox
        'anchor_aura': (0, 0, 0.40),     # centro do mascote pra particles
    }
    for name, pos in anchors.items():
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=pos)
        empty = bpy.context.active_object
        empty.name = name
        empty.empty_display_size = 0.1  # pequeno, só pra visualizar no Blender


def apply_body_materials(head, body, arms, feet, preset):
    """Aplica material PREMIUM (com SSS) nas partes principais."""
    body_mat = create_premium_material(
        'body_material',
        base_color=preset['body_color'],
        sss_color=preset['sss_color'],
        sss_radius=preset['sss_radius'],
        roughness=0.32,
        metalness=0.04,
        clearcoat=0.85,
        sheen=0.4,
        sheen_color=preset['glow_color'],
    )
    accent_mat = create_premium_material(
        'accent_material',
        base_color=preset['accent_color'],
        sss_color=preset['sss_color'],
        sss_radius=preset['sss_radius'],
        roughness=0.35,
        metalness=0.06,
        clearcoat=0.7,
        sheen=0.3,
        sheen_color=preset['glow_color'],
    )
    head.data.materials.append(body_mat)
    body.data.materials.append(body_mat)
    for arm in arms:
        arm.data.materials.append(accent_mat)
    for foot in feet:
        foot.data.materials.append(accent_mat)


# ============================================================================
# LIGHTING + SCENE PREMIUM
# ============================================================================

def setup_lighting():
    """5-point lighting rig profissional."""
    # KEY light (frontal-direita)
    bpy.ops.object.light_add(type='AREA', location=(2.5, -2.5, 3.5))
    key = bpy.context.active_object
    key.data.energy = 700
    key.data.size = 2.0
    key.data.color = (1.0, 0.97, 0.93)
    key.rotation_euler = (math.radians(55), 0, math.radians(40))

    # RIM warm (atrás-esquerda) — destaca silhueta com tom coral
    bpy.ops.object.light_add(type='AREA', location=(-2.0, 2.5, 2.5))
    rim1 = bpy.context.active_object
    rim1.data.energy = 500
    rim1.data.size = 1.5
    rim1.data.color = (1.0, 0.75, 0.6)
    rim1.rotation_euler = (math.radians(110), 0, math.radians(-30))

    # RIM cool (atrás-direita) — tom azulado pra contrast
    bpy.ops.object.light_add(type='AREA', location=(2.0, 2.5, 2.0))
    rim2 = bpy.context.active_object
    rim2.data.energy = 250
    rim2.data.size = 1.5
    rim2.data.color = (0.65, 0.78, 1.0)
    rim2.rotation_euler = (math.radians(115), 0, math.radians(30))

    # FILL (frontal-baixo) — atenua sombras embaixo
    bpy.ops.object.light_add(type='AREA', location=(0, -2, -0.5))
    fill = bpy.context.active_object
    fill.data.energy = 200
    fill.data.size = 2.0
    fill.data.color = (0.85, 0.92, 1.0)

    # AMBIENT (topo) — luz suave de cima
    bpy.ops.object.light_add(type='AREA', location=(0, 0, 5))
    ambient = bpy.context.active_object
    ambient.data.energy = 200
    ambient.data.size = 5.0
    ambient.data.color = (1.0, 0.95, 0.88)


def setup_world_background():
    """World com gradient warm + ambient occlusion enable."""
    world = bpy.context.scene.world
    if not world.use_nodes:
        world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    # Limpa nodes existentes
    for node in list(nodes):
        nodes.remove(node)
    # Output
    output = nodes.new('ShaderNodeOutputWorld')
    output.location = (300, 0)
    # Background com cor warm sutil
    bg = nodes.new('ShaderNodeBackground')
    bg.location = (100, 0)
    bg.inputs['Color'].default_value = (0.04, 0.03, 0.025, 1.0)  # quase preto warm
    bg.inputs['Strength'].default_value = 0.5
    links.new(bg.outputs['Background'], output.inputs['Surface'])


def setup_camera():
    """Camera 3/4 angle com DOF sutil."""
    bpy.ops.object.camera_add(location=(0, -3.6, 1.6))
    camera = bpy.context.active_object
    camera.rotation_euler = (math.radians(74), 0, 0)
    camera.data.lens = 55  # 55mm — leve telephoto pra compressão facial
    # Depth of Field — bokeh suave atrás do mascote
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 3.6  # foco no mascote
    camera.data.dof.aperture_fstop = 4.5  # f/4.5 — DOF sutil
    bpy.context.scene.camera = camera


def setup_compositor_bloom():
    """Compositor com Glare bloom — destaca highlights (olhos brilhantes).
    API mudou entre versões; usa try/except pra ser portátil."""
    scene = bpy.context.scene
    try:
        # Blender 5.x usa compositor_node_tree separado
        if hasattr(scene, 'compositor_node_tree'):
            tree = scene.compositor_node_tree
            if tree is None:
                # Cria via assignment
                scene.use_nodes = True
                tree = scene.compositor_node_tree
        else:
            scene.use_nodes = True
            tree = scene.node_tree
        if tree is None:
            print('  Compositor não disponível — pulando bloom')
            return
        for node in list(tree.nodes):
            tree.nodes.remove(node)
        rl = tree.nodes.new('CompositorNodeRLayers')
        rl.location = (0, 0)
        glare = tree.nodes.new('CompositorNodeGlare')
        glare.location = (300, 0)
        # Tenta BLOOM, fallback pra FOG_GLOW
        try:
            glare.glare_type = 'BLOOM'
        except TypeError:
            glare.glare_type = 'FOG_GLOW'
        if hasattr(glare, 'quality'):
            glare.quality = 'HIGH'
        glare.mix = 0.0  # mix 0 = só glare (que será misturado pelo render)
        glare.threshold = 0.92
        glare.size = 7
        out = tree.nodes.new('CompositorNodeComposite')
        out.location = (600, 0)
        tree.links.new(rl.outputs['Image'], glare.inputs['Image'])
        tree.links.new(glare.outputs['Image'], out.inputs['Image'])
        print('  Compositor bloom: OK')
    except Exception as e:
        print(f'  Compositor bloom falhou (não-crítico): {e}')


def setup_render(out_path, resolution=768):
    """Cycles renderer com 256 samples + denoising — qualidade premium."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU' if bpy.context.preferences.addons.get('cycles') else 'CPU'
    scene.cycles.samples = 256
    scene.cycles.use_denoising = True
    if hasattr(scene.cycles, 'denoiser'):
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.filepath = out_path
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = True
    # Tone mapping — Standard pra cores fiéis ao DNA
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.3
    # Bloom via compositor (já setup separado)


def export_glb(out_path, animated=False):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_animations=animated,
        use_selection=False,
    )


def add_idle_animation(head, body, eye_L_parts, eye_R_parts):
    """Anim idle: breath cycle + blink periódico — toca em loop no app.

    Breath: scale Y do body+head oscila 1.0→1.025→1.0 a cada 2s
    Blink: scale Z dos olhos vai 1.0→0.1→1.0 em 6 frames (~0.25s) a cada ~4s
    """
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 96  # 4s @ 24fps

    # BREATH no head (scale Y oscilando)
    for frame, scale_y in [(1, 1.0), (24, 1.025), (48, 1.0), (72, 1.020), (96, 1.0)]:
        head.scale.y = scale_y
        head.keyframe_insert(data_path='scale', frame=frame, index=1)
    for frame, scale_y in [(1, 1.0), (24, 1.03), (48, 1.0), (72, 1.025), (96, 1.0)]:
        body.scale.y = scale_y
        body.keyframe_insert(data_path='scale', frame=frame, index=1)

    # BLINK em ambos olhos (sclera = primeiro mesh de cada eye)
    # eye_L_parts/R_parts retornados por build_eye = [sclera, pupil, hl]
    for sclera in [eye_L_parts[0], eye_R_parts[0]]:
        # Blink em frame 40-46 (rápido)
        for frame, scale_z in [(1, 1.0), (40, 1.0), (43, 0.1), (46, 1.0),
                                (76, 1.0), (79, 0.1), (82, 1.0), (96, 1.0)]:
            sclera.scale.z = scale_z
            sclera.keyframe_insert(data_path='scale', frame=frame, index=2)


# ============================================================================
# MAIN
# ============================================================================

def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--preset', default='bipo', choices=PRESETS.keys())
    parser.add_argument('--out', required=True)
    parser.add_argument('--render', help='Optional preview PNG')
    args = parser.parse_args(argv)

    preset = PRESETS[args.preset]
    print(f'\n=== Building mascot {args.preset} (FANTASTIC v2) ===')

    clear_scene()
    head = build_head(preset)
    body = build_body(preset)
    eye_L = build_eye('eye_L', -0.22, preset)
    eye_R = build_eye('eye_R', 0.22, preset)
    lash_L = build_eyelash('eye_L', -0.22, preset)
    lash_R = build_eyelash('eye_R', 0.22, preset)
    cheek_L = build_cheek('cheek_L', -0.32, preset)
    cheek_R = build_cheek('cheek_R', 0.32, preset)
    mouth = build_mouth()
    arms = build_arms(preset)
    feet = build_feet(preset)
    apply_body_materials(head, body, arms, feet, preset)
    add_attachment_points()  # empties como anchors pra accessories
    add_idle_animation(head, body, eye_L, eye_R)  # breath + blink loop

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    export_glb(args.out, animated=True)
    print(f'GLB exported: {args.out}')

    if args.render:
        setup_lighting()
        setup_world_background()
        setup_camera()
        setup_compositor_bloom()
        os.makedirs(os.path.dirname(args.render), exist_ok=True)
        setup_render(args.render)
        bpy.ops.render.render(write_still=True)
        print(f'Render: {args.render}')

    print('=== Done ===')


if __name__ == '__main__':
    main()
