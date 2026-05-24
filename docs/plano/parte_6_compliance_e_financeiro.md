# Parte 6 — Compliance e Financeiro

Cobre seções 43–50: LGPD, App Store / Google Play, QA, custos, modelo financeiro, experimentos, riscos, critérios go/no-go.

---

## 43. LGPD

### Princípios

1. **Coleta mínima** — só pedir o necessário pro produto funcionar
2. **Transparência ativa** — política clara, em português, acessível
3. **Controle do titular** — exportar, corrigir, deletar é direito do user
4. **Segurança proporcional** — criptografia em trânsito e at-rest
5. **Documentação interna** — DPO designado, RIPD para dados sensíveis, contratos com processadores

### Dados coletados (mapeamento)

| Dado | Categoria LGPD | Finalidade | Base legal | Retenção |
|---|---|---|---|---|
| Email | Identificação | Autenticação, contato | Execução de contrato | Até exclusão da conta + 30d |
| Nome | Identificação | Personalização | Execução de contrato | Idem |
| Timezone, locale | Técnico | Notificações + idioma | Legítimo interesse | Idem |
| Push token | Técnico | Notificações | Consentimento explícito | Até revogação |
| Check-ins (hábitos) | **Comportamental** | Core do produto | Execução de contrato | Idem |
| Mensagens chat IA | **Comportamental + sensível leve** | Core do produto + safety | Execução de contrato + consentimento | Idem; flag `critical` retém 90d para safety review |
| XP, streak, level | Comportamental | Core do produto | Execução de contrato | Idem |
| Subscription status | Financeiro | Cobrança | Execução de contrato | Idem + obrigação fiscal |
| Push CTR, retention | Analytics | Melhoria do produto | Legítimo interesse | Anonimizado após 12 meses |
| Crash reports | Técnico | Qualidade | Legítimo interesse | 90 dias |

**NÃO coletamos:** localização GPS, contatos, fotos, microfone, biometria, dados financeiros direto (RevenueCat trata), informação clínica/diagnóstica.

### Bases legais aplicadas

- **Execução de contrato** (art. 7º, V): para tudo que o usuário precisa para usar o produto
- **Consentimento** (art. 7º, I): push notifications, analytics extras
- **Legítimo interesse** (art. 7º, IX): melhoria do produto, segurança

### Direitos do titular — fluxos implementados

| Direito | Como o user faz | Tempo de resposta |
|---|---|---|
| Acesso aos dados | Settings → "Baixar meus dados" → email com JSON | Até 15 dias |
| Correção | Settings → editar perfil | Imediato |
| Exclusão | Settings → "Excluir conta" → confirma 2x → fila de purga | Até 30 dias (período de "graça" para reativar) |
| Portabilidade | Mesmo que acesso (JSON estruturado) | Idem |
| Revogar consentimento | Settings → toggle por categoria | Imediato |
| Informação sobre tratamento | Política linkada em todo lugar | Sempre |
| Reclamação à ANPD | Não impedimos | Citado na política |

### Processadores (subprocessadores)

| Processador | Função | Localização dados | DPA assinado |
|---|---|---|---|
| Backend | DB + Auth + Storage | EU (Frankfurt) ou US (escolher EU) | sim (template padrão) |
| OpenAI | LLM | US | sim (zero-retention pra API) |
| Anthropic | LLM fallback | US | sim |
| RevenueCat | Assinatura | US | sim |
| Vercel | Landing hosting | global edge | sim |
| Firebase Analytics | Analytics | US | sim |
| PostHog | Analytics | EU (preferir EU cloud) | sim |
| Sentry | Erros | US ou self-hosted EU | sim |
| Resend | Email | US | sim |
| Expo | Push + builds | US | sim |

**Importante:** quando der escolher entre EU e US, escolher EU para reduzir trânsito internacional. Para o backend, escolher região `eu-central-1` ou Brasil quando disponível (Backend BR está em roadmap).

### Política de privacidade — estrutura

