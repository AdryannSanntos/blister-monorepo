# Blister OS — Planos de migração

> Índice dos três planos conectados que substituem o monólito único de migração.

## Ordem de execução

```
1. Correção + Docs     →  2. Frontend     →  3. Backend
   (01-correction)         (02-frontend)        (03-backend)
```

**Leia primeiro:** [00-execution-rules.md](./00-execution-rules.md)

## Planos

| # | Arquivo | Escopo |
|---|---------|--------|
| 0 | [00-execution-rules.md](./00-execution-rules.md) | Regras globais, fontes de verdade, sincronização entre planos |
| 1 | [01-correction-and-docs.md](./01-correction-and-docs.md) | Adequar projeto ao Blister OS: docs, skills, regras, arquivos legados, proto HTML |
| 2 | [02-frontend.md](./02-frontend.md) | `apps/web` — telas e fluxos baseados em `blister-os-reference.html` |
| 3 | [03-backend.md](./03-backend.md) | `apps/api`, `packages/agent-sdk`, Prisma, RAG, agentes |

## Referências fixas (não divergir)

| Recurso | Caminho |
|---------|---------|
| Proto visual | [`blister-os-reference.html`](../../../blister-os-reference.html) |
| Plano monólito (legado) | [`.cursor/plans/blister_os_migration_e0a9114a.plan.md`](../../../.cursor/plans/blister_os_migration_e0a9114a.plan.md) |
| PRD alvo | `docs/prd/blister-os-prd.md` (criado no Plano 1) |
| ADR pivot | `docs/decisions/2026-06-12-blister-os-pivot.md` (criado no Plano 1) |

## Princípio de sincronização

O **frontend é implementado antes do backend** (após o Plano 1), **sem nenhuma integração** — apenas dados fake **funcionais** (resgate, wizards, arquivos, settings persistem localmente). Toda mudança de funcionalidade ou contrato no frontend deve ser refletida na seção **Contrato com o Frontend** do Plano 3. A integração real com API acontece só no Plano 3.
