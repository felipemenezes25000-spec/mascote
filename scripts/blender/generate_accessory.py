"""
Generate Accessory — gera acessórios GLB pro mascote via Blender Python API.

Cada acessório é UM GLB separado pra ser carregado dinamicamente pelo app
(útil pra economy de skin: user paga e desbloqueia). Slot definido por bone
anchor (head, neck, body, aura).

ECONOMIA FREE/PREMIUM:
  - FREE: desbloqueado por achievements (hábitos consistentes, streaks)
  - PREMIUM: comprado in-app (R$5-15 unitário ou bundle)
  - SIGNATURE: drops raros de eventos sazonais

ANIMAÇÕES — alguns acessórios têm animations embedded no GLB:
  - wings: flap (idle 2s loop)
  - flame_mane: flicker (shader animation)
  - halo: rotate (constant Y rotation)
  - aura_cosmic: particle orbit
  - heart_glow: float + pulse

Rodar:
    blender --background --python scripts/blender/generate_accessory.py -- \\
        --accessory crown_royal \\
        --out app/mobile/assets/mascot-3d/accessories/crown_royal.glb \\
        --render app/mobile/assets/mascot-3d/accessories/crown_royal-preview.png
"""

import argparse
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector


# ============================================================================
# REGISTRY — todos os acessórios disponíveis com metadata
# ============================================================================

ACCESSORIES = {
    # === FREE ACCESSORIES (desbloqueados por achievements) ===
    'cap_classic': {
        'tier': 'free', 'slot': 'head', 'unlock': '3_days_streak',
        'builder': 'build_cap_classic',
    },
    'beanie': {
        'tier': 'free', 'slot': 'head', 'unlock': '5_meditations',
        'builder': 'build_beanie',
    },
    'flower_daisy': {
        'tier': 'free', 'slot': 'head', 'unlock': 'spring_event',
        'builder': 'build_flower_daisy',
    },
    'sunglasses': {
        'tier': 'free', 'slot': 'face', 'unlock': '7_days_streak',
        'builder': 'build_sunglasses',
    },
    'glasses_round': {
        'tier': 'free', 'slot': 'face', 'unlock': '10_reading_sessions',
        'builder': 'build_glasses_round',
    },
    'scarf_cozy': {
        'tier': 'free', 'slot': 'neck', 'unlock': 'winter_event',
        'builder': 'build_scarf_cozy',
    },
    'bow_tie': {
        'tier': 'free', 'slot': 'neck', 'unlock': 'first_month',
        'builder': 'build_bow_tie',
    },

    # === PREMIUM STATIC (R$5-10) ===
    'crown_royal': {
        'tier': 'premium', 'price_brl': 9.90, 'slot': 'head',
        'builder': 'build_crown_royal',
    },
    'crown_flowers': {
        'tier': 'premium', 'price_brl': 7.90, 'slot': 'head',
        'builder': 'build_crown_flowers',
    },
    'monocle_gold': {
        'tier': 'premium', 'price_brl': 5.90, 'slot': 'face',
        'builder': 'build_monocle_gold',
    },
    'cape_velvet': {
        'tier': 'premium', 'price_brl': 12.90, 'slot': 'neck',
        'builder': 'build_cape_velvet',
    },

    # === PREMIUM ANIMATED (R$12-20) — anim embedded ===
    'wings_angel': {
        'tier': 'premium', 'price_brl': 14.90, 'slot': 'back',
        'builder': 'build_wings_angel', 'animated': True,
    },
    'wings_dragon': {
        'tier': 'premium', 'price_brl': 14.90, 'slot': 'back',
        'builder': 'build_wings_dragon', 'animated': True,
    },
    'wings_butterfly': {
        'tier': 'premium', 'price_brl': 12.90, 'slot': 'back',
        'builder': 'build_wings_butterfly', 'animated': True,
    },
    'halo_radiant': {
        'tier': 'premium', 'price_brl': 9.90, 'slot': 'head',
        'builder': 'build_halo_radiant', 'animated': True,
    },

    # === SIGNATURE (R$20-30) — raros, VFX foderozos ===
    'flame_mane': {
        'tier': 'signature', 'price_brl': 24.90, 'slot': 'head',
        'builder': 'build_flame_mane', 'animated': True,
        'event': 'fire_festival',
    },
    'aura_cosmic': {
        'tier': 'signature', 'price_brl': 29.90, 'slot': 'aura',
        'builder': 'build_aura_cosmic', 'animated': True,
    },
    'heart_glow': {
        'tier': 'signature', 'price_brl': 19.90, 'slot': 'aura',
        'builder': 'build_heart_glow', 'animated': True,
        'event': 'valentine',
    },
    'sword_floating': {
        'tier': 'signature', 'price_brl': 22.90, 'slot': 'back',
        'builder': 'build_sword_floating', 'animated': True,
    },
}


# ============================================================================
# COLOR PALETTES
# ============================================================================

