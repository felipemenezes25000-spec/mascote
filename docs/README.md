# Documentação — Mascote

Índice da pasta `docs/`. Para o estado operacional atual, comece por **[CURRENT_STATE.md](CURRENT_STATE.md)**.

## Por onde começar

| Documento | Quando usar |
|-----------|-------------|
| [CURRENT_STATE.md](CURRENT_STATE.md) | Verdade operacional: o que funciona, gaps, comandos |
| [COMECAR_AQUI.md](COMECAR_AQUI.md) | Tour das telas e features (handoff de design) |
| [BETA_RELEASE_CHECKLIST.md](BETA_RELEASE_CHECKLIST.md) | Checklist antes de beta nas lojas |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | Release geral (billing, env, QA) |

## Produto e engenharia

| Documento | Conteúdo |
|-----------|----------|
| [EVOLUTION_ENGINE.md](EVOLUTION_ENGINE.md) | Motor de evolução procedural |
| [GAMIFICATION_SYSTEM.md](GAMIFICATION_SYSTEM.md) | XP, streak, recompensas |
| [AI_MASCOT_DESIGN.md](AI_MASCOT_DESIGN.md) | IA, safety, descritores |
| [PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md) | Mascote Plus / paywall |
| [PLANO_MIGRACAO_PROCEDURAL_3D.md](PLANO_MIGRACAO_PROCEDURAL_3D.md) | Migração 2D → 3D |
| [specs/BACKLOG_DLI_V2.md](specs/BACKLOG_DLI_V2.md) | Specs executáveis DLI |
| [ROADMAP_DIGITAL_LIVING_IDENTITY.md](ROADMAP_DIGITAL_LIVING_IDENTITY.md) | Roadmap 6 meses |

## Auditorias e relatórios (históricos)

| Documento | Nota |
|-----------|------|
| [AUDIT_AAA_COMPLETO.md](AUDIT_AAA_COMPLETO.md) | Auditoria multi-role (referência) |
| [AUDIT_REPORT_2026-05-18.md](AUDIT_REPORT_2026-05-18.md) | Snapshot 18/05 |
| [VEREDITO-FINAL.md](VEREDITO-FINAL.md) | Veredito consolidado (pode divergir do código) |
| [TEST_REPORT.md](TEST_REPORT.md) | Relatório de testes (atualizar após mudanças grandes) |

## Evidência visual

- [screenshots/2026-05-19/](screenshots/2026-05-19/) — fluxo onboarding + home (Playwright)

## Outras pastas do repositório

| Pasta | Propósito |
|-------|-----------|
| `../app/mobile/` | App Expo (código principal) |
| `../app/web/` | Landing Next.js |
| `./plano/` | Plano estratégico de negócio (7 partes) |
| `../scripts/` | Smoke Android + Maestro auxiliar |
| `../validation/` | Validação de mercado (landing estática + survey) |

## Comandos (raiz do repo)

```bash
npm install --prefix app/mobile
npm run typecheck
npm test              # 1779 testes, 110 arquivos
npm run web           # Expo web
```
