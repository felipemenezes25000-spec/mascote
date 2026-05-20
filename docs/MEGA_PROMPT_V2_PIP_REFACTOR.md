# Mega-prompt — Pip/Mascote v2.0 (colar no Cursor / Claude Code)

> **Contexto:** App Expo 51 + RN em `app/mobile/`. Conceito forte (criatura procedural + autocuidado). Este prompt consolida auditoria de produto, UX, design system e execução técnica. Trabalhe **em commits pequenos**; não refatore tudo de uma vez.

---

## Papel da IA

Você é tech lead + product designer sênior. Objetivo: transformar o Mascote/Pip no **melhor app de wellness com mascote procedural** do mercado brasileiro — sem perder o tom acolhedor, sem paywall predatório, sem UI “inacabada”.

**Regras invioláveis:**
1. Tom de voz: acolhedor, leve, nunca culpabilizante, nunca clínico/diagnóstico.
2. Português BR. Copy curta na UI.
3. Zero `console.warn` em web (nested buttons, shadow*, pointerEvents prop).
4. Tudo user-facing usa `emergentPhaseLabels` + arquétipos reais (`lumina`, `terra`, `aqua`, `cosmos` de `archetypeAffinity.ts`) — **nunca** `phaseLabels` legado (“Bebê”, “Ovo”) na UI.
5. Free tier deve **entregar valor emocional** antes de pedir Plus.
6. Manter testes verdes: `npm run test:security`, `npm test`, `npm run typecheck`.

---

## Diagnóstico (estado atual — validar no código)

### Notas (0–10)

| Camada | Nota | Por quê |
|--------|------|---------|
| Conceito | 9 | Criatura única + hábitos gentis + identidade procedural |
| Visual / UI | 7,5 | Paleta âmbar coesa (`themes.ts`); mascote 3D ainda polível; header denso |
| UX / fluxo | 7 | Loop check-in claro; Relatório parece vazio no free; 9 hábitos na Home = carga |
| Monetização | 6 | Heatmap 12 semanas atrás de `PremiumFeatureGuard` cedo (`report.tsx`) |
| Engenharia | 8 | 1500+ testes, safety, DNA privacy, local-first |

### Assinaria Plus?

**Sim, com ressalvas** — pelo vínculo emocional com o Pip e pelo conceito. **Não** no D1 se o Relatório mostrar só paywall. Preciso de 2–3 semanas vendo evolução visível + chat útil + heatmap 7 dias grátis.

### Bugs / dívidas confirmadas no repo

- [x] Nested `<button>` — corrigido em `HomeQuickActions` + `QuickActionCard` (revalidar com hard refresh web).
- [ ] Copy dupla: `HomeHero` usa arquétipo OU `emergentPhaseLabels`; `index.tsx` ticker ainda usa `phaseLabels` (“Bebê”).
- [ ] `ModalShell` / `EvolutionRevealModal`: `pointerEvents` como prop (migrar para `style`).
- [ ] Card do mascote: gradiente creme da cena `room` em `SceneBackground.tsx` (quadro `primarySoft`) pode parecer “retângulo bege vazio” — redesenhar cena ou mascote centralizado sem dead zone.
- [ ] Saudação truncada em mobile estreito — `HomeHeader` greeting 26px na mesma linha que pills.
- [ ] Relatório free: banner “Ver Plus” + heatmap bloqueado = sensação de app incompleto.
- [ ] Chat: chips de sugestão só com `<6` msgs — OK, mas falta agrupamento por dia mais evidente e estado “digitando” mais visível no free.

---

## FASE 0 — Fundação (tokens já existem, consolidar)

**Fonte de verdade hoje:** `app/mobile/src/lib/themes.ts` + `useTheme.ts`.

### Ação

1. Criar `app/mobile/src/theme/tokens.ts` que **re-exporta e estende** `Theme` — não duplicar cores à mão.
2. Adicionar aliases semânticos documentados:

```ts
// Exemplo de mapa (implementar em tokens.ts)
export const semantic = {
  surface: { 0: 'bg', 1: 'surface', 2: 'surface2' },
  text: { primary: 'text', secondary: 'textSecondary', tertiary: 'textDim' },
  brand: { 500: 'primary', 600: 'primaryDeep', 100: 'primaryTint' },
  state: { success: 'positive', danger: 'danger', info: 'info' },
} as const;
```

3. `grep` por hex hardcoded em `src/` (ex.: `#fff` em `report.tsx` bigBtn) → substituir por `theme.colors.*`.
4. Garantir sombras só via `theme.shadow.*` / `makeShadow()` — nunca `shadowColor` solto no web.

**Definition of done:** `npm run typecheck` verde; Storybook opcional depois.

---

## FASE 1 — Copy & identidade unificada (1–2 dias)

### Arquivos obrigatórios

