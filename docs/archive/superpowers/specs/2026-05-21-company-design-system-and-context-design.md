# Company Design System and Context Design Spec

**Date:** 2026-05-21  
**Scope:** Company `Design System`, company `Context`, S3 artifacts, and async sync pipeline  
**Status:** Approved

---

## Objective

Implement a first-class company `Design System` feature that is separate from company `Context`, with the database as the source of truth, S3 as the storage layer for binary assets and generated markdown artifacts, and an asynchronous sync pipeline that keeps AI-facing context files updated.

This feature must support:

- a routed dashboard experience at `/dashboard/workspace/design-system`
- clear product separation between operational context and visual identity
- direct editing with no draft/publication layer
- binary asset storage in S3
- generated `design-system.md` and `context.md` files for AI consumption
- explicit domain permissions

---

## Product Boundaries

### Context

`Context` is the company's operational and textual knowledge domain.

It stores the knowledge that helps the system understand how the company works, what it does, who it serves, and which operational rules or nuances matter for AI execution.

Examples:

- business context
- products and services
- positioning details
- process notes
- company-specific operational guidance

### Design System

`Design System` is the company's visual identity and aesthetic direction domain.

It stores the knowledge that helps the system understand how the company should look, what brand elements are official, which colors are valid, how logos are used, and which references define the visual language.

Examples:

- identity guidance
- color groups and semantic roles
- logo assets
- visual references
- brand restrictions
- aesthetic direction for AI outputs

### Hard separation

The two domains are siblings, not subtypes of one another.

- `Context` must not become a catch-all for brand assets
- `Design System` must not become a catch-all for operational knowledge

This separation is critical for:

- product clarity
- permission clarity
- maintainable schema evolution
- reliable AI context construction

---

## Source of Truth and Storage Strategy

### Database

The database is the source of truth for all editable product data.

This applies to both `Context` and `Design System`.

The database is responsible for:

- structured editing
- validation
- permission-controlled mutations
- metadata
- sync status tracking
- future search/filter/admin operations

### S3

S3 is the storage layer for:

- binary design assets
- generated AI-facing markdown artifacts

S3 is not the source of truth for editable company knowledge.

### AI-facing artifacts

The system generates:

- `context.md`
- `design-system.md`

These files are derived projections, not editable masters.

They exist to provide:

- deterministic prompt context
- stable structure for retrieval and orchestration
- a compact, curated textual representation of the company state

---

## Recommended Stack

### Backend application

- `NestJS 11`
- `Prisma`
- `PostgreSQL`
- `Zod`
- `CASL` via `packages/authz`

### Frontend application

- `Next.js 16`
- `React 19`
- `TanStack Query`
- `TanStack Table`
- `react-hook-form`
- `shadcn/ui`
- `Tailwind CSS v4`

### Storage

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- optional but recommended for larger uploads: `@aws-sdk/lib-storage`

Local development should support LocalStack-compatible configuration through:

- `AWS_S3_ENDPOINT`
- `AWS_S3_FORCE_PATH_STYLE=true`

### Async jobs and event execution

Recommended choice now:

- application-owned domain events persisted in Postgres
- `Trigger.dev` for async orchestration, retries, and observability

Why this combination:

- the domain event record keeps the product state authoritative in the app database
- Trigger handles retryable work like markdown regeneration and S3 writes
- failures become observable and replayable
- this avoids coupling critical product state to fire-and-forget in-process jobs

### Events recommendation

The product should not rely on S3 events as the primary business event source.

Business events should originate in the application domain, for example:

- `design_system.updated`
- `design_asset.created`
- `design_asset.deleted`
- `company_context.updated`

S3 remains a storage target, not the main workflow coordinator.

---

## Domain Model Direction

### DesignSystemProfile

Each organization has one root design system profile.

Responsibilities:

- anchors the design system domain for the company
- stores summary metadata and sync state
- owns nested sections and design assets

### Internal section strategy

The design system must not be stored as one opaque, ever-growing JSON blob.

The approved approach is hybrid:

- one main domain record per organization
- multiple section or block records internally

This allows:

- targeted updates
- easier schema evolution
- clearer ownership by tab
- smaller mutation surfaces

### Design System tabs and ownership

#### 1. Colors

Supports multiple company-defined color groups.

Each group contains many colors.

Each color should support at least:

- name
- primary color value
- display format
- semantic role
- optional usage note
- optional restriction note

#### 2. Assets

Each asset belongs to the design system domain and stores:

- binary object location in S3
- primary role
- optional secondary tags
- optional title
- optional description
- content type and file metadata

The approved primary roles for MVP are:

- `logo`
- `logo-variation`
- `brand-guideline`
- `color-reference`
- `typography-reference`
- `visual-reference`
- `campaign-reference`
- `product-visual`
- `iconography`
- `template`
- `context-reference`
- `other`

