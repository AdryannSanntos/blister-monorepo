# Assets and Integrations Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first functional `Assets` workspace feature and the first frontend-only `Integrations` screen, while codifying AI-first, permission-first, and design-system-first project rules.

**Architecture:** Add explicit asset permissions in `packages/authz`, create a dedicated NestJS assets module and Prisma data model, then implement a React Query-based workspace assets experience with two tabs (`Context` and `Operational`) inside the existing dashboard shell. Implement `Integrations` as a routed frontend shell using the same project components and permission patterns, without real connector backend behavior yet.

**Tech Stack:** Next.js 16, React 19, NestJS 11, Prisma, Zod, CASL, TanStack Query, TanStack Table, shadcn/ui, Tailwind CSS v4, Biome, TypeScript strict

---

## File Structure

### New backend files

- `apps/api/src/assets/assets.module.ts`
- `apps/api/src/assets/assets.controller.ts`
- `apps/api/src/assets/assets.service.ts`
- `apps/api/src/assets/assets.service.spec.ts`
- `apps/api/src/assets/dto/create-asset.dto.ts`
- `apps/api/src/assets/dto/update-asset.dto.ts`
- `apps/api/src/assets/dto/list-assets.dto.ts`
- `apps/api/src/assets/dto/bulk-update-assets.dto.ts`
- `apps/api/src/assets/dto/index.ts`

### New frontend files

- `apps/web/src/core/modules/assets/pages/assets-page.tsx`
- `apps/web/src/core/modules/assets/hooks/use-assets.ts`
- `apps/web/src/core/modules/assets/components/assets-header.tsx`
- `apps/web/src/core/modules/assets/components/assets-tabs.tsx`
- `apps/web/src/core/modules/assets/components/assets-table.tsx`
- `apps/web/src/core/modules/assets/components/assets-bulk-actions.tsx`
- `apps/web/src/core/modules/assets/components/asset-detail-sheet.tsx`
- `apps/web/src/core/modules/assets/components/add-context-source-dialog.tsx`
- `apps/web/src/core/modules/assets/components/add-operational-asset-dialog.tsx`
- `apps/web/src/core/modules/integrations/pages/integrations-page.tsx`
- `apps/web/src/core/modules/integrations/components/integrations-catalog.tsx`
- `apps/web/src/core/modules/integrations/components/integrations-connections-table.tsx`
- `apps/web/src/app/(dashboard)/workspace/assets/page.tsx`
- `apps/web/src/app/(dashboard)/workspace/integrations/page.tsx`

### Modified shared/backend/frontend/docs files

- `packages/authz/src/index.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`
- `docs/skills/project-engineering-skill.md`
- `docs/skills/frontend-skill.md`
- `docs/skills/backend-skill.md`
- `docs/skills/design-system-skill.md`
- `/Users/adryansantos/.claude/skills/company-os-frontend/SKILL.md`
- `/Users/adryansantos/.claude/skills/company-os-backend/SKILL.md`
- `/Users/adryansantos/.claude/skills/company-os-design/SKILL.md`
- `/Users/adryansantos/.claude/skills/company-os-authz/SKILL.md`

---

### Task 1: Codify cross-cutting project rules

**Files:**
- Modify: `docs/skills/project-engineering-skill.md`
- Modify: `docs/skills/frontend-skill.md`
- Modify: `docs/skills/backend-skill.md`
- Modify: `docs/skills/design-system-skill.md`
- Modify: `/Users/adryansantos/.claude/skills/company-os-frontend/SKILL.md`
- Modify: `/Users/adryansantos/.claude/skills/company-os-backend/SKILL.md`
- Modify: `/Users/adryansantos/.claude/skills/company-os-design/SKILL.md`
- Modify: `/Users/adryansantos/.claude/skills/company-os-authz/SKILL.md`

- [ ] **Step 1: Update the skills/docs todo status and inspect target files for insertion points**

Run: inspect the files above and identify where to add explicit rules for AI-first design, permission-first access, use of project skills, and reuse of project components.
Expected: clear insertion points found in every file.

- [ ] **Step 2: Add rule text to `docs/skills/project-engineering-skill.md`**

Add rules that explicitly state:

```md
## Regras Críticas de Produto e Execução

- Toda feature deve ser pensada simultaneamente para o usuário e para a IA.
- Toda ação, acesso, mutação, visualização restrita e fluxo derivado deve ser guiado por permissão.
- Implementações neste monorepo devem priorizar as skills internas do projeto em `.claude`.
- No frontend, sempre reutilizar componentes existentes primeiro; novos componentes só quando necessário e sempre seguindo a identidade visual e os padrões do projeto.
- A camada interna de interpretação e recuperação da IA nunca deve ser exposta ao usuário final.
```