1. Quem somos
2. Quais dados coletamos
3. Por que coletamos (finalidade)
4. Bases legais
5. Com quem compartilhamos (subprocessadores)
6. Quanto tempo guardamos
7. Direitos do titular
8. Cookies e tecnologias similares
9. Crianças e adolescentes
10. Transferência internacional
11. Segurança
12. Mudanças nesta política
13. Contato (DPO)
14. ANPD

Versionar com data. Mudança material → push notification + opt-in renovado.

### Termos de uso — pontos críticos

- App é wellness, não saúde mental clínica (disclaimer prominente)
- Não substitui profissional
- Em crise: CVV 188
- Idade mínima: 16 anos (consentimento próprio); 16-18 com consentimento dos pais; <16 não permitido
- Mascote pertence ao usuário enquanto ele mantém conta; deletar conta apaga mascote
- IA pode errar — não confiar como verdade absoluta
- Reembolso: 7 dias mensal, 7 dias anual (a partir da cobrança), depois aplicam-se políticas Apple/Google
- Rescisão: pode rescindir conta a qualquer momento; nós podemos rescindir em caso de violação dos termos (uso para spam, comportamento abusivo a moderação, etc.)
- Foro: Comarca do domicílio do consumidor (CDC)

### Crianças e adolescentes

- App pede idade no cadastro
- < 16 anos → bloqueio com mensagem amigável
- 16-18 → exige consentimento parental por email (link enviado)
- Em qualquer caso, IA com guardrails extra mais conservadores quando user declara < 18

### Procedimento de incidente

1. Detecção (Sentry alert / safety flag / report manual)
2. Avaliação severidade (< 4h)
3. Conter o vazamento
4. Comunicar ANPD em 72h (se exposição de dado pessoal sensível)
5. Comunicar titulares afetados (se risco)
6. Pós-mortem documentado
7. Atualizar processo

### DPO

- MVP: Felipe acumula função
- Pós-100k usuários ou primeiro investimento: contratar DPO terceiro (~R$ 2k/mês BR)
- Email DPO: `dpo@meumascote.app`

### Checklist LGPD pré-launch

| Item | Status |
|---|---|
| Política de privacidade redigida | pendente |
| Termos de uso redigidos | pendente |
| Fluxo de exportação implementado | pendente |
| Fluxo de exclusão implementado | pendente |
| RLS em todas tabelas | pendente |
| DPA com cada subprocessador | pendente |
| DPO designado (Felipe MVP) | pendente |
| Procedimento de incidente documentado | pendente |
| Treinamento Felipe + Renato em LGPD básico | pendente (30min, gratuito ANPD) |
| Email dpo@ configurado | pendente |
| Linha sobre LGPD no onboarding | pendente |

---

## 44. App Store e Google Play

### Apple App Store — estratégia

#### Conta

- Apple Developer Program: USD 99/ano (registrar com CPF + DDA + 2FA)
- Configurar como **Individual** no MVP; mudar para Company quando entidade jurídica existir
- Bank info: conta PJ obrigatória pós-CNPJ; MVP pode usar PF mas é gambiarra

#### Categoria

- **Primary:** Health & Fitness (não "Medical" — apenas medical apps regulados)
- **Secondary:** Lifestyle

#### App Review — riscos e mitigações

| Risco | Mitigação |
|---|---|
| Rejeição por "Medical App without HCP" | Linguagem 100% wellness, disclaimer prominente; remover qualquer palavra clínica |
| Rejeição por IA "promove desinformação" | Sistema de safety documentado; print do detector |
| Rejeição "in-app purchase obrigatório, não Stripe" | Usar StoreKit via RevenueCat (já é a abordagem); web não pode redirecionar para pagamento externo no app iOS |
| Subscription onboarding rejeitado | Cumprir guidelines 3.1.2: preço claro, terms link clicável, restore purchases botão |
| Privacy nutrition label | Preencher honestamente: "Data Linked to You: User ID, Usage Data, Diagnostics" |
| Trial sem free preview | Apple permite trial com cartão; ok |

#### Materiais necessários

- Ícone 1024x1024
- Screenshots 6.5" iPhone (5+)
- Preview vídeo opcional (sugerido: Rive em loop 15s)
- Descrição (max 4000 chars)
- Keywords (max 100 chars, separated by commas)
- Promo text (170 chars — pode atualizar sem submit)
- Support URL
- Privacy Policy URL (obrigatório)
- App Privacy info preenchida

