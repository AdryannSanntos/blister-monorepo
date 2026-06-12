# Authorization — Blister OS

Every action requires permission: backend `@RequirePermission`, frontend `<PermissionGate>` or `useAbility()`.

## Source of truth

`packages/authz/src/index.ts`

---

## Workspace model

| Workspace | RBAC | Scope key |
|-----------|------|-----------|
| **Personal Space** | Owner only (no invites in MVP UI) | `personalSpaceId` |
| **Company** | 5 system roles | `companyId` |

User may belong to Personal Space + multiple Companies. Active workspace in session/context header (Plano 3).

---

## System roles — Company (target Plano 3)

| Role | Capabilities summary |
|------|----------------------|
| `owner` | Full access + delete workspace + billing |
| `admin` | Settings, team, credits view/adjust (no delete workspace) |
| `creator` | Run agents, files, projects, marketplace redeem |
| `reviewer` | Approve/reject/edit runs; read files/projects |
| `viewer` | Read-only across workspace content |

**Immutable** — do not rename or delete role keys.

Legacy `owner/admin/member` maps to OS roles during migration (`member` → `creator` default).

---

## Platform admin

`PlatformRoleGuard`: `platform_owner`, `platform_admin` — prefix `/api/platform/*`.

---

## Permission catalog — target OS

### Workspace / team

| Key | Subject | Usage |
|-----|---------|-------|
| `workspace.read` | Workspace | Switcher, metadata |
| `workspace.settings.read` / `.update` | WorkspaceSettings | Configurações — **replaces brand.*** |
| `member.*` | Member | Invites, roles |
| `role.read` | Role | List roles |

### Content

| Key | Subject | Usage |
|-----|---------|-------|
| `project.*` | Project | Projetos workspace |
| `file.create` / `.read` / `.delete` | File | Arquivos + extract |
| `generation.create` | Generation | Start agent run |
| `agentRun.review` | AgentRun | Approve/reject/edit |

### Marketplace

| Key | Subject | Usage |
|-----|---------|-------|
| `marketplace.read` | MarketplaceItem | Browse |
| `marketplace.redeem` | MarketplaceItem | Resgate |
| `library.read` | LibraryItem | Biblioteca |

### Credits

| Key | Subject | Usage |
|-----|---------|-------|
| `credit.read` | Credit | Balance, ledger |

### Legacy (deprecate in Plano 3)

| Key | Replacement |
|-----|-------------|
| `brand.*` | `workspace.settings.*` |
| `campaign.*` | `project.*` (gradual) |
| `piece.*` | `agentRun.review` |

---

## Adding a new permission

1. `packages/authz/src/index.ts`
2. `pnpm --filter @company-os/authz build`
3. Seed roles
4. `@RequirePermission` + `<PermissionGate>`

---

## Data scope

- Services validate resource `workspaceId` against membership
- `userId` from `req.currentUser.id`; resource IDs from `req.params`
- RAG and runs **never** cross workspace boundaries

---

## Personal Space

- No `member.invite` — single user
- Same permission keys where applicable; guards short-circuit to owner

See also: [`workspace-context.md`](workspace-context.md)