| Arquivo | Mudança |
|---------|---------|
| `app/(tabs)/index.tsx` | `PersonalTicker`: `phaseLabels` → `emergentPhaseLabels` |
| `features/home/components/HomeHero.tsx` | Pill sempre: `nv {level} · {ArchetypeLabel} {pct}%` quando DNA existe; fallback procedural |
| `features/home/components/HomeStatsBars.tsx` | Trocar “próxima forma” por linguagem procedural consistente |
| `app/profile.tsx` | Auditar `phaseLabels` |
| `lib/phaseLabels.ts` | Marcar `phaseLabels` como `@deprecated` JSDoc; ESLint ban opcional |

### Voice guide (criar `app/mobile/src/copy/voice.ts`)

```ts
export const voice = {
  do: ['Tô aqui no seu ritmo', 'Sem pressa', 'Cuide de você'],
  dont: ['Você falhou', 'Faça agora', 'Diagnóstico', 'Obrigatório'],
  pip: { name: 'companheiro digital', not: 'terapeuta' },
};
```

**DoD:** Nenhuma tela principal mostra “Bebê/Ovo/Criança” como status do Pip.

---

## FASE 2 — Home: menos ruído, mais foco (3–5 dias)

### Problema

Home (`index.tsx`) empilha: header denso + ticker + banner + hero + missão + 9 hábitos + stats + daily reward + combo + mission card + links.

### Solução (composição alvo)

```
HomeHeader (2 linhas responsivas)
PersonalTicker (opcional, colapsável)
HomeBanner (noturno — max 1x/dia, dismiss)
HomeHero (Pip full-width, sem dead zone lateral)
PrimaryActionCard (1 CTA principal)
CareActionGrid (5 visíveis + “Ver mais” sheet)
StatInline (check-ins · streak · nv — 1 linha)
EnergyXpRow (compacto)
DailyRewardStrip (colapsado se já claimou)
```

### Tarefas técnicas

1. **`HomeHeader` refactor**
   - Linha 1: logo pequeno + greeting truncado com `numberOfLines={1}` + sino.
   - Linha 2: `Olá, {nome}` display + `WalletPills` compacto (chip único “170 · 15% · 🔥2” expansível).
   - Remover brand duplicado em viewport < 400.

2. **`CareActionGrid`** (novo em `features/home/components/`)
   - Props: `pinned: HabitKind[]`, `maxVisible: 5`, `onLongPress` → sheet config.
   - Tile 72×88, ícone + label + contador `3×`.
   - “+ Ver mais” abre bottom sheet com os 9 hábitos.

3. **`SceneBackground` room**
   - Centralizar mascote; reduzir quadro vazio à esquerda OU mascote overlap no quadro.
   - Alternativa: cena `bedroom` default à noite, `room` de dia.

4. **`Mascot3DLazy`**
   - Skeleton com shimmer da cor `primaryTint`, não bloco bege estático.

**DoD:** Home scroll < 2.5 telas em iPhone SE; zero horizontal overflow; screenshot antes/depois.

---

## FASE 3 — Relatório: valor free antes do Plus (2 dias)

**Arquivo:** `app/(tabs)/report.tsx`

### Mudança de produto (obrigatória)

| Free | Plus |
|------|------|
| Heatmap **4 semanas** completo | Heatmap **12–84 semanas** |
| 1 insight textual/semana (“você apareceu 4 dias”) | Insights narrativos + export |
| Top hábitos + KPIs | Relatório narrativo completo sem guard |

### Implementação

1. `Heatmap` aceitar prop `weeks={4}` no free, `weeks={12}` no plus.
2. Substituir banner agressivo por card inline: “Quer ver 12 semanas? Plus” **abaixo** do heatmap 4w, não no lugar dele.
3. Remover sensação de tela vazia: adicionar card “Insight da semana” sempre (texto gerado local de `weeklyReportGenerator` lite).

**DoD:** Usuário free sai com sensação de progresso, não de bloqueio.

---

## FASE 4 — Chat: profundidade percebida (2–3 dias)

**Arquivo:** `app/(tabs)/chat.tsx`

### Melhorias

1. Header: “{personality} · {X} msgs restantes hoje” só no free — tom neutro.
2. Lista: agrupamento por dia com label sticky (“Hoje”, “Ontem”).
3. `TypingIndicator` visível durante `generateReply`.
4. Chips de sugestão: manter até 6 msgs, depois botão “Sugestões” que expande.
5. Long-press na bolha do Pip → menu útil/repetiu/não ajudou (já existe rating — tornar discoverable).

**DoD:** Conversa de 15+ mensagens legível sem parecer demo.

---

## FASE 5 — Design System (componentes — 1–2 semanas)

Criar `app/mobile/src/components/ds/` **sem quebrar** imports antigos — re-export gradual.

### Prioridade de implementação

