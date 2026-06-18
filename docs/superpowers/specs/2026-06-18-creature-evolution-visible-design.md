# Evolução visível da criatura — design

Data: 2026-06-18 · Status: aprovado (Felipe) · Autor: Claude

## Problema

A criatura parece idêntica ao longo da evolução — só muda de tamanho. Duas causas-raiz:

1. **Mutações invisíveis.** O sistema de mutações (`src/lib/dna/mutations.ts`, catálogo 50+, desbloqueio por gene/hábito/streak, `aggregateVisualImpact`) está completo e a home calcula/passa `mutationIds` ao `MascotRenderer`. Mas o caminho vivo (`CreatureRenderer`) **descarta** `mutationIds` — só o `Mascot2D` legado consumia. Pior: o `VisualImpact` fala a língua do `Morphology` (Mascot2D), não a do `CreatureGenome` (CreatureRenderer).
2. **Evolução não transforma a forma.** Aparência = 100% derivada do genoma (drift por hábito ~0.01/dia). Fase/nível não mexem em traço nenhum; `mascotSize` é baseado na largura da tela.

Resíduo dos pivôs 3D→Mascot2D→CreatureRenderer: o sistema de mutações ficou pendurado no renderer anterior.

## Visão (aprovada)

Evolução faseada + mutações visíveis + cada ação **e cada conversa no chat** moldam a criatura, num processo **lento e que faça sentido**.

**Conceito central:** o **genoma é o destino** (a forma final: orelhas/cauda/asas/coroa/padrão); a **evolução é a jornada de revelar esse destino**. A criatura "cresce pra dentro" da forma que os hábitos e conversas moldam — transformação lenta, coerente e pessoal.

## Escopo faseado

### Fase 1 — Camada de evolução visível no `CreatureRenderer` (este ciclo)

Pré-requisito que destrava tudo: mesmo que hábitos/chat já mexam no genoma, hoje nada disso aparece.

- **Módulo puro `src/components/mascot/creatureEvolution.ts`** (testável, sem reanimated/SVG):
  `creatureEvolution({ phase, mutationIds })` → `EvolutionVisuals`:
  - `stage` 0..5 de `MascotPhase` (ovo→evoluido).
  - Revelação progressiva (gate de traços que o genoma já escolheu):
    - tail: estágio ≥ 1 (bebe)
    - pattern: ≥ 2 (crianca)
    - wings: ≥ 3 (adolescente)
    - crown: ≥ 4 (adulto)
    - aura/sparkles/pulse base: 5 (evoluido)
    - orelhas/corpo/rosto/membros: sempre (criatura nunca fica "quebrada")
  - `glow` 0..1 cresce com o estágio.
  - **Ponte de mutações** via `aggregateVisualImpact(mutationIds)`:
    - `glowBoost`/`bodyEmissiveIntensity` → soma a `glow`
    - `bioluminescent` → `pulse = true`
    - `pattern` (fractal/spots/stripes/cells) → `patternOverride` mapeado p/ pattern do CreatureRenderer
    - `morphologyMultipliers.eyeSize` → `eyeScale`
    - `auraParticleMultiplier` → `sparkleCount`
  - Mutações aplicam SEMPRE (marco), mesmo em estágio baixo.
- **`CreatureRenderer` consome `phase` + `mutationIds`**, aplica: gate de drawCrown/drawWings/drawTail/drawPattern; intensidade do glow; pulso (shared value) se `pulse`; faíscas (`sparkleCount`); `eyeScale` no drawEyes; `patternOverride`.
- **Threading**: `MascotRenderer` e `Mascot` já recebem `phase`+`mutationIds` em props — passar ao `CreatureRenderer`.
- Sem mudança de gameplay: mesmas condições de desbloqueio de mutação; só visibilidade.

**Verificação:** unit (mapeamento puro), render (fase baixa vs alta diferem; mutationIds mudam render), e **visual** (expo web + Playwright: render fase ovo vs evoluido + efeito de mutação).

### Fase 2 — Chat alimenta o genoma — FEITA (mesma sessão)

Cada conversa = nudge minúsculo no genoma por tema/sentimento, com teto diário. Lento e significativo; hábitos já faziam, adicionado o chat.

- `src/lib/dna/chatToGene.ts` (PURO): `detectChatThemes` + `chatDrift(genome, message)` — 9 temas (feelings/calm/learning/creativity/social/discipline/resilience/adventure/activity) por radical sem acento; intensidade emocional (magnitude do sentimento) → emotionalDepth (desabafar aprofunda). ~0.0012/gene/msg (8× menor que hábito), teto 0.003/gene/msg. Não-negativo, determinístico.
- `src/lib/dna/chatDriftBudget.ts`: teto DIÁRIO (8 msgs/dia driftam) via chave local auto-resetável. Anti-gaming.
- `store.driftDnaFromChat(message)`: lock `mascot_logic:${uid}` (serializa c/ habit-drift/setDna/lifeSim); pula crise (`classifyInput === 'critical'`); só consome orçamento quando há drift real; persiste via `mascots.updateDna`.
- Hook em `app/(tabs)/chat.tsx` send(): `void useStore.getState().driftDnaFromChat(text)` fire-and-forget, junto do `rememberFromMessage`.

Verificado: simulação de ~250 msgs/tema (≈ semanas) renderiza espécies distintas (neutro=Gosminha → aprender=Cristal, sentimentos=Felino, criar=Inseto, superação=Dragão). +20 testes; 6729→6749.

## Não-objetivos (YAGNI agora)

- Não desenhar um ovo literal no estágio 0 (só a forma mais minimalista da criatura).
- Não reescrever o `VisualImpact` das mutações (faço a ponte, não a migração).
- Não mexer no `Mascot2D` legado (fallback sem DNA).
- Não acelerar o drift de hábito (calibração de gameplay fica pra Fase 2).

## Riscos

- Animação SVG não é unit-testável → separar DECISÃO pura (testável) do MECANISMO reanimated (verificado no DOM via Playwright), como na feature de animação (commit `e9bde63`).
- Revelar traços pode deixar a criatura "pelada" em estágio baixo → garantir que orelhas/corpo/rosto/membros sempre apareçam.