- [ ] **Step 3: Add aligned rule text to the remaining `docs/skills/*.md` files**

Add concise sections to frontend/backend/design docs reinforcing the same rules in area-specific language.

- [ ] **Step 4: Add the same rules to the `.claude` skill files**

Ensure the project-specific operational skills include the same mandatory behaviors.

- [ ] **Step 5: Review wording for consistency**

Check that “permission”, “AI”, “project identity”, and “project skills” are named consistently across all modified files.

- [ ] **Step 6: Commit the docs/skills rule updates**

```bash
git add docs/skills/project-engineering-skill.md docs/skills/frontend-skill.md docs/skills/backend-skill.md docs/skills/design-system-skill.md "/Users/adryansantos/.claude/skills/company-os-frontend/SKILL.md" "/Users/adryansantos/.claude/skills/company-os-backend/SKILL.md" "/Users/adryansantos/.claude/skills/company-os-design/SKILL.md" "/Users/adryansantos/.claude/skills/company-os-authz/SKILL.md"
git commit -m "docs: codify AI-first and permission-first project rules"
```

### Task 2: Add explicit asset and integration permissions

**Files:**
- Modify: `packages/authz/src/index.ts`

- [ ] **Step 1: Write the failing permission expectations in a scratch checklist**

Expected permission behavior:

```text
owner: full asset management + integrations read
admin: asset management + integrations read
member: no default assets access, no default integrations access unless explicitly granted later
```

- [ ] **Step 2: Add new permission keys to `AppPermissionKey` and related arrays**

Add explicit keys such as:

```ts
'asset.read'
'asset.create'
'asset.update'
'asset.archive'
'asset.context.review'
'integration.read'
```

- [ ] **Step 3: Map the new permissions in `permissionMap`**

Add a consistent CASL mapping such as:

```ts
'asset.read': ['read', 'Asset'],
'asset.create': ['create', 'Asset'],
'asset.update': ['update', 'Asset'],
'asset.archive': ['delete', 'Asset'],
'asset.context.review': ['update', 'ContextAsset'],
'integration.read': ['read', 'Integration'],
```

- [ ] **Step 4: Add any new subjects required by the new mappings**

Update the subjects tuple to include any new subject names referenced above.

- [ ] **Step 5: Update default role permissions**

Ensure:

```text
owner: gets all new permissions
admin: gets all new permissions except only if you intentionally want to restrict later
member: gets none of the new permissions by default
```

- [ ] **Step 6: Run typecheck for the authz package or repository equivalent**

Run: `pnpm typecheck`
Expected: no type errors from the new permission keys.

- [ ] **Step 7: Commit the permission changes**

```bash
git add packages/authz/src/index.ts
git commit -m "feat: add asset and integration permissions"
```

### Task 3: Add Prisma models for assets

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Define the minimal data model before editing**

Model goals:

```text
store assets by organization
support file or URL source kind
support context and operational roles simultaneously
support visible status fields without exposing AI internals
support visible business relations
```

- [ ] **Step 2: Add asset models to Prisma schema**

Add models for the MVP such as:

```prisma
model Asset {
  id                String   @id @default(cuid())
  organizationId    String
  title             String
  description       String?
  sourceKind        String
  sourceUrl         String?
  fileName          String?
  mimeType          String?
  contextRole       Boolean  @default(false)
  operationalRole   Boolean  @default(true)
  contextStatus     String?
  operationalStatus String?  @default("active")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  relations    AssetRelation[]
}

model AssetRelation {
  id        String @id @default(cuid())
  assetId    String
  kind      String
  value     String

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
}
```

Use exact names that fit the existing repository style while preserving the design intent.

- [ ] **Step 3: Add the relation from `Organization` to `Asset`**

Add an `assets Asset[]` relation in the `Organization` model.

- [ ] **Step 4: Run Prisma format and generate**

Run:

```bash
pnpm --filter @company-os/api prisma format
pnpm --filter @company-os/api prisma generate
```

Expected: Prisma schema formats successfully and generated client updates cleanly.

