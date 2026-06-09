# TikTok Live Platform Foundation Design

## Goal

Create a new project named `tiktok-live-plataform` by copying `ai-business-os-monorepo` and reducing it to a clean Blister foundation for a TikTok live commerce platform.

The new project must keep only the base systems needed to start the product: authentication, password recovery, invitations, user roles, user permissions, and user account settings. It must remove Workana AI, Company OS, organization/workspace, AI, agents, brain, assets, credits, integrations, RAG, design-system-company, and other old product domains.

## Product Context

Blister is an agency-operated software platform for live commerce on TikTok Shop in Brazil. The eventual MVP will connect brands, hosts/creators, operators, and internal admins around campaign execution, agenda, briefing, payments, and performance.

This implementation does not build those MVP domains yet. It creates the clean technical base for them.

## Architecture

The copied monorepo remains a pnpm/turbo workspace with:

- `apps/web`: Next.js frontend.
- `apps/api`: NestJS API.
- `packages/authz`: direct user role and permission catalog.
- `packages/types`: shared types only if still used by the retained base.
- `packages/configs`: shared TypeScript configs.

The application becomes single-tenant. There are no organizations, workspaces, companies, or memberships.

## Backend Scope

Keep:

- Better Auth user/session/account/verification flow.
- Email module for transactional invitation/password flows.
- Prisma module.
- User-level roles and permissions.
- Invitations that assign roles directly to the invited user.
- Optional audit support if it is small and not coupled to removed domains.

Remove:

- Organization module and org-scoped guards/services.
- Onboarding, assets, credits, context, conversation, agents, AI catalog, AI runtime, RAG, storage, design system, platform admin, trigger, and old product modules.

Prisma should retain only the minimal user/access schema:

- `User`
- `Session`
- `Account`
- `Verification`
- `Role`
- `RolePermission`
- `UserRole`
- `UserPermissionOverride`
- `Invitation`
- `AuditLog` only if retained cleanly

## Frontend Scope

Keep:

- Auth pages: login, forgot password, reset password.
- Invitation acceptance flow.
- Dashboard shell.
- Account settings.
- User management.
- Role and permission management.
- Shared UI components required by retained screens.

Remove:

- Workspace routes and selectors.
- Organization/company-specific UI.
- Onboarding, brain/context, agents, assets, integrations, design system company, platform admin, charts tied to old product metrics, and old landing copy.

Routes should be simplified to:

- `/auth/*`
- `/invite/accept`
- `/dashboard/*`
- `/account/settings` or dashboard-account equivalent

## Authorization Model

Roles and permissions attach directly to users.

Default roles:

- `admin`: full access.
- `operator`: operational access for agency users.
- `brand`: base brand/seller access for future campaign flows.
- `host`: base host/creator access for future campaign flows.

Initial permissions should be limited to foundation capabilities:

- `user.read`
- `user.invite`
- `user.update`
- `user.remove`
- `role.read`
- `role.create`
- `role.update`
- `role.delete`
- `permission.read`
- `account.read`
- `account.update`

Future Blister domains such as campaigns, profiles, applications, agenda, payments, and reviews will add their own permissions later.

## Naming And Copy Cleanup

The new project name is `tiktok-live-plataform`, keeping the user's spelling.

Replace old language and identifiers where practical:

- Product name: `Blister`.
- Remove `Workana AI`, `Company OS`, `company-os`, `Brain`, `Agentes`, `Créditos`, `Integrações` from retained UI/docs/config.
- Rename package names and path aliases from `@company-os/*` to a neutral or Blister-specific namespace if required by the retained code.

## Verification

After implementation:

- Install/build dependencies if needed.
- Generate Prisma client.
- Run typecheck for retained apps/packages.
- Run available tests for retained foundation modules.
- Run lint/format check if feasible.

## Out Of Scope

Do not implement the PRD MVP modules in this pass:

- Brand profile.
- Host/creator profile.
- Campaigns.
- Matching.
- Applications and campaign invitations.
- Agenda.
- Briefing/checklist.
- Payments.
- Ratings/reputation.
- Operational reports.
