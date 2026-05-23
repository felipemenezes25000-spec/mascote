# Brief de assets 3D do Mascote (Blender)

**Decisão de produto (2026-05-22)**: parar de tentar visual procedural por
deformação de esfera. Os 4 mascotes base passam a ser **modelados em Blender
por artista 3D**, com **rigging skeletal** + **animações pré-feitas**. O
sistema procedural continua vivo na **escolha de cor/acessórios/padrões/fase**,
não na geometria.

Padrão de referência: Pokemon Sleep, Pou, My Talking Tom, Cult of the Lamb.

---

## 🎯 O que entregar

### 4 mascotes base
Um para cada personality do app. Estilo: **chibi cute** (cabeça grande, corpo
pequeno, olhos enormes), paleta wellness (pêssego/cream/coral/menta).

| Mascote | Personality | Vibe | Referência de silhueta |
|---|---|---|---|
| **Bipo** | Calmo | Sereno, acolhedor | Slowpoke + Marshmallow |
| **Zip** | Motivador | Energético, alerta | Pikachu + Stitch |
| **Lulu** | Fofo | Bochechas marcadas, sorrindo | Jigglypuff + Kirby |
| **Aro** | Sábio | Olhos grandes pensativos | Mew + Mokona |

**Importante**: **NÃO** copiar nenhum dos personagens acima. Eles são referência
de PROPORÇÃO e ATITUDE, não de design. Cada mascote precisa ser **original** —
inspirado em criaturas wellness/orgânicas (gota d'água viva, broto, nuvem,
gelatina, etc).

---

## 📐 Specs técnicos

### Geometria
- **Poly count target**: 5.000–10.000 triangles por mascote (mobile-friendly)
- **Topology**: quads limpos, edge loops bons em pontos de articulação (boca,
  olhos, juntas)
- **Subdivision-ready**: precisamos do **base mesh** + (opcional) versão high-poly
  pra normal map bake. Se entregar só low-poly, ok.
- **Symmetria**: lateral X (espelhado), exceto detalhes ornamentais

### Rigging
Skeleton mínimo (estilo Mixamo simplificado):

```
root
└── spine
    ├── neck → head
    │       ├── jaw (boca)
    │       ├── eye_L
    │       └── eye_R
    ├── arm_L → forearm_L → hand_L
    ├── arm_R → forearm_R → hand_R
    ├── leg_L → foot_L
    └── leg_R → foot_R
```

Total: ~14 bones. Sem fingers (mascote tem mãos simples).

### Animações (cada uma 1-2s em loop quando aplicável)
- **idle** (sempre em loop): breath cycle, pequenos movimentos de cabeça
- **blink**: piscar olhos a cada 3-5s
- **smile**: pequeno sorriso (boca curva para cima)
- **sad**: cabeça abaixa, boca curva para baixo
- **excited**: bounce vertical + olhos arregalados
- **sleep**: cabeça inclina, olhos fecham, leve balançar
- **wave**: braço direito acena (interaction com user)
- **hatch** (só pro ovo): rachadura emerge, expansão, criatura sai

**Formato**: animações como NLA strips no Blender, exportadas no GLB com nomes
em snake_case (`idle`, `blink`, `excited`, etc).

### Materials
Cada mascote tem **3 material slots customizáveis** pelo DNA:
1. **`body_material`**: cor principal do corpo. Tint via uniform.
2. **`accent_material`**: cor de detalhes (cauda, bracinhos, pézinhos)
3. **`glow_material`**: cor da bioluminescência (olhos, aura, padrões)

**Não pintem texturas com cor fixa** — usem **cor neutra branca** + multiply no
shader pra que o app possa tintar em runtime via uniform.

PBR setup:
- `roughness`: 0.42 base (gel look)
- `metalness`: 0.08 base
- `emissive`: usado para inner glow — slot separado
- `clearcoat` (se possível): 0.85 pra brilho jelly superior

### Acessórios desbloqueáveis (separados, opcionais)
Lista de acessórios que serão attachados via bone:

- `head`: cap, bow, glasses, crown, flower, headphones, mask, horn, halo
- `neck`: scarf, cape
- `body`: leaf, cookie
- `aura`: star, monocle

Cada acessório é **GLB separado** com 1 bone de attach. Total: ~14 GLBs
adicionais, ~500-2000 tris cada.

