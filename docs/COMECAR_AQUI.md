# Mascote — começar aqui

Felipe, bom dia. App **totalmente alinhado ao handoff de design**. Trinta e tantas telas, 5 paletas, 3 temas, fontes oficiais, roda da sorte, customize completa.

## Pra ver agora

```powershell
cd C:\Users\Felipe\Documents\mascote\app\mobile
npx expo start --web
```

Abre `http://localhost:8081`. Aguarda ~15s pra carregar fontes Google.

## O que mudou desde a última revisão (tudo do handoff)

### Identidade
- ✅ **Logo PNG oficial** importada pra `assets/logo-mascote.png`
- ✅ **4 fontes Google carregadas** via expo-font: Quicksand, Instrument Serif, Plus Jakarta Sans, JetBrains Mono
- ✅ **5 paletas de laranja trocáveis em runtime**: Classic, Pôr-do-sol, Pêssego, Coral, Sol
- ✅ **3 temas**: Claro, Sépia, Escuro — funcionando em todas telas via `useTheme()` reativo

### Telas novas (15+)
- ✅ `/splash` — splash com logo e tagline, redireciona em 1.4s
- ✅ `/signup` — separado do welcome
- ✅ `/onboarding/age` — bloqueio <16
- ✅ `/onboarding/goal` — escolher objetivo
- ✅ `/onboarding/mood` — humor atual
- ✅ `/onboarding/mascot` — escolher mascote visualmente (alternativo ao quiz)
- ✅ `/onboarding/meet` — conhecer o mascote com bubble de fala
- ✅ `/onboarding/push` — pedir push notifications
- ✅ `/onboarding/notice` — aviso wellness + CVV 188
- ✅ `/customize` — 6 tabs (Mascote/Acessório/Cenário/Humor/Paleta/Nome)
- ✅ `/rewards` — **Roda da Sorte 8 fatias com spin animado** (cubic-bezier 3.5s) + caixa surpresa
- ✅ `/checkin` — check-in dedicado em 4 passos
- ✅ `/checkin-result` — resultado com narrativa do mascote
- ✅ `/mission` — detalhe da missão
- ✅ `/mission-done` — celebração com confete
- ✅ `/evolution` — tela dedicada de evolução
- ✅ `/streak` — detalhe completo (marcos, folgas, como funciona)
- ✅ `/inventory` — coleção (acessórios + cenários + conquistas)
- ✅ `/subscription` — assinatura ativa com planos Basic/Plus
- ✅ `/cancel` — pausar/cancelar com fluxo humanizado (oferece pausa antes)
- ✅ `/feedback` — NPS + comentário
- ✅ `/safety` — recursos de crise dedicados (CVV/SAMU clicáveis)

### Sistema de gamificação completo
- ✅ **Moedas 🪙 + Gemas 💎** com pílulas no header
- ✅ **Daily Reward D1-D7** escalando (10→15→25→40→60→80→150 + gems em D5/6/7)
- ✅ **Caixa surpresa** 1×/dia com 5 drops aleatórios + confete
- ✅ **Roda da sorte** 8 fatias, 1 giro/dia, animação cinematográfica
- ✅ **Combo multiplier ring** (componente disponível em `ComboRing.tsx`)
- ✅ **Bônus de streak** +50 XP +1 gem a cada 7 dias
- ✅ Cenários ilustrados em SVG (6: room/forest/beach/library/lunar/cafe)
- ✅ 7 acessórios oficiais renderizados em SVG (cap/glasses/bow/scarf/flower/headphones/crown)
- ✅ 17 conquistas
- ✅ 8 eventos sazonais

### Sistema de temas reativo
- `src/lib/themes.ts` — definições de Light/Sepia/Dark × 5 paletas
- `src/lib/useTheme.ts` — hook que lê settings.theme_mode + settings.brand_palette
- **`'system'` resolve via `useColorScheme()` do RN** — pega dark/light do SO
- `useStyles(makeStyles)` — helper pra StyleSheet reativo
- **High contrast** funcional (toggle em Configurações → Aparência)
- Trocar tema em **Customize → Paleta** ou **Configurações** — aplica em runtime sem reload

### Logo oficial integrada
- `src/components/BrandLogo.tsx` — SVG convertido do handoff (gemini-svg)
- Visível em: **Splash** (200px + wordmark "mascote" em Quicksand 700)
- **Welcome** (180px + wordmark)
- **Header da Home** (42px ao lado do greeting)
- Disponível como `<BrandLogo size={N} shadow={true|false} />`

### Combo multiplier
- `src/components/ComboRing.tsx` — ring SVG animado (pulse contínuo) com gradient laranja→dourado
- Persistido em `combo` table (decaimento após 24h)
- **Incrementa em cada check-in (×1 → ×5)**, adiciona 25% de XP por nível
- Aparece na home entre missão e XP bar, ao lado do **Event Card** ("Forma Aurora termina em 2d 14h")

### Tab bar glass effect
- **Web**: backdrop-filter CSS blur(20px) saturate(180%) com transparência adaptativa por tema
- **Nativo**: `BlurView` do `expo-blur` com `tint={isDark ? 'dark' : 'light'}` intensity 75
- Tabs flutuantes (position absolute) com sombra suave

### Fontes oficiais aplicadas
- **h1, h2** → Instrument Serif (toque editorial humano)
- **h3, body, bodyBold, sm** → Plus Jakarta Sans
- **xs (rótulos uppercase)** → JetBrains Mono com letterspacing
- **brand** → Quicksand 700
- **serif italic** → Instrument Serif Italic

### Mais bugs corrigidos
- **Trocar personalidade agora reseta missão do dia** (vai gerar nova alinhada com nova personalidade)
- **Anti-pattern emocional na IA**: detecta "te amo", "você é minha única amiga", "preciso de você pra viver" → resposta encorajando vínculos humanos sem ser frio

