# Living Identity Design — Manifesto

> "O app não tem mascote dentro dele. O app **é** o habitat do mascote."

Living Identity Design é o sistema visual que conecta DNA, gestos, evolução,
chat, missões e paywall em uma única experiência coerente. Surgiu em 2026-05
para sair do "app de hábitos com mascote dentro" e ir pra **criatura viva
digital cujo habitat o usuário visita todo dia**.

---

## Princípios invioláveis

1. **Mascote é protagonista visual.** Toda tela "central" abre com `CreatureHero`.
   Nunca dashboard antes da criatura.
2. **Orgânico, não fintech.** Cantos `radius.lg` (22px), nunca `0`. Bordas
   sutis em cor de palette, nunca cinza neutro.
3. **Paleta DNA-driven.** Cores derivam do `paletteFromGenome(dna)` quando
   contextualmente fizer sentido. Fallback: paleta de tema atual.
4. **Tokens, sempre.** `theme.spacing.*`, `theme.radius.*`, `theme.shadow.*`,
   `theme.colors.*`, `theme.tokens.{emotion,semantic,...}`. Sem hex inventado
   em telas. Sem `padding: 12`.
5. **Tipografia via Typography.** `<Text>` cru em telas vira `<Typography
   variant="...">`. Variants: `display | title | heading | body | bodyBold |
   caption | mono`.
6. **Reação, não notificação.** Quando algo importante acontece, o mascote
   **reage** (animation + CreatureReactionToast com presença visual), em vez
   de toast de sistema. Use `creatureMoments.emit(...)`.
7. **Sem culpa, sem cobrança.** Travado pelo G2 das guarantees — copy nunca
   pode acusar/punir. Reativo, gentil, paciente.

---

## Stack visual

| Camada | O que faz | Onde mora |
|---|---|---|
| Mascote (3D + 2D fallback) | Renderer procedural derivado do DNA | [`src/components/Mascot3D.tsx`](../app/mobile/src/components/Mascot3D.tsx) + [`mascot-3d/*`](../app/mobile/src/components/mascot-3d/), [`Mascot2D.tsx`](../app/mobile/src/components/Mascot2D.tsx) |
| Marca (logo) | Silhueta orgânica DNA-tinted | [`BrandLogo.tsx`](../app/mobile/src/components/BrandLogo.tsx) |
| Primitives orgânicos | Cards, headers, progress, toast | [`src/components/ui/*`](../app/mobile/src/components/ui/) |
| Tokens | Cores, spacing, radius, shadow, typography | [`src/lib/themes.ts`](../app/mobile/src/lib/themes.ts) |
| Eventos do mascote | Bus pub/sub semântico | [`src/lib/moments/`](../app/mobile/src/lib/moments/) |

---

## Novos primitives (criados 2026-05-20)

### `SectionHeader`

Título + subtitle padronizado de seção. Sempre usa `theme.spacing.md` + tipografia
do tema. Slot trailing pra "Ver tudo".

```tsx
<SectionHeader
  title="Memórias"
  subtitle="O que o seu mascote lembra"
  trailing={<Pressable onPress={...}><Typography variant="caption">Ver tudo</Typography></Pressable>}
/>
```

### `LivingCard`

Card orgânico. Tons: `neutral | warm | calm | celebrative | glass`. Borda sutil
em palette atual, sombra `theme.shadow.sm`, radius `lg`. Opcional `onPress`
vira Pressable acessível.

```tsx
<LivingCard tone="celebrative" highlighted onPress={openMission}>
  <Typography variant="heading">Missão do dia</Typography>
  <Typography variant="body" tone="secondary">3 minutos de respiração</Typography>
</LivingCard>
```

### `ProgressPulse`

Progress bar viva. Cor deriva de `mood`. `pulse=true` adiciona piscada
respiratória (Reanimated, respeita reduceMotion). `glow=true` adiciona
shadow externo (uso em streak milestones).

```tsx
<ProgressPulse value={streak / 30} mood="feliz" pulse glow />
```

### `CreatureHero`