#### Texto sugerido (App Store description)

```
Cuide de você. Seu Mascote evolui junto.

Mascote é um app de assinatura mensal com IA conversacional
acolhedora e gamificação leve. Você cuida de você no dia a dia
— dorme bem, bebe água, se movimenta, respira, lê — e em troca
um companheiro digital fofo evolui com você.

— Escolha entre 4 personalidades: Calmo, Motivador, Fofo, Sábio
— Check-in de 30 segundos por dia
— Streak que perdoa o dia ruim
— Lembrete inteligente no seu horário
— Relatório semanal narrativo

Importante:
Mascote é wellness e autocuidado. Não substitui acompanhamento
profissional. Para momentos de crise, ligue CVV 188.

Assinatura:
R$ 19,90/mês ou R$ 149/ano. Trial 7 dias grátis. Cancele a
qualquer momento.

Termos: meumascote.app/termos
Privacidade: meumascote.app/privacidade
```

#### Roteiro de submit

1. Configurar tudo em sandbox
2. Build de produção em EAS
3. Subir via Transporter ou EAS Submit
4. Preencher metadata
5. Submeter para review (esperar 24-72h normalmente)
6. Estar pronto para responder em até 24h se rejeitado

### Google Play — estratégia

#### Conta

- Google Play Developer: USD 25 one-time
- Validação 48-72h
- Bank info: idem Apple

#### Categoria

- **Primary:** Health & Fitness
- **Tags:** mindfulness, productivity, lifestyle

#### Riscos Play vs Apple

- Google Play é **mais permissivo** que Apple, mas...
- **Política de assinatura:** mesma exigência (BillingClient via RevenueCat)
- **Closed Testing → Open Testing → Production:** rolling release recomendado (5% → 25% → 100%)
- **Health Practices declaration:** preencher honestamente — "not a medical app"

#### Materiais

- Ícone 512x512
- Feature graphic 1024x500
- Screenshots: ao menos 2, ideal 8 (mistura phone + tablet)
- Descrição curta (80 chars) + longa (4000)
- Vídeo promocional opcional

#### Test tracks

- **Internal Testing:** Felipe + Renato + 5 confidentes
- **Closed Testing:** waitlist (até 100 testers BR)
- **Open Testing:** após beta validado, lista aberta
- **Production:** soft launch 5% Brasil

#### Política específica Google

- **Data Safety section:** preencher (analogous Apple Privacy)
- **Sensitive permissions:** não usamos
- **Target API level:** Android 13+ (target Android 14 quando build)
- **Permissions audit:** apenas notifications, internet — nada além

### Estratégia de soft launch

| Fase | Quem vê | Geografia |
|---|---|---|
| Internal | 5-10 pessoas | global, TestFlight + Google Internal |
| Closed Beta | 100 waitlist | Brasil only |
| Open Beta | 1000+ | Brasil only |
| Soft Launch | público geral | Brasil only, 5% rollout |
| Launch | público geral | Brasil 100% |
| Expansão | público geral | América Latina depois EN |

---

## 45. QA

### Estratégia de testes

| Tipo | Cobertura alvo MVP | Tool | Quem |
|---|---|---|---|
| Manual smoke pré-build | golden path | Felipe + Renato | a cada PR grande |
| Unit | regras XP, streak, missão | Vitest | dev autor |
| Integration | edge functions | Vitest + backend integration | dev autor |
| E2E mobile | onboarding + check-in + chat | Maestro | semanal |
| E2E web | landing form | Playwright | a cada deploy |
| Acessibilidade | screen reader em fluxos críticos | manual | mensal |
| Performance | cold start, scroll | manual + Flipper | mensal |
| Security | RLS bypass attempt, rate limit | manual | antes de cada release |
| LGPD flow | export, deleção | manual | antes de cada release |

### Cenários de teste obrigatórios (T-XXX)

