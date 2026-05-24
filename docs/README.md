# Documentação — Mascote

Índice oficial da pasta `docs/`.

## Fonte canônica (comece aqui)

| Documento | Uso |
|-----------|-----|
| [CURRENT_STATE.md](CURRENT_STATE.md) | Estado operacional real (o que funciona, o que falta) |
| [AUDIT_REAL_ATUAL.md](AUDIT_REAL_ATUAL.md) | Auditoria técnica mais recente com evidências |
| [RELEASE_READINESS.md](RELEASE_READINESS.md) | Go/No-Go para beta/release |
| [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) | Limites conhecidos e riscos ativos |

## Produto e engenharia

| Documento | Conteúdo |
|-----------|----------|
| [COMECAR_AQUI.md](COMECAR_AQUI.md) | Tour do produto e da proposta |
| [GUARANTEES.md](GUARANTEES.md) | Garantias de produto (G1–G4) |
| [EVOLUTION_ENGINE.md](EVOLUTION_ENGINE.md) | Motor de evolução procedural |
| [GAMIFICATION_SYSTEM.md](GAMIFICATION_SYSTEM.md) | XP, streak e recompensas |
| [AI_MASCOT_DESIGN.md](AI_MASCOT_DESIGN.md) | IA, safety e descritores |
| [AI_PROXY_CONTRACT.md](AI_PROXY_CONTRACT.md) | Contrato de integração do proxy IA |
| [PREMIUM_STRATEGY.md](PREMIUM_STRATEGY.md) | Estratégia Plus / paywall |
| [SYNC_ARCHITECTURE.md](SYNC_ARCHITECTURE.md) | Arquitetura de sync local-first |
| [UNITY_STATUS.md](UNITY_STATUS.md) | Situação atual da integração Unity |
| [UNITY_RUNBOOK_v3.md](UNITY_RUNBOOK_v3.md) | Runbook Unity canônico (Editor) |
| [BETA_RELEASE_CHECKLIST.md](BETA_RELEASE_CHECKLIST.md) | Checklist pré-beta nas lojas |

## Histórico e arquivados

| Documento/Pasta | Nota |
|-----------------|------|
| [archive/reports/](archive/reports/) | Relatórios antigos consolidados/substituídos |
| [archive/unity/](archive/unity/) | Runbooks Unity antigos (v1/v2) |
| [AUDIT_AAA_COMPLETO.md](AUDIT_AAA_COMPLETO.md) | Auditoria ampla histórica |
| [AUDIT_REPORT_2026-05-18.md](AUDIT_REPORT_2026-05-18.md) | Snapshot histórico de 18/05 |
| [VEREDITO-FINAL.md](VEREDITO-FINAL.md) | Veredito antigo (não canônico) |

## Outras pastas do repositório

| Pasta | Propósito |
|-------|-----------|
| `../app/mobile/` | App Expo (código principal) |
| `../app/web/` | Landing Next.js |
| `./plano/` | Plano estratégico de negócio |
| `../scripts/` | Scripts auxiliares |
| `./validation/` | Validação de mercado |

## Comandos úteis (raiz)

```bash
npm install --prefix app/mobile
npm run typecheck
npm test
npm run web
```
