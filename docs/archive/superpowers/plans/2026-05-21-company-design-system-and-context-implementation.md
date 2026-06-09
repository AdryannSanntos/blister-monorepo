# Company Design System and Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the company `Design System` feature, formalize `Context` and `Design System` as separate domains, store binaries and markdown artifacts in S3, and keep AI-facing markdown synchronized asynchronously from application-owned events.

**Architecture:** Reconcile the current asset/authz/schema foundation first, then add a dedicated backend domain for company design system data and sync state. Use PostgreSQL as the source of truth, `Trigger.dev` as the async orchestration layer for artifact generation, and AWS S3 as the storage target for uploaded files and generated markdown. On the frontend, add a routed dashboard page with tabs for `Cores`, `Assets`, and `Identidade`, protected by new explicit permissions.

**Tech Stack:** Next.js 16, React 19, NestJS 11, Prisma, PostgreSQL, Zod, CASL, TanStack Query, TanStack Table, shadcn/ui, Tailwind CSS v4, Trigger.dev, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, LocalStack for local S3 emulation, TypeScript strict

---

## File Structure

### New backend files

- `apps/api/src/design-system/design-system.module.ts`
- `apps/api/src/design-system/design-system.controller.ts`
- `apps/api/src/design-system/design-system.service.ts`
- `apps/api/src/design-system/design-system.service.spec.ts`
- `apps/api/src/design-system/design-system-sync.service.ts`
- `apps/api/src/design-system/dto/get-design-system.dto.ts`
- `apps/api/src/design-system/dto/update-design-identity.dto.ts`
- `apps/api/src/design-system/dto/create-color-group.dto.ts`
- `apps/api/src/design-system/dto/update-color-group.dto.ts`
- `apps/api/src/design-system/dto/create-color-token.dto.ts`
- `apps/api/src/design-system/dto/update-color-token.dto.ts`
- `apps/api/src/design-system/dto/create-design-asset.dto.ts`
- `apps/api/src/design-system/dto/update-design-asset.dto.ts`
- `apps/api/src/design-system/dto/regenerate-design-artifact.dto.ts`
- `apps/api/src/design-system/dto/index.ts`
- `apps/api/src/storage/storage.module.ts`
- `apps/api/src/storage/storage.service.ts`
- `apps/api/src/storage/storage.service.spec.ts`
- `apps/api/src/storage/dto/create-upload-url.dto.ts`
- `apps/api/src/context/context-sync.service.ts`
- `apps/api/src/context/context-markdown.serializer.ts`
- `apps/api/src/design-system/design-system-markdown.serializer.ts`

### New Trigger files

- `apps/api/trigger/design-system-sync.task.ts`
- `apps/api/trigger/context-sync.task.ts`
- `apps/api/trigger/shared/s3-artifact-writer.ts`
- `apps/api/trigger/shared/markdown-builders.ts`
- `apps/api/trigger/shared/task-payloads.ts`
- `apps/api/trigger.config.ts`

### New frontend files

- `apps/web/src/app/dashboard/workspace/design-system/page.tsx`
- `apps/web/src/core/modules/design-system-company/pages/company-design-system-page.tsx`
- `apps/web/src/core/modules/design-system-company/hooks/use-company-design-system.ts`
- `apps/web/src/core/modules/design-system-company/components/design-system-header.tsx`
- `apps/web/src/core/modules/design-system-company/components/design-system-tabs.tsx`
- `apps/web/src/core/modules/design-system-company/components/color-groups-table.tsx`
- `apps/web/src/core/modules/design-system-company/components/upsert-color-group-dialog.tsx`
- `apps/web/src/core/modules/design-system-company/components/upsert-color-token-dialog.tsx`
- `apps/web/src/core/modules/design-system-company/components/design-assets-table.tsx`
- `apps/web/src/core/modules/design-system-company/components/upload-design-asset-dialog.tsx`
- `apps/web/src/core/modules/design-system-company/components/design-identity-form.tsx`
- `apps/web/src/core/modules/design-system-company/components/sync-status-badge.tsx`

### Modified shared/backend/frontend files

- `packages/authz/src/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/package.json`
- `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`
- `apps/web/src/core/shared/components/ui/app-sidebar.tsx`
- `docs/decisions/sidebar-flows.md`
- `docs/decisions/mvp-features.md`
- `docs/decisions/execution-order.md`

---

## Task 1: Reconcile the current foundation mismatches