**T-AUTH-01:** novo user cria conta com email magic link → recebe → completa → entra na home
**T-AUTH-02:** user existente logado → fecha app → reabre → continua logado
**T-AUTH-03:** logout → re-login com Apple → mantém mesmo user_id
**T-ONB-01:** novo user passa pelos 4 passos do onboarding em < 90s
**T-ONB-02:** escolhe personalidade → personalidade reflete em chat
**T-ONB-03:** sai do onboarding no meio → ao voltar, retoma
**T-HOME-01:** abrir home mostra mascote + streak + missão + chips
**T-HOME-02:** offline, vê estado em cache
**T-CHECKIN-01:** clica chip água → loading rápido → XP confirmado
**T-CHECKIN-02:** check-in offline → vai pra queue → sincroniza ao voltar online
**T-CHECKIN-03:** duplo clique não duplica (idempotency)
**T-CHECKIN-04:** 7º check-in do dia confirma mas não dá XP (cap)
**T-XP-01:** XP server-authoritative (modificar cliente via debug não muda XP real)
**T-STREAK-01:** check-in dia 1 → 2 → 3 → streak = 3
**T-STREAK-02:** check-in dia 1 → pula dia 2 → faz dia 3 → streak = 2 (gastou grace)
**T-STREAK-03:** pula 3 dias seguidos → streak = 0
**T-CHAT-01:** mensagem "oi" → recebe resposta da personalidade certa
**T-CHAT-02:** "to triste" → resposta acolhedora, não clínica
**T-CHAT-03:** "tenho depressão" → resposta de safety (não diagnóstica), flag `watch`
**T-CHAT-04:** "quero me matar" → resposta hardcoded CVV, **não chama LLM**, flag `critical`
**T-CHAT-05:** 21ª mensagem em 1h (free) → 429
**T-MISS-01:** missão do dia visível
**T-MISS-02:** completar → +XP, missão sumir
**T-PUSH-01:** push diário no horário esperado
**T-PUSH-02:** opt-out → cessa imediatamente
**T-PAY-01:** trial → cartão → 7 dias depois cobra → confirma assinatura
**T-PAY-02:** cancelar antes de 7d → sem cobrança
**T-PAY-03:** cancelar mensal → mantém acesso até fim do período
**T-PAY-04:** Restore purchases após reinstall
**T-LGPD-01:** exportar dados → JSON correto
**T-LGPD-02:** excluir conta → 30d grace → purga
**T-LGPD-03:** revogar push consent → para de mandar
**T-PERF-01:** cold start < 3s no iPhone 12
**T-PERF-02:** scroll home 60fps
**T-A11Y-01:** VoiceOver lê home corretamente
**T-A11Y-02:** Dynamic Type ajusta sem quebrar
**T-A11Y-03:** Reduce Motion desabilita spring

### Critérios de aceite global

- Zero crash em smoke completo
- Zero data loss (check-in offline ≠ perda)
- Zero falha de safety (T-CHAT-04 deve PASSAR sempre)
- Zero RLS bypass (T-SEC-RLS-01 deve falhar tentar acessar dado de outro user)

### Bug severity

- **P0:** crash, data loss, safety falho → fixar imediato
- **P1:** feature core não funciona → fixar antes de release
- **P2:** UX problem afetando >10% users → fixar no próximo release
- **P3:** cosmético → backlog

### Release checklist

- [ ] Todos T-XXX P0 passam
- [ ] Build produção em dispositivo real (não só simulador)
- [ ] Smoke test feito por humano
- [ ] Sentry captura erros
- [ ] PostHog feature flags configurados
- [ ] Versão incrementada (semver)
- [ ] Release notes redigidas
- [ ] Rollback plan documentado (OTA rollback)

---

## 46. Custos

### Custos pré-MVP (mês 1)

| Item | R$/mês | Observação |
|---|---|---|
| Domínio | R$ 4 | meumascote.app via Namecheap |
| Apple Developer | R$ 50 | USD 99/ano amortizado |
| Google Play | R$ 0 | one-time USD 25 |
| Backend | R$ 0 | free tier |
| Vercel | R$ 0 | free tier |
| OpenAI (testes) | R$ 50 | ~3M tokens com gpt-4o-mini |
| Figma | R$ 0 | free tier |
| Rive | R$ 0 | free tier (5 files) |
| TikTok Ads | R$ 1500 | 30d × R$ 50 |
| Instagram Ads | R$ 1500 | 30d × R$ 50 |
| Meta Ads | R$ 900 | 30d × R$ 30 |
| **Subtotal ferramentas** | **R$ 100** | |
| **Subtotal marketing** | **R$ 3900** | |
| **Total mês 1** | **R$ 4000** | |

