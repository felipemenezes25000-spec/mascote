# Known Limitations — 2026-05-24

Documento vivo dos limites conhecidos no estado atual.

## Produto / plataforma

- Unity iOS ainda está em modo **stub/documentação** (sem bridge nativa final).
- Renderizador Unity no mobile depende de embed nativo; fallback para Three/2D é esperado em dev.
- E2E Maestro não roda no pipeline padrão de unit/integration.

## Backend / serviços externos

- Proxy IA de produção ainda não está deployado.
- RevenueCat real ainda não está integrado ponta-a-ponta no app nativo.
- Sync remoto multi-device ainda não existe (arquitetura local-first).

## Qualidade técnica

- Cobertura total passa threshold, mas há zonas com baixa cobertura em componentes visuais e integrações nativas.
- `noUncheckedIndexedAccess` segue desligado por volume de refactor pendente.
- Mocks de analytics/billing agora têm guard de produção, mas a validação completa ainda depende de smoke test em build release real.
- Living Moments está ativo no `lifeEvents` do tick atual; histórico longitudinal persistente de momentos ainda não existe.
- ACK RN↔Unity depende de confirmação ativa no runtime Unity; em ambientes stub/sem embed real o bridge executa retries e pode gerar timeout recoverable esperado.

## Segurança / operação

- Sem segredos hardcoded no cliente por padrão, mas integração de proxy IA continua sendo requisito para blindar chaves em produção.
- Build/release de loja ainda depende de configuração operacional externa (credenciais, tracks, EAS completo).
