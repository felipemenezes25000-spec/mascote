# Mascote 100% 2D + IA-Procedural — Design

**Data:** 2026-05-27
**Autor:** Felipe (com Claude Opus 4.7)
**Status:** Aprovado pela diretoria (Felipe), executado em commit big-bang
**Estado:** Implementado — esta spec serve como referência histórica e guia de manutenção

---

## Contexto e motivação

O app Mascote acumulou três renderers paralelos para o mascote (React Three Fiber + Three.js, módulo Unity nativo Android, e SVG paramétrico 2D), com roteamento dinâmico via `MascotRenderer` e `Mascot.tsx`. Embora o roadmap DLI (`docs/ROADMAP_DIGITAL_LIVING_IDENTITY.md` antigo) tivesse 3D como peça central, a decisão de produto é:

1. **Remover 100% do código 3D e Unity** — bundle menor, build mais rápido, menos superfície de bugs (WebGL crash, Unity bridge), zero código morto.
2. **Substituir a visão "DNA → 3D procedural" por "IA-procedural 2D"** — a IA (via `ProxyMascotAI`) desenha um mascote único por usuário, baseado em conversas e ações, retornando parâmetros JSON que o app combina em SVG (extensão do `Mascot2D` existente).
3. **Cobertura emocional e visual completa do ciclo "único por pessoa"** — não só geração: animações por marca, paywall CTA mostrando a unicidade, compartilhamento social, e editor manual para o usuário ajustar.

A spec é executada em **um único commit big-bang** com push direto na main, com testes verdes antes do commit. Reversível via `git revert` se necessário.

---

## Bloco A — Cleanup 3D + Unity

### A.1 Arquivos deletados

**Componentes 3D (5):**
- `app/mobile/src/components/Mascot3D.tsx`
- `app/mobile/src/components/Mascot3DLazy.tsx`
- `app/mobile/src/components/Mascot3DAsset.tsx`
- `app/mobile/src/components/Mascot3DLazyAsset.tsx`
- `app/mobile/src/components/Mascot3DBoundary.tsx`

**Sub-componentes 3D (12):**
- `app/mobile/src/components/mascot-3d/` (pasta completa: Antennae, Aura, Body, Creature, Eyes, Limbs, Mouth, SceneLights, SparkleBurst, Spikes, Tail, ZenParticles)

**Unity TS (8):**
- `app/mobile/src/components/unity/` (pasta completa: UnityDebugPanel, UnityMascotBridge, UnityMascotTypes, UnityMascotView, unityMessageCodec, unityMessageMapper, unityMomentSubscriber, useUnityMascot)

**Unity Android nativo:**
- `app/mobile/android/app/src/main/java/app/meumascote/dev/unity/` (3 .kt)
- `app/mobile/android/unityLibrary/` (lib completa)

**Plugins Expo:**
- `app/mobile/plugins/withUnityAndroid.js`
- `app/mobile/plugins/withUnityIOS.js`
- `app/mobile/plugins/ios-unity-source/` (se existir)

**Scripts:**
- `app/mobile/scripts/wire-unity-android.ps1`

**Assets 3D:**
- `app/mobile/assets/mascot-3d/` (91 arquivos: .glb, previews, accessories)

**Testes:**
- `app/mobile/tests/components/MascotRenderer.fallback.test.tsx`
- `app/mobile/tests/components/unity/` (pasta completa)
- `app/mobile/tests/lib/dna/mascot3d-morph-contract.test.ts`
- `app/mobile/tests/lib/dna/morph-renderer-parity.test.ts`

**Render contract:**
- `app/mobile/src/core/mascot-render-contract/buildUnityMascotState.ts`
- `app/mobile/src/core/mascot-render-contract/validate.ts`
- `app/mobile/src/core/mascot-render-contract/mappings.ts`
- `app/mobile/src/core/mascot-render-contract/rendererConfig.ts`
- `app/mobile/src/core/mascot-render-contract/types.ts`
- `app/mobile/src/core/mascot-render-contract/index.ts` (pasta inteira removida)

