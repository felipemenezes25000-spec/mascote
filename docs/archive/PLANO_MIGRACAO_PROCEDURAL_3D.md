# Plano de migração — Mascote procedural 3D

> **Status:** plano de implementação acionável
> **Prazo:** 8 semanas (lançamento em ~2 meses)
> **Stack:** React Native + Expo (mantido) + Three.js + React Three Fiber via `expo-gl`
> **Princípio:** o procedural amplifica a essência atual. Não substitui.

---

## Decisões travadas

**Engine:** Three.js (MIT) + `@react-three/fiber/native` + `expo-gl`. Custo: zero. Splash: nenhum. Royalty: nenhum. Integra trivialmente com Expo SDK 51.

**Não trocamos** o app inteiro. Mantemos as 45+ telas, os 1.344 testes, o sistema de IA BYOK, o safety net em 5 camadas, a memória de longo prazo TF-IDF, o AsyncStorage com migrations versionadas, o Expo Router 3.5.

**Trocamos apenas** o componente `Mascot.tsx` por um equivalente 3D procedural, adicionamos persistência de DNA, atrelamos o DNA aos hábitos que já existem.

**Princípios invioláveis preservados** (auditados toda PR):
- sem culpa — criatura nunca regride por hábito faltado
- sem ranking — DNA é privado, nunca comparado
- sem terapia — criatura nunca diagnostica, sugere ou interpreta sintomas
- local-first — DNA mora só no AsyncStorage do device
- anti-attachment — limite saudável de interação preservado
- safety net — as 5 camadas continuam intactas, IA não tem acesso ao DNA

---

## Arquivos no codebase atual

### Fica intocado
- Toda a árvore de `app/` (45+ telas do Expo Router)
- `src/store.ts` — apenas adiciona campo `dna`
- `src/lib/ai.ts`, `src/lib/memory.ts`, `src/lib/safety*` — IA e safety não tocam o DNA
- `src/lib/xp.ts`, `src/lib/streak.ts` — sistema de progressão preservado
- `src/content/missions.ts`, `src/content/safety.ts`, `src/content/replies.ts`
- Todos os testes existentes em `tests/` — devem continuar passando

### Vira fallback (renomeado, não deletado)
- `src/components/Mascot.tsx` → `src/components/Mascot2D.tsx` (fallback automático em devices fracos ou se WebGL falhar)

### Novo
- `src/components/Mascot3D.tsx` — view procedural com R3F
- `src/components/MascotProceduralBody.tsx` — geometry + materials do corpo
- `src/components/MascotProceduralEyes.tsx` — sclera + pupila + eye-tracking
- `src/components/MascotProceduralAura.tsx` — partículas e bioluminescência
- `src/lib/dna/genome.ts` — tipos, geração, mutação, validação
- `src/lib/dna/seedFromPersonality.ts` — Bipo/Zip/Lulu/Aro → DNA base
- `src/lib/dna/habitToGene.ts` — mapeamento hábito → drift de gene
- `src/lib/dna/persistence.ts` — leitura/escrita no AsyncStorage
- `src/lib/deviceCapabilities.ts` — detecta se 3D roda bem

### Modificado
- `src/lib/db.ts` — nova migration (`SCHEMA_VERSION + 1`) que adiciona campo `dna` ao registro Mascot, valor default derivado da personalidade atual
- `src/lib/evolution-stories.ts` — gera narrativa baseada em mudanças de DNA, não em fase fixa
- `src/lib/phaseLabels.ts` — fases viram emergentes (calculadas do DNA), não enum fixo
- `src/components/EvolutionModal.tsx` — mostra qual gene se fortaleceu, não "passei de criança para adolescente"
- `src/components/MascotAmbient.tsx` — ambiente reage ao mood derivado do DNA
- `src/content/personalities.ts` — adiciona perfil de DNA base de cada uma das 4 personalidades

---

## Cronograma de 8 semanas

### Semana 1 — Fundação técnica

**Meta:** R3F renderizando um cubo procedural no device real. Nenhuma feature de produto.

Trabalho:
- `npx expo install expo-gl three @react-three/fiber@^8`
- Provar que `Canvas` do R3F renderiza em iOS, Android e Web (Expo Go + dev build)
- Medir FPS em Moto G Play, Samsung A14, iPhone 11
- Validar que `expo-gl` não conflita com Expo Router e com a build atual do EAS
- Decidir resolução de pixel ratio por device (`PixelRatio.get()` → cap em 2x)

**Critério de aceite:** cubo procedural renderizando estável em 60 fps em mid-range Android, sem regressão nos 1.344 testes existentes.

**Riscos:** `@react-three/fiber/native` exige Reanimated 3.x já presente — confirmar versão. Em Expo Go web, alguns shaders podem falhar — testar fallback.

### Semana 2 — Porting do protótipo

**Meta:** A criatura do protótipo HTML rodando dentro de `Mascot3D.tsx`.

