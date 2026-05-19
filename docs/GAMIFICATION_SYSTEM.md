# Sistema de Gamificação — Mascote

## Visão geral

O Mascote combina **wellness gentil** com gamificação procedural:

- **XP e níveis** — progresso cumulativo por check-ins e missões
- **Streaks com grace days** — constância sem culpa por falhas
- **Missões diárias** — 300+ templates (base + catálogo expandido com metadados)
- **Achievements** — 20+ conquistas com recompensas reais (XP, moedas, acessórios, cenários)
- **Mutações DNA** — marcos biológicos visuais desbloqueáveis
- **Microevoluções** — mudanças incrementais por hábito (água, sono, exercício, etc.)
- **Wallet** — moedas e gemas por ações

## Princípios

1. **Sem punição** — inatividade não regride evolução conquistada
2. **Procedural, não fake** — combinações visuais > 1000 (ver `EvolutionMath.ts`)
3. **Identidade > fase** — DNA e fenótipo importam mais que esteira Tamagotchi

## Arquivos principais

| Área | Caminho |
|------|---------|
| Check-in pipeline | `src/lib/checkin.ts` |
| XP / fases | `src/lib/xp.ts` |
| Missões | `src/content/missions.ts`, `missions-extended.ts`, `mission-meta.ts` |
| Achievements | `src/content/achievements.ts` |
| Mutações | `src/lib/dna/mutations.ts` |
| Evolução procedural | `src/game/evolution/` |
| Unlocks | `src/lib/unlock.ts` |

## Fluxo de check-in

```
Tap hábito → applyCheckinFully
  → streak + XP + coins
  → drift DNA (positivo)
  → avalia mutações
  → avalia microevoluções
  → unlocks (achievements, acessórios, cenas)
```

## Loops implementados

| Loop | Fluxo |
|------|--------|
| Diário | check-in → XP/moedas → microevolução → fala do mascote (`mascot-context-line`) |
| Semanal | Home/Settings → `weekly-report.tsx` (preview free / completo Plus) |
| Mensal | `monthly-report.tsx` (marco + gate Plus) |
| Retorno | `returnLoopKind` + animação saudade/retorno na Home |
| Coleção | Evolução tab → mutações, memórias, links closet/inventory |
| Narrativa | `MascotMemoryService` + memórias na aba Evolução |

## Premium (Plus)

Benefícios em `src/content/billing.ts`. Gates em `EntitlementService` + `PremiumFeatureGuard`.
