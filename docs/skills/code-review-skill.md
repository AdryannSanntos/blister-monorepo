# Code Review Skill — Blister OS

> Fonte: [`CLAUDE.md`](../../CLAUDE.md) · [`00-execution-rules.md`](../plans/blister-os/00-execution-rules.md)

## Ordem de revisão

1. **Segurança & authz** — `@RequirePermission`, workspace scope, no `userId` from body
2. **Contratos** — Zod frontiers, shared types in `packages/types`
3. **OS alignment** — matches reference routes/NAV? Brand Brain removed?
4. **SDK boundary** — agent logic not in `apps/api`?
5. **Plano 2 check** — no product API imports in OS modules?
6. **Design** — tokens, typography components, animations
7. **Qualidade** — tests where required (Playwright smoke)

## Red flags

| Flag | Verdict |
|------|---------|
| New `/dashboard/brand` or Brand Brain copy | Reject |
| `PipelineOrchestrator` or auto agent chain | Reject |
| Agent steps in `apps/api/src/agents/{id}/` | Reject — move to SDK |
| `apiClient` in Plano 2 OS feature | Reject |
| `strategist`/`copywriter`/`designer`/`post` new flows | Reject |
| Missing `feedback-handler.ts` in SDK agent | Reject |
| Permission used before authz declaration | Reject |
| Fetch in page component | Reject — use hook |

## Plano-aware

- Plano 1: docs consistency
- Plano 2: fixtures functional, zero HTTP
- Plano 3: contract in 03-backend.md implemented

## Linguagem

UI strings operational PT-BR; code identifiers English.

## Legado

Changes that expand MEI/post/pecas scope need explicit ADR — default reject during OS migration.