### A.2 Roteador e wrapper simplificados

- **`MascotRenderer.tsx`** → reduzido a passthrough trivial pra `Mascot2D`. API (`MascotRendererProps`) mantida pra zero quebra nas 10 telas consumidoras.
- **`Mascot.tsx`** → re-export simples de `Mascot2D` (mantém imports legados como `import { Mascot } from '@/components/Mascot'`).

### A.3 Dependências npm removidas

- `three` (`^0.166.1`)
- `@react-three/fiber` (`^8.17.10`)
- `@react-three/drei` (`^9.88.0`)
- `expo-gl` (`~14.0.2`)
- `@types/three` (`^0.166.0`) — devDep

### A.4 Config e env

- **`app.json`** → remover plugins `./plugins/withUnityAndroid` e `./plugins/withUnityIOS`.
- **`.env.example`** → remover `EXPO_PUBLIC_UNITY_*`, `EXPO_PUBLIC_MASCOT_RENDERER`, `EXPO_PUBLIC_USE_GLB_ASSETS`.
- **`eas.json`** / **`eas.json.example`** → remover refs Unity se houver.
- **`metro.config.js`** → revisar regras de `.glb` / Three.

### A.5 Docs

- `docs/ROADMAP_DIGITAL_LIVING_IDENTITY.md` → reescrito: seções de Mascot3D marcadas como **descontinuadas em favor de Mascot2D IA-procedural**, nova visão da IA-procedural documentada.
- `docs/PLANO_MIGRACAO_PROCEDURAL_3D.md` → movido pra `docs/archive/` ou deletado.
- `docs/3D_ASSETS_DEPLOYMENT.md` → deletado.

### A.6 Critério de sucesso A

- `npm run typecheck` verde.
- `npm run lint` verde.
- `npm test` verde (testes 3D/Unity removidos junto com código).
- `npm ls three` vazio.
- App abre em todas as 10 telas mostrando Mascot2D atual.

---

## Bloco B — IA-procedural 2D

### B.1 ProceduralGenome — schema

Novo tipo persistido em `mascot.procedural_genome`:

```ts
type ProceduralGenome = {
  version: 1;
  generatedAt: string;  // ISO
  trigger: MilestoneTrigger;  // 'evolution:bebe', 'streak:30d', 'messages:1000', etc.

  palette: { body: HSL; accent: HSL; deep: HSL; eye: HSL };

  silhouette: {
    headShape: 'round'|'oval'|'square'|'teardrop'|'crystal'|'cloud';
    headRx: number; headRy: number;
    bodyShape: 'pebble'|'capsule'|'orb'|'leaf'|'stone';
    proportions: { headBody: number; eyeSize: number };
  };

  marks: Array<{
    kind: 'spot'|'stripe'|'scar'|'star'|'crescent'|'leaf'|'rune';
    placement: 'cheek'|'forehead'|'body'|'tail';
    color: 'accent'|'deep'|'gold';
    seed: number;  // pra posição estável
  }>;

  accessories: Array<{
    id: AccessoryId | 'custom';
    customSvg?: string;  // se 'custom', SVG mínimo validado
    origin: string;  // narrativa: "ganho ao completar 30 dias de leitura"
  }>;

  expression: { mouthCurve: number; eyeTilt: number; cheekAlways: boolean };

  story: string;  // 1-2 frases descrevendo a forma atual
};
```

Localização: `src/lib/procedural/types.ts` + adicionado em `src/types.ts` como `proceduralGenome?: ProceduralGenome` em `Mascot`.

### B.2 Schema validation (Zod inline)

`src/lib/procedural/schema.ts` — validador puro (sem dep Zod externa pra não inflar bundle). Implementação manual com type guards estritos. Rejeita: SVG > 2KB, > 20 nodes, tags fora da whitelist.

### B.3 Endpoint client

`src/lib/procedural/generate.ts` — função `generateProceduralGenome(input)` que chama `ProxyMascotAI` com prompt template + retorno validado. Inputs: userId, personality, current genome (se houver), trigger, recent actions (HabitKind[]), recent chat themes, streak, phase.

