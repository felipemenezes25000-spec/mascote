# Evolution Engine — Documentação Técnica

## Arquitetura

```
GenotypeGenerator  →  Genotype (seed, genome, arquétipo, raridade)
        ↓
BehaviorEngine     →  BehaviorHistory (hábitos, streak, dominantes)
        ↓
PhenotypeGenerator →  Phenotype (slots discretos + morfologia + paleta)
        ↓
VisualEvolutionEngine → modula slots com microevoluções
        ↓
EvolutionEngine    → orquestra preview, path, persistência
```

## Módulos

| Módulo | Responsabilidade |
|--------|------------------|
| `EvolutionTypes.ts` | Genotype, Phenotype, BehaviorHistory, MicroEvolution |
| `EvolutionMath.ts` | `calculateTotalEvolutionCombinations()` — produto cartesiano dos slots |
| `EvolutionRules.ts` | Bias visual por hábito (água→brilho, meditação→zen) |
| `EvolutionMilestones.ts` | Fases macro + elegibilidade de microevoluções |
| `MicroEvolutionCatalog.ts` | 30+ microevoluções por hábito/streak |
| `MutationEngine.ts` | Ponte com `lib/dna/mutations` |
| `RaritySystem.ts` | Tier procedural (comum → lendário) |
| `PersonalityEngine.ts` | Flavor textual + first words |
| `EvolutionPersistence.ts` | AsyncStorage por userId |
| `EvolutionTimeline.ts` | Eventos macro/micro/mutation |

## Personalização (Sims-style)

- Onboarding: `buildPersonalizationInput` → `generateGenotype` → DNA persistido
- Settings: `app/settings/personalization.tsx` + `PersonalizationRepository`
- `useEvolutionState` carrega personalização salva ao calcular fenótipo

Hábitos continuam sendo o motor de microevoluções; personalização define a **base** do genótipo.

## API pública

```typescript
import {
  calculateTotalEvolutionCombinations,
  generateEvolutionPreview,
  generateUserMascotEvolutionPath,
  buildEvolutionState,
  processEvolutionAfterCheckin,
} from '@/game/evolution';
```

### Prova de 1000+ combinações

`calculateTotalEvolutionCombinations()` multiplica cardinalidades de 16 slots discretos do fenótipo. Resultado atual: **> 10¹⁵** combinações base; microevoluções multiplicam ainda mais.

### Integração

- **Check-in**: `applyCheckinFully` chama `processEvolutionAfterCheckin`
- **Renderer**: `Mascot3D` consome DNA + mutationIds; displayModifiers disponíveis via `Phenotype.displayModifiers`
- **Onboarding**: usar `generateEvolutionPreview(seed)` para DNA + egg hatch

## Fases macro

| MacroPhaseId | MascotPhase | XP threshold |
|--------------|-------------|--------------|
| ovo | ovo | 0 |
| bebe | bebe | 100 |
| crianca | crianca | 500 |
| jovem | adolescente | 2000 |
| adulto | adulto | 8000 |
| lendaria | evoluido | 25000 |

## Testes

`tests/game/evolution-engine.test.ts` — seed consistency, hábitos, >1000 combinações, inatividade não punitiva.