- [ ] **Step 5: Commit the schema changes**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/generated/prisma
git commit -m "feat: add Prisma models for workspace assets"
```

### Task 4: Build the backend assets module

**Files:**
- Create: `apps/api/src/assets/assets.module.ts`
- Create: `apps/api/src/assets/assets.controller.ts`
- Create: `apps/api/src/assets/assets.service.ts`
- Create: `apps/api/src/assets/assets.service.spec.ts`
- Create: `apps/api/src/assets/dto/create-asset.dto.ts`
- Create: `apps/api/src/assets/dto/update-asset.dto.ts`
- Create: `apps/api/src/assets/dto/list-assets.dto.ts`
- Create: `apps/api/src/assets/dto/bulk-update-assets.dto.ts`
- Create: `apps/api/src/assets/dto/index.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write the failing service tests for the main asset behaviors**

Create tests for behaviors like:

```ts
it('creates a context source asset')
it('creates an operational asset')
it('lists assets by role')
it('updates visible fields only')
it('marks a context asset as discarded without deleting it')
it('promotes an operational asset into context role without duplication')
```

- [ ] **Step 2: Run the new backend asset tests to verify they fail**

Run: `pnpm --filter @company-os/api test assets.service.spec.ts`
Expected: FAIL because the module and service do not exist yet.

- [ ] **Step 3: Create DTOs with Zod schemas**

Define DTO schemas for:

```ts
create asset
update visible asset fields
list/filter assets
bulk update actions
```

Keep DTOs limited to product-facing fields. Do not expose internal AI metadata.

- [ ] **Step 4: Implement `AssetsService`**

Implement minimal methods:

```ts
createAsset
listAssets
getAssetById
updateAsset
bulkUpdateAssets
```

Use `PrismaService` only.

- [ ] **Step 5: Implement `AssetsController` with explicit permissions**

Protect routes with permissions such as:

```ts
GET /organizations/:orgId/assets              -> asset.read
POST /organizations/:orgId/assets             -> asset.create
GET /organizations/:orgId/assets/:assetId     -> asset.read
PATCH /organizations/:orgId/assets/:assetId   -> asset.update
POST /organizations/:orgId/assets/bulk        -> asset.update or asset.context.review depending on action
```

- [ ] **Step 6: Register the module in `AppModule`**

Import the new `AssetsModule` into the application.

- [ ] **Step 7: Run backend tests and typecheck**

Run:

```bash
pnpm --filter @company-os/api test
pnpm --filter @company-os/api typecheck
```

Expected: PASS for new asset coverage and no type errors.

- [ ] **Step 8: Commit the backend asset module**

```bash
git add apps/api/src/assets apps/api/src/app.module.ts
git commit -m "feat: add backend assets module"
```

### Task 5: Create frontend hooks for assets

**Files:**
- Create: `apps/web/src/core/modules/assets/hooks/use-assets.ts`

- [ ] **Step 1: Write the hook API surface first**

Define hooks that cover:

```ts
useAssets
useAsset
useCreateAsset
useUpdateAsset
useBulkUpdateAssets
```

- [ ] **Step 2: Implement the React Query hooks**

All requests must use `apiClient` and `activeOrgId`, never direct fetches in pages or components.

- [ ] **Step 3: Add correct invalidation behavior**

Invalidate the assets list and detail queries after mutations.

- [ ] **Step 4: Run frontend typecheck**

Run: `pnpm --filter @company-os/web typecheck`
Expected: no type errors from new hooks.

- [ ] **Step 5: Commit the asset hooks**

```bash
git add apps/web/src/core/modules/assets/hooks/use-assets.ts
git commit -m "feat: add frontend asset domain hooks"
```

### Task 6: Build the Assets frontend page and components

**Files:**
- Create: `apps/web/src/core/modules/assets/pages/assets-page.tsx`
- Create: `apps/web/src/core/modules/assets/components/assets-header.tsx`
- Create: `apps/web/src/core/modules/assets/components/assets-tabs.tsx`
- Create: `apps/web/src/core/modules/assets/components/assets-table.tsx`
- Create: `apps/web/src/core/modules/assets/components/assets-bulk-actions.tsx`
- Create: `apps/web/src/core/modules/assets/components/asset-detail-sheet.tsx`
- Create: `apps/web/src/core/modules/assets/components/add-context-source-dialog.tsx`
- Create: `apps/web/src/core/modules/assets/components/add-operational-asset-dialog.tsx`
- Create: `apps/web/src/app/(dashboard)/workspace/assets/page.tsx`

- [ ] **Step 1: Build the route shell and basic page composition**

Create the workspace assets route using the existing dashboard shell patterns.

