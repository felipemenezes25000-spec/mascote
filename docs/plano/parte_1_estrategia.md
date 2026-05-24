# Parte 1 — Estratégia

Cobre seções 1–9 dos entregáveis obrigatórios: resumo executivo, pitches, posicionamento, público, personas, JTBD, proposta de valor.

---

## 1. Resumo executivo

**Mascote** é um app mobile de assinatura mensal (R$ 19,90) que combina lógica de Tamagotchi, IA conversacional acolhedora e hábitos de autocuidado. O usuário cuida de si — dorme, bebe água, se movimenta, medita, lê, escreve — e como consequência vê um companheiro digital evoluir visualmente: ganha humor, energia, XP, fases, acessórios e cenários.

**Diferencial central:** não é um chatbot, não é um app de hábitos genérico, não é um Tamagotchi de skin nova. É a **interseção das três coisas**, com uma camada de evolução visual que torna o progresso comportamental palpável em 30 segundos por dia.

**Problema atacado:** apps de hábito (Habitica, Streaks) têm retenção D30 média de 4–8% porque dependem de motivação intrínseca; chatbots wellness (Replika, Wysa) viciam mas não geram comportamento offline; Tamagotchis modernos (Finch) provam que evolução visual prende, mas não usam IA conversacional contextual com a rotina real do usuário.

**Tese:** combinar **vínculo emocional (Tamagotchi)** + **conversa personalizada (IA)** + **gatilho comportamental (hábito)** produz retenção D30 ≥ 25% (3–5x acima do mercado) e LTV justifica CAC de até R$ 60.

**Modelo:** assinatura mensal R$ 19,90, anual R$ 149 (38% off), trial de 7 dias com cartão. Freemium superficial: usuário sem assinatura vê o mascote em modo "letárgico" — só evolui pagando.

**Equipe:** Felipe (founder, produto/growth) + Renato (co-founder).

**Status:** pré-MVP. Validando hipóteses antes de codar app.

**Próximos 90 dias:** validar → beta fechado → soft launch.

**Pedido (se for para investidor):** não estamos levantando. Estamos buscando 50 beta testers, 5 entrevistas com fundadores B2C, e 2 mentores de retenção mobile.

---

## 2. Pitch de 1 frase

> **Mascote é o Tamagotchi adulto: um companheiro digital que evolui quando você cuida de você.**

Versões alternativas para testar em anúncios A/B:

- "Um bichinho virtual que só evolui quando você dorme, bebe água e respira."
- "O app que transforma seus hábitos em um bichinho fofo que cresce com você."
- "Cuide do seu Mascote cuidando de você."
- "Quanto mais você se cuida, mais ele evolui."

**Recomendação:** começar com "Mascote é o Tamagotchi adulto..." nas primeiras 2 semanas de teste, porque ancora em um referencial geracional forte (millennials 28–40) que é nosso público inicial. Trocar se CTR < 1.5%.

---

## 3. Pitch de 30 segundos

> Apps de hábito morrem porque ninguém aguenta marcar checkbox pra sempre. Chatbots de bem-estar funcionam, mas o efeito não sai do app. O Mascote é diferente: você cuida de você no mundo real — dorme, bebe água, se mexe, respira — e em troca um bichinho digital fofo evolui na sua frente. Tem 4 personalidades (calmo, motivador, fofo e sábio) que conversam com você por IA, mandam mensagem no melhor horário do seu dia e reagem ao que você faz. É R$ 19,90 por mês. Estamos validando agora — quer ser um dos 50 primeiros?

**Quando usar:** entrevistas de validação, pitch curto em evento, descrição do anúncio expandido.

---

## 4. Pitch de 2 minutos

> Existe um problema que ninguém resolveu direito: a gente sabe que cuidar de si melhora a vida, mas a gente esquece, procrastina, ou acha chato. Apps de hábito tipo Habitica e Streaks têm 6% de retenção depois de 30 dias — quase ninguém continua. Chatbots tipo Replika viciam, mas não fazem você dormir melhor. E Tamagotchis modernos como o Finch provam que ter um bichinho que evolui prende a atenção, mas eles não conversam contigo de verdade e não são personalizados.
>
> O Mascote é a junção das três coisas. É um app mobile de assinatura onde você tem um bichinho digital — escolhe entre quatro personalidades — e ele só evolui quando você cuida de você. Dormiu 7 horas? Ele ganha energia. Bebeu água? Fica mais saudável. Meditou cinco minutos? O cenário ao redor melhora. Manteve o streak? Desbloqueia fase, acessórios, cenários novos. E ele conversa com você por IA — não é chatbot genérico, é um companheiro que sabe seu ritmo, manda mensagem no horário certo, e te lembra das suas missões diárias sem ser invasivo.
>
> Importante: a gente não promete cura, não dá diagnóstico, não substitui psicólogo. É autocuidado, bem-estar, gamificação positiva. Wellness, não saúde mental clínica.
>
> Modelo: R$ 19,90 por mês, trial de 7 dias. Mercado-alvo inicial são millennials e Gen Z 22–38 anos no Brasil que já tentaram apps de hábito e desistiram. Estimamos mercado endereçável local de 8 milhões de pessoas.
>
> Stack: React Native + Expo, IA via OpenAI no backend Node, Backend, RevenueCat. Time é eu (Felipe) e meu sócio Renato.
>
> Estamos antes do MVP. Próximos 30 dias: landing, formulário, 30 entrevistas, beta de 50 pessoas. Se o D7 do beta passar de 25% e a entrevista qualitativa confirmar a sensação de vínculo, a gente lança em julho.