GOLD = (1.0, 0.84, 0.4, 1.0)
GOLD_DEEP = (0.78, 0.6, 0.18, 1.0)
SILVER = (0.85, 0.87, 0.92, 1.0)
RUBY = (0.78, 0.08, 0.18, 1.0)
EMERALD = (0.12, 0.62, 0.38, 1.0)
SAPPHIRE = (0.15, 0.32, 0.78, 1.0)
PEARL = (0.96, 0.94, 0.90, 1.0)
ROSE = (0.96, 0.55, 0.62, 1.0)


# ============================================================================
# MATERIAL HELPERS
# ============================================================================

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light)


def make_material(name, color, roughness=0.35, metalness=0.05,
                  emissive_color=None, emissive_strength=0.0,
                  clearcoat=0.0):
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
    if clearcoat > 0:
        if 'Coat Weight' in bsdf.inputs:
            bsdf.inputs['Coat Weight'].default_value = clearcoat
        elif 'Clearcoat' in bsdf.inputs:
            bsdf.inputs['Clearcoat'].default_value = clearcoat
    return mat


def shade_smooth(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


# ============================================================================
# FREE ACCESSORY BUILDERS
# ============================================================================

def build_cap_classic():
    """Boné clássico azul marinho com pala."""
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 0), radius=0.42, segments=32, ring_count=20)
    crown = bpy.context.active_object
    crown.name = 'cap_crown'
    crown.scale = (1.0, 1.0, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    # Recorta metade inferior (cap só de cima)
    bm = bmesh.new()
    bm.from_mesh(crown.data)
    for v in list(bm.verts):
        if v.co.z < -0.02:
            bm.verts.remove(v)
    bm.to_mesh(crown.data)
    bm.free()
    mat = make_material('cap_navy', (0.15, 0.22, 0.40, 1.0), roughness=0.6)
    crown.data.materials.append(mat)
    shade_smooth(crown)

    # Pala (visor)
    bpy.ops.mesh.primitive_cylinder_add(location=(0, -0.32, -0.02), radius=0.36, depth=0.04, vertices=32)
    visor = bpy.context.active_object
    visor.name = 'cap_visor'
    visor.scale = (1.0, 0.5, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    visor_mat = make_material('cap_visor_mat', (0.08, 0.14, 0.28, 1.0), roughness=0.55)
    visor.data.materials.append(visor_mat)
    shade_smooth(visor)


def build_beanie():
    """Gorro de inverno bordô com pompom."""
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 0), radius=0.46, segments=32, ring_count=24)
    beanie = bpy.context.active_object
    beanie.name = 'beanie'
    beanie.scale = (1.0, 1.0, 0.85)
    bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new()
    bm.from_mesh(beanie.data)
    for v in list(bm.verts):
        if v.co.z < -0.08:
            bm.verts.remove(v)
    bm.to_mesh(beanie.data)
    bm.free()
    mat = make_material('beanie_burgundy', (0.52, 0.15, 0.20, 1.0), roughness=0.85)
    beanie.data.materials.append(mat)
    shade_smooth(beanie)

    # Pompom
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 0.48), radius=0.13, segments=20)
    pompom = bpy.context.active_object
    pompom.name = 'pompom'
    pompom_mat = make_material('pompom_white', PEARL, roughness=0.92)
    pompom.data.materials.append(pompom_mat)
    shade_smooth(pompom)


def build_flower_daisy():
    """Margarida branca com miolo amarelo na cabeça."""
    # Miolo
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0.25, -0.15, 0.4), radius=0.06, segments=16)
    center = bpy.context.active_object
    center.name = 'daisy_center'
    center_mat = make_material('daisy_center_mat', (1.0, 0.85, 0.2, 1.0), roughness=0.4,
                              emissive_color=(1.0, 0.85, 0.2, 1.0), emissive_strength=0.3)
    center.data.materials.append(center_mat)

    # 6 pétalas brancas
    for i in range(6):
        angle = (i / 6) * math.pi * 2
        x = 0.25 + math.cos(angle) * 0.10
        y = -0.15 + math.sin(angle) * 0.10
        bpy.ops.mesh.primitive_uv_sphere_add(location=(x, y, 0.4), radius=0.05, segments=14)
        petal = bpy.context.active_object
        petal.name = f'daisy_petal_{i}'
        petal.scale = (1.4, 1.4, 0.4)
        bpy.ops.object.transform_apply(scale=True)
        petal_mat = make_material(f'daisy_petal_mat_{i}', (1.0, 0.98, 0.95, 1.0),
                                 roughness=0.45, clearcoat=0.3)
        petal.data.materials.append(petal_mat)
        shade_smooth(petal)


