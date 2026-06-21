# Tradução do app (pt / en / es) — design & roadmap

> Objetivo: tornar o **Meu Mascote** de fato multilíngue (pt-BR, en-US, es-419),
> mantendo o **pré-registro** e a ficha localizada da Play como estão.
> Pedido do Felipe (2026-06-21): "faça a tradução e mantenha o pré-registro".

## Por que isto é um projeto de fases (não um clique)

Estado real medido em 2026-06-21:
- O helper de i18n (`src/lib/i18n/`) existe mas cobre **só o atelier** (4 arquivos, ~126 linhas de strings), em **pt/en**.
- **Não há detecção de idioma do aparelho** (sem `expo-localization`). O app sempre roda em `pt`.
- **~108 componentes `.tsx`** com texto **cravado em português**.
- O **chat de IA responde em português** (prompts/personalidades + memória).
- A **malha de segurança de crise é regex em pt** ([[project_mascote_safety_architecture]]).

Tradução "de verdade" = extrair centenas de strings + traduzir × 3 + detecção de
idioma + **localizar a IA e a safety**. É multi-semana. A ficha/criativo já estão
localizados (não dependem disto) → o pré-registro segue normal.

## Princípio de arquitetura

Manter o helper local type-safe que já existe (`t('path.dotted')` + `StringsBundle`):
nada de i18next. `Record<Locale, StringsBundle>` faz o **compilador** exigir paridade
de chaves entre idiomas — QA grátis. Cada feature ganha seu namespace dentro do bundle
(ex.: `atelier.*`, `onboarding.*`, `home.*`), espelhado em `-en.ts` / `-es.ts`.

## Fases

### Fase 1 — Fundação es + atelier (FEITA, 2026-06-21)
- `Locale = 'pt' | 'en' | 'es'`; `atelier-strings-es.ts` completo; export + mapa.
- Verificado: `tsc --noEmit` exit 0 + 18 testes de i18n verdes.

### Fase 2 — Detecção de idioma + troca manual
- Detectar o locale do aparelho no boot e passar pra `LocaleProvider initialLocale`.
- Toggle de idioma em Ajustes (pt/en/es) persistido (AsyncStorage).
- **Custo real:** `expo-localization` é **dep nativa** → precisa `expo prebuild`/rebuild
  do `android/` (que é commitado). Não dá pra verificar sem o pipeline de build/dispositivo.
- Fallback sem dep nativa (menos confiável): `Intl.DateTimeFormat().resolvedOptions().locale`.
- **Sem esta fase, nenhuma tradução aparece pro usuário** (o app fica preso em `pt`).

### Fase 3 — Extração de strings (o grosso)
- Inventariar os ~108 componentes; mover texto cravado pra bundles `t(...)`.
- Traduzir pt→en→es por namespace, **na ordem de tráfego**:
  onboarding → home → check-in → missão → chat (UI) → jornada → ajustes → closet → cosmos.
  (atelier já feito.)
- Cada PR: um cluster de telas + testes de paridade de chave. Manter os ~6.7k testes verdes.

### Fase 4 — IA + SEGURANÇA (a mais arriscada)
- Prompts/personalidades do chat passam a depender do `locale` (responder no idioma do user).
- **Bloqueante de segurança:** replicar a detecção de crise (auto-dano/suicídio) em EN e ES
  **antes** de liberar o chat nesses idiomas — senão crise em en/es passa batida.
  Ver [[project_mascote_safety_architecture]] e o histórico de falsos-negativos pt.
- Custo de tokens/QA da IA multiplica por idioma.

### Fase 5 — QA & loja
- e2e por locale; revisar truncamento/overflow de UI (es/de costumam ser ~20% mais longos);
- screenshots da ficha en/es já existem no repo (`assets/{enUS,es419}-*`), subir no Console se quiser.

## Riscos / armadilhas
- **Rebuild nativo** (Fase 2) — único passo que precisa do pipeline de build.
- **Safety por idioma** (Fase 4) — não-negociável; bloqueia liberar IA em en/es.
- **Paridade de testes** — adicionar `es` exige espelhar fixtures de teste que enumeram locales.
- **Gap de verificação aqui:** consigo escrever/typecheck/testar lógica pura, mas **não consigo
  buildar/rodar o app nem testar em dispositivo** neste ambiente. As fases de runtime (2, 4)
  precisam do build do Felipe / device pra validação real.

## O que NÃO muda
- Pré-registro, campanha de ads, ficha localizada da Play — tudo intacto.