### Custos mês 2-3 (beta + soft launch)

| Item | R$/mês |
|---|---|
| Ferramentas (acima) | R$ 100 |
| OpenAI prod (~100 ativos) | R$ 100 |
| Backend Pro tier (se ultrapassar free) | R$ 130 |
| EAS plan | R$ 150 |
| PostHog (se ultrapassar 1M events) | R$ 0-300 |
| Sentry team | R$ 150 |
| Resend | R$ 100 |
| Ads (R$ 5k validados, R$ 8k expansão) | R$ 8000 |
| Creator deals | R$ 1000 |
| Reserva legal (LGPD, contrato) | R$ 500 |
| **Total mês 2-3** | **R$ 10.230** |

### Custos por usuário ativo (escala)

| Usuários | OpenAI | Backend | RevenueCat | Push | Outros | Custo/user/mês |
|---|---|---|---|---|---|---|
| 100 | R$ 100 | R$ 0 | R$ 0 | R$ 0 | R$ 200 | R$ 3,00 |
| 1.000 | R$ 1.000 | R$ 130 | R$ 0 | R$ 100 | R$ 500 | R$ 1,73 |
| 10.000 | R$ 7.500 | R$ 500 | R$ 0 | R$ 400 | R$ 1.500 | R$ 0,99 |
| 100.000 | R$ 50.000 | R$ 3.000 | R$ 600 | R$ 2.500 | R$ 6.000 | R$ 0,62 |

**Margem bruta** com 10.000 ativos × R$ 19,90 = R$ 199.000 - R$ 9.900 custos = **R$ 189.100/mês (95%)**.

### Custos one-time / projeto

| Item | R$ | Quando |
|---|---|---|
| Logo profissional | R$ 1.000 | mês 2 |
| Marca registrada INPI | R$ 350 | mês 3 |
| Contrato de termos/política revisado por advogado | R$ 2.000 | antes do paywall ligado |
| CNPJ MEI/ME | R$ 100 | antes da primeira cobrança real |
| Conta PJ | R$ 0 | antes do primeiro pagamento |

### Salários (não pagos no MVP)

- Felipe + Renato: founder pay R$ 0 nos primeiros 6 meses
- Quando MRR > R$ 30k: começar com R$ 3k cada
- Quando MRR > R$ 100k: salário de mercado R$ 8-12k cada

---

## 47. Modelo financeiro

### Premissas

- Preço médio (mensal + anual ponderado): R$ 17/mês
- CAC blended: R$ 60 (orgânico+pago)
- Churn mensal: 12% inicial → 8% otimização
- Trial→pago conversão: 45%
- Apple/Google take 15-30%: assumir 22% blended

### Receita líquida por user

```
Receita bruta médio user: R$ 17/mês
Take store (22%): -R$ 3,74
Custo infra: -R$ 1,00
Custo IA: -R$ 0,80
Custo email/push: -R$ 0,20
Margem líquida: R$ 11,26/mês por user
```

### LTV por cohort de churn

```
LTV = ARPU × margem × (1 / churn rate)

Churn 12%: R$ 17 × 0.66 × (1/0.12) = R$ 93,50
Churn 8%:  R$ 17 × 0.66 × (1/0.08) = R$ 140,25
Churn 5%:  R$ 17 × 0.66 × (1/0.05) = R$ 224,40
```

Target: estabilizar churn < 8% até mês 12.

### Modelo projeção 12 meses

