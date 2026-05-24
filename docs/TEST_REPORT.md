# Test Report — Mascote Mobile

**Data:** 2026-05-24  
**Escopo:** Continuação v8 AAA (fases 8-10 + lote de memória/evolução/maestro) com validação real de quality gates.

## Comandos executados nesta rodada

```powershell
cd app\mobile
npm test
npm run typecheck
npm run test:coverage
```

## Resultados reais desta rodada

| Comando | Status final | Detalhe |
|---------|--------------|---------|
| `npm test` | ✅ | **5549 testes**, 168 arquivos |
| `npm run typecheck` | ✅ | 0 erros TS strict |
| `npm run test:coverage` | ✅ | thresholds do CI respeitados |

### Cobertura real desta rodada (Vitest + v8)

- Statements: **73.37%**
- Branches: **67.66%**
- Functions: **75.84%**
- Lines: **73.61%**

## Cobertura de mudanças novas

- ✅ Fase 8-10 remanescente validada sem duplicação:
  - `UnityDebugPanel` com métricas ACK
  - integração `proxyMascotReply` (payload/fetch)
  - sync/export com `life_state`
  - guard de billing em produção
  - des-enfase de chat na Home
- ✅ Memória emocional (Phase 2.4):
  - gravação de eventos de simulação em memória leve
  - recall usado em linhas proativas de retorno/momento/hábito
- ✅ Microevolução rara (Phase 3):
  - trigger raro conectado ao fluxo Home
  - teste de gatilho de streak para `micro-recovery-bloom`
- ✅ Maestro smoke:
  - fluxo `app/mobile/.maestro/home-return-sim.yaml` adicionado

## Observações honestas

- Fluxos Maestro foram atualizados, mas **não executados em device/emulador nesta rodada**.

## Pendências externas ainda válidas

- [ ] Executar Maestro em emulador/device real (smoke atualizado)
- [ ] RevenueCat sandbox E2E completo
- [ ] Proxy IA server-side deployado para integração ponta a ponta

---

*Atualizado com execução real de test/typecheck/coverage em 2026-05-24.*