Trabalho:
- Portar `class Creature` do protótipo para componente R3F com hooks
- Body procedural com vertex displacement seedado
- Olhos + pupila + highlight
- Membros, espinhos, antenas, cauda condicionais
- Aura de partículas via `<Points>`
- Animação procedural em `useFrame` (respiração, blink, eye-tracking via gesto)
- DNA stub hardcoded (sem persistência ainda)

**Critério de aceite:** criatura procedural renderiza com DNA fixo, anima, segue o toque do usuário em vez do mouse.

**Riscos:** Three.js mobile mata material caro — usar `MeshStandardMaterial` simples, evitar PBR completo. Limite de partículas em low-end: 80 vs 220 no web.

### Semana 3 — Persistência de DNA

**Meta:** DNA do usuário salva no AsyncStorage e sobrevive a reload.

Trabalho:
- Definir tipo `Genome` em `src/lib/dna/genome.ts`: 11 floats entre 0 e 1
- Escrever `generateDNA(seed, presetKey?)` determinístico
- Adicionar campo `dna: Genome` ao tipo `Mascot` em `src/lib/db.ts`
- Migration nova em `SCHEMA_MIGRATIONS`: usuários existentes recebem DNA derivado da personalidade que já escolheram (Bipo/Zip/Lulu/Aro)
- Testes property-based com `fast-check`: DNA sempre serializa/deserializa, valores sempre em [0.02, 0.98]
- Integrar com `store.ts` — novo selector `useDNA()`

**Critério de aceite:** usuários novos recebem DNA na criação. Usuários antigos recebem DNA na primeira abertura pós-update, derivado da personalidade que já tinham. Reload mantém o DNA. Migration testada com seed do banco anterior.

**Riscos:** quebrar migration = quebrar app de usuário existente. Migration nova deve ser **idempotente** e ter teste de roundtrip com snapshot do banco v(n-1).

### Semana 4 — Hábitos influenciam o DNA

**Meta:** cumprir um hábito drifta o gene correspondente.

Trabalho:
- `src/lib/dna/habitToGene.ts` — mapeia cada um dos 9 hábitos atuais para drift de 1-3 genes
- `src/lib/checkin.ts` recebe um hook: ao registrar hábito, chama `applyHabitDrift(habit, intensity)`
- Drift é **sempre positivo ou neutro** — nunca penaliza ausência (princípio: sem culpa)
- Drift acumula com decay temporal — picos isolados não viram tudo
- Mood derivado do DNA composto (não mais hardcoded em `src/lib/mood.ts`)

**Mapeamento inicial:**

| Hábito | Genes que reforça |
|---|---|
| Sono | discipline, resilience, emotionalDepth |
| Água | resilience, adaptability |
| Respiração | empathy, emotionalDepth, discipline |
| Leitura | intelligence, curiosity, creativity |
| Journaling | emotionalDepth, empathy, intelligence |
| Movimento | resilience, adaptability, socialEnergy |
| Conexão | socialEnergy, empathy |
| Silêncio | discipline, intelligence |
| Gratidão | empathy, emotionalDepth, socialEnergy |

**Critério de aceite:** completar 7 dias de hábitos diferentes muda visualmente a criatura. Faltar 7 dias **não regride** a criatura (princípio "sem culpa").

**Riscos:** drift forte demais → criatura muda toda hora e perde identidade. Drift fraco → usuário não percebe evolução. Calibrar com `0.005-0.04` por hábito por dia, e testar em playthrough simulado de 30 dias.

### Semana 5 — Presets das 4 personalidades

**Meta:** Bipo, Zip, Lulu e Aro continuam funcionando, mas agora como DNA base com variação procedural.

Trabalho:
- `src/lib/dna/seedFromPersonality.ts` — gera DNA base para cada personalidade
- `src/content/personalities.ts` — adiciona perfil de DNA em cada personalidade
- Tela de escolha de personalidade no onboarding mostra preview 3D da criatura base
- Cada usuário começa com base + variação procedural única (seed = `userId.hashCode()`)

**Critério de aceite:** 100 usuários diferentes que escolhem Bipo nascem com 100 Bipos diferentes mas todos com a essência calmo/empático preservada. Snapshot test confirma variação esperada.

### Semana 6 — Substituir o componente, feature flag

**Meta:** `Mascot3D` vira default. `Mascot2D` fica como fallback automático.

Trabalho:
- Detector em `src/lib/deviceCapabilities.ts`: confere GL_RENDERER, RAM, OS version, decide se renderiza 3D ou cai para 2D
- Wrapper `<Mascot />` decide qual sub-componente carrega
- Feature flag `PROCEDURAL_3D` no AsyncStorage — usuário pode forçar fallback nas configurações se preferir
- Atualizar `EvolutionModal.tsx` para narrar mudança de DNA ("sua Lulu desenvolveu o olhar mais atento" em vez de "passou de bebê pra criança")
- `MascotAmbient.tsx` lê o palette do DNA atual

**Critério de aceite:** em devices que suportam, 3D ativa automaticamente. Em devices fracos, 2D antigo aparece, sem aviso intrusivo. Todos os 1.344 testes verdes. E2E Maestro cobrindo fluxo principal.