**Files:**
- Modify: `packages/authz/src/index.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Inspect: `apps/api/src/assets/**/*`
- Inspect: `apps/web/src/core/modules/assets/**/*`

- [ ] **Step 1: Verify the real source of truth for asset schema and permissions**

Inspect the current Prisma schema, generated client usage, and asset module files.

Expected outcome:

- identify whether the checked-in `schema.prisma` is missing committed asset models
- confirm which asset permissions are already required by shipped frontend/backend code

- [ ] **Step 2: Normalize `asset.*` permissions in `packages/authz/src/index.ts`**

Add or reconcile the existing asset permission keys and subjects so the current codebase matches the authz package contract.

Expected permission set:

```text
asset.read
asset.create
asset.update
asset.archive
asset.context.review
integration.read
```

- [ ] **Step 3: Normalize the Prisma source of truth before expanding the domain**

If asset models are missing from `schema.prisma`, restore them first before introducing `Design System` tables.

Expected outcome:

- `schema.prisma` matches the models referenced by the current repository code

- [ ] **Step 4: Run baseline verification**

Run:

```bash
pnpm --filter @company-os/api test
pnpm typecheck
```

Expected:

- current asset module still compiles against the normalized foundation

---

## Task 2: Add explicit design system permissions

**Files:**
- Modify: `packages/authz/src/index.ts`

- [ ] **Step 1: Add new permission keys**

Add:

```text
design-system.read
design-system.update
```

- [ ] **Step 2: Add CASL subject mappings**

Add subjects if needed, for example:

```text
DesignSystem
DesignAsset
```

And map permissions consistently in `permissionMap`.

- [ ] **Step 3: Update default roles**

Expected default behavior:

```text
owner: read + update
admin: read + update
member: no default access unless granted later
```

- [ ] **Step 4: Verify the authz package**

Run:

```bash
pnpm typecheck
```

Expected:

- no authz typing errors

---

## Task 3: Add Prisma models for company design system and sync state

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add the root design system profile model**

The root model should be one-per-organization and track sync state.

It should support fields like:

```text
organizationId
identity summary fields or structured JSON blocks
design artifact sync status
design artifact syncedAt
design artifact error message
```

- [ ] **Step 2: Add color group and color token models**

Expected responsibilities:

- one design system has many color groups
- one color group has many colors
- each color carries semantic role and optional guidance text

- [ ] **Step 3: Add design asset models**

Design assets should store:

```text
organizationId or designSystemProfileId
primaryRole
secondaryTags[] or normalized tags relation
title
description
s3 object key
content type
file name
size
```

- [ ] **Step 4: Add context sync state if missing**

Ensure the operational `Context` domain can also track markdown sync status cleanly.

- [ ] **Step 5: Generate Prisma client and verify schema**

Run:

```bash
pnpm --filter @company-os/api prisma generate
pnpm typecheck
```

Expected:

- generated client compiles with the new tables

---

## Task 4: Add AWS S3 storage foundation

**Files:**
- Create: `apps/api/src/storage/storage.module.ts`
- Create: `apps/api/src/storage/storage.service.ts`
- Create: `apps/api/src/storage/storage.service.spec.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install or confirm required S3 packages**

Required packages:

```text
@aws-sdk/client-s3
@aws-sdk/s3-request-presigner
@aws-sdk/lib-storage (recommended)
```

The storage implementation must support LocalStack through endpoint override and path-style mode.

- [ ] **Step 2: Add a typed storage service contract**

The storage service should support:

```text
createPresignedUploadUrl
putMarkdownArtifact
deleteObject
buildObjectKey
```

- [ ] **Step 3: Standardize S3 object key conventions**

Expected object key patterns:

```text
organizations/<orgId>/context/context.md
organizations/<orgId>/design-system/design-system.md
organizations/<orgId>/design-system/assets/<assetId>/<filename>
```

- [ ] **Step 4: Add environment variable expectations**

Expected configuration:

```text
AWS_REGION
AWS_S3_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_S3_PUBLIC_BASE_URL (optional)
AWS_S3_ENDPOINT (optional, for S3-compatible providers)
AWS_S3_FORCE_PATH_STYLE
```

- [ ] **Step 5: Verify the storage service with unit tests**

Run:

```bash
pnpm --filter @company-os/api test storage.service.spec.ts
```

Expected:

- object key generation and artifact upload contract are covered

---

## Task 5: Add Trigger.dev async pipeline for markdown sync

**Files:**
- Create: `apps/api/trigger.config.ts`
- Create: `apps/api/trigger/design-system-sync.task.ts`
- Create: `apps/api/trigger/context-sync.task.ts`
- Create: `apps/api/trigger/shared/*`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install Trigger.dev packages**

Required packages depend on chosen SDK version, but the expected stack is:

```text
@trigger.dev/sdk or current Trigger.dev v4 package set
```

- [ ] **Step 2: Add Trigger config to the API app**

The config should support:

- local dev
- deployment build
- task discovery for the design-system and context sync tasks

- [ ] **Step 3: Create a design system sync task**

Responsibilities:

- load company design system data from the database
- serialize deterministic markdown
- write `design-system.md` to S3
- update sync status in the database