def build_sunglasses():
    """Óculos escuros aviador."""
    # 2 lentes (toruses + planos pretos)
    for sign, name in [(-1, 'lens_L'), (1, 'lens_R')]:
        bpy.ops.mesh.primitive_torus_add(
            location=(sign * 0.22, -0.62, 1.0),
            major_radius=0.13, minor_radius=0.018,
            major_segments=24, minor_segments=8,
        )
        frame = bpy.context.active_object
        frame.name = f'sunglass_frame_{name}'
        frame.rotation_euler = (math.radians(90), 0, 0)
        frame_mat = make_material('sunglass_frame', (0.05, 0.05, 0.05, 1.0),
                                 roughness=0.3, metalness=0.85)
        frame.data.materials.append(frame_mat)
        shade_smooth(frame)
        bpy.ops.object.transform_apply(rotation=True)

        # Lente preta (disk)
        bpy.ops.mesh.primitive_circle_add(location=(sign * 0.22, -0.65, 1.0),
                                         radius=0.11, vertices=24, fill_type='NGON')
        lens = bpy.context.active_object
        lens.name = f'sunglass_lens_{name}'
        lens.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        lens_mat = make_material('sunglass_lens', (0.02, 0.02, 0.04, 1.0),
                                roughness=0.05, metalness=0.4, clearcoat=0.9)
        lens.data.materials.append(lens_mat)

    # Ponte central
    bpy.ops.mesh.primitive_cube_add(location=(0, -0.62, 1.02), size=0.05)
    bridge = bpy.context.active_object
    bridge.name = 'sunglass_bridge'
    bridge.scale = (3.5, 0.3, 0.3)
    bpy.ops.object.transform_apply(scale=True)
    bridge.data.materials.append(bpy.data.materials['sunglass_frame'])


def build_glasses_round():
    """Óculos redondos Harry Potter style."""
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_torus_add(
            location=(sign * 0.22, -0.62, 1.0),
            major_radius=0.13, minor_radius=0.014,
            major_segments=28, minor_segments=8,
        )
        frame = bpy.context.active_object
        frame.name = f'round_frame_{sign}'
        frame.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material('round_frame', (0.10, 0.08, 0.06, 1.0),
                           roughness=0.4, metalness=0.5)
        frame.data.materials.append(mat)
        shade_smooth(frame)

    # Ponte
    bpy.ops.mesh.primitive_cube_add(location=(0, -0.62, 1.0), size=0.04)
    bridge = bpy.context.active_object
    bridge.scale = (3.5, 0.4, 0.15)
    bpy.ops.object.transform_apply(scale=True)
    bridge.data.materials.append(bpy.data.materials['round_frame'])


