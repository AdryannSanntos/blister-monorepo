# Blister Docs

Documentação viva do **Blister OS** — SO de conteúdo video-first.

## Planos de migração (comece aqui)

**Regras:** [`docs/plans/blister-os/00-execution-rules.md`](plans/blister-os/00-execution-rules.md)

Ordem: [01 Correção + Docs](plans/blister-os/01-correction-and-docs.md) → [02 Frontend](plans/blister-os/02-frontend.md) → [03 Backend](plans/blister-os/03-backend.md)

Plano 2: **zero integração** — UI com fixtures funcionais; API só no Plano 3.

---

## Hierarquia de fontes

| # | Fonte | Uso |
|---|-------|-----|
| 1 | [`docs/prd/blister-os-prd.md`](prd/blister-os-prd.md) | Produto e domínio |
| 2 | [`blister-os-reference.html`](../blister-os-reference.html) | Layout, NAV, fluxos visuais |
| 3 | [`docs/plans/blister-os/00-execution-rules.md`](plans/blister-os/00-execution-rules.md) | Ordem e sync planos |
| 4 | [`CLAUDE.md`](../CLAUDE.md) | Regras operacionais código |
| 5 | [`docs/decisions/2026-06-12-blister-os-pivot.md`](decisions/2026-06-12-blister-os-pivot.md) | ADR pivot |
| 6 | [`docs/design-system/blister-os-reference.md`](design-system/blister-os-reference.md) | Inventário telas |
| 7 | [`docs/project/`](project/) | Arquitetura, fluxos, auth, estado |
| 8 | [`docs/agents/`](agents/) | Agentes + workflow |
| 9 | [`docs/marketplace/README.md`](marketplace/README.md) | Marketplace e biblioteca |

**Legado:** [`docs/prd/blister-master-prd.md`](prd/blister-master-prd.md) — deprecated.

---

## Estrutura

```
docs/
├── plans/blister-os/   ← planos de execução 01/02/03
├── prd/                ← blister-os-prd + módulos
├── project/            ← arquitetura, fluxos, workspace-context
├── agents/             ← default + marketplace agents
├── marketplace/        ← catálogo e resgate
├── decisions/          ← ADRs
├── design-system/      ← tokens + blister-os-reference
├── skills/             ← skills IA desenvolvimento
├── archive/            ← MEI/Workana — NÃO usar como contrato
└── setup/
```

---

## Produto (resumo)

- **Video-first:** Editor, Cortes, Pesquisar (default)
- **Marketplace:** Edit Styles, templates, agentes extras → Biblioteca
- **Contexto:** Configurações + Arquivos — sem módulo Brand Brain
- **Projetos:** workspace operacional — runs isoladas por ferramenta

Termos UI: ver [`blister-os-prd.md`](prd/blister-os-prd.md) § Linguagem.

---

## Regra de conflito

1. Código mergeado em `main`
2. `blister-os-reference.html`
3. `blister-os-prd.md`
4. ADR 2026-06-12
5. Planos 01/02/03

`docs/archive/` e `docs/superpowers/` = histórico apenas.