Wrapper de topo de tela. Centraliza o mascote, halo decorativo opcional, e
linha contextual ("Bipo está calmo hoje"). Substitui o costume atual de
espalhar `<View>` + texto por todas as telas.

```tsx
<CreatureHero
  caption="Você voltou. Que bom."
  hint="Bipo te esperou no canto, sem pressa."
>
  <Mascot3D dna={dna} mood={mood} size={220} />
</CreatureHero>
```

### `CreatureReactionToast`

Toast que parece vir do mascote, não do sistema. Kinds: `celebrate | gentle |
memory | milestone`. Cada um usa accent diferente dos tokens.

```tsx
<CreatureReactionToast
  message="Bipo ganhou olhar mais profundo"
  hint="20 dias de journaling te deram isso."
  icon="✨"
  kind="celebrate"
/>
```

---

## CreatureMomentService — o ligante invisível

O bus de moments é o que **conecta** todas as 10 áreas do briefing (check-in,
hábito, chat, missão, mutação, streak, customização, scene). Substitui a
fiação ad-hoc atual.

### Como emitir

```tsx
import { creatureMoments } from '@/lib/moments';

// Em checkin.ts, após pipeline completar:
creatureMoments.emit('habit.water', { intensity: 1 });
creatureMoments.emit('checkin.completed', { habit: 'water', xpGained: 19 });

// Em mutations.ts, após desbloquear:
creatureMoments.emit('mutation.unlocked', {
  mutationId: 'mut.deep_eyes',
  rarity: 'rare',
});
```

### Como reagir

```tsx
import { creatureMoments } from '@/lib/moments';
import { useEffect } from 'react';

useEffect(() => {
  return creatureMoments.on('mutation.unlocked', (moment) => {
    // Anima Mascot3D
    mascotRef.current?.celebrate();
    // Mostra toast
    enqueueToast({
      kind: 'celebrate',
      icon: '✨',
      message: `Nova mutação: ${describeMutation(moment.payload.mutationId)}`,
    });
    // Salva memória
    rememberMutation(moment.payload);
    // Trackeia
    analytics.track('mutation_unlocked', moment.payload);
  });
}, []);
```

### Moments catálogo

| Categoria | Moments |
|---|---|
| Check-in | `checkin.completed`, `habit.water`, `habit.sleep`, `habit.exercise`, `habit.meditation`, `habit.reading`, `habit.breath`, `habit.outdoor`, `habit.sun`, `habit.journaling` |
| Chat | `chat.memory_saved`, `chat.reply_received` |
| Engajamento | `mission.completed`, `streak.milestone`, `streak.recovered` |
| Evolução | `mutation.unlocked`, `phase.advanced`, `microevolution.observed` |
| Mundo | `customization.changed`, `scene.changed`, `accessory.equipped` |
| Retorno | `user.returned` |

Catálogo completo em [`src/lib/moments/types.ts`](../app/mobile/src/lib/moments/types.ts).

---

## O que foi REFEITO nesta sessão

| Item | Antes | Depois |
|---|---|---|
| `BrandLogo` | Robô laranja com face plate, parafusos | Silhueta orgânica (gota luminescente + olho único + aura). DNA-tinted via tema. |
| `Mascot2D` | Sem awareness de DNA, paleta vem só de personality | Aceita `dna` opcional; paleta deriva de `paletteFromGenome` (paridade com 3D). |
| `Tail.tsx` (3D) | Bug: multiplicador `segs.length` esticava cauda 8x fora da câmera | Removido o multiplicador errado. |
| Sistema de cards | `<View>` + estilo manual em cada tela | `<LivingCard>` com tons + tokens |
| Progress bars | Cinza neutro | `<ProgressPulse>` mood-driven |
| Toasts | Sistema genérico | `<CreatureReactionToast>` vindo "do mascote" |
| Reações cross-cutting | Cada handler fia analytics + animation + memory separado | `creatureMoments.emit('habit.water', ...)` — múltiplos handlers reagem em paralelo |

---

## O que NÃO foi feito (precisa device + Figma + iteração)

Honesto e explícito — listo o que **PRECISA** acontecer pra fechar a visão
"Living Identity Design" mas exige design tool + dispositivo real:

### 🔴 Redesign visual das telas principais

- **Home** ainda é o "dashboard atual". Os primitives existem (CreatureHero,
  LivingCard, ProgressPulse), mas o **layout** das telas não foi tocado —
  redesign visual de Home/Chat/Evolução/Ateliê exige Figma + iteração no
  device.

### 🔴 Ateliê do Mascote

- `app/customize.tsx` ainda é "lista seca de configurações". Visão de Ateliê
  com abas (Corpo / Estilo / Mundo / Alma), preview live, halo de reação —
  exige redesign de UX.

### 🔴 Evolução como Biografia Viva

- `app/(tabs)/evolution.tsx` é técnica demais. Transformar em narrativa
  ("Sua aurora ficou mais limpa por causa da água") exige composição de copy
  + visual + dados ML — sessão dedicada.

### 🔴 Reação visual em cada ação

- A camada `CreatureMomentService` existe e os primitives existem, mas
  **WIRING dos call sites** (substituir o código atual de check-in por
  `creatureMoments.emit(...)`) precisa de auditoria caso-a-caso pra não
  quebrar testes existentes.

### 🟡 Débito visual (102 hex hardcoded em 13 arquivos)

- `SceneBackground.tsx` (52 hex) — provavelmente legítimo (cenas têm cor própria
  intencional), mas vale revisar
- `EvolutionModal.tsx` (14 hex), `PhenotypeRenderer.ts` (12 hex) — alvos diretos
- Run `npm run audit:visual` pra ver o relatório atualizado
- Doc completo: [`docs/VISUAL_DEBT.md`](VISUAL_DEBT.md)

### 🟡 Text cru nas telas

- 479 ocorrências de `<Text>` em `app/`. Muitas legítimas (TextInput, partes
  internas), mas há trabalho real de migração pra `Typography`. Audit
  identifica top ofensores.

---

## Como usar este sistema dia-a-dia

### Quando você escreve uma tela nova

```
✅ Use ScreenShell se existir, senão estruture com SafeAreaView + tokens
✅ Abra com <CreatureHero> se for tela "central de habitat"
✅ Use <LivingCard tone="..."> pra cada bloco — nunca View+style inline
✅ Use <Typography variant="..."> em vez de <Text>
✅ Use <ProgressPulse mood={...}> pra progresso
✅ Use <SectionHeader> pra agrupar seções
✅ Emita creatureMoments quando algo importante acontecer
❌ Não defina cor com hex literal
❌ Não defina padding/margin com número mágico
❌ Não use Toast de RN — use CreatureReactionToast (com fila externa)
```

### Quando você toca em copy

- Rode `npm run test:guarantees` antes de commit
- G2 bloqueia termos punitivos em `replies.ts` e `safety.ts`
- G4 bloqueia copy de paywall com pressão

### Quando você toca em DNA/morfologia

- Rode `npm run test:guarantees` (G1)
- Garante: criatura única, drift visível, decay não pune

---

## Comandos

```powershell
# Auditar débito visual atual
npm --prefix app/mobile run audit:visual > docs/VISUAL_DEBT.md

# Garantias das promessas de produto (inclui copy)
npm --prefix app/mobile run test:guarantees

# Componentes Living Identity (smoke + tokens)
npm --prefix app/mobile test tests/components/living-identity.test.tsx

# Moments bus
npm --prefix app/mobile test tests/lib/moments/

# Mascot2D paridade DNA
npm --prefix app/mobile test tests/components/mascot2d-dna.test.tsx
```

---

## Onde isso vai

O que foi entregue aqui é **a fundação**. Os primitives existem, o bus de
moments existe, a marca foi resetada, o fallback 2D não é mais robô laranja
genérico. O próximo passo é **wiring** — usar o sistema em todas as telas.
Esse trabalho é prazo de 2-4 semanas iterando no device (não em vitest).

**Métrica de sucesso:** quando o audit `npm run audit:visual` retornar < 20 hex
hardcoded e < 100 `<Text>` cru em telas, sabemos que o Living Identity
Design **chegou em produção**.