def build_scarf_cozy():
    """Cachecol coral em volta do pescoço."""
    bpy.ops.mesh.primitive_torus_add(
        location=(0, 0, 0.10),
        major_radius=0.42, minor_radius=0.10,
        major_segments=32, minor_segments=16,
    )
    scarf = bpy.context.active_object
    scarf.name = 'scarf'
    scarf.scale = (1.0, 1.0, 0.7)
    bpy.ops.object.transform_apply(scale=True)
    mat = make_material('scarf_coral', (0.96, 0.52, 0.42, 1.0), roughness=0.78)
    scarf.data.materials.append(mat)
    shade_smooth(scarf)

    # Pontas (2 cilindros pendurados)
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(
            location=(sign * 0.15, -0.32, -0.15), radius=0.06, depth=0.32, vertices=12,
        )
        end = bpy.context.active_object
        end.scale = (1.0, 0.3, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        end.data.materials.append(mat)
        shade_smooth(end)


def build_bow_tie():
    """Gravata borboleta no pescoço."""
    # 2 triângulos invertidos pra formar bow
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(
            location=(sign * 0.16, -0.42, 0.18), size=0.18,
        )
        wing = bpy.context.active_object
        wing.scale = (1.0, 0.2, 0.65)
        bpy.ops.object.transform_apply(scale=True)
        # Adiciona Bevel pra arredondar
        bevel = wing.modifiers.new('Bevel', 'BEVEL')
        bevel.width = 0.04
        bevel.segments = 3
        mat = make_material(f'bow_{sign}', (0.78, 0.15, 0.22, 1.0),
                           roughness=0.5, clearcoat=0.5)
        wing.data.materials.append(mat)
        shade_smooth(wing)

    # Nó central
    bpy.ops.mesh.primitive_cube_add(location=(0, -0.42, 0.18), size=0.08)
    knot = bpy.context.active_object
    knot.scale = (0.8, 0.6, 1.2)
    bpy.ops.object.transform_apply(scale=True)
    knot_mat = make_material('bow_knot', (0.58, 0.08, 0.12, 1.0), roughness=0.5)
    knot.data.materials.append(knot_mat)
    shade_smooth(knot)


# ============================================================================
# PREMIUM STATIC BUILDERS
# ============================================================================

def build_crown_royal():
    """Coroa real dourada com 5 spikes + 3 gemas (rubi, esmeralda, safira)."""
    # Aro base
    bpy.ops.mesh.primitive_torus_add(
        location=(0, 0, 0.5), major_radius=0.40, minor_radius=0.06,
        major_segments=32, minor_segments=12,
    )
    band = bpy.context.active_object
    band.name = 'crown_band'
    band.scale = (1.0, 1.0, 0.45)
    bpy.ops.object.transform_apply(scale=True)
    gold_mat = make_material('crown_gold', GOLD, roughness=0.18, metalness=0.92,
                            emissive_color=GOLD, emissive_strength=0.15)
    band.data.materials.append(gold_mat)
    shade_smooth(band)

    # 5 spikes (cones) ao redor do aro
    gem_colors = [RUBY, GOLD, EMERALD, GOLD, SAPPHIRE]
    for i in range(5):
        angle = (i / 5) * math.pi * 2 - math.pi / 2
        x = math.cos(angle) * 0.40
        y = math.sin(angle) * 0.40
        bpy.ops.mesh.primitive_cone_add(
            location=(x, y, 0.62), radius1=0.06, radius2=0.0, depth=0.20, vertices=12,
        )
        spike = bpy.context.active_object
        spike.name = f'crown_spike_{i}'
        spike.data.materials.append(gold_mat)
        shade_smooth(spike)

        # Gem no topo do spike (centro)
        if gem_colors[i] != GOLD:
            bpy.ops.mesh.primitive_uv_sphere_add(
                location=(x, y, 0.78), radius=0.04, segments=16,
            )
            gem = bpy.context.active_object
            gem.name = f'crown_gem_{i}'
            gem_mat = make_material(f'crown_gem_{i}_mat', gem_colors[i],
                                   roughness=0.05, metalness=0.4,
                                   emissive_color=gem_colors[i], emissive_strength=0.8,
                                   clearcoat=1.0)
            gem.data.materials.append(gem_mat)
            shade_smooth(gem)


def build_crown_flowers():
    """Coroa de flores rosa + verde + amarelas (Festival vibe)."""
    bpy.ops.mesh.primitive_torus_add(
        location=(0, 0, 0.5), major_radius=0.42, minor_radius=0.05,
        major_segments=24, minor_segments=10,
    )
    band = bpy.context.active_object
    band.scale = (1.0, 1.0, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    band_mat = make_material('flower_crown_band', EMERALD, roughness=0.8)
    band.data.materials.append(band_mat)
    shade_smooth(band)

    # 8 flores ao redor
    flower_colors = [ROSE, (1.0, 0.85, 0.3, 1.0), ROSE, PEARL, (0.95, 0.7, 0.9, 1.0),
                    ROSE, (1.0, 0.85, 0.3, 1.0), PEARL]
    for i in range(8):
        angle = (i / 8) * math.pi * 2
        x = math.cos(angle) * 0.42
        y = math.sin(angle) * 0.42
        # Pétalas
        for p in range(5):
            pa = (p / 5) * math.pi * 2
            px = x + math.cos(pa) * 0.04
            py = y + math.sin(pa) * 0.04
            bpy.ops.mesh.primitive_uv_sphere_add(location=(px, py, 0.55), radius=0.03)
            petal = bpy.context.active_object
            petal.scale = (1.3, 1.3, 0.4)
            bpy.ops.object.transform_apply(scale=True)
            pmat = make_material(f'fc_petal_{i}_{p}', flower_colors[i], roughness=0.4)
            petal.data.materials.append(pmat)
        # Centro
        bpy.ops.mesh.primitive_uv_sphere_add(location=(x, y, 0.56), radius=0.025)
        center = bpy.context.active_object
        cmat = make_material(f'fc_center_{i}', (1.0, 0.85, 0.2, 1.0), roughness=0.4,
                            emissive_color=(1.0, 0.85, 0.2, 1.0), emissive_strength=0.4)
        center.data.materials.append(cmat)


def build_monocle_gold():
    """Monóculo dourado com cordão."""
    bpy.ops.mesh.primitive_torus_add(
        location=(0.22, -0.62, 1.0),
        major_radius=0.16, minor_radius=0.018,
        major_segments=28, minor_segments=10,
    )
    frame = bpy.context.active_object
    frame.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material('monocle_gold', GOLD, roughness=0.15, metalness=0.95,
                       emissive_color=GOLD, emissive_strength=0.2)
    frame.data.materials.append(mat)
    shade_smooth(frame)

    # Lente
    bpy.ops.mesh.primitive_circle_add(location=(0.22, -0.65, 1.0), radius=0.14,
                                     vertices=24, fill_type='NGON')
    lens = bpy.context.active_object
    lens.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    lens_mat = make_material('monocle_lens', (0.95, 0.92, 0.88, 0.4),
                            roughness=0.02, metalness=0.0, clearcoat=1.0)
    lens.data.materials.append(lens_mat)


def build_cape_velvet():
    """Capa de veludo roxa com bordas douradas."""
    bpy.ops.mesh.primitive_plane_add(location=(0, 0.4, -0.2), size=1.0)
    cape = bpy.context.active_object
    cape.name = 'cape'
    cape.scale = (0.8, 1.0, 1.4)
    bpy.ops.object.transform_apply(scale=True)

    # Deforma pra parecer panejamento
    bm = bmesh.new()
    bm.from_mesh(cape.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=8, use_grid_fill=True)
    for v in bm.verts:
        if v.co.y > 0:  # base da capa (atrás)
            v.co.z -= 0.2 * (v.co.y * 0.5)
        v.co.x += math.sin(v.co.y * 5) * 0.04  # ondulação
    bm.to_mesh(cape.data)
    bm.free()
    cape.data.materials.clear()
    velvet_mat = make_material('cape_velvet', (0.32, 0.12, 0.48, 1.0),
                              roughness=0.78, clearcoat=0.4)
    cape.data.materials.append(velvet_mat)
    shade_smooth(cape)


# ============================================================================
# PREMIUM ANIMATED BUILDERS
# ============================================================================

def build_wings_angel():
    """2 asas brancas pluma — animação flap em loop."""
    wings = []
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_plane_add(location=(sign * 0.55, 0.5, 0.2), size=0.9)
        wing = bpy.context.active_object
        wing.name = f'wing_angel_{sign}'
        wing.rotation_euler = (math.radians(15), 0, sign * math.radians(30))
        bpy.ops.object.transform_apply(rotation=True)
        # Subdiv pra forma de pétala
        bm = bmesh.new()
        bm.from_mesh(wing.data)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=6, use_grid_fill=True)
        # Curva pra pétala
        for v in bm.verts:
            v.co.z += math.sin(abs(v.co.x) * 3) * 0.1
            v.co.x *= 1 + abs(v.co.y) * 0.3  # alarga embaixo
        bm.to_mesh(wing.data)
        bm.free()
        mat = make_material(f'wing_angel_{sign}_mat', PEARL,
                           roughness=0.32, clearcoat=0.55,
                           emissive_color=(1.0, 0.96, 0.92, 1.0), emissive_strength=0.2)
        mat.blend_method = 'BLEND'
        # Não tem transparency keyword universal — só set alpha
        wing.data.materials.append(mat)
        shade_smooth(wing)
        wings.append(wing)

    # Animation: flap (keyframes rotation Y oscilating)
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 48  # 2s @ 24fps
    for i, wing in enumerate(wings):
        sign = -1 if i == 0 else 1
        # Keyframes em 1, 12, 24, 36, 48
        for frame, angle_deg in [(1, 30), (12, 55), (24, 30), (36, 5), (48, 30)]:
            wing.rotation_euler.z = sign * math.radians(angle_deg)
            wing.keyframe_insert(data_path='rotation_euler', frame=frame, index=2)


def build_wings_dragon():
    """Asas dragão vermelhas escamosas — animação flap mais agressiva."""
    wings = []
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_plane_add(location=(sign * 0.55, 0.5, 0.2), size=0.95)
        wing = bpy.context.active_object
        wing.name = f'wing_dragon_{sign}'
        wing.rotation_euler = (math.radians(20), 0, sign * math.radians(35))
        bpy.ops.object.transform_apply(rotation=True)
        bm = bmesh.new()
        bm.from_mesh(wing.data)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=8, use_grid_fill=True)
        # Forma de asa de morcego: pontas em vez de plana
        for v in bm.verts:
            if v.co.x > 0.3:  # ponta da asa
                v.co.z += abs(v.co.y) * 0.4
                v.co.x *= 1.2
        bm.to_mesh(wing.data)
        bm.free()
        mat = make_material(f'wing_dragon_{sign}_mat', (0.72, 0.18, 0.20, 1.0),
                           roughness=0.45, metalness=0.25,
                           emissive_color=(0.95, 0.32, 0.12, 1.0), emissive_strength=0.3)
        wing.data.materials.append(mat)
        shade_smooth(wing)
        wings.append(wing)

    # Animação flap dramático
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 36
    for i, wing in enumerate(wings):
        sign = -1 if i == 0 else 1
        for frame, angle_deg in [(1, 35), (9, 75), (18, 35), (27, 5), (36, 35)]:
            wing.rotation_euler.z = sign * math.radians(angle_deg)
            wing.keyframe_insert(data_path='rotation_euler', frame=frame, index=2)


