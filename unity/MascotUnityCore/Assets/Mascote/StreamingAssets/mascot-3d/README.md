# Mascot 3D Assets

Esta pasta vai receber os **GLBs modelados em Blender** quando os assets do
artista chegarem. Hoje está vazia (ou só com placeholders).

## 📦 O que vai aqui

```
mascot-3d/
├── bipo.glb       ← Calmo (sereno acolhedor)
├── zip.glb        ← Motivador (energético alerta)
├── lulu.glb       ← Fofo (bochechas marcadas)
├── aro.glb        ← Sábio (olhos pensativos)
├── egg.glb        ← Casca de ovo (fase ovo, antes de hatching)
└── accessories/
    ├── cap.glb         ├── halo.glb
    ├── bow.glb         ├── horn.glb
    ├── glasses.glb     ├── monocle.glb
    ├── crown.glb       ├── mask.glb
    ├── flower.glb      ├── scarf.glb
    ├── headphones.glb  ├── cape.glb
    ├── leaf.glb        ├── cookie.glb
    └── star.glb
```

## 🔌 Como o app consome

Quando os assets estiverem aqui, o `Mascot3D.tsx` (refatorado em paralelo) vai:

1. **Resolver path por personality** via `PERSONALITY_TO_GLB[mascot.personality]`
   (do `src/lib/dna/bindings.ts`)
2. **Carregar GLB** via `useGLTF()` do `@react-three/drei` (precisa instalar)
3. **Aplicar tints DNA-driven** chamando:
   ```ts
   const bindings = dnaToMaterialBindings(dna, userBand, phaseGlowMult);
   scene.getObjectByName('body_material').material.color.setHex(bindings.bodyTint);
   scene.getObjectByName('accent_material').material.color.setHex(bindings.accentTint);
   ```
4. **Escalar bones por fase + DNA** chamando:
   ```ts
   const scales = dnaToBoneScales(dna, phase, userBand);
   skeleton.bones['head'].scale.setScalar(scales.head);
   skeleton.bones['body'].scale.setScalar(scales.body);
   // etc
   ```
5. **Tocar animations por mood**:
   ```ts
   const anim = moodToAnimation(mood);
   actions[anim.primary].setEffectiveTimeScale(anim.speed).play();
   if (anim.blend) actions[anim.blend.name].setEffectiveWeight(anim.blend.weight).play();
   ```
6. **Attach acessórios equipados** via `unlockedAccessories(dna, unlocked, equipped)`
   carregando GLBs adicionais e parentando em bones.

## 🎨 Brief detalhado pro artista

Ver `docs/design/MASCOT_3D_ASSETS_BRIEF.md` na raiz do repo. Contém:
- Specs técnicos (poly count, rigging bones, animations, materials)
- 4 mascotes com vibe de cada personality
- Critérios de aceite
- Onde contratar + custo estimado (R$3-8k/mascote BR ou $300-800 intl)
- Opção de AI-generated (Meshy.ai $50 total) pra prototipar rápido

## 🚧 Estado atual

- ✅ **Helper `bindings.ts`** criado em `src/lib/dna/` — pure functions
  que mapeam DNA → material+bones+animations (24 tests passando)
- ✅ **Brief completo** em `docs/design/MASCOT_3D_ASSETS_BRIEF.md`
- ⏳ **GLBs pendentes** — esperando assets do artista 3D
- ⏳ **Mascot3D.tsx refator** — precisa instalar `@react-three/drei` +
  reescrever pra usar `useGLTF` quando GLBs chegarem
- ⏳ **Placeholders** — pode ser gerado via Meshy.ai ou Blender básico
  pra dev rolar enquanto não tem arte final

## 📐 Specs resumidas pro consumo

Cada GLB **DEVE** ter:
- 14 bones com nomes: `root`, `spine`, `neck`, `head`, `jaw`, `eye_L`, `eye_R`,
  `arm_L`, `forearm_L`, `hand_L`, `arm_R`, `forearm_R`, `hand_R`, `leg_L`,
  `foot_L`, `leg_R`, `foot_R` (todos lowercase com underscore)
- 3 materials slots: `body_material`, `accent_material`, `glow_material`
  (cor neutra branca — app tinta via uniform)
- Animations nomeadas: `idle`, `blink`, `smile`, `sad`, `excited`, `sleep`,
  `wave` (snake_case)
- Total size < 1MB (textures otimizadas 512×512 ou 1024×1024)
- Topology limpa (quads, sem n-gons), poly count 5-10k tris