### Format de entrega
- **`.blend` source files** (pra futuras edições)
- **`.glb`** com textures + animations embedded (formato runtime)
- **Resolution**: 512×512 ou 1024×1024 para textures (mobile-friendly)
- **Bones naming**: padrão Mixamo se possível (compatível com retargeting)

### Phases visuais (NÃO precisa modelar 6 separados)
A mesma mesh é usada pra todas as 6 fases via **bone scale**:
- **Ovo** (0-3d): mascote 100% escondido + GLB de casca de ovo separado
- **Bebê** (3-14d): bones head escala 1.4×, body 0.7×, eyes 1.5×
- **Criança** (14-30d): head 1.2×, body 0.85×, eyes 1.25×
- **Adolescente** (30-90d): proporção 1.0× (default)
- **Adulto** (90-365d): proporção 1.0× + acessórios desbloqueáveis
- **Evoluído** (365d+): + halo GLB attached + asas GLB attached + aura particles (engine-side)

O Blender precisa entregar **bones que dêem escala independente em head e
body** (com `head` bone separado de `neck` bone separado de `spine`).

---

## 💰 Custo estimado e onde contratar

| Modalidade | Custo (BRL) | Tempo | Onde |
|---|---|---|---|
| **Freelancer Brasil** | R$3.000-8.000 por mascote | 1-2 semanas/mascote | [Workana](https://www.workana.com), [99freelas](https://99freelas.com.br), Behance/Artstation DM |
| **Freelancer Internacional** | $300-800 USD por mascote | similar | [Fiverr](https://www.fiverr.com), [Upwork](https://www.upwork.com) |
| **Você aprender Blender** | ~80h estudo + 40h modelagem | 2-3 meses part-time | [Blender Guru](https://www.youtube.com/@blenderguru), [Grant Abbitt](https://www.youtube.com/@GrantAbbitt) |
| **AI-generated 3D** (Meshy, Tripo) | $20-50 USD total + retoping | 1-2 semanas | [meshy.ai](https://meshy.ai), [tripo3d.ai](https://tripo3d.ai) |

**Total estimado para os 4 mascotes**: R$12-32k (freelance BR) ou US$1200-3200 (intl)
+ R$500-1500 pra ~14 acessórios.

**Recomendação**: começar com **AI-generated** (Meshy) pra prototipar rapidíssimo
(1 semana, $50), depois contratar artista pra refinar/retopologizar se a venda
funcionar.

---

## 🔌 Como o app vai consumir

Quando os GLBs chegarem, plugar em:
- `app/mobile/assets/mascot-3d/bipo.glb`
- `app/mobile/assets/mascot-3d/zip.glb`
- `app/mobile/assets/mascot-3d/lulu.glb`
- `app/mobile/assets/mascot-3d/aro.glb`
- `app/mobile/assets/mascot-3d/egg.glb`
- `app/mobile/assets/mascot-3d/accessories/{cap,bow,glasses,...}.glb`

O `Mascot3D.tsx` (refatorado em paralelo a este brief) carrega via `useGLTF` do
`@react-three/drei`, aplica DNA→material via `material.color.setHex(tint)`, e
controla animation state via `useAnimations`.

DNA continua único por usuário:
- **Cor** (body_material.color via `paletteFromGenome(dna)`)
- **Proporções** (bones head_scale + body_scale via DNA empathy/intelligence)
- **Acessórios** desbloqueáveis (DNA + hábitos definem qual aparece)
- **Padrões** (creativity > 0.7 → spots overlay texture)
- **Fase** (idade → bone scale presets)
- **Mood** (animation blend triste/feliz/exausto/empolgado)
- **Chat drift** (modula DNA → muda cores e proporções com tempo)

---

## ✅ Critérios de aceite

Antes de pagar o freelancer:
1. GLB importa em [gltf-viewer](https://gltf-viewer.donmccurdy.com) sem warnings
2. 14 bones presentes com nomes corretos (`head`, `neck`, `arm_L`, etc)
3. Animation `idle` em loop limpo (sem pop no início/fim)
4. Materials `body`/`accent`/`glow` separados e tintáveis
5. Total file size < 1MB por mascote (textures otimizadas)
6. Visual em wireframe: topology limpa, sem n-gons, edge loops corretos
7. Visual em render: silhueta reconhecível como personality designada