- [ ] **Step 4: Create a context sync task**

Responsibilities mirror design system sync for `context.md`.

- [ ] **Step 5: Define retry and failure behavior**

Expected behavior:

- transient failures retry automatically
- final failure marks the artifact sync as `failed`
- error metadata remains product-safe and non-sensitive

- [ ] **Step 6: Add required Trigger environment variables**

Expected configuration:

```text
TRIGGER_SECRET_KEY
TRIGGER_PROJECT_ID
TRIGGER_API_URL (if required by deployment model)
```

---

## Task 6: Add backend design system module and API surface

**Files:**
- Create: `apps/api/src/design-system/**/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the NestJS module skeleton**

Add module, controller, service, DTO index, and tests.

- [ ] **Step 2: Add read endpoint**

Expected route family:

```text
GET /organizations/:orgId/design-system
```

Permission:

```text
design-system.read
```

- [ ] **Step 3: Add identity update endpoint(s)**

Expected route family:

```text
PATCH /organizations/:orgId/design-system/identity
```

Permission:

```text
design-system.update
```

- [ ] **Step 4: Add color group and color token endpoints**

Expected route families:

```text
POST/PATCH/DELETE /organizations/:orgId/design-system/color-groups
POST/PATCH/DELETE /organizations/:orgId/design-system/colors
```

- [ ] **Step 5: Add design asset endpoints**

Expected route families:

```text
POST /organizations/:orgId/design-system/assets/upload-url
POST /organizations/:orgId/design-system/assets
PATCH /organizations/:orgId/design-system/assets/:assetId
DELETE /organizations/:orgId/design-system/assets/:assetId
```

- [ ] **Step 6: Add manual regeneration endpoint**

Expected route:

```text
POST /organizations/:orgId/design-system/regenerate-artifact
```

This endpoint should enqueue Trigger work rather than regenerate inline.

---

## Task 7: Add deterministic markdown serializers

**Files:**
- Create: `apps/api/src/design-system/design-system-markdown.serializer.ts`
- Create: `apps/api/src/context/context-markdown.serializer.ts`

- [ ] **Step 1: Define serializer output rules**

Rules:

- fixed heading order
- stable section names
- no internal IDs
- no hidden AI scoring or metadata
- concise product-facing wording

- [ ] **Step 2: Implement `design-system.md` serialization**

Required sections:

```text
brand overview
identity principles
color palette
color restrictions
official assets
logo guidance
visual references
AI notes
known gaps
```

- [ ] **Step 3: Implement `context.md` serialization**

Follow the same deterministic structure rules for the operational domain.

- [ ] **Step 4: Add serializer tests**

Expected coverage:

- section order
- omission rules
- fallback behavior for missing optional data

---

## Task 8: Add frontend route and permission-aware navigation

**Files:**
- Create: `apps/web/src/app/dashboard/workspace/design-system/page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`
- Modify: `apps/web/src/core/shared/components/ui/app-sidebar.tsx`

- [ ] **Step 1: Add the new dashboard route file**

The page should render the new company design system page component.

- [ ] **Step 2: Replace the current `Em breve` sidebar behavior**

Expected new behavior:

- real route link
- active state support
- permission-based visibility using `design-system.read`

- [ ] **Step 3: Verify route protection and navigation labels**

Expected product copy:

- `Design System` under the `Empresa` group

---

## Task 9: Implement frontend data hooks and page shell

**Files:**
- Create: `apps/web/src/core/modules/design-system-company/hooks/use-company-design-system.ts`
- Create: `apps/web/src/core/modules/design-system-company/pages/company-design-system-page.tsx`
- Create: `apps/web/src/core/modules/design-system-company/components/design-system-header.tsx`
- Create: `apps/web/src/core/modules/design-system-company/components/design-system-tabs.tsx`
- Create: `apps/web/src/core/modules/design-system-company/components/sync-status-badge.tsx`

- [ ] **Step 1: Add React Query hooks for read and write operations**

Expected hook families:

```text
useCompanyDesignSystem
useUpdateDesignIdentity
useCreateColorGroup
useUpdateColorGroup
useCreateColorToken
useUpdateColorToken
useDeleteColorToken
useCreateDesignAsset
useUpdateDesignAsset
useDeleteDesignAsset
useRegenerateDesignArtifact
```

- [ ] **Step 2: Build the page shell with header and tabs**

The page should show:

- title and description
- sync status
- manual regeneration action inside `PermissionGate`

- [ ] **Step 3: Wire active organization context correctly**

Use `useActiveOrganization()` and React Query patterns consistent with the project.

---

## Task 10: Implement the Colors tab

**Files:**
- Create: `apps/web/src/core/modules/design-system-company/components/color-groups-table.tsx`
- Create: `apps/web/src/core/modules/design-system-company/components/upsert-color-group-dialog.tsx`
- Create: `apps/web/src/core/modules/design-system-company/components/upsert-color-token-dialog.tsx`

- [ ] **Step 1: Model color groups as a table-first UI**

Expected columns at the group or nested level:

```text
group name
color count
updated at
actions
```

- [ ] **Step 2: Add per-color editing with semantic role support**

Each color must support:

- name
- color value
- display format
- semantic role
- optional note/restriction

- [ ] **Step 3: Protect mutations with `design-system.update`**

All create/edit/delete actions must render only within `PermissionGate`.

---

## Task 11: Implement the Assets tab

**Files:**
- Create: `apps/web/src/core/modules/design-system-company/components/design-assets-table.tsx`
- Create: `apps/web/src/core/modules/design-system-company/components/upload-design-asset-dialog.tsx`

- [ ] **Step 1: Build the assets table**

Expected columns:

```text
preview
primary role
secondary tags
title
file type
updated at
actions
```

- [ ] **Step 2: Implement upload flow using presigned URLs**

Expected frontend flow:

1. request upload URL from API
2. upload file directly to S3
3. create or confirm design asset metadata in API

- [ ] **Step 3: Keep MVP behavior text-first for AI**

Do not add automatic extraction or multimodal processing in this phase.

- [ ] **Step 4: Protect mutations with `design-system.update`**

Uploads, edits, and deletes must be permission-gated.

---

## Task 12: Implement the Identity tab

**Files:**
- Create: `apps/web/src/core/modules/design-system-company/components/design-identity-form.tsx`

- [ ] **Step 1: Build a hybrid structured form**

Suggested sections:

```text
brand essence
desired perception
visual style
what to avoid
conceptual references
AI notes
```

- [ ] **Step 2: Use project form standards**

Required:

- `react-hook-form`
- `Zod`
- `FormItem > FormLabel > FormControl > FormMessage`
- project tokens and components only

- [ ] **Step 3: Save directly with clear sync feedback**

The form should communicate both data save success and downstream markdown sync state.

---

## Task 13: Add docs and product decision updates

**Files:**
- Modify: `docs/decisions/sidebar-flows.md`
- Modify: `docs/decisions/mvp-features.md`
- Modify: `docs/decisions/execution-order.md`

- [ ] **Step 1: Update sidebar flow docs**

Reflect that `Design System` is no longer `Em breve` and is now a real routed domain.

- [ ] **Step 2: Update MVP feature status**

Reflect that the feature is now implemented or in implementation, depending on merge timing.

- [ ] **Step 3: Update execution-order references if needed**

Clarify how `Context` and `Design System` interact with future company brain and AI workflows.

---

## Task 14: End-to-end verification

**Files:**
- Test: affected backend and frontend suites

- [ ] **Step 1: Verify backend tests**

Run:

```bash
pnpm --filter @company-os/api test
```

Expected:

- design system, storage, and serializer tests pass

- [ ] **Step 2: Verify frontend checks**

Run:

```bash
pnpm --filter @company-os/web typecheck
pnpm --filter @company-os/web test
```

Expected:

- no route or hook typing regressions

- [ ] **Step 3: Verify async sync manually in development**

Manual flow:

1. edit identity or colors
2. confirm database mutation succeeds
3. confirm Trigger task runs
4. confirm markdown artifact updates in S3
5. confirm sync status updates in UI

Expected:

- end-to-end sync works for both `design-system.md` and `context.md`

---

## Required Infrastructure Configuration

### Trigger.dev

Configure now:

```text
TRIGGER_SECRET_KEY
TRIGGER_PROJECT_ID
```

Also prepare:

- Trigger project linked to the API app
- local/dev instructions for running Trigger workers alongside NestJS

### AWS S3

Configure now:

```text
AWS_REGION
AWS_S3_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

Optional but recommended:

```text
AWS_S3_ENDPOINT
AWS_S3_PUBLIC_BASE_URL
AWS_S3_FORCE_PATH_STYLE
```

For the current local setup, use:

```text
AWS_REGION=us-east-2
AWS_S3_BUCKET=workana-ai-bucket
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
```

Bucket expectations:

- private bucket by default
- IAM policy allowing scoped object read/write/delete for the application
- lifecycle rules can be added later, not required for MVP

### Recommended upload strategy

Use presigned URLs rather than proxying all file bytes through NestJS.

Why:

- better scalability
- simpler backend request load
- cleaner separation of metadata vs binary upload responsibilities

---

## Plan Notes

- This plan intentionally treats async sync as first-class product infrastructure, not a background convenience.
- This plan intentionally uses `Trigger.dev` for orchestration and retries rather than S3 events as the primary business coordinator.
- Do not commit as part of execution unless explicitly requested by the user.