def build_wings_butterfly():
    """Asas borboleta translúcidas com gradient — animação suave."""
    wings = []
    for sign in [-1, 1]:
        # Asa superior
        bpy.ops.mesh.primitive_plane_add(location=(sign * 0.45, 0.5, 0.35), size=0.7)
        upper = bpy.context.active_object
        upper.name = f'wing_butterfly_upper_{sign}'
        upper.rotation_euler = (math.radians(10), 0, sign * math.radians(25))
        bpy.ops.object.transform_apply(rotation=True)
        bm = bmesh.new()
        bm.from_mesh(upper.data)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=6, use_grid_fill=True)
        bm.to_mesh(upper.data)
        bm.free()
        mat_upper = make_material(f'wing_b_upper_{sign}', (0.92, 0.45, 0.78, 0.7),
                                 roughness=0.3, clearcoat=0.6,
                                 emissive_color=(0.95, 0.6, 0.85, 1.0), emissive_strength=0.4)
        upper.data.materials.append(mat_upper)
        shade_smooth(upper)
        wings.append(upper)

        # Asa inferior
        bpy.ops.mesh.primitive_plane_add(location=(sign * 0.40, 0.55, -0.05), size=0.5)
        lower = bpy.context.active_object
        lower.name = f'wing_butterfly_lower_{sign}'
        lower.rotation_euler = (math.radians(15), 0, sign * math.radians(20))
        bpy.ops.object.transform_apply(rotation=True)
        mat_lower = make_material(f'wing_b_lower_{sign}', (0.75, 0.35, 0.88, 0.7),
                                 roughness=0.3, clearcoat=0.6,
                                 emissive_color=(0.85, 0.5, 0.95, 1.0), emissive_strength=0.4)
        lower.data.materials.append(mat_lower)
        shade_smooth(lower)
        wings.append(lower)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 32
    for i, wing in enumerate(wings):
        sign = -1 if i % 2 == 0 else 1
        if 'upper' in wing.name:
            sign = -1 if '-' in wing.name else 1
        for frame, angle_deg in [(1, 20), (8, 45), (16, 20), (24, 0), (32, 20)]:
            wing.rotation_euler.z = sign * math.radians(angle_deg)
            wing.keyframe_insert(data_path='rotation_euler', frame=frame, index=2)


