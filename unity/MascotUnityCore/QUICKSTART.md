# ⚡ QUICKSTART — Voltando ao Unity

> Sessão Cowork 2026-05-23 deixou tudo pronto. Quando você voltar, faça os 4 passos abaixo (5-10 min).

## 1) Liberar Avast (real)

O Avast tem **Self-Defense** ligado — o `Stop-Service` não funciona, e desativar pelo Hub também não basta. **Tem que ser pela UI dele:**

**Click direito no ícone do Avast** (bandeja do sistema, perto do relógio) →
**Avast Shields control** → **Disable for 10 minutes** → confirma o warning amarelo

Se não tiver ícone na bandeja, vai em:
**Avast UI → Menu (⋯) → Configurações → Proteção → Core Shields → File Shield → desliga**

## 2) Abrir Unity

Click no atalho do Unity Hub na taskbar, depois no card **MascotUnityCore**.

Library/Package Manager vai resolver em ~30-60s (com Avast off não vai dar mais o erro do IPC).

## 3) Rodar o setup

No menu superior: **Mascote → 🚀 Setup Everything** → diálogo → **Sim, bora!** → ~30s

## 4) Play!

Aperta **▶** (top center). Vai aparecer:
- **Bipo azul** no centro do Game view
- **HUD de 3 colunas** com Identidade / Reações / 18 Acessórios

**Testa:**
- Click `cap_classic` → chapéu vermelho no topo da cabeça
- Click `glasses_round` → óculos pretos
- Click `wings_angel` → asas brancas atrás
- Click `zip` → mascote troca pra laranja
- Click `aura_cosmic` → anel ciano ao redor

---

## Se algo der errado

| Problema | Fix rápido |
|---|---|
| Erro "Could not connect to IPC stream Upm-X" | Avast ainda bloqueando — refazer Passo 1 |
| Mascote rosa | Menu **Mascote → Setup URP Pipeline** |
| Mascote vazio (só sockets) | Menu **Mascote → Generate Mascot Prefabs (Primitives)** |
| Cena sem nada | Menu **Mascote → Build Complete Scene (MascotRoom)** |
| Tudo zoado | Menu **Mascote → 🚀 Setup Everything** (regenera tudo) |
| "script missing" em algum GameObject | Library/ corrompido — fecha Unity, deleta pasta `Library/`, reabre (5-15 min reimport) |

---

## Documentação completa

`docs/UNITY_RUNBOOK_v3.md` — snapshot pós-sessão com arquitetura, roadmap, troubleshooting expandido.

## Commits da sessão (rollback fácil)

```
e74c228 feat(unity): final wire-up — auto-wire all controllers in Awake
7160165 docs(unity): RUNBOOK_v3 final
9bb41b9 feat(unity): scene builder + test harness rich
f961098 feat(unity): mascot prefabs from scratch + URP setup
b9ba8e1 chore(unity): bump ProjectVersion to 6000.4.8f1
```
