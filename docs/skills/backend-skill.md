# Backend Skill — Blister

> Source of truth: [`docs/prd/blister-master-prd.md`](../prd/blister-master-prd.md) · [`docs/project/architecture.md`](../project/architecture.md)

## Objective

Guide implementation, refactoring, or review in `apps/api`.

## Module structure

```
apps/api/src/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.service.spec.ts
  dto/                  ← Zod schemas required
```

## Validation (Zod always)

- Every body, query, and parsed params pass through Zod in the controller.
- Agent/LLM outputs validated with Zod before persist or return.
- Shared schemas live in `packages/types`.
- Service validates business invariants: `companyId`, status, credit balance.

```typescript
const parsed = createCampaignSchema.safeParse(body);
if (!parsed.success) throw new BadRequestException(parsed.error.issues);
return this.service.create(currentUser.id, parsed.data);
```

## Existing modules

`auth`, `users`, `platform`, `audit`, `email`, `prisma`

## Target domains (MVP)

| Module | Responsibility |
|--------|----------------|
| `company/` | Brand Brain, business profile |
| `campaigns/` | Optional campaigns + context files |
| `agents/` | Pluggable registry, workflow engine, 3 MVP agents |
| `rag/` | Ingestion, pgvector embeddings, rerank, learning |
| `credits/` | Balance, debit per run, free tier |
| `ai-catalog/` | Models, providers, markup (admin) |

## Critical rules

- Sensitive reads/mutations always use `@RequirePermission(key)`.
- Public endpoints always use `@Public()`.
- `userId` from `req.currentUser.id`, never from body.
- Resource IDs from `req.params`, never from body.
- **Zod on every boundary** — no `unknown` in services.
- Prisma is the only database access.
- Scope by `companyId` — validate ownership on every mutation.

## Checklist

- [ ] Zod on every DTO and AI output
- [ ] Business validation in service
- [ ] `@RequirePermission` on mutations
- [ ] New permission in `packages/authz` first
- [ ] `companyId` scope validated
- [ ] Critical mutations in `AuditLog`