**Riscos:** false-negative no detector deixa usuário capaz cair pro 2D. Falar com 5 beta testers em devices reais antes de fechar regra.

### Semana 7 — QA pesado e otimização

**Meta:** rodar em Moto G Play sem travar.

Trabalho:
- Testar em pelo menos 8 devices: 2 iPhones modernos, 2 iPhones antigos (SE 2020), 4 Androids de faixas diferentes
- Profiling com Flipper / Hermes inspector — identificar leaks
- Limitar partículas, baixar polycount em low-end (qualidade adaptativa)
- Battery test: 30 min de uso ativo, medir % consumido (alvo: <5% em iPhone 13, <8% em Android mid)
- Testar com VoiceOver e TalkBack — criatura tem `accessibilityLabel` descrevendo a personalidade
- A11y: reduzir motion se `useReducedMotion` (acessibilidade)
- Bundle size check — Three.js + R3F deve adicionar <300 KB ao APK

**Critério de aceite:** 60 fps estável em todos os devices testados, <5% bateria em 30 min, APK abaixo de 50 MB total, todos os testes verdes, acessibilidade auditada.

### Semana 8 — Polish e lançamento

**Meta:** ship.

Trabalho:
- Triage de bugs reportados em beta
- Polish de animação (curvas easing, transições entre humores)
- Captura de screenshots e vídeo da app store com a criatura procedural
- Atualizar `README.md`, `app/mobile/README.md`, store listing
- Soft launch para 10% via EAS Update channel
- Monitoramento — adicionar evento "dna_render_fallback_triggered" para saber quantos caem no 2D
- Lançamento amplo

**Critério de aceite:** usuários novos veem a criatura procedural no primeiro abrir do app. Usuários antigos abrem o app pela primeira vez pós-update e veem uma narrativa de transição: "a Lulu evoluiu para sua forma viva." Sem regressão de crashes.

---

## Riscos e mitigações

**Risco 1 — Performance em Android low-end.**
Mitigação: detector de capabilities + fallback 2D automático. LOD adaptativo (low polycount, menos partículas).

**Risco 2 — Migration de save quebra app de usuário existente.**
Mitigação: migration idempotente, testes de roundtrip com snapshot de banco v(n-1), feature flag de rollback.

**Risco 3 — DNA polui a essência (criatura vira "experimento", perde alma).**
Mitigação: 4 personalidades base continuam visíveis na escolha inicial. Narrativa nunca usa termos científicos ("mutação", "DNA", "genoma") com o usuário final. UI fala em "ela cresceu mais atenta", "sua aura ficou mais calorosa". DNA é detalhe técnico, não vocabulário de produto.

**Risco 4 — Atraso de stack causa cascata.**
Mitigação: semana 1 é só prova de conceito. Se R3F não funcionar no Expo SDK 51 do projeto, decisão GO/NO-GO antes da semana 2. Plano B: manter 2D, lançar sem procedural, evoluir pós-lançamento.

**Risco 5 — IA da memória de longo prazo expõe DNA inadvertidamente.**
Mitigação: auditar `src/lib/memory.ts` — DNA nunca entra no contexto do prompt LLM. Snapshot test que falha se prompt incluir o objeto DNA.

**Risco 6 — Princípio de "sem culpa" quebra.**
Mitigação: testes property-based garantem que `applyHabitDrift` nunca retorna delta negativo. Code review com checklist explícito dos 6 princípios.

---

## Definição de pronto (DoR para o lançamento)

- [ ] Todos os 1.344 testes verdes + cobertura ≥ 98%
- [ ] Maestro E2E rodando os 8 fluxos críticos
- [ ] Renderiza 3D em iOS 14+, Android 8+ (cobertura ~98% do mercado BR)
- [ ] Fallback 2D funciona em devices abaixo do limite
- [ ] Migration de v(n-1) testada com snapshots reais
- [ ] Bundle <50 MB
- [ ] Bateria <5% em 30 min de uso ativo (iPhone 13)
- [ ] Acessibilidade auditada (TalkBack, VoiceOver, reduced motion)
- [ ] Os 6 princípios invioláveis verificados em PR review
- [ ] Pitch da loja atualizado com vídeo da criatura procedural

---

## O que NÃO entra no lançamento (roadmap pós-lançamento)

- Mutação espontânea aleatória (interessante, mas não essencial pro wow inicial)
- Behavior trees complexos com utility AI
- Memória emocional que comenta o passado da criatura
- Mutações raras desbloqueáveis após 30/90/365 dias
- Bioma de fundo que evolui com a criatura
- Sistema de "criatura sente a sua ausência" — risco de gerar dependência emocional, requer estudo de psychological safety

Esses ficam para v1.1 a v1.5, alimentados por dados reais de uso e feedback dos primeiros 1.000 usuários.

---

**Última atualização:** 19 de maio de 2026
**Autor do plano:** sessão de design técnico
**Aprovação necessária para começar:** Felipe (product owner) + revisão dos princípios invioláveis
