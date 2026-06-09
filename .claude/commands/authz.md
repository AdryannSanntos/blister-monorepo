# Authorization Skill — Blister

Permission catalog, roles, and authorization patterns.
Source of truth: `packages/authz/src/index.ts`. Details: `docs/project/authorization.md`.

> Scope by `companyId`. See [`docs/project/authorization.md`](../../docs/project/authorization.md).

---

## Permission catalog (`AppPermissionKey`)

### RBAC / workspace

| Key | Action | Subject |
|-----|--------|---------|
| `user.read` / `user.update` | read/update | User |
| `member.*` | CRUD | Member |
| `role.*` | CRUD | Role |
| `permission.read` | read | Permission |

### Business (Blister IA)

| Key | Subject | Usage |
|-----|---------|-------|
| `company.read` / `company.update` | Company | Business profile |
| `brand.read` / `brand.update` | Brand | Brand Brain |
| `campaign.*` | Campaign | CRUD + `campaign.generate` |
| `file.create` / `file.delete` | File | Campaign uploads |
| `piece.read` / `piece.approve` / `piece.update` | ContentPiece | **Legado** — preferir `generation.create` / `campaign.generate` + revisão na `AgentRun` |
| `credit.read` | Credit | Balance and ledger |
| `generation.create` | Generation | Quick generation |

## System roles (immutable)

- **owner** — `allPermissionKeys`
- **admin** — business + team (no `role.create/update/delete`)
- **member** — `businessPermissionKeys` + basic read (MEI owner in MVP)

Platform admin: `platform_owner` / `platform_admin` via `PlatformRoleAssignment` + `PlatformRoleGuard`.

## Adding a permission

1. `packages/authz/src/index.ts` — subject, key, map, `getDefaultRolePermissions`
2. `pnpm --filter @company-os/authz build`
3. Seed roles
4. `@RequirePermission` + `<PermissionGate>`
