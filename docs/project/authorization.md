# Authorization (CASL + packages/authz)

Every action requires permission: backend `@RequirePermission`, frontend `<PermissionGate>` or `useAbility()`.

## Source of truth

`packages/authz/src/index.ts`

## System roles (immutable)

| Role | Scope |
|------|-------|
| `owner` | All CASL permissions |
| `admin` | Business ops + team/roles (no `role.create/update/delete`) |
| `member` | Business ops (MEI owner in MVP) |

Platform admin uses **`PlatformRoleGuard`**: `platform_owner`, `platform_admin`.

## CASL catalog — Blister IA

### RBAC / workspace

| Key | Action | Subject |
|-----|--------|---------|
| `user.read` / `user.update` | read/update | User |
| `member.*` | CRUD | Member |
| `role.*` | CRUD | Role |
| `permission.read` | read | Permission |

### Business domain

| Key | Subject | Usage |
|-----|---------|-------|
| `company.read` / `company.update` | Company | Business profile |
| `brand.read` / `brand.update` | Brand | Brand Brain |
| `campaign.*` | Campaign | CRUD + `campaign.generate` |
| `file.create` / `file.delete` | File | Campaign uploads |
| `piece.read` / `piece.approve` / `piece.update` | ContentPiece | **Legado** — revisão nova via `generation.create` / `campaign.generate` em `AgentRun` |
| `credit.read` | Credit | Balance and ledger summary |
| `generation.create` | Generation | Disparar agente / revisar run (fora de campanha) |

## Adding a new permission

1. `packages/authz/src/index.ts` — subject, key, map, `getDefaultRolePermissions`
2. `pnpm --filter @company-os/authz build`
3. Seed roles
4. `@RequirePermission` + `<PermissionGate>`

## Data scope

- MVP: **1 company per user** (`Company.ownerUserId`)
- Services validate resource `companyId` against the authenticated user's company
- `userId` always from `req.currentUser.id`; resource IDs from `req.params`

## Platform admin

Prefix `/api/platform/*` + `PlatformRoleGuard` — credits, AI catalog, RAG settings, balance adjustments.
