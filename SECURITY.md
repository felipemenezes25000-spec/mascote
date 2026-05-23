# Política de Segurança

Obrigado por se preocupar com a segurança do Mascote. Esta página descreve como reportar vulnerabilidades de forma responsável e o que esperar do nosso lado.

## Versões com suporte

O projeto ainda não tem releases estáveis com versionamento semântico. Por enquanto, **apenas a branch `main`** recebe correções de segurança.

| Versão | Suporte de segurança |
| ------ | -------------------- |
| `main` | ✅ ativa             |
| outras | ❌                    |

## Como reportar uma vulnerabilidade

**Não abra uma issue pública** descrevendo a falha. Use um dos canais privados abaixo:

1. **Preferido — GitHub Security Advisories:**
   [Abrir advisory privado](https://github.com/felipemenezes25000-spec/mascote/security/advisories/new)
   O canal padrão do GitHub permite divulgação coordenada, gera CVE quando aplicável e mantém o histórico no próprio repositório.

2. **Alternativo — mensagem direta:**
   Se preferir, abra uma issue *vazia* dizendo apenas "Preciso reportar uma questão de segurança em privado" e marcando [@felipemenezes25000-spec](https://github.com/felipemenezes25000-spec). Vamos abrir um canal privado em seguida.

### O que incluir no reporte

- Descrição clara do problema e do impacto potencial.
- Passos de reprodução (PoC mínimo é ideal).
- Versões/commit hash afetados.
- Se aplicável, sugestão de mitigação.

## Escopo

Áreas cobertas por esta política:

- Aplicativo mobile (`app/mobile/`)
- Landing page (`app/web/`)
- Edge Functions e schema Supabase (`supabase/`)
- Workflows e infraestrutura em `.github/`

Fora de escopo:

- Bugs funcionais não relacionados a segurança (use o template de bug report).
- Dependências de terceiros que já tenham CVE publicado — reporte upstream, mas avise se nosso uso amplifica o risco.
- Ataques que exigem comprometimento físico do dispositivo do usuário ou engenharia social contra o time.

## O que esperar

| Etapa                      | Prazo alvo                    |
| -------------------------- | ----------------------------- |
| Confirmação de recebimento | até **5 dias** úteis          |
| Triagem inicial e severidade | até **10 dias** úteis        |
| Correção ou mitigação      | varia por severidade          |
| Divulgação coordenada      | combinada com quem reportou   |

Como o projeto é mantido por uma pessoa, prazos podem variar. Vamos ser transparentes sobre o andamento.

## Princípios de produto que afetam segurança

Algumas garantias do Mascote (`docs/GUARANTEES.md`) têm impacto direto em segurança e privacidade:

- **DNA nunca sai do device em forma crua.** Só descritores pt-BR seguros vão para a IA.
- **Recursos de crise (CVV 188 / SAMU 192)** estão sempre acessíveis, sem IA e sem paywall — falhas que escondam ou degradem esse caminho são tratadas como severidade alta.
- **Sem culpa.** Bugs que façam o app punir ausência (ex.: streak ou decay agressivo) são considerados regressões críticas de produto e tratados com prioridade.

Obrigado por ajudar a manter o Mascote seguro.