---

## 5. Posicionamento

### Statement de posicionamento (template Geoffrey Moore)

> **Para** millennials e Gen Z entre 22 e 38 anos que tentaram apps de hábito e desistiram,
> **que querem** se cuidar com mais constância sem virar uma planilha de checkboxes,
> **o Mascote é** um app de assinatura mensal com IA e gamificação
> **que** transforma autocuidado em evolução visual de um companheiro digital,
> **diferente de** Habitica (gamificação seca), Replika (chatbot sem ação offline) e Finch (sem IA personalizada),
> **nosso produto entrega** vínculo emocional + rotina + recompensa visível em 30 segundos por dia.

### Onde estamos no mapa

```
                          ALTO ENGAJAMENTO EMOCIONAL
                                    │
                  Replika ●         │
                                    │      ● Mascote (target)
                                    │
                  ● Finch           │      ● Calm
                                    │
SEM AÇÃO OFFLINE  ──────────────────┼────────────── COM AÇÃO OFFLINE
                                    │
                                    │
                  Wysa ●             │      ● Strides
                                    │
                                    │      ● Habitica  ● Streaks
                                    │
                          BAIXO ENGAJAMENTO EMOCIONAL
```

O Mascote ocupa o canto **superior direito**: emocionalmente envolvente E gera ação offline real. Esse espaço hoje é aspiracional — Finch está mais perto, mas não usa IA conversacional contextual.

### O que NÃO somos (limites claros)

| Não somos | Porque é tentação | Por que recusamos |
|---|---|---|
| Terapia digital | Mercado de saúde mental é grande | Risco regulatório, ético e de UX (não temos credenciais clínicas) |
| Diagnóstico de transtornos | Marketing seria fácil | Anvisa/CFM/CFP nos derrubam |
| Substituto de psicólogo | Posicionamento de "salvar vidas" vende | Falsa promessa, dano emocional, processo |
| Coach de produtividade | Audiência maior | Diluiria o vínculo emocional (nosso moat) |
| Diário/journaling puro | Mercado existente (Day One) | Sem mascote, vira commodity |
| Rede social de hábitos | Engajamento extra | Comparação social é tóxica em wellness |
| Jogo (Unity, RPG) | Diverte mais | Vira "joguinho", perde a função de hábito |

---

## 6. Público-alvo

### Segmentação primária (foco do MVP)

**Geografia:** Brasil, capitais e regiões metropolitanas (São Paulo, Rio, BH, Curitiba, Porto Alegre, Recife, Salvador, Brasília, Fortaleza).

**Demografia:**
- Idade 22–38 (millennials tardios + Gen Z primária)
- 65% mulheres / 35% homens (a inferir nos primeiros testes; produto não é gendered, mas wellness apps tendem a esse split no Brasil)
- Classe B/C+ (poder de compra para R$ 19,90/mês recorrente; classe A está saturada de apps premium, classe C- não converte em recorrência)
- Smartphone iOS ou Android com plano de dados/Wi-Fi estável

**Psicografia:**
- Já baixou pelo menos 1 app de hábito ou bem-estar nos últimos 12 meses
- Acompanha pelo menos 3 perfis sobre "saúde mental" ou "vida leve" no Instagram/TikTok
- Diz frases tipo "eu queria ser mais constante", "queria me cuidar mais", "queria menos ansiedade no dia a dia" (mas não busca tratamento clínico)
- Tem afinidade com personagens, fofura, Studio Ghibli, Tamagotchi, Stardew Valley, Animal Crossing
- Disposição para pagar R$ 20/mês por algo que entregue valor emocional + utilidade

**Comportamento digital:**
- Usa apps de assinatura (Spotify, Netflix, talvez Calm/Headspace)
- Compra "experiências" mais que produtos físicos
- Responde a TikTok e Reels com narrativa pessoal
- Confia em recomendação de influenciador de nicho

### Segmentação secundária (mês 6+)

