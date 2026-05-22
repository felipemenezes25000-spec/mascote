
> mascote-mobile@0.1.0 audit:visual
> node scripts/audit-visual.js

# Visual debt audit — Mascote

> Gerado por `scripts/audit-visual.js` em 2026-05-20T22:27:58.409Z.

Este relatório destaca onde o app **NÃO** está usando o design system
consistentemente. Cada item é um candidato a migrar pra tokens.

## Hex hardcoded fora de tokens/renderers

Total arquivos com hex: **10**
Total ocorrências: **24**

Top 20 ofensores:

| arquivo | hex hardcoded |
|---|---|
| `src/components/ErrorBoundary.tsx` | 5 |
| `src/components/WalletPills.tsx` | 5 |
| `app/(tabs)/chat.tsx` | 4 |
| `app/rewards.tsx` | 3 |
| `src/components/Mascot3D.tsx` | 2 |
| `src/components/Card.tsx` | 1 |
| `src/components/ChatBubble.tsx` | 1 |
| `src/components/Mascot.tsx` | 1 |
| `src/features/home/components/HomeBanner.tsx` | 1 |
| `app/(tabs)/_layout.tsx` | 1 |

**Como migrar:** trocar `"#FF8030"` por `theme.colors.primary`, `"#7BAE7A"` por `theme.colors.sage`, etc.

## `<Text>` cru em telas (sem `Typography`)

Total arquivos: **43**
Total ocorrências: **438**

Top 20 ofensores:

| arquivo | <Text> | já importa Typography? |
|---|---|---|
| `app/settings.tsx` | 34 | 🔴 puro RN |
| `app/(tabs)/evolution.tsx` | 29 | 🔴 puro RN |
| `app/paywall.tsx` | 22 | 🔴 puro RN |
| `app/dna.tsx` | 20 | 🔴 puro RN |
| `app/privacy.tsx` | 20 | 🔴 puro RN |
| `app/share.tsx` | 18 | 🔴 puro RN |
| `app/breathe.tsx` | 15 | 🔴 puro RN |
| `app/diary.tsx` | 15 | 🔴 puro RN |
| `app/(tabs)/report.tsx` | 14 | 🔴 puro RN |
| `app/streak.tsx` | 14 | 🔴 puro RN |
| `app/cancel.tsx` | 13 | 🔴 puro RN |
| `app/onboarding/mascot.tsx` | 13 | 🔴 puro RN |
| `app/onboarding/notice.tsx` | 13 | 🔴 puro RN |
| `app/profile.tsx` | 13 | 🔴 puro RN |
| `app/closet.tsx` | 12 | 🔴 puro RN |
| `app/onboarding/identity.tsx` | 12 | 🔴 puro RN |
| `app/subscription.tsx` | 12 | 🔴 puro RN |
| `app/safety.tsx` | 11 | 🔴 puro RN |
| `app/(tabs)/chat.tsx` | 9 | 🔴 puro RN |
| `app/mission.tsx` | 9 | 🔴 puro RN |

**Como migrar:** substituir `<Text>foo</Text>` por `<Typography variant="body">foo</Typography>` ou variant apropriada.

## Como rodar

```powershell
npm --prefix app/mobile run audit:visual > docs/VISUAL_DEBT.md
```
