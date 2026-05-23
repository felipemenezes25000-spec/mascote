# Screenshots — convenções de organização

Este diretório guarda capturas de tela com **valor permanente** para o
projeto: marcos de design, baselines de QA, evidências de release etc.
Capturas descartáveis (debug temporário, prints de uma sessão isolada)
**não devem ser commitadas**.

## Onde cada tipo de captura mora

- **Capturas de design / QA com valor permanente**
  → `docs/screenshots/<YYYY-MM-DD>/<descricao-kebab>.png`
  Ex.: `docs/screenshots/2026-05-19/onboarding-final.png` (já existe
  como exemplo do padrão).
- **Capturas de auditoria visual automatizada**
  → continuam onde o script `app/mobile/scripts/audit-visual.js` (ou
  scripts equivalentes) gera. Não mover manualmente para cá.
- **Frames de design da criatura (concept art)**
  → `docs/design/creature-evolution/` (versão atual) e
  `docs/design/creature-evolution/legacy/` (versões antigas mantidas
  só para comparação histórica).
- **Assets reais usados em runtime pelo app**
  → `app/mobile/assets/`. Nunca em `app/mobile/` direto.

## O que é proibido (e por quê)

PNGs soltos na **raiz do repo** ou em **`app/mobile/`** estão bloqueados
pelo `.gitignore` (regras `/qa-*.png`, `/app-running.png`, `/v2-*.png`,
`/app/mobile/*.png` etc.). Esses caminhos eram usados para outputs do
Maestro (`takeScreenshot`) e capturas ad-hoc de QA, que poluíam o repo
e nunca tinham valor após o ciclo.

Se precisar promover uma captura ad-hoc para histórico permanente,
mova-a para `docs/screenshots/<data>/` com nome descritivo antes de
commitar.