def build_halo_radiant():
    """Halo dourado giratório (anim rotation Z constant)."""
    bpy.ops.mesh.primitive_torus_add(
        location=(0, 0, 1.45),
        major_radius=0.45, minor_radius=0.035,
        major_segments=48, minor_segments=12,
    )
    halo = bpy.context.active_object
    halo.name = 'halo'
    mat = make_material('halo_gold', GOLD, roughness=0.1, metalness=0.92,
                       emissive_color=GOLD, emissive_strength=1.2,
                       clearcoat=0.9)
    halo.data.materials.append(mat)
    shade_smooth(halo)

    # Animation: rotaciona Z continuamente
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 60  # 2.5s loop
    halo.rotation_euler.z = 0
    halo.keyframe_insert(data_path='rotation_euler', frame=1, index=2)
    halo.rotation_euler.z = math.radians(360)
    halo.keyframe_insert(data_path='rotation_euler', frame=60, index=2)

    # Linear interpolation pra rotação constant
    for fc in halo.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'


# ============================================================================
# SIGNATURE BUILDERS (VFX foderozos)
# ============================================================================

def build_flame_mane():
    """Juba de fogo — 8 chamas (cones distorcidos) com emissive forte + flicker."""
    flames = []
    for i in range(10):
        angle = (i / 10) * math.pi * 2
        radius = 0.42 + (i % 3) * 0.04
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius - 0.05
        height = 0.35 + (i % 4) * 0.08
        bpy.ops.mesh.primitive_cone_add(
            location=(x, y, 0.7 + height/2),
            radius1=0.10, radius2=0.0, depth=height, vertices=10,
        )
        flame = bpy.context.active_object
        flame.name = f'flame_{i}'
        # Tilt aleatório
        flame.rotation_euler = (math.radians(-15 + i * 7), 0, angle)
        bpy.ops.object.transform_apply(rotation=True)
        # Cor gradient: vermelho na base, amarelo na ponta
        color_intensity = 0.7 + (i % 5) * 0.06
        mat = make_material(f'flame_mat_{i}', (1.0, 0.4 * color_intensity, 0.05, 1.0),
                           roughness=0.0, metalness=0.0,
                           emissive_color=(1.0, 0.55, 0.12, 1.0), emissive_strength=4.5)
        flame.data.materials.append(mat)
        shade_smooth(flame)
        flames.append(flame)

    # Animation: cada chama flicker em frequência diferente
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 32
    for i, flame in enumerate(flames):
        base_y = flame.location.y
        phase = i * 7
        for frame in range(1, 33, 4):
            offset = math.sin(((frame + phase) / 32) * math.pi * 4) * 0.06
            flame.location.z = (0.7 + (i % 4) * 0.08) / 2 + 0.4 + offset
            flame.keyframe_insert(data_path='location', frame=frame, index=2)


