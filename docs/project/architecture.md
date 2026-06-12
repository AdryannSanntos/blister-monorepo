# Arquitetura — Blister OS

## Monorepo

```
apps/
  web/           Next.js 16 + React 19 — UI OS (Plano 2 fixtures → Plano 3 API)
  api/           NestJS 11 — HTTP, auth, Prisma adapters, agent registry
packages/
  agent-sdk/     Workflow kernel + agent implementations (100% logic)
  authz/         CASL permissions
  types/         Shared Zod DTOs
  configs/       TS presets
```

pnpm workspaces + Turbo. Biome lint/format.

---

## Boundary: SDK vs API

```
┌─────────────────────────────────────────────────────────┐
│ packages/agent-sdk                                       │
│  AgentBuilder · WorkflowEngine · steps · learning       │
│  research · cuts · video_editor · planning · script …   │
└───────────────────────────┬─────────────────────────────┘
                            │ adapters (injected)
┌───────────────────────────▼─────────────────────────────┐
│ apps/api/src/agents/                                     │
│  agents.controller.ts · agent-catalog · adapters/       │
│  (Prisma, RAG, Credits, Storage — NO business logic)    │
└─────────────────────────────────────────────────────────┘
```

Rule: **never** implement agent steps in `apps/api/src/agents/{id}/` — only in SDK.

---

## Stack

**Frontend:** Next.js 16, React 19, Tailwind v4, shadcn/ui, RHF+Zod, TanStack Query, nuqs, zustand, Playwright, next-themes

**Backend:** NestJS 11, Prisma + PostgreSQL + pgvector, better-auth, CASL, Zod, Resend, S3

**IA:** AI runtime adapters, embedding + rerank, Trigger.dev for async runs/index

---

## Backend domains — target

```
apps/api/src/
  auth/ users/ platform/ audit/ email/ prisma/     ← exist
  workspace/     ← settings, personal space (Plano 3)
  files/         ← browser + extract (Plano 3)
  marketplace/   ← items + redeem (Plano 3)
  projects/      ← workspace projects (Plano 3)
  agents/        ← registry + HTTP only
  rag/           ← ingestion, retrieval
  credits/ ai-catalog/ storage/                   ← exist partial
  company/ brand/                                 ← legacy → workspace migration
```

Context model: [`workspace-context.md`](workspace-context.md)

---

## Frontend routes — OS

```
/dashboard                              ← home
/dashboard/agents/video-editor          ← editor wizard
/dashboard/agents/cuts                  ← cortes wizard
/dashboard/agents/[agentId]             ← research, planning, script…
/dashboard/marketplace
/dashboard/marketplace/[itemId]
/dashboard/library
/dashboard/projects
/dashboard/files                        ← replaces brand + uploads
/dashboard/settings                     ← replaces /dashboard/brand
/workspaces/admin                       ← platform admin
/auth/*
```

Visual contract: [`blister-os-reference.html`](../../blister-os-reference.html)

---

## Agent execution (isolated)

```
POST /api/agents/:agentId/run
  → AuthGuard → workspace scope → CreditsCheck
  → AgentRun QUEUED → Trigger agent-run-execute
  → SDK WorkflowEngine (steps of THIS agent only)
  → RAG ContextPack (settings + files + learning)
  → outputPayload → review endpoints → learning → RAG
```

No `PipelineOrchestrator`. See [`2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md).

---

## StepContext (SDK — target)

```typescript
{
  workspaceId: string;
  agentId: string;
  userInput: string;
  projectId?: string;
  workspaceSettings: WorkspaceSettings;
  project?: Project;
  ragPack: RagContextPack;
  stepOutputs: Record<string, unknown>;
  agentRunId: string;
}
```

Replaces `brandBrain` + `campaign` from legacy StepContext.

---

## Frontend phases

| Phase | Data |
|-------|------|
| Plano 2 | Fixtures + Zustand/localStorage — **zero HTTP product API** |
| Plano 3 | TanStack Query hooks → real endpoints |

Mark future contracts: `// CONTRACT: see docs/plans/blister-os/03-backend.md#...`

---

## Auth

- better-auth: session only
- `AuthGuard` global; `@Public()` explicit
- `userId` from `req.currentUser.id`

---

## Request flow

```
Browser → AuthGuard → PermissionGuard → Controller → Service → Prisma
                                              ↓
                                         AuditLog (sensitive mutations)
```

Proxy: `apps/web/src/proxy.ts` — `/dashboard/*` requires session.

See: [`current-state.md`](current-state.md) · [`user-flows.md`](user-flows.md)