- Mulheres 38–50 que cuidam de família e se esquecem de si
- Estudantes universitários 18–22 com rotina caótica
- Brasileiros morando fora (saudade + cuidado próprio é forte)

### Não-público (não tente vender pra esses agora)

- Adolescentes < 18 (regulatório complica, paywall difícil)
- 60+ (UX precisa ser muito diferente, mercado pequeno no app store)
- Pessoas em tratamento ativo de saúde mental (não somos para elas — a IA pode causar dano sem querer)
- Profissionais clínicos buscando ferramenta para pacientes (B2B é outro produto)

---

## 7. Personas

Quatro personas iniciais. **Use Carolina como persona âncora** — design, copy, anúncio e onboarding miram nela.

### Persona 1 — Carolina, 28 (ÂNCORA)

- **Vive em:** São Paulo, Pinheiros
- **Trabalha como:** UX designer em agência
- **Rotina:** acorda 8h, trabalha 10–19h, chega em casa exausta, scroll TikTok até 1h da manhã, dorme mal
- **Já tentou:** Calm (cancelou), Strava (não foi), bullet journal (deu 3 semanas)
- **Frustração principal:** "Eu sei o que tenho que fazer, eu só não consigo fazer todo dia"
- **Gatilho de compra:** ver uma amiga postando print do Mascote dela no Story
- **Objeção principal:** "Mais um app de assinatura que vou esquecer"
- **Quote:** "Eu queria um Tamagotchi que me forçasse a beber água, juro"
- **JTBD principal:** quando chego em casa cansada, quero algo pequeno e fofo que me lembre de cuidar de mim, pra eu não ir dormir com a sensação de que joguei o dia fora

### Persona 2 — Mateus, 24

- **Vive em:** Belo Horizonte, com os pais
- **Trabalha como:** dev júnior remoto
- **Rotina:** acorda 10h, trabalha sentado, raramente sai, joga até tarde
- **Já tentou:** Habitica (gostou da gamificação, abandonou em 1 mês)
- **Frustração:** isolamento, ganho de peso, sensação de "estar parado na vida"
- **Gatilho de compra:** anúncio TikTok de UGC tipo "POV: meu Mascote tá triste porque eu não saí de casa"
- **Objeção:** "Não vou conseguir pagar todo mês"
- **Quote:** "Eu até gosto de me cuidar, só preciso de motivo"
- **JTBD:** quando passo o dia inteiro no quarto, quero alguém pra me lembrar que existe vida fora dali sem me julgar

### Persona 3 — Letícia, 34

- **Vive em:** Curitiba, casada, 1 filho de 5 anos
- **Trabalha como:** advogada
- **Rotina:** acorda 6h, escritório 9–18h, busca filho, cuida da casa, dorme tarde
- **Já tentou:** Headspace, app de água, agenda física
- **Frustração:** "Eu cuido de todo mundo menos de mim"
- **Gatilho de compra:** post de Instagram com narrativa "se você cuida de todos menos de você"
- **Objeção:** "Não tenho tempo nem pra mais um app"
- **Quote:** "Eu queria 5 minutos por dia que fossem só meus"
- **JTBD:** quando o dia inteiro foi sobre os outros, quero 5 minutos que sejam só meus e que me sintam menos culpada por não me cuidar

### Persona 4 — Pedro, 36

- **Vive em:** Rio de Janeiro
- **Trabalha como:** PM em scaleup
- **Rotina:** intensa, otimizada, mede tudo
- **Já tentou:** Whoop, Oura, Streaks, qualquer app de produtividade
- **Frustração:** "Já tenho dado demais sobre mim, falta significado"
- **Gatilho de compra:** indicação de outro PM
- **Objeção:** "É só mais um app pra eu obsessivamente otimizar"
- **Quote:** "Quero algo que me obrigue a desacelerar"
- **JTBD:** quando estou no piloto automático maximizando tudo, quero algo que me force a fazer uma pausa que tenha sentido

### Anti-persona (NÃO é seu cliente)

- **Quem:** Beatriz, 19, estudante de psicologia
- **Por que não:** quer "ajudar pessoas com depressão", busca ferramenta clínica, vai ficar frustrada que o app é leve
- **O que fazer:** redirecionar gentilmente no onboarding com texto "Mascote é para autocuidado, não substitui acompanhamento profissional"

---

## 8. Jobs To Be Done (JTBD)

Estrutura: **quando** [contexto] **eu quero** [motivação] **para** [resultado emocional].

### JTBDs primários (foco do MVP)