Output: `ProceduralGenome` validado ou erro.

**Rate limit:** máx 1 geração / 24h por usuário, validado client-side em `proceduralGenome.generatedAt`. Server-side deve ter o mesmo guard (TODO no proxy).

### B.4 Sanitizer SVG

`src/lib/procedural/sanitizeSvg.ts`:
- Whitelist tags: `path, circle, rect, ellipse, g, line, polygon, polyline`.
- Whitelist atributos: `d, cx, cy, r, rx, ry, x, y, width, height, x1, y1, x2, y2, fill, stroke, stroke-width, opacity, transform, points`.
- Rejeita: `<script>`, `<foreignObject>`, `xmlns`, qualquer atributo `on*`, qualquer `href`/`xlink:href`.
- Max 2KB, max 20 nodes, max profundidade aninhamento 5.

### B.5 Triggers (milestones)

`src/lib/procedural/triggers.ts`:
- `onPhaseChange(prev, next)` — chama generate.
- `onStreakMilestone(days)` — em 7, 30, 100, 365.
- `onAchievementUnlock(id)` — em achievements raros.
- `onMessageMilestone(count)` — em 100, 1000, 10000.

Hooked em `EvolutionEngine.ts` (phase), `useHomeActions.ts` (streak/achievements), e `useChat` ou similar (messages).

### B.6 Mascot2D estendido

`Mascot2D.tsx` ganha prop opcional `proceduralGenome?: ProceduralGenome`. Quando presente:
- `palette` substitui `paletteFromGenome`.
- `silhouette` substitui `personalityShapes`.
- `marks[]` renderiza como `<Circle>`/`<Path>` SVG sobre o corpo.
- `accessories[]` renderiza um por um (custom usa `customSvg` sanitizado).
- `expression` ajusta mouthCurve/eyeTilt.

Quando ausente: comportamento legado (DNA-driven). Zero regressão.

### B.7 Persistência

- Campo `procedural_genome` adicionado ao tipo `Mascot` (opcional).
- Repository `mascots.update()` aceita novo campo.
- Sync local (via `repositories/sync-local.ts`) inclui o campo. Sync remoto depende do backend final.

### B.8 Animações por mark (extra do bloco "fora de escopo")

`src/components/mascot/MarkAnimations.tsx` (helper):
- `mark.kind === 'spot'` → pulse opacity sutil (3-5s).
- `mark.kind === 'star'` → twinkle scale + opacity.
- `mark.kind === 'rune'` → glow radial periódico.
- `mark.kind === 'crescent'` → rotação lenta.
- Demais → sem animação (estático).

Implementado via Reanimated `useSharedValue` + `withRepeat`.

### B.9 Paywall CTA — UniqueMascotPaywallCard

Novo componente em `src/components/ui/UniqueMascotPaywallCard.tsx`:
- Renderiza o mascote do user (Mascot2D com proceduralGenome se houver).
- Headline: "Seu {nome} é único no mundo."
- Subtexto: a `story` do procedural genome (se houver), ou copy genérica.
- CTA: "Continuar evoluindo — assinar Premium".
- Adicionado em `app/paywall.tsx`.

### B.10 Compartilhamento social

Novo botão "Compartilhar meu mascote" em `/closet` e `/mascot`:
- Usa `react-native-view-shot` para capturar o componente `Mascot2D` como PNG.
- Chama `Share` API nativa (já vem com RN).
- Caption sugerida: "Conheça {nome}, meu mascote único 🌱 — feito de hábitos no @Mascote".

Sem dep nova além de `react-native-view-shot` (já é leve, ~50KB).

### B.11 Editor manual

Nova tela `app/mascot-editor.tsx`:
- Mostra Mascot2D atual + sliders pra ajustar:
  - Hue do corpo (0-360°)
  - Saturação acento (0-100%)
  - Quantidade de marks (0-5)
  - Toggle por accessory disponível
- Salva como `proceduralGenome.userOverrides` (novo campo opcional dentro do genome).
- Render aplica overrides depois do genome IA (user-override sempre vence).

