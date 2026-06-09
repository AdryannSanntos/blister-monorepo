# TikTok Live Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `tiktok-live-plataform` as a clean Blister foundation with login, invitations, direct user roles/permissions, and account settings only.

**Architecture:** Copy the current monorepo, then remove organization/workspace and old Workana AI product modules. Keep the Next.js/NestJS/pnpm/turbo structure, but convert authorization from organization membership to direct user roles.

**Tech Stack:** Next.js 16, React 19, NestJS 11, Prisma, PostgreSQL, Better Auth, CASL, Zod, pnpm, Turbo, Biome.

---

## File Structure Map

- Create project copy: `/Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform`.
- Modify root metadata: `package.json`, `tsconfig.base.json`, `CLAUDE.md`, `.env.example`, `docker-compose*.yml`, `README` if present.
- Modify authorization package: `packages/authz/src/index.ts`, `packages/authz/package.json`, `packages/authz/tsconfig.json` if package aliases reference `company-os`.
- Modify shared package names: `packages/types/package.json`, `packages/configs/package.json`, root path aliases.
- Modify backend package: `apps/api/package.json`, `apps/api/src/app.module.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`.
- Keep backend modules: `apps/api/src/auth`, `apps/api/src/email`, `apps/api/src/prisma`, selected authorization/user files adapted from `apps/api/src/organization`.
- Remove backend modules: `agents`, `ai-catalog`, `ai-runtime`, `assets`, `context`, `conversation`, `credits`, `design-system`, `onboarding`, `platform`, `rag`, `storage`, `trigger`.
- Modify frontend package: `apps/web/package.json`, `apps/web/src/proxy.ts`, `apps/web/src/app/layout.tsx`, retained app routes.
- Keep frontend modules: `auth`, `account`, `dashboard` shell, shared UI, adapted user/roles pages from `organization`.
- Remove frontend modules and routes: `agents`, `assets`, `context`, `design-system-company`, `design-system`, `home` if old branded, `integrations`, `onboarding`, `platform-admin`, `workspace`, old `dashboard/workspace/*` routes except pages migrated to direct users/roles.

## Task 1: Copy Project And Remove Heavy Artifacts

**Files:**
- Create: `/Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform`
- Exclude: `.git`, `node_modules`, app build outputs, generated Prisma client, `.next`, `dist`, coverage, caches

- [ ] **Step 1: Verify destination does not exist**

Run: `test ! -e /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform`

Expected: command exits with code `0`.

- [ ] **Step 2: Copy source without dependency/build artifacts**

Run: `rsync -a --exclude .git --exclude node_modules --exclude .next --exclude dist --exclude coverage --exclude apps/api/src/generated --exclude .turbo /Users/adryansantos/Documents/PROJETOS/ai-business-os-monorepo/ /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/`

Expected: destination folder is created with root files, `apps`, and `packages`.

- [ ] **Step 3: Verify copy shape**

Run: `ls /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform`

Expected: output includes `apps`, `packages`, `package.json`, `pnpm-workspace.yaml`, and does not include `.git` or `node_modules`.

## Task 2: Rename Workspace And Package Namespace

**Files:**
- Modify: `package.json`
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `packages/authz/package.json`
- Modify: `packages/types/package.json`
- Modify: `tsconfig.base.json`

- [ ] **Step 1: Replace package namespace**

Change all retained package names and imports from `@company-os/*` to `@blister/*`.

Expected mapping:

```text
company-os-monorepo -> tiktok-live-plataform
@company-os/api -> @blister/api
@company-os/web -> @blister/web
@company-os/authz -> @blister/authz
@company-os/types -> @blister/types
@company-os/configs/* -> @blister/configs/*
```

- [ ] **Step 2: Remove obsolete root script**

Remove `dev:video` from root `package.json` because `apps/video` is not retained.

- [ ] **Step 3: Verify no package alias remains**

Run: `rg "@company-os|company-os|dev:video" /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/package.json /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/apps /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/packages /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/tsconfig.base.json`

Expected: no matches in retained source files.

## Task 3: Reduce Authorization Catalog To Direct User Access

**Files:**
- Modify: `packages/authz/src/index.ts`
- Test: `packages/authz/src/index.test.ts` if test setup exists, otherwise validate with package typecheck

- [ ] **Step 1: Define direct-user subjects and permissions**

Replace old company/member/brain/agent permissions with:

```ts
export const subjects = ['all', 'User', 'Role', 'Permission', 'Account'] as const;

export type AppPermissionKey =
  | 'user.read'
  | 'user.invite'
  | 'user.update'
  | 'user.remove'
  | 'role.read'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'permission.read'
  | 'account.read'
  | 'account.update';

export const defaultSystemRoles = ['admin', 'operator', 'brand', 'host'] as const;
```

- [ ] **Step 2: Set permission map**

Use this exact mapping:

```ts
export const permissionMap: Record<AppPermissionKey, [AppAction, AppSubject]> = {
  'user.read': ['read', 'User'],
  'user.invite': ['create', 'User'],
  'user.update': ['update', 'User'],
  'user.remove': ['delete', 'User'],
  'role.read': ['read', 'Role'],
  'role.create': ['create', 'Role'],
  'role.update': ['update', 'Role'],
  'role.delete': ['delete', 'Role'],
  'permission.read': ['read', 'Permission'],
  'account.read': ['read', 'Account'],
  'account.update': ['update', 'Account'],
};
```

- [ ] **Step 3: Set default role permissions**

Use role defaults:

```ts
admin: allPermissionKeys
operator: user.read, user.invite, user.update, role.read, permission.read, account.read
brand: account.read, account.update
host: account.read, account.update
```