| Mês | Novos ativos | Total pagantes | MRR | Custo total | Resultado | Caixa acum (assume R$ 30k inicial) |
|---|---|---|---|---|---|---|
| 1 | 0 | 0 | R$ 0 | R$ 4.000 | -R$ 4.000 | R$ 26.000 |
| 2 | 0 | 0 | R$ 0 | R$ 7.000 | -R$ 7.000 | R$ 19.000 |
| 3 | 50 | 50 | R$ 850 | R$ 10.000 | -R$ 9.150 | R$ 9.850 |
| 4 | 200 | 230 | R$ 3.910 | R$ 13.000 | -R$ 9.090 | R$ 760 ⚠️ |
| 5 | 350 | 510 | R$ 8.670 | R$ 16.000 | -R$ 7.330 | -R$ 6.570 🚨 |
| 6 | 500 | 859 | R$ 14.603 | R$ 18.000 | -R$ 3.397 | -R$ 9.967 |
| 7 | 700 | 1.256 | R$ 21.352 | R$ 20.000 | +R$ 1.352 | -R$ 8.615 |
| 8 | 900 | 1.706 | R$ 29.002 | R$ 24.000 | +R$ 5.002 | -R$ 3.613 |
| 9 | 1.100 | 2.201 | R$ 37.417 | R$ 28.000 | +R$ 9.417 | +R$ 5.804 |
| 10 | 1.300 | 2.737 | R$ 46.529 | R$ 32.000 | +R$ 14.529 | +R$ 20.333 |
| 11 | 1.500 | 3.308 | R$ 56.236 | R$ 36.000 | +R$ 20.236 | +R$ 40.569 |
| 12 | 1.700 | 3.911 | R$ 66.487 | R$ 40.000 | +R$ 26.487 | +R$ 67.056 |

**Insights:**
- Cash flow turns positive no mês 7 com R$ 30k inicial
- Caixa fica negativo mês 5–8 → precisa de **R$ 15-20k extra de runway** OU acelerar receita OU reduzir custo de ads
- Break-even MRR R$ 25k ~ mês 8

### Cenário stress (50% pior)

| Variável | Base | Stress |
|---|---|---|
| Trial→pago | 45% | 30% |
| Churn mensal | 12% | 18% |
| CAC | R$ 60 | R$ 100 |
| MRR mês 12 | R$ 66k | R$ 25k |
| Caixa mês 12 | +R$ 67k | -R$ 40k 🚨 |

Em stress, precisa de **R$ 60k de capital** OU corte drástico de ads.

### Cenário otimista (50% melhor)

| Variável | Base | Otimista |
|---|---|---|
| Trial→pago | 45% | 55% |
| Churn | 12% | 8% |
| CAC | R$ 60 | R$ 40 |
| MRR mês 12 | R$ 66k | R$ 130k |

### Decisão financeira

**Recomendado:**
1. Começar com **R$ 30k** de capital próprio (founders)
2. Ter **R$ 20k** reserva acessível (Pix/emergência)
3. Se mês 5 indicar stress (mais que 1 variável vermelha) → reduzir ads para R$ 50/dia total e crescer só orgânico
4. Se mês 9 ainda em queima > R$ 10k/mês → buscar investidor anjo (round pré-seed R$ 200-400k em equity simples)

---

## 48. Experimentos

### Lista priorizada

**E-001 — Onboarding com quiz vs escolha livre de personalidade**
- Hipótese: quiz aumenta D7 em 15% pois persona-fit melhora
- Métrica primária: D7 retention
- Métrica secundária: troca de personalidade nos primeiros 7d
- Duração: 14 dias
- Variantes: A=escolha livre (controle), B=quiz 4 perguntas
- Decisão: B > A em D7 com p < 0.10 → ship B

**E-002 — Trial 7d vs 14d**
- Hipótese: 14d aumenta conversion final em 20%
- Métrica primária: trial → pago
- Secundária: D30 dos pagos
- Duração: 30 dias
- Variantes: A=7d (controle), B=14d
- Decisão: B > A em conv com margem suficiente → ship B; se aumentar mas D30 cair, manter A

**E-003 — Paywall agressivo (no início) vs depois (após 3 dias de uso)**
- Hipótese: depois converte mais
- Métrica: trial start rate
- Variantes: A=imediato (controle), B=delayed 72h
- Cuidado: tem implicação ética (não enganar com "grátis pra sempre")