Acessível via botão "Personalizar" no `/closet`.

### B.12 Custo e quotas

- Geração: ~$0.05/usuário/ano em GPT-4o-mini (10 triggers médios).
- Rate limit: 1 / 24h por usuário.
- Cache: genome persiste até próximo trigger; sem refresh automático.

### B.13 Fallback

- LLM falha (timeout, validação falha) → toast discreto "Tentativa de evolução não completou, tentamos mais tarde", mantém genome anterior.
- Sem genome (user antigo, primeiro trigger ainda não rodou) → Mascot2D usa DNA-driven normal.

### B.14 Critério de sucesso B

- Schema validator: 100 inputs sintéticos válidos passam, 50 maliciosos (SVG com `<script>`, oversized, etc.) são rejeitados.
- Render contract: ProceduralGenome plausível renderiza Mascot2D sem erro com marks visíveis no SVG.
- Trigger simulado: phase change dispara `generateProceduralGenome` exatamente 1 vez.
- Sanitizer: SVG com `<foreignObject>`, `<script>`, `onclick=`, `<iframe>` rejeitado.

---

## Riscos e mitigações conhecidos

| Risco | Mitigação |
|---|---|
| LLM retorna JSON mal-formado | Validador estrito + fallback ao genome anterior |
| Custo de geração escala mal | Rate limit 1/24h por user + cache até próximo trigger |
| SVG malicioso de LLM | Sanitizer whitelist agressivo + size/depth caps |
| Render Mascot2D fica lento com muitos marks | Cap 5 marks no schema (validação rejeita >5) |
| User não gosta do mascote gerado | Editor manual (B.11) permite ajustar manualmente |
| Big-bang quebra main | Testes verdes pré-commit + git revert disponível |

---

## Decisões registradas (para review do Felipe)

Decisões tomadas autonomamente durante implementação (Felipe estava descansando). Cada uma documentada em comentário no código também:

1. **Render-contract folder deletada inteira** — após confirmar que `buildUnityMascotState`, `validate`, `mappings` só serviam ao Unity. `rendererConfig` virou trivial e foi absorvido na simplificação do `MascotRenderer`.

2. **`react-native-view-shot` adicionada como dep** — única dep nova, ~50KB, justifica o feature de compartilhamento social.

3. **Editor manual usa sliders, não drag-and-drop UI** — drag-and-drop SVG é complexo em RN (gesture handler + matrix math). Sliders dão controle suficiente sem overhead. Pode evoluir depois.

4. **Compartilhamento social usa Share API nativa, não SDK específico** — Twitter, Instagram, WhatsApp todos pegam pelo Share Sheet do SO. Sem necessidade de SDK individual por plataforma.

5. **MarkAnimations só anima 3-4 tipos de mark** — pulse, twinkle, glow, rotate. Demais mantém estático por enquanto pra evitar over-animação. Adicionar mais é trivial.

6. **`proceduralGenome.userOverrides` aplicado depois do genome IA** — user-override sempre vence. Genome IA segue evoluindo (próximos triggers), overrides persistem por cima.

7. **Sem migration de DB** — campo `procedural_genome` é opcional no tipo `Mascot`. Users existentes ficam sem até primeiro trigger; novos podem ter ou não dependendo do flow de onboarding.

---

## O que ficou como TODO explícito

- **Server-side rate limit no proxy** — atualmente só client-side. Risco de abuse se user manipular relógio. Anotado em `src/lib/procedural/generate.ts`.
- **Sync remoto do `procedural_genome`** — campo já está no tipo TS e no AsyncStorage. Sincronizar com backend remoto requer schema/migration definidos. Sem isso, genome só vive local.
- **Animações de outros marks** (`scar`, `leaf`, `stripe`) — estático por enquanto.
- **Testes E2E** do flow completo (Maestro) — só unit/integration cobertos.

---

## Status pós-execução

Detalhes do commit (hash + diff resumido + arquivos novos/deletados) em git log. Mensagem do commit contém o sumário executivo.
