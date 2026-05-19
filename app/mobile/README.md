# Mascote — app local

App de autocuidado gamificado rodando 100% local. Sem backend, sem cloud, sem chave de API obrigatória.

## Rodar agora

```powershell
cd app\mobile
npx expo start --web
```

Abre `http://localhost:8081` automaticamente. Aperta `w` no terminal se não abrir.

## Outras formas de rodar

**No celular (Expo Go):**
1. Instala o app **Expo Go** (App Store / Play Store)
2. `npx expo start`
3. Escanea o QR code com a câmera (iOS) ou pelo próprio Expo Go (Android)
4. Celular e PC precisam estar no mesmo Wi-Fi

**iOS Simulator (precisa Mac):** `npx expo start --ios`
**Android Emulator (precisa Android Studio):** `npx expo start --android`

## O que está funcionando

✓ Onboarding (3 telas) — escolhe personalidade e nomeia o mascote
✓ Home — mascote animado + 9 hábitos clicáveis + missão do dia
✓ XP, nível, fases do mascote (ovo → bebê → criança → adolescente → adulto → evoluído)
✓ Streak com 2 graces (folgas perdoadas)
✓ Chat com IA — modo mock por personalidade (Calmo, Motivador, Fofo, Sábio)
✓ Detector de safety (crise → CVV 188 sem chamar IA)
✓ Tela "Você" com stats da semana
✓ Paywall demo (sem cobrança real)
✓ Persistência local (AsyncStorage) — fecha o app, abre de novo, tudo lá
✓ Reset completo se quiser começar de zero

## Ligar IA real (opcional)

Sem chave: o chat usa respostas pré-escritas por personalidade — funciona pra sentir o app.

Com chave OpenAI:
1. Pega tua chave em https://platform.openai.com/api-keys (precisa cartão)
2. No app: aba **Você** → **Adicionar chave OpenAI**
3. Cola a `sk-...`
4. Pronto. Usa gpt-4o-mini (baratíssimo).

A chave fica só no teu dispositivo. Não é enviada pra lugar nenhum além da OpenAI.

## Arquitetura

```
app/mobile/
├── app/                         ← Expo Router (rotas)
│   ├── _layout.tsx              root + hidratação
│   ├── index.tsx                decide rota
│   ├── onboarding/              welcome → personality → name
│   ├── (tabs)/                  home, chat, you
│   └── paywall.tsx              modal
├── src/
│   ├── theme.ts                 cores, espaçamentos, tipografia
│   ├── types.ts                 tipos do domínio
│   ├── store.ts                 Zustand (estado global)
│   ├── content/
│   │   ├── personalities.ts     4 personalidades
│   │   ├── missions.ts          15 missões catálogo
│   │   ├── safety.ts            regex de safety (input + output)
│   │   └── replies.ts           bank de respostas mock
│   ├── lib/
│   │   ├── db.ts                AsyncStorage como banco local
│   │   ├── xp.ts                regras de XP / fase / nível
│   │   ├── streak.ts            streak forgiving
│   │   └── ai.ts                roteador IA (mock | OpenAI)
│   └── components/              Mascot, HabitChip, MissionCard, etc.
└── package.json
```

## Banco local

Tudo guardado em **AsyncStorage** (no celular: SQLite por baixo; na web: localStorage). Sem servidor.

Tabelas (chaves em AsyncStorage `mascote:profiles`, `mascote:checkins`, etc.):
- `profiles` — você
- `mascots` — o mascote
- `checkins` — cada vez que você cuidou de si
- `missions` — missões diárias
- `streaks` — sequência de dias
- `messages` — conversas
- `xp_events` — log de XP

Pra resetar tudo: tela **Você** → **Apagar tudo e recomeçar**.

## O que NÃO está aqui (intencionalmente)

✗ Landing page / propaganda
✗ Cobrança real (paywall é só visual)
✗ Push notifications
✗ Backend cloud (Supabase ficou pra depois)
✗ Login social
✗ Sync entre dispositivos

Tudo isso está documentado no `plano_mascote/` se um dia quiser ligar.

## Problemas comuns

**"Module not found: react-native-reanimated"**
→ `npx expo install --fix`

**"Port 8081 in use"**
→ `npx expo start --port 19000 --web`

**Tela branca no navegador**
→ Aperta `r` no terminal (recarrega) ou `shift+r` (limpa cache)

**Cache estranho**
→ `npx expo start --clear`

## Próximos passos (quando quiser ir além)

Veja `plano_mascote/` no diretório pai. Tem 8 docs cobrindo stack, schema, growth, LGPD, etc.

Quando for ligar Supabase + IA real:
1. Cria projeto em supabase.com
2. Roda o SQL de `plano_mascote/parte_2_mercado_e_stack.md` (seção 14)
3. Troca `src/lib/db.ts` por chamadas Supabase (mesma interface)
4. Adiciona chave OpenAI na aba Você
