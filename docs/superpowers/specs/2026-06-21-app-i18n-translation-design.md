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

### Fase 2a — Troca manual de idioma (FEITA, 2026-06-21 noite)
- `localeFromLanguage()`/`languageFromLocale()` mapeiam o campo livre
  `settings.language` (pt-BR/en-US/es-419) ↔ `Locale`. Zero mudança de schema.
- `RootLayout` chama `setLocale(localeFromLanguage(settings.language))` no render:
  cold-boot correto + troca reativa (RootLayout assina settings → re-render).
- Seletor pt/en/es na tela de Personalização.
- Verificado: tsc + suíte completa (6768) + lint. **Runtime (boot/reatividade em
  device) pendente do QA do Felipe.** Falta só a **Fase 2b** (auto-detect do device
  via expo-localization, dep nativa + rebuild).

### Fase 3 — Extração de strings (EM ANDAMENTO, 2026-06-21 noite)
Padrão provado e telas FEITAS (namespace por feature em STRINGS_PT/EN/ES):
- Loop diário: `checkin`, `checkin_result` (3 funções), `mission_done` (5 funções) ✅
- Funil onboarding: `onboarding.welcome`, `signup`, `onboarding.age`,
  `onboarding.goal`, `onboarding.style` ✅ (fluxo welcome→signup→age→goal→style)
- `common` (continue/ok) — reusado p/ reduzir duplicação.
- Armadilhas: (a) const/array módulo-level → builder no render; (b) interpolação =
  entrada FUNÇÃO + `t(path,...args)`; (c) `const t` local renomeado; (d) guards a11y
  estáticos que checam `accessibilityLabel="literal"` → generalizar regex p/ `{t('...')}`.
Padrão repetível: (1) achar strings cravadas; (2) namespace nos 3 bundles (pt =
cópia atual EXATA → zero mudança pro usuário pt); (3) `t('ns.key')` no componente,
import `{ t } from '@/lib/i18n'`; (4) tsc + testes; (5) commit. **Const/array em
módulo-level: transformar em builder chamado no render.**
Próximas por tráfego: signup, home `(tabs)/index`, mission/mission-done,
chat UI `(tabs)/chat`, resto do onboarding, settings, paywall, journey, cosmos.

### Fase 2b — Auto-detecção do idioma do aparelho (opcional/futuro)
- Default inteligente: detectar o locale do aparelho no boot e gravar em
  `settings.language` na 1ª execução (o usuário ainda pode trocar manual na 2a).
- **Custo real:** `expo-localization` é **dep nativa** → precisa `expo prebuild`/rebuild
  do `android/` (que é commitado). Não dá pra verificar sem o pipeline de build/dispositivo.
- Fallback sem dep nativa (menos confiável): `Intl.DateTimeFormat().resolvedOptions().locale`.
- Não é bloqueante: com a 2a o usuário já escolhe idioma; isto só melhora o default.

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