def build_aura_cosmic():
    """Aura cósmica — 50 partículas orbitando + nebula center."""
    # Nebula central (esfera glow)
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 0.4), radius=0.65, segments=32)
    nebula = bpy.context.active_object
    nebula.name = 'nebula_core'
    mat = make_material('nebula_mat', (0.4, 0.2, 0.8, 0.15),
                       roughness=0.9, metalness=0.0,
                       emissive_color=(0.6, 0.3, 1.0, 1.0), emissive_strength=1.5)
    nebula.data.materials.append(mat)
    shade_smooth(nebula)

    # 50 partículas estrelares orbitando
    for i in range(50):
        angle = (i / 50) * math.pi * 2
        radius = 0.8 + (i % 5) * 0.15
        height = (i % 7 - 3) * 0.15
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        bpy.ops.mesh.primitive_uv_sphere_add(
            location=(x, y, 0.4 + height), radius=0.025 + (i % 3) * 0.01, segments=8,
        )
        star = bpy.context.active_object
        star.name = f'cosmic_star_{i}'
        # Mix de cores: branco, azul, rosa, dourado
        color_idx = i % 4
        colors = [(1.0, 1.0, 1.0, 1.0), (0.5, 0.7, 1.0, 1.0),
                 (1.0, 0.6, 0.9, 1.0), (1.0, 0.9, 0.5, 1.0)]
        star_mat = make_material(f'cosmic_star_{i}_mat', colors[color_idx],
                                roughness=0.0, metalness=0.0,
                                emissive_color=colors[color_idx], emissive_strength=3.5)
        star.data.materials.append(star_mat)


def build_heart_glow():
    """Corações flutuantes ao redor — 6 corações com glow rosa."""
    for i in range(6):
        angle = (i / 6) * math.pi * 2
        radius = 0.85
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        # Heart = 2 spheres + cone abaixo
        bpy.ops.mesh.primitive_uv_sphere_add(location=(x - 0.06, y, 0.5 + i*0.02), radius=0.07)
        h1 = bpy.context.active_object
        bpy.ops.mesh.primitive_uv_sphere_add(location=(x + 0.06, y, 0.5 + i*0.02), radius=0.07)
        h2 = bpy.context.active_object
        bpy.ops.mesh.primitive_cone_add(location=(x, y, 0.42 + i*0.02),
                                       radius1=0.09, radius2=0.0, depth=0.18, vertices=12)
        h3 = bpy.context.active_object
        h3.rotation_euler.x = math.pi
        bpy.ops.object.transform_apply(rotation=True)
        heart_mat = make_material(f'heart_{i}_mat', ROSE,
                                 roughness=0.2, metalness=0.0,
                                 emissive_color=(1.0, 0.45, 0.65, 1.0), emissive_strength=2.5,
                                 clearcoat=0.85)
        for obj in [h1, h2, h3]:
            obj.data.materials.append(heart_mat)
            shade_smooth(obj)


def build_sword_floating():
    """Espada flutuante atrás do mascote (estilo Final Fantasy)."""
    # Lâmina
    bpy.ops.mesh.primitive_cube_add(location=(0, 0.6, 0.4), size=0.5)
    blade = bpy.context.active_object
    blade.name = 'sword_blade'
    blade.scale = (0.06, 0.12, 1.2)
    bpy.ops.object.transform_apply(scale=True)
    blade_mat = make_material('sword_blade_mat', SILVER,
                             roughness=0.05, metalness=0.95,
                             emissive_color=(0.8, 0.9, 1.0, 1.0), emissive_strength=0.35,
                             clearcoat=1.0)
    blade.data.materials.append(blade_mat)
    shade_smooth(blade)

    # Guarda
    bpy.ops.mesh.primitive_cube_add(location=(0, 0.6, -0.18), size=0.18)
    guard = bpy.context.active_object
    guard.scale = (1.5, 0.4, 0.25)
    bpy.ops.object.transform_apply(scale=True)
    guard_mat = make_material('sword_guard_mat', GOLD,
                             roughness=0.2, metalness=0.92,
                             emissive_color=GOLD, emissive_strength=0.3)
    guard.data.materials.append(guard_mat)
    shade_smooth(guard)

    # Cabo
    bpy.ops.mesh.primitive_cylinder_add(location=(0, 0.6, -0.32), radius=0.04,
                                        depth=0.20, vertices=12)
    hilt = bpy.context.active_object
    hilt.data.materials.append(guard_mat)
    shade_smooth(hilt)

    # Pomo (sphere com gem)
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0.6, -0.45), radius=0.06, segments=20)
    pomo = bpy.context.active_object
    pomo_mat = make_material('sword_pomo_mat', RUBY,
                            roughness=0.1, metalness=0.4,
                            emissive_color=RUBY, emissive_strength=1.0,
                            clearcoat=1.0)
    pomo.data.materials.append(pomo_mat)
    shade_smooth(pomo)


# ============================================================================
# RENDER
# ============================================================================

