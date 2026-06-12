---
name: Blister OS Migration (index)
overview: "Plano monólito dividido em 3 planos conectados. Implementação: Correção → Frontend → Backend."
todos: []
isProject: false
---

# Blister OS — Índice de migração

> **Este plano foi dividido.** Use os planos em [`docs/plans/blister-os/`](../../docs/plans/blister-os/).

## Ordem de execução

```
1. Correção + Docs  →  2. Frontend  →  3. Backend
```

**Regras globais:** [`docs/plans/blister-os/00-execution-rules.md`](../../docs/plans/blister-os/00-execution-rules.md)

## Planos

| # | Documento | Escopo |
|---|-----------|--------|
| 0 | [00-execution-rules.md](../../docs/plans/blister-os/00-execution-rules.md) | Sincronização, fontes de verdade, frontend-first |
| 1 | [01-correction-and-docs.md](../../docs/plans/blister-os/01-correction-and-docs.md) | PRD, ADR, skills, regras, arquivos legados |
| 2 | [02-frontend.md](../../docs/plans/blister-os/02-frontend.md) | `apps/web` + `blister-os-reference.html` |
| 3 | [03-backend.md](../../docs/plans/blister-os/03-backend.md) | API, Prisma, agent-sdk, agentes |

## Nota

O conteúdo detalhado do monólito original permanece útil como referência histórica nos arquivos acima. O contrato vivo entre frontend e backend está em **Plano 3 → Contrato com o Frontend**, atualizado pelo Plano 2.

**Plano 2:** zero integração com API — UI completa com dados fake funcionais. Integração real = Plano 3, Fase 3.7.