**E-004 — Push 1x vs 2x dia**
- Hipótese: 2x aumenta DAU mas pode aumentar opt-out
- Métrica: DAU, push opt-out rate
- Decisão: balance entre engagement e churn

**E-005 — Streak grace 2d vs 3d**
- Hipótese: 3d reduz churn no dia 4 sem perder engajamento
- Métrica: D7 retention, dias até churn

**E-006 — Hero da landing (3 variações)**
- Métrica: visitor → form
- Variantes: H1, H2, H3 (Parte 4 §27)

**E-007 — Preço R$ 14,90 vs R$ 19,90 vs R$ 24,90**
- Métrica: conv visitor → pago, LTV
- Variantes: 3 preços
- Cuidado: implementação por cohort, não trocar para usuário existente

**E-008 — Avatar mascote com vs sem nome de pet do user**
- Hipótese: personalização aumenta vínculo
- Métrica: D7, conversas com mascote/user

### Processo

1. **Hipótese clara** (X muda Y em Z%)
2. **Métrica primária única**
3. **Sample size mínimo** (calculator)
4. **Duração max** (~14 dias para não ficar sangrando atenção)
5. **Critério de decisão antecipado**
6. **Log de experimentos** (planilha)

### Não A/B testar (não vale a pena no MVP)

- Cor exata do botão
- Pequena variação de copy
- Posição de items
- Coisas com sample size insuficiente

---

## 49. Riscos

### Matriz (probabilidade × impacto)

| # | Risco | Probabilidade | Impacto | Score | Mitigação |
|---|---|---|---|---|---|
| R-01 | App Review rejeita por "Medical App" | média | alto | 🔴 | Linguagem 100% wellness, disclaimer prominente, auditar copy antes de submeter |
| R-02 | LLM gera conteúdo inadequado em produção | média | crítico | 🔴 | Detector input+output, fallback hardcoded, T-CHAT-04 obrigatório, alerta para safety crítico |
| R-03 | Churn alto após trial (>20%) | alta | alto | 🔴 | Best-time push, engagement loops, win-back; se persistir, baixar preço ou estender trial |
| R-04 | CAC sobe acima de R$ 100 | média | alto | 🟠 | Pausar canal, dobrar orgânico, ajustar criativo |
| R-05 | OpenAI muda preço ou política | baixa | alto | 🟠 | Roteador permite Claude fallback; abstrair LLM interface |
| R-06 | Incidente de dados (LGPD) | baixa | crítico | 🟠 | RLS default deny, audit logs, training Felipe+Renato |
| R-07 | Apple/Google take = 30% (não 15%) | alta | médio | 🟠 | Já no modelo conservador |
| R-08 | Renato sai do projeto | baixa | crítico | 🟠 | Documentar tudo, contratar freelance ilustrador como backup |
| R-09 | Felipe burnout | média | crítico | 🟠 | Horário máximo 50h/sem, dia off semanal, terapia individual |
| R-10 | Bug crítico após launch | alta | médio | 🟡 | OTA via EAS Update, rollback plan, Sentry alerts |
| R-11 | Concorrente (Finch) entra BR PT-BR | baixa | alto | 🟡 | Acelerar comunidade BR; difícil reverter brand já estabelecida |
| R-12 | App Store cobra atualização não esperada | média | baixo | 🟡 | Buffer R$ 1k extra |
| R-13 | Push não chega (token expirado, etc) | alta | médio | 🟡 | Retry, monitoring, revalidar tokens |
| R-14 | Tráfego orgânico TikTok não converte | média | alto | 🟠 | Diversificar IG, FB, search; não single channel |
| R-15 | LGPD multa por descuido | baixa | crítico | 🟠 | Documentação, DPO, treinamento |
| R-16 | Time mascote não consegue 4 fases × 4 humores em 4 sem | média | médio | 🟠 | Lançar com 3 fases × 3 humores; expandir pós-launch |
| R-17 | Custo OpenAI explode com user growth | baixa | alto | 🟠 | Cache, rate limit, modelo cheaper, alerta de billing |
| R-18 | Reembolso/chargeback alto | baixa | médio | 🟡 | Trial cancela fácil, refund 7d, comunicação clara |
| R-19 | Empresa sem CNPJ rejeitada por banco | média | médio | 🟡 | Abrir MEI antes do primeiro pagamento |
| R-20 | Conta Apple Developer suspensa por TOS | baixa | crítico | 🟢 | Sempre cumprir guidelines; backup builds em EAS para acesso rápido |

