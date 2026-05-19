# Mascote

> App de autocuidado gamificado em PT-BR. Um mascote evolui conforme você cuida de si — sono, água, respiração, leitura, journaling. Sem ranking, sem culpa, sem terapia.

**Status:** MVP local-first rodando (web + Android nativo). Sem backend, sem cobrança real, sem cloud.

---

## O que é

Um companheiro digital que:

- **Evolui com hábitos** — ovo → bebê → criança → adolescente → adulto → evoluído
- **Tem 4 personalidades** — Calmo (Bipo), Motivador (Zip), Fofo (Lulu), Sábio (Aro)
- **Conversa contigo** — IA mock por personalidade ou OpenAI BYOK (gpt-4o-mini)
- **Lembra de você** — memória de longo prazo (TF-IDF / embeddings local)
- **Tem safety net** — detecta crise → entrega CVV 188 + CAPS + SAMU, sem chamar IA
- **Roda 100% local** — AsyncStorage como banco, nada sai do dispositivo

Posicionamento: **bem-estar e autocuidado**. Nunca terapia, diagnóstico ou cura.

---

## Quick start

```powershell
cd app/mobile
npx expo install
npx expo start --web
```

Abre em `http://localhost:8081`. Detalhes completos (Expo Go, simuladores, BYOK OpenAI) em [`app/mobile/README.md`](app/mobile/README.md).

---

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React Native 0.74 + Expo SDK 51 + Expo Router 3.5 |
| Estado | Zustand |
| Animação | Reanimated 3 + Gesture Handler |
| Persistência | AsyncStorage (com schema migrations versionado) |
| IA | OpenAI gpt-4o-mini (BYOK) ou mock por personalidade |
| ML on-device | TF-IDF, embeddings, vector store, BM25, sentiment temporal |
| Testes | Vitest (1.344 testes, 98,89 % cobertura) + Maestro (E2E) + fast-check (property tests) |
| Build | Expo (web + Android nativo via gradle) |

---

## Estrutura do projeto

```
mascote/
├── app/mobile/              ← O app (React Native + Expo)
│   ├── app/                 ← Rotas Expo Router (45+ telas)
│   ├── src/
│   │   ├── components/      ← 38 componentes (Mascot, HabitChip, etc.)
│   │   ├── content/         ← Personalidades, missões, safety, replies
│   │   ├── lib/             ← db, ai, xp, streak, memory, ml/
│   │   └── store.ts         ← Zustand
│   ├── tests/               ← 67 arquivos de teste
│   └── .maestro/            ← E2E (8 fluxos)
├── plano_mascote/           ← 8 docs estratégicos (mercado, stack, growth, LGPD)
├── docs/
│   ├── AUDIT_REPORT_*.md    ← Auditoria técnica
│   ├── COMECAR_AQUI.md      ← Guia inicial
│   └── VEREDITO-FINAL.md    ← Análise de viralidade e prontidão
├── scripts/                 ← Utilitários (smoke test Android, etc.)
└── video-gen/               ← Vídeo de pitch para investidor
```

---

## Documentação

- [**app/mobile/README.md**](app/mobile/README.md) — Como rodar, problemas comuns, BYOK OpenAI
- [**docs/COMECAR_AQUI.md**](docs/COMECAR_AQUI.md) — Guia de primeiros passos
- [**docs/VEREDITO-FINAL.md**](docs/VEREDITO-FINAL.md) — Análise completa: notas por dimensão, riscos, recomendações
- [**docs/AUDIT_REPORT_2026-05-18.md**](docs/AUDIT_REPORT_2026-05-18.md) — Auditoria técnica detalhada
- [**plano_mascote/**](plano_mascote/) — Estratégia, mercado, produto, monetização, compliance

---

## O que está pronto

✅ Onboarding completo (11 telas)
✅ Home com mascote animado + 9 hábitos clicáveis + missão do dia
✅ XP / nível / fase com transições monotônicas
✅ Streak forgiving (2 graces, +1 a cada 14 dias)
✅ Chat por personalidade (mock + OpenAI BYOK)
✅ Safety em 5 camadas (regex input + ensemble ML + attachment + regex output + system prompt)
✅ Memória de longo prazo do mascote (TF-IDF / embeddings)
✅ Customização (acessórios, cenários, paletas, temas)
✅ Persistência local com migrations versionadas
✅ Tests 98,89 % linhas / 97,42 % branches

## O que não está (intencional)

✗ Backend cloud (planejado em Supabase — documentado em `plano_mascote/`)
✗ Cobrança real (paywall é placeholder visual)
✗ Push notifications nativos
✗ Login social
✗ Sync entre dispositivos

---

## Posicionamento — o que NÃO é o Mascote

- **Não é** terapia, diagnóstico ou tratamento
- **Não substitui** profissional de saúde mental
- **Não usa** as palavras: depressão, ansiedade clínica, transtorno, TDAH, diagnóstico, tratamento, trauma
- **Usa** as palavras: se cuidar, rotina, energia, humor, respirar, pausa

Em momentos de crise, o app entrega imediatamente **CVV 188** (24h, gratuito), **cvv.org.br**, **CAPS** e **SAMU 192** — sem chamar IA, sem demora.

---

## Autor

Felipe Menezes · [@felipemenezes25000-spec](https://github.com/felipemenezes25000-spec)

Co-fundador: Renato