| # | Componente | Substitui |
|---|------------|-----------|
| 1 | `Button` | já existe em `components/Button.tsx` — alinhar variantes ao spec |
| 2 | `Card` | `components/Card.tsx` — `overflow: hidden` default |
| 3 | `Chip` | moods + filtros |
| 4 | `Banner` | `HomeBanner`, preview report |
| 5 | `StatInline` | `HomeStatsBars` parcialmente |
| 6 | `Sheet` | `@gorhom/bottom-sheet` para hábitos/mood |
| 7 | `Bubble` | extrair de chat |
| 8 | `PipAvatar` | wrapper sobre `Mascot` + props traits |

### Spec `PipAvatar` (wrapper)

```tsx
interface PipAvatarProps {
  size?: number;
  dna: MascotDNA;
  mood?: MascotMood;
  phase: MascotPhase;
  showSpeechBubble?: boolean;
  speechText?: string;
  reduceMotion?: boolean;
}
```

Delega para `Mascot` existente; adiciona bubble + layout sem dead zones.

---

## FASE 6 — Mascote 3D polish (paralelo)

**Arquivos:** `components/mascot-3d/*`, `lib/dna/palette.ts`, `morphology.ts`

Checklist visual:
- [ ] Paleta wellness (pêssego/minta) — já iniciado em `palette.ts`
- [ ] Menos facetas (`bodyFlatShading` só chaos > 0.88)
- [ ] Olhos: pupila menos neon, esclera sem emissive forte
- [ ] Aura: menos partículas (`auraParticleCount` reduzido)
- [ ] Web: fallback 2D elegante se WebGL falhar (`Mascot3DBoundary`)

---

## FASE 7 — Acessibilidade & motion (contínuo)

1. `AccessibilityInfo.isReduceMotionEnabled()` em `MascotAmbient`, `Creature`, `StaggeredView`.
2. Contraste: `textDim` sobre `bg` dark — validar AA (mín 4.5:1).
3. `accessibilityLabel` PT em todos os `Pressable` da Home e Chat.
4. Foco teclado web: outline visível em chips (CSS).

---

## FASE 8 — Monetização ética

**Arquivos:** `EntitlementService.ts`, `paywall-triggers.ts`, `PremiumFeatureGuard.tsx`

| Feature | Free | Plus |
|---------|------|------|
| Heatmap | 4 semanas | 12+ semanas |
| Chat | 10/dia (atual) | ilimitado |
| Cenas premium | preview 1x | todas |
| Relatório narrativo | 1x/mês teaser | ilimitado |
| Trial | 7 dias heatmap full | — |

Paywall copy: benefício claro, nunca “desbloqueie o que já estava aí”.

---

## Ordem de commits sugerida (copiar checklist)

```
[ ] fix: pointerEvents em ModalShell + EvolutionRevealModal
[ ] fix: unificar copy phaseLabels → emergentPhaseLabels na Home
[ ] feat: CareActionGrid 5+sheet na Home
[ ] feat: HomeHeader 2 linhas responsivo
[ ] feat: report heatmap 4w free + insight card
[ ] feat: chat day groups + typing polish
[ ] refactor: ds/Chip + ds/Banner
[ ] polish: SceneBackground room layout + Pip centering
[ ] docs: CHANGELOG v2.0 copy
```

---

## Prompt único para colar (versão curta)

```markdown
Refatore o app Mascote (Expo 51, pasta app/mobile) para v2.0 premium wellness.

Prioridades nesta ordem:
1. Unificar copy: só emergentPhaseLabels + arquétipos lumina/terra/aqua/cosmos na UI (remover phaseLabels "Bebê/Ovo" de index.tsx ticker e telas).
2. Home: header 2 linhas, CareActionGrid 5 hábitos + sheet, corrigir dead zone bege no card do mascote (SceneBackground room + centralizar Mascot).
3. Relatório: heatmap 4 semanas grátis + insight semanal; Plus = 12 semanas (não tela vazia com só paywall).
4. Chat: agrupar por dia, typing visível, sugestões colapsáveis após 6 msgs.
5. Zero warnings web: sem nested buttons, shadow* só via theme.shadow, pointerEvents no style.
6. Tokens: zero hex solto em TSX — usar theme via useTheme/useStyles.
7. Manter npm test + test:security verdes.

Tom: acolhedor PT-BR, sem culpa, sem diagnóstico. Commits pequenos com screenshot antes/depois por fase.
```

---

## Métricas de sucesso (90 dias)

| Métrica | Meta v2 |
|---------|---------|
| D1 retenção | ≥ 50% cohort onboarding |
| D7 | ≥ 28% |
| Conversão Plus (D30) | ≥ 8% dos ativos |
| NPS | ≥ 35 |
| Crash-free | ≥ 99.5% |
| Console warnings web | 0 |

---

## Changelog sugerido (quando lançar)

> “Cuidei do Pip por dentro. Agora ele respira melhor, fala mais leve e te escuta com mais espaço. Algumas coisas você vai sentir sem perceber — outras vai descobrir aos pouco, no seu ritmo. Tô aqui.”

---

*Gerado a partir de auditoria do repositório mascote — 2026-05-20.*