### Plano de resposta para R-01 (caso ocorra)

1. Apple manda review reject — ler exatamente o motivo
2. Se "Medical": revisar todo copy do app E descrição da store
3. Remover qualquer menção a "saúde mental", "tratamento", etc.
4. Submeter novamente com nota explicativa em "Notes for Review": "Mascote is a wellness/self-care companion. Not a medical app. We use only wellness terminology and direct users to professional resources (CVV 188) for any crisis."
5. Se rejeitar de novo, agendar call com Apple via App Review

### Plano de resposta para R-02 (LLM problema em prod)

1. Detector flagrou ou usuário reportou
2. Pegar conversa em painel admin
3. Em 4h: avaliar se é incident crítico ou padrão
4. Se crítico: hotfix no detector (regra adicional) + OTA via EAS Update + comunicar usuário individual
5. Pós-mortem em 7d documentado, regra somada ao corpus de testes

---

## 50. Critérios de go/no-go

### Decisão 1 — 48h pós-landing

| Critério | Vai (verde) | Pausa (vermelho) |
|---|---|---|
| Landing ao ar | sim | não |
| Form funcional | sim | não |
| 15+ inscrições | sim | < 5 |

**Se vermelho:** review semana, ajustar.

### Decisão 2 — 7 dias

| Critério | Continua | Pivota | Para |
|---|---|---|---|
| 200+ inscrições | sim | 100-200 | <100 |
| CPL < R$ 5 | sim | R$ 5-10 | > R$ 10 |
| 10+ entrevistas insightful | sim | 5-10 | <5 |

**Se "para":** considerar pivot ou shutdown.

### Decisão 3 — 30 dias (lançar beta?)

| Critério | Beta abre | Atrasar 2 sem | Parar |
|---|---|---|---|
| MVP funcional (T-XXX P0 passam) | sim | parcial | bloqueador grave |
| Crash rate < 1% | sim | 1-3% | > 5% |
| Safety T-CHAT-04 passa | sim | sim | falha |
| 50 convites prontos | sim | parcial | <30 |

### Decisão 4 — 90 dias (ligar paywall real?)

| Critério | Liga paywall | Atrasa 30d | Pivot |
|---|---|---|---|
| Beta D7 > 25% | sim | 15-25 | <15 |
| NPS beta > 30 | sim | 10-30 | <10 |
| Safety incidents | zero | 1-2 | 3+ |
| Bugs P0 abertos | zero | 1-2 | 3+ |

### Decisão 5 — 6 meses (escalar ou shutdown?)

| Critério | Escala (busca investidor) | Continua bootstrap | Shutdown |
|---|---|---|---|
| Assinantes ativos | 500+ | 200-500 | <100 |
| Churn mensal | <12% | 12-20% | >25% |
| LTV/CAC | >2 | 1-2 | <1 |
| NPS | >40 | 20-40 | <10 |
| Caixa restante | >R$ 30k | R$ 10-30k | <R$ 10k |

### Regras absolutas (kill criteria, qualquer momento)

- **Safety crítico não resolvido em 48h** → pausar produto
- **Incidente LGPD não comunicado** → pausar + reportar
- **Founder burnout sério** → pausa de 30d
- **Receita não cobre 70% custos por 3 meses consecutivos** → reestruturar urgente

---

## Decisões pendentes (Parte 6)

| ID | Decisão | Opções | Prazo |
|---|---|---|---|
| P6.1 | Região Backend | EU (recomendado) ou US | Antes de codar |
| P6.2 | DPA com OpenAI: zero-retention | sim (recomendado) | Antes do beta |
| P6.3 | Capital próprio inicial | R$ 30k (recomendado), R$ 20k mínimo | Antes do mês 1 |
| P6.4 | Quando abrir MEI | antes do primeiro pagamento real | Mês 2 |

**Atualizado em:** 2026-05-16
