# Sistema de tokens — guia rápido

> Este documento é fonte de verdade pra **como cores entram no código**.
> Se um componente usa `#hex` ou `rgba()` direto, ele está errado — abra um PR.

## Princípio

1. Componentes consomem tokens via `useTheme()`. Hex bruto vive APENAS em
   `themes.ts` e `prototipo-criatura-procedural.html` (artefato de design).
2. Tokens são organizados por **categoria semântica**, não por aparência.
   `theme.tokens.emotion.happy.fg` é correto; `theme.colors.gold` para
   "feliz" é errado (porque o significado some).
3. Theme **muda** (light/sepia/dark × 5 paletas). Tokens semânticos resolvem
   automaticamente o contraste correto.

## Estrutura

```ts
const t = useTheme();

// Surfaces (theme-aware)
t.colors.bg           // fundo principal
t.colors.surface      // card padrão
t.colors.text         // texto principal
t.colors.border       // borda padrão

// Brand (varia com paleta)
t.colors.primary      // CTA principal (laranja Mascote por padrão)
t.colors.primarySoft  // fundo soft de chips/highlights
t.colors.primaryDeep  // hover/active

// Tokens semânticos (não muda com paleta — significado fixo)
t.tokens.emotion.happy.fg     // cor pra estado "feliz" do mascote
t.tokens.rarity.legendary.glow // halo de item lendário
t.tokens.archetype.guardiao.fg // cor primária do arquétipo Guardião
t.tokens.phase.ovo.bg          // fundo da fase Ovo
t.tokens.gamification.xp.fg    // cor de XP (gold)
t.tokens.semantic.positive     // verde sage (sucesso/check)
```

## Quando usar qual

| Categoria | Quando usar | Exemplo |
|-----------|-------------|---------|
| `colors.*` | Layout neutro (fundos, bordas, texto) | `View { backgroundColor: t.colors.bg }` |
| `colors.primary*` | CTA, brand visível | Botão "Cuidar agora" |
| `tokens.emotion.*` | Estado afetivo do mascote | Halo no Mascot quando happy |
| `tokens.rarity.*` | Drops, conquistas, itens | Badge "lendário" no closet |
| `tokens.archetype.*` | Hero/Evolução refletindo DNA | Background da aba Evolução |
| `tokens.phase.*` | Marcadores de fase | Strip de timeline da evolução |
| `tokens.gamification.*` | XP, streak, combo, moedas | Pills XPBar / WalletPills |
| `tokens.semantic.*` | Status genérico | Toast de erro, ícone de sucesso |
| `colors.success/warning/error` | Mensagens de sistema | Banners |
| `colors.moodTriste/...` | Histórico de mood (já mapeado a moods do journal) | Heatmap |

## Dark mode

Tokens semânticos NÃO mudam de cor entre light/dark — o sistema dá overlay/
mistura via `surface`/`bg`. Por isso `tokens.emotion.happy.fg` funciona em
qualquer modo, contanto que o `bg` esteja correto.

Cores que dependem do mode: tudo em `colors.*` que não é semântico (bg, surface,
text*, border*). Esses já são adaptados em `SURFACES`.

## Adicionando um token novo

1. Pense: "isso é categoria existente?". Se sim, adicione em `EMOTION_COLORS`,
   `RARITY_COLORS`, etc.
2. Se for categoria nova (ex.: "weather"), adicione um bloco em `themes.ts` e
   exponha em `theme.tokens.weather`.
3. Atualize esta tabela.
4. **Nunca** introduza hex direto em componentes.

## Sombra cross-platform

```ts
// CORRETO
{...t.shadow.md}

// ou via helper
{...makeShadow('#000', 0, 8, 16, 0.12, 4)}

// ERRADO (gera warning RN-web 0.19+)
{ shadowOffset: {...}, shadowOpacity: ... }
```

## Fonte e escala

```ts
// Tipos prontos (já respeitam textScale do user)
{...t.text.h1}    // título display
{...t.text.body}  // corpo

// Para custom: use t.text.body como base e sobrescreva fontSize via wrapper
```

A escala do usuário (`accessibility.dynamic_text`) é honrada via
`buildTheme(mode, palette, { textScale })`. Tela já recebe o multiplicador
via `useTheme()`. Não calcule escala manualmente em componente.