- [ ] **Step 2: Build the tab model and header summaries**

`Context` tab header should emphasize pipeline + strategic context value.

`Operational` tab header should emphasize organization + reuse readiness.

- [ ] **Step 3: Build the table view with project table patterns**

Use TanStack Table + project table wrapper patterns.

Columns should only include product-facing fields.

- [ ] **Step 4: Build the add dialogs**

Create one dialog for context source creation and one for operational asset creation.

Fields should support:

```text
title
description
source kind
file or URL
visible category/type/status defaults
visible business relations when appropriate
```

- [ ] **Step 5: Build the asset detail sheet**

Show preview + visible business fields + relations.

Do not expose AI internals.

- [ ] **Step 6: Add bulk actions with permission checks**

All bulk actions must be wrapped in `PermissionGate` or equivalent permission-aware rendering.

- [ ] **Step 7: Ensure styling uses project tokens and components only**

Use project buttons, cards, dialogs, badges, table primitives, and tokens.

- [ ] **Step 8: Run frontend typecheck**

Run: `pnpm --filter @company-os/web typecheck`
Expected: no type errors.

- [ ] **Step 9: Commit the frontend assets page**

```bash
git add apps/web/src/core/modules/assets apps/web/src/app/(dashboard)/workspace/assets/page.tsx
git commit -m "feat: implement workspace assets page"
```

### Task 7: Wire Assets into dashboard navigation

**Files:**
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

- [ ] **Step 1: Replace the assets placeholder action with a real route**

Change the `Arquivos e assets` item from `showComingSoon(...)` to a real `href` route.

- [ ] **Step 2: Protect the navigation entry with the new asset read permission**

Use the new `asset.read` permission on the sidebar item.

- [ ] **Step 3: Verify the route match logic**

Ensure the sidebar highlights correctly on `/dashboard/workspace/assets`.

- [ ] **Step 4: Commit the navigation update**

```bash
git add apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx
git commit -m "feat: add assets route to workspace navigation"
```

### Task 8: Build the Integrations frontend-only screen

**Files:**
- Create: `apps/web/src/core/modules/integrations/pages/integrations-page.tsx`
- Create: `apps/web/src/core/modules/integrations/components/integrations-catalog.tsx`
- Create: `apps/web/src/core/modules/integrations/components/integrations-connections-table.tsx`
- Create: `apps/web/src/app/(dashboard)/workspace/integrations/page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

- [ ] **Step 1: Create the integrations route and page shell**

Follow the same dashboard workspace route structure as other workspace pages.

- [ ] **Step 2: Build the connector catalog**

Render connector cards grouped into:

```text
Context Sources: Google Drive, Notion, Website/Crawl
Publishing Channels: Instagram, LinkedIn, Facebook
```

- [ ] **Step 3: Build the future-connections operational section**

Render an empty-state or placeholder table/list for future connected integrations.

- [ ] **Step 4: Add integrations route to dashboard navigation**

Use `integration.read` permission instead of `company.update`.

- [ ] **Step 5: Run frontend typecheck**

Run: `pnpm --filter @company-os/web typecheck`
Expected: no type errors.

- [ ] **Step 6: Commit the integrations screen**

```bash
git add apps/web/src/core/modules/integrations apps/web/src/app/(dashboard)/workspace/integrations/page.tsx apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx
git commit -m "feat: add integrations workspace screen"
```

### Task 9: Verification and final review

**Files:**
- Review all files changed in Tasks 1-8

- [ ] **Step 1: Run full project checks relevant to touched areas**

Run:

```bash
pnpm --filter @company-os/api test
pnpm --filter @company-os/api typecheck
pnpm --filter @company-os/web typecheck
pnpm lint
```

Expected: all relevant checks pass, or failures are isolated and fixed before completion.

- [ ] **Step 2: Review permission coverage**

Verify that:

```text
Assets screen access is permission-gated
Integrations screen access is permission-gated
All asset mutations require backend permissions
All frontend actions are hidden or disabled appropriately
```

- [ ] **Step 3: Review the “no AI internals exposed” rule**

Check that no UI surface renders AI confidence, ranking, derived context, or hidden internal metadata.

- [ ] **Step 4: Review the “project identity first” rule**

Check that any new components reuse project tokens and existing primitives, and no competing UI patterns were introduced.

- [ ] **Step 5: Commit the final verification fixes if needed**

```bash
git add .
git commit -m "chore: finalize assets and integrations foundation"
```