Each asset has one required primary role and optional secondary tags.

#### 3. Identity

Identity uses a hybrid structure:

- structured fields for consistency
- open text fields for nuance

Suggested sections:

- brand essence
- desired perception
- visual style
- anti-patterns / what to avoid
- conceptual references
- AI notes

---

## UI and Routing

### Route

The feature route is:

- `/dashboard/workspace/design-system`

### Sidebar behavior

`Design System` stops being an `Em breve` item and becomes a real entry in the `Empresa` group.

### Permissions

New explicit permissions are required:

- `design-system.read`
- `design-system.update`

Permission rules:

- route visibility and data reads use `design-system.read`
- edits, uploads, deletes, sync regeneration, and settings changes use `design-system.update`

### Page behavior

Page header should include:

- page title
- short domain description
- last sync status
- manual `Regenerar contexto para IA` action when permitted

Tabs:

- `Cores`
- `Assets`
- `Identidade`

### Editing model

There is no draft/publication layer.

Approved editing behavior:

- direct save
- immediate persistence in the database
- async markdown regeneration after relevant changes

Expected visible states:

- saved
- syncing AI context
- sync failed
- last synced at

---

## Markdown Projection Strategy

### design-system.md

The generated `design-system.md` must contain:

1. brand overview
2. identity principles
3. color palette grouped by section and semantic role
4. color restrictions and usage rules
5. official assets by primary role
6. logo usage guidance
7. visual references and aesthetic direction
8. operational notes for AI
9. known gaps and pending decisions

### context.md

`context.md` follows the same philosophy for the operational domain:

- stable headings
- deterministic serialization
- product-facing language only
- no hidden AI internals

### Serializer rules

Markdown generation must be deterministic.

That means:

- fixed section order
- stable naming
- no random phrasing
- no internal IDs or implementation-only metadata
- concise, context-rich text optimized for AI retrieval and prompting

---

## Async Sync Pipeline

### Triggering model

When the company updates design system or context data:

1. the database mutation succeeds first
2. the app records a domain event or enqueues a sync request
3. Trigger picks up the work
4. the serializer regenerates the markdown artifact
5. the artifact is written to S3
6. sync status is updated in the database

### Sync statuses

Each domain should track a status like:

- `idle`
- `pending`
- `synced`
- `failed`

### Manual regeneration

Users with update permission can request regeneration manually.

This is the operational fallback for:

- transient S3 errors
- serializer failures
- retry after infrastructure issues

---

## S3 Path Strategy

Recommended object key structure:

- `organizations/<orgId>/context/context.md`
- `organizations/<orgId>/design-system/design-system.md`
- `organizations/<orgId>/design-system/assets/<assetId>/<filename>`

Why this layout:

- clear domain separation
- easier cleanup and audit
- predictable retrieval paths
- future-safe for additional generated files

---

## Asset Behavior in AI Workflows

The approved MVP behavior is hybrid but text-first.

That means:

- binary files are stored and available operationally
- AI does not rely on direct binary interpretation as its main path in MVP
- asset metadata and approved usage notes are projected into `design-system.md`

This gives the system enough context for:

- choosing the official logo
- understanding brand direction
- respecting color usage constraints
- generating visually aligned content later

without introducing a mandatory multimodal pipeline in the first version.

---

## Existing Repository Risks That Must Be Resolved

### 1. Asset permission mismatch

The repository already uses `asset.*` permissions in frontend and backend, but the loaded `packages/authz/src/index.ts` file does not currently declare them.

This mismatch must be corrected before or alongside this work.

### 2. Asset schema mismatch

The loaded `schema.prisma` content does not currently show the asset models that the codebase already references.

This means the implementation plan must include a reconciliation step for the actual Prisma source of truth.

### 3. Async sync is product-critical

Because the database is the source of truth and markdown is a derived artifact, sync reliability is not a nice-to-have. It is a core product responsibility.

The system must expose sync status clearly and support manual retry.

---

## Recommended Delivery Order

1. Reconcile current authz and schema mismatches
2. Add explicit `design-system.*` permissions
3. Add backend data model for company design system and sync state
4. Add S3 service layer and upload contract
5. Add Trigger-based sync workflow for markdown generation
6. Add frontend route and tabs
7. Add markdown serializers for `context.md` and `design-system.md`
8. Add manual regeneration UI and status reporting

---

## Final Recommendation

The approved product and technical direction is sound.

The most important principle to preserve during implementation is this:

- many raw files are not the goal
- a curated, deterministic, AI-usable context is the goal

The value of this feature comes from structured editing plus reliable markdown projection, not from treating S3 as a generic dumping ground.
