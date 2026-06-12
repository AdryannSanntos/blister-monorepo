# Skills / Commands de desenvolvimento — Blister OS

Slash commands em `.claude/commands/` (espelhados em `.opencode/agents/`).

> Fonte de produto: [`docs/prd/blister-os-prd.md`](../prd/blister-os-prd.md) · Planos: [`docs/plans/blister-os/`](../plans/blister-os/)

## Skills disponíveis

| Command | Papel | Quando usar |
|---------|-------|-------------|
| `/context` | Agente estratégico — lê PRD OS, planos, authz, schema | Produto, priorização, PRDs |
| `/backend` | `apps/api` + Plano 3 — **não** agent logic in API | Endpoints, migrations |
| `/frontend` | `apps/web` — reference HTML, Plano 2 fixtures | Telas OS, zero API |
| `/design` | Design system + blister-os-reference | UI fidelity |
| `/authz` | Permissões — 5 roles target | Nova key authz |
| `/review` | Code review checklist OS | PRs |

## Protocolo `/context`

1. `CLAUDE.md`
2. `package.json` (raiz + apps)
3. `packages/authz/src/index.ts`
4. `docs/prd/blister-os-prd.md`
5. `docs/plans/blister-os/00-execution-rules.md`
6. `docs/decisions/2026-06-12-blister-os-pivot.md`
7. `docs/skills/*`
8. `apps/api/prisma/schema.prisma`

## Regras reforçadas

- Permissão em tudo; SDK monolith; sem Brand Brain; sem pipeline
- Plano 2: zero integração API produto
- Código em inglês; copy UI PT-BR operacional

## Skills de processo

`docs/superpowers/` = histórico specs/planos — não contrato OS.

Detalhe cada skill: [`docs/skills/README.md`](../skills/README.md)