| # | Job | Contexto | Motivação | Resultado emocional |
|---|---|---|---|---|
| J1 | **Lembrete amoroso** | Quando termino o dia sentindo que não fiz nada por mim | Quero ser lembrada de pelo menos uma coisa pequena que cuido de mim | Para dormir sem culpa |
| J2 | **Companhia leve** | Quando estou sozinho no quarto sem motivo pra nada | Quero alguém que reaja ao que eu fizer | Para sentir que importo pra alguém, mesmo que digital |
| J3 | **Constância sem dor** | Quando começo um hábito e abandono em 2 semanas | Quero um motivo lúdico pra continuar mesmo nos dias ruins | Para me sentir capaz de seguir com algo |
| J4 | **Progresso visível** | Quando me cuido mas não vejo resultado no espelho | Quero ver progresso em outro lugar | Para sentir que vale a pena continuar |
| J5 | **Pausa significativa** | Quando estou no piloto automático no trabalho | Quero parar 30 segundos sem culpa | Para voltar com a cabeça mais leve |

### JTBDs secundários (mês 3+)

| # | Job | Resultado emocional |
|---|---|---|
| J6 | Refletir o que sinto sem virar diário formal | Sentir que tô me conhecendo melhor sem esforço |
| J7 | Marcar conquistas que ninguém valoriza | Sentir orgulho privado |
| J8 | Compartilhar progresso com amigos sem competir | Sentir pertencimento sem comparação |
| J9 | Acumular relatórios que me digam algo novo sobre mim | Sentir que tô evoluindo |

### Anti-JTBDs (NÃO tente entregar)

- "Quero tratar minha depressão" → não somos
- "Quero perder 10kg" → não somos
- "Quero me viciar em um chatbot" → não queremos
- "Quero competir com meus amigos" → não construímos isso

---

## 9. Proposta de valor

### Canvas de valor (Strategyzer)

**Customer pains (dores):**
- Apps de hábito morrem em 2 semanas
- Não tem tempo nem energia para "se cuidar direito"
- Sente culpa quando "perde o dia"
- Acha chato marcar checkbox
- Tem medo de virar paciente clínico
- Cansa de tela sem significado emocional

**Customer gains (ganhos):**
- Sentir que tá cuidando de si sem esforço sobrehumano
- Ter um motivo lúdico pra continuar
- Ver progresso fofo
- Receber afeto digital leve
- Pertencer a uma comunidade sem comparação
- Sentir orgulho pequeno todo dia

**Customer jobs:**
- (ver seção 8)

**Pain relievers (como aliviamos as dores):**
- Mascote evolui → motivação extrínseca leve substitui willpower
- 30 segundos de check-in basta → barreira baixa
- Streak forgiving (perde se faltar 3 dias, não 1) → reduz culpa
- Linguagem leve (autocuidado, não saúde mental) → tira medo clínico
- Visual fofo (Rive animado) → significado emocional

**Gain creators (como entregamos os ganhos):**
- Evolução visual diária do Mascote
- 4 personalidades de IA que conversam contigo
- Streak, XP, fases, acessórios, cenários
- Push notifications no melhor horário (não às 9h padrão)
- Relatórios semanais "como você cuidou de você essa semana"

### Promessa de valor em uma frase

> **Em 30 segundos por dia, você cuida de você e seu Mascote evolui.**

### Reason to believe (RTB)

| Promessa | Por que acreditar |
|---|---|
| "Em 30 segundos por dia" | Onboarding mede tempo do primeiro check-in → mostra média na landing após 100 betas |
| "Seu Mascote evolui de verdade" | Vídeo de antes/depois de 30 dias na landing |
| "Não é mais um app que você vai esquecer" | Notificação no melhor horário (provado por IA) + streak forgiving |
| "Não é terapia, é autocuidado" | Linguagem clara em todo lugar; disclaimer fixo no perfil |

### Hierarquia de mensagens (para uso em copy)

1. **Hero:** "Cuide de você. Seu Mascote evolui junto."
2. **Sub:** "App de assinatura com IA e gamificação para quem cansou de planilha de hábito."
3. **Prova social:** "Beta com 50 pessoas — D7 de 38%." (apenas quando tiver número real)
4. **Benefício funcional:** "Check-in de 30 segundos. Lembrete no seu horário. Streak que perdoa."
5. **Benefício emocional:** "Volte amanhã pra ver seu Mascote feliz."
6. **CTA:** "Entrar na lista de beta (vagas limitadas)."

---

## Decisões pendentes (Parte 1)

| ID | Decisão | Opções | Prazo |
|---|---|---|---|
| P1.1 | Personalidade default no onboarding | (a) Quiz de 4 perguntas (b) Carolina escolhe livre (c) Calmo como default | Antes do beta |
| P1.2 | Preço inicial | (a) R$ 19,90/mês (b) R$ 24,90/mês (c) R$ 14,90/mês | Antes da landing |
| P1.3 | Persona âncora | Carolina (recomendado) ou Mateus | Antes dos anúncios |

**Atualizado em:** 2026-05-16