def setup_lighting():
    bpy.ops.object.light_add(type='AREA', location=(2.5, -2.5, 3.5))
    key = bpy.context.active_object
    key.data.energy = 700
    key.data.size = 2.0
    key.data.color = (1.0, 0.97, 0.93)
    key.rotation_euler = (math.radians(55), 0, math.radians(40))

    bpy.ops.object.light_add(type='AREA', location=(-2.0, 2.5, 2.5))
    rim = bpy.context.active_object
    rim.data.energy = 450
    rim.data.size = 1.5
    rim.data.color = (1.0, 0.75, 0.6)
    rim.rotation_euler = (math.radians(110), 0, math.radians(-30))

    bpy.ops.object.light_add(type='AREA', location=(0, -2, -0.5))
    fill = bpy.context.active_object
    fill.data.energy = 180
    fill.data.size = 2.0
    fill.data.color = (0.85, 0.92, 1.0)

    bpy.ops.object.light_add(type='AREA', location=(0, 0, 5))
    ambient = bpy.context.active_object
    ambient.data.energy = 200
    ambient.data.size = 5.0
    ambient.data.color = (1.0, 0.95, 0.88)


def setup_world():
    world = bpy.context.scene.world
    if not world.use_nodes:
        world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.04, 0.03, 0.025, 1.0)
    bg.inputs['Strength'].default_value = 0.5


def setup_camera():
    bpy.ops.object.camera_add(location=(0, -3.6, 1.6))
    camera = bpy.context.active_object
    camera.rotation_euler = (math.radians(74), 0, 0)
    camera.data.lens = 55
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 3.6
    camera.data.dof.aperture_fstop = 4.5
    bpy.context.scene.camera = camera


def setup_render(out_path, resolution=512):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.filepath = out_path
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.3


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


# ============================================================================
# MAIN
# ============================================================================

def parent_to_root_empty(slot_name='head'):
    """Post-process v2: cria Empty 'accessory_root' como parent de todos os
    meshes, zera a posição do Empty. GLB exporta UMA scene tree limpa.

    Mais robusto que center_to_local_space() — esse falhava com accessories
    multi-piece (sunglasses tem 2 lentes separadas: centroid ficava entre
    elas mas pieces continuavam separadas). Agora TUDO fica filho de UM root.

    Slot offsets aplicados no root pra cada accessory ficar onde DEVE:
      head: y=0 (anchor_head já tá no topo do mascote)
      face: y=0 (anchor_face já tá na frente do rosto)
      neck: y=0 (centro do pescoço)
      back: y=0 (atrás)
      aura: y=0 (centro)

    Cada accessory MANTÉM suas posições relativas internas (lentes 22cm
    separadas, etc) — só o ponto de ancoragem global é zerado.
    """
    import mathutils
    # Coleta todos os objects criados pelo builder
    objs = [o for o in bpy.context.scene.objects
            if o.type in ('MESH', 'CURVE') and not o.parent]
    if not objs:
        return
    # Calcula centroid de bbox agregado (igual antes)
    all_corners = []
    for o in objs:
        for corner in o.bound_box:
            all_corners.append(o.matrix_world @ mathutils.Vector(corner))
    minv = mathutils.Vector((
        min(c.x for c in all_corners),
        min(c.y for c in all_corners),
        min(c.z for c in all_corners),
    ))
    maxv = mathutils.Vector((
        max(c.x for c in all_corners),
        max(c.y for c in all_corners),
        max(c.z for c in all_corners),
    ))
    # BOTTOM-CENTER em vez de centroid: o ponto de ancoragem é a BASE do
    # accessory (onde encosta no mascote), não o centro do bbox. Pra cap, o
    # band sit dentro do anchor_head em vez de flutuar 0.5 acima.
    center = mathutils.Vector(((minv.x + maxv.x) / 2, (minv.y + maxv.y) / 2, minv.z))
    # Cria Empty 'accessory_root' no bottom-center
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=center)
    root = bpy.context.active_object
    root.name = 'accessory_root'
    # Parent todos os meshes ao root (mantém world position)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)
    # Agora move o root pra origem — children seguem juntos
    root.location = (0, 0, 0)
    print(f'  parented to accessory_root, zeroed at origin (was at {center.x:.2f},{center.y:.2f},{center.z:.2f})')


# Mantém alias antigo pra não quebrar referências
center_to_local_space = parent_to_root_empty


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--accessory', required=True, choices=ACCESSORIES.keys())
    parser.add_argument('--out', required=True)
    parser.add_argument('--render', help='Optional preview PNG')
    args = parser.parse_args(argv)

    meta = ACCESSORIES[args.accessory]
    print(f'\n=== Generating {args.accessory} ({meta["tier"]}) ===')

    clear_scene()
    builder_name = meta['builder']
    builder_fn = globals()[builder_name]
    builder_fn()
    center_to_local_space()  # zera origem pra anchor parenting funcionar

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    export_glb(args.out, animated=meta.get('animated', False))
    print(f'GLB exported: {args.out}')

    if args.render:
        setup_lighting()
        setup_world()
        setup_camera()
        os.makedirs(os.path.dirname(args.render), exist_ok=True)
        setup_render(args.render)
        bpy.ops.render.render(write_still=True)
        print(f'Render: {args.render}')

    print('=== Done ===')


if __name__ == '__main__':
    main()