- [ ] **Step 4: Verify package builds**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform --filter @blister/authz build`

Expected: build passes.

## Task 4: Replace Prisma Schema With Foundation Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Remove product-specific Prisma models**

Keep only Better Auth models and direct access models: `User`, `Session`, `Account`, `Verification`, `Role`, `RolePermission`, `UserRole`, `UserPermissionOverride`, `Invitation`, `AuditLog`.

- [ ] **Step 2: Remove vector extension**

Delete `previewFeatures = ["postgresqlExtensions"]` and `extensions = [vector]`, because RAG is removed.

- [ ] **Step 3: Model direct role assignment**

Use direct relations:

```prisma
model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  isSystem    Boolean          @default(false)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  users       UserRole[]
  permissions RolePermission[]
}

model UserRole {
  id         String   @id @default(cuid())
  userId     String
  roleId     String
  assignedAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
}
```

- [ ] **Step 4: Rewrite seed**

Seed only system roles, role permissions, and an optional dev admin user if the old seed already depends on env values. Remove all Workana AI content, context sources, agents, AI providers, assets, and design system data.

- [ ] **Step 5: Verify Prisma validates**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/apps/api prisma:generate`

Expected: Prisma client generation succeeds.

## Task 5: Reduce Backend Modules

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify or create: `apps/api/src/users/*` if adapting organization logic to direct users
- Modify: `apps/api/src/auth/*` only where package imports changed
- Remove directories listed in the file structure map

- [ ] **Step 1: Remove obsolete module imports from AppModule**

Keep imports limited to `ConfigModule`, `PrismaModule`, `AuthModule`, `EmailModule`, direct user/access module, and `AuditModule` only if retained.

- [ ] **Step 2: Adapt PermissionGuard to direct users**

Permission resolution should use `req.currentUser.id` only. It must not require `orgId` or membership lookup.

- [ ] **Step 3: Adapt controllers to direct permissions**

Use permission keys such as `user.read`, `user.invite`, `role.read`, `role.update`, and `account.update`.

- [ ] **Step 4: Delete old backend domains**

Remove old product directories after imports are gone.

- [ ] **Step 5: Verify backend typecheck**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform --filter @blister/api typecheck`

Expected: typecheck passes or shows only missing generated Prisma client if Task 4 was skipped.

## Task 6: Reduce Frontend Routes And Modules

**Files:**
- Modify: `apps/web/src/proxy.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/app/page.tsx`
- Modify: `apps/web/src/app/dashboard/**`
- Modify: `apps/web/src/core/modules/dashboard/**`
- Modify or create: `apps/web/src/core/modules/users/**`
- Remove obsolete modules listed in the file structure map

- [ ] **Step 1: Remove workspace routing rules**

Proxy should only protect `/dashboard/*` and redirect unauthenticated users to `/auth/login?next=<path>`. It should not check or clear active organization cookies.

- [ ] **Step 2: Simplify dashboard nav**

Dashboard should expose only foundation pages: overview, users, roles/permissions, invites if separate, account settings.

- [ ] **Step 3: Remove old product routes**

Delete old `workspace`, `agents`, `brain`, `assets`, `integrations`, `onboarding`, and platform admin routes.

- [ ] **Step 4: Replace visible product language**

Use `Blister` for product naming. Avoid Workana AI, Company OS, Brain, Agentes, Créditos, Integrações.

- [ ] **Step 5: Verify frontend typecheck**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform --filter @blister/web typecheck`

Expected: typecheck passes.

## Task 7: Remove Unused Dependencies And Apps

**Files:**
- Remove: `apps/video`
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml` through install if feasible

- [ ] **Step 1: Remove unused app**

Delete `apps/video`.

- [ ] **Step 2: Remove backend dependencies tied only to removed modules**

Remove API dependencies that become unused after deletion: AWS S3 packages, OpenRouter packages, Trigger.dev, pdf/jszip, socket.io if no retained module imports them.

- [ ] **Step 3: Remove frontend dependencies tied only to removed modules**

Remove frontend dependencies for agent/chat/workflow/chart modules if no retained source imports them.

- [ ] **Step 4: Reinstall lockfile**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform install`

Expected: lockfile updates and install succeeds.

## Task 8: Final Verification

**Files:**
- Whole new project

- [ ] **Step 1: Search old branding and removed domains**

Run: `rg "Workana AI|Company OS|company-os|Brain|Agentes|Créditos|Integrações|workspace|organizationId|Membership" /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/apps /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/packages /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform/*.json`

Expected: no matches in retained functional source, except dependency-neutral package internals if any.

- [ ] **Step 2: Run full typecheck**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform typecheck`

Expected: all retained packages pass.

- [ ] **Step 3: Run tests**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform test`

Expected: all retained tests pass.

- [ ] **Step 4: Run lint/format check**

Run: `pnpm --dir /Users/adryansantos/Documents/PROJETOS/tiktok-live-plataform format:check`

Expected: Biome check passes or reports only files that need formatting.

## Self-Review

Spec coverage:

- Copy project: Task 1.
- Remove old domains: Tasks 4, 5, 6, 7, 8.
- Single-tenant user roles: Tasks 3, 4, 5.
- Keep login/invites/roles/account settings: Tasks 3, 5, 6.
- Rename to Blister and `tiktok-live-plataform`: Tasks 1, 2, 6, 8.
- Verification: Task 8.

Placeholder scan: no `TBD`, `TODO`, or unresolved placeholder instructions remain.

Type consistency: package namespace is consistently `@blister/*`; project folder keeps the requested `tiktok-live-plataform` spelling.