### Loja básica funcional
- Em **Closet**: acessórios e cenários bloqueados agora podem ser **comprados com moedas** (preços 80-300 🪙)
- Buy via wallet.spend() → unlock automático → pode equipar

### Streak Freeze manual
- Em **/streak**: card de "Streak Freeze" com botão "Comprar (50 🪙)"
- Cap de 5 freezes simultâneos
- Cada freeze permite pular 1 dia sem perder streak

### Tour pós-onboarding
- Modal de 4 passos overlay na primeira abertura da Home
- Mostra: mascote, check-in (toque/segurar), missão, gameplay
- Persistido via `settings.tour_completed`
- Botão "pular" disponível

### Import / restore JSON
- Em **Configurações → Privacidade e dados**:
  - **Exportar dados (JSON)** — mostra no console F12
  - **Importar dados (JSON)** — cola JSON exportado anteriormente, sobrescreve tudo
- Confirma 2× antes de aplicar (destrutivo)
- Redireciona pra splash pra reidratar

### Personalidades oficiais
- Bipo (Calmo, sage 🌿)
- Zip (Motivador, laranja 🔥)
- Lulu (Fofo, coral 💕)
- Aro (Sábio, lilás 🔮)

### Fluxo de onboarding (novo)
```
splash → welcome → signup → age → goal → mood → mascot → meet → name → push → notice → home
                                                              ↑
                                                          quiz (alternativo)
                                                              ↑
                                                          personality (atalho rápido)
```

## Roteiro de teste (15 min)

1. **Splash** carrega com fontes oficiais
2. **Welcome** → "Começar" → **Signup**
3. **Signup**: nome → "Continuar"
4. **Age**: faixa etária
5. **Goal**: objetivo
6. **Mood**: humor atual
7. **Mascot picker** (cards visuais com cada mascote em SVG)
8. **Meet**: o mascote escolhido aparece com bubble
9. **Name**: nomear mascote
10. **Push**: pedir push (sim/não)
11. **Notice**: aviso wellness + CVV → "Entendi"
12. **Home**: cenário ilustrado, mascote no centro, daily reward strip, missão, caixa surpresa, ticker
13. **Aba Você** → ⚙️ **Configurações** ou **Customize** → muda **Paleta** pra Coral → app inteiro fica coral em runtime
14. **Customize → Tema → Escuro** → tudo escuro
15. **Quick action Closet** → ver acessórios desbloqueados/bloqueados
16. **Rewards** (via Customize ou link) → **Roda da Sorte** → gira → drop
17. **Inventory** → ver tudo desbloqueado
18. **Streak detail** → marcos futuros
19. **Subscription** → ver planos Basic/Plus
20. **Safety** → ligar pro CVV/SAMU (testar Linking)

## Arquitetura

```
app/
├── _layout.tsx              ← carrega fontes + theme reativo + 20+ rotas
├── splash.tsx               ← novo
├── signup.tsx               ← novo
├── onboarding/
│   ├── welcome / age / quiz / personality / name (antigos)
│   ├── goal / mood / mascot / meet / push / notice (novos)
├── (tabs)/
│   ├── index.tsx            ← Home com tudo do handoff
│   ├── chat.tsx
│   └── you.tsx
├── customize.tsx            ← 6 tabs
├── rewards.tsx              ← roda da sorte
├── closet.tsx
├── settings.tsx
├── weekly-report.tsx
├── achievements.tsx
├── notifications.tsx
├── inventory.tsx            ← novo
├── streak.tsx               ← novo
├── evolution.tsx            ← novo
├── checkin.tsx              ← novo
├── checkin-result.tsx       ← novo
├── mission.tsx              ← novo
├── mission-done.tsx         ← novo
├── subscription.tsx         ← novo
├── cancel.tsx               ← novo
├── feedback.tsx             ← novo
├── safety.tsx               ← novo
├── paywall.tsx
├── share.tsx
├── privacy.tsx
└── terms.tsx
src/
├── lib/themes.ts            ← Light/Sepia/Dark × 5 paletas
├── lib/useTheme.ts          ← hook + useStyles helper
├── components/
│   ├── Mascot.tsx           ← robô-laranja paramétrico
│   ├── SceneBackground.tsx  ← 6 cenários SVG
│   ├── WalletPills.tsx
│   ├── DailyRewardStrip.tsx
│   ├── MysteryBoxCard.tsx
│   ├── ConfettiBurst.tsx
│   ├── ComboRing.tsx        ← novo
│   ├── LiveTicker.tsx
│   ├── ... (HabitChip, MissionCard, ChatBubble, XPBar, StreakFlame, Heatmap, HabitChart, EvolutionModal, UnlockToast, NotificationBell, etc)
assets/
└── logo-mascote.png         ← logo oficial do handoff
```

## Como o sistema de temas funciona

1. Setting `theme_mode` ('light'|'sepia'|'dark'|'system') no banco local
2. Setting `brand_palette` ('classic'|'sunset'|'peach'|'coral'|'sun') no banco
3. `useTheme()` lê do Zustand store e retorna o Theme correto
4. `useStyles(makeStyles)` memoiza o StyleSheet por theme
5. Componentes re-renderizam quando user troca em **Customize**

## O que falta (próximas fases — não escopo dessa sessão)

- Animações Rive/Lottie pro mascote
- Push notifications nativos (expo-notifications precisa de Apple Dev account)
- Cobrança real RevenueCat
- Backend Supabase
- Tutorial interativo pós-onboarding
- High contrast mode (toggle salva mas não aplica)

## Stack

Tudo já documentado. Plano detalhado em `plano_mascote/`.

Boa sorte. Cuida de você primeiro.
