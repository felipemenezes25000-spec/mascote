# validation/ — Validação retroativa do Mascote

Estrutura de validação que endereça a "validação invertida": o plano original
(`plano_mascote/parte_5_execucao.md`) prescrevia validar antes de construir,
mas o MVP foi feito em paralelo. Esta pasta serve como ponte: rodar em 4
semanas o que deveria ter rodado em 30 dias antes do código.

## Conteúdo

| Arquivo | Propósito |
|---|---|
| [`PLAN.md`](PLAN.md) | Plano de validação completo — hipóteses, cronograma, go/no-go |
| [`survey-template.md`](survey-template.md) | 14 questões prontas pra Tally / Google Forms |
| [`metrics.md`](metrics.md) | Definições operacionais — como calcular cada métrica |
| [`landing/`](landing/) | Landing page estática deployável (Vercel/Netlify/GH Pages) |

## Como começar (em 4 horas)

1. **Deploy landing** — `cd validation/landing && vercel deploy` (ou push pra Netlify/GH Pages)
2. **Configurar survey** — importar `survey-template.md` em Tally.so (40 min)
3. **Conectar landing → survey** — adicionar redirect após waitlist signup
4. **Configurar 1 ad** — Meta Ads R$ 200/3 dias targeting Brasil, mulher 22-38, interesse "wellness"
5. **Esperar inscritos** — meta de 100 emails na primeira semana
6. **Marcar 10 entrevistas** — convidar via email os primeiros 50 inscritos

## O que NÃO está aqui

- Resultados de validação (`results.md` será criado sextas, à medida que os dados chegarem)
- Build do APK pra closed alpha (depende de EAS Build, fora dessa pasta)
- Dashboard consolidado (vem depois — talvez Notion ou Metabase)

## Reconciliação com plano original

Veja seção "Reconciliação com o plano original" em `PLAN.md`. TL;DR: app já existe,
validação serve como gate de scale (paid ads / public launch), não como gate
de viabilidade. Critério de morte continua sendo `parte_6` do plano (D7 < 15%
no mês 1 ou CAC > R$ 80 sem caminho de redução).
