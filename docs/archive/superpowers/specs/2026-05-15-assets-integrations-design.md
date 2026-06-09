# Assets and Integrations - Design Spec

**Date:** 2026-05-15  
**Scope:** Workspace Assets flow and Integrations screen  
**Status:** Approved

---

## Objective

Implement the workspace `Assets` flow as a reusable operational and contextual library for the company, prioritizing future use in post, content, copy, visual, and carousel generation. Implement the `Integrations` screen as a frontend-first foundation that is conceptually correct for later expansion into real connectors.

---

## Critical Product Rules

### 1. Every feature must be designed for the user and for the AI

Every new flow must serve both:

- the human operator using the UI
- the internal AI layer that will retrieve, rank, interpret, and act on the data

This means all product design must explicitly account for:

- what the user sees and controls
- what the AI needs behind the scenes
- what must remain hidden from the user

### 2. Permission governs everything

Every screen, CTA, action, mutation, restricted read, bulk action, detail view, and workflow transition must be permission-driven.

This is a product rule, not just an implementation detail.

### 3. Always follow the project identity and project components

Frontend work must always:

- reuse existing project components first
- create new components only when necessary
- ensure any new component matches the existing design system, tokens, and UI patterns

### 4. Always use the project skills

Work in this monorepo must prefer the project skills from `.claude` and keep `docs/skills` aligned with those rules.

### 5. The AI internal layer must never be exposed to the user

The user must not see:

- internal AI tags
- confidence scores
- ranking signals
- derived context
- retrieval metadata
- internal relevance structures

The system may rely on them internally, but the UI must only expose product-facing, human-usable fields.

---

## Assets Overview

`Assets` is a single workspace area with two distinct tabs:

- `Context`
- `Operational`

The two tabs share a common library foundation, but each tab has different goals, governance, and workflows.

---

## Context Tab

### Purpose

The `Context` tab stores sources that help the system understand the company and generate suggestions to improve the official company context.

It is not only a file repository. It is an ingestion and review pipeline for contextual knowledge.

### Accepted inputs in MVP

- file upload
- URL registration

### Processing model

- ingestion is automatic by default
- the system processes the source automatically
- the system generates suggestions for official context updates
- a human must review before the official context is changed

### Context status flow

- `uploaded`
- `processed`
- `suggested`
- `approved`
- `discarded`

`discarded` means:

- the source remains stored
- it becomes ineligible as an official context source
- it is not deleted from the system by default

### Review model

Review is hybrid:

- approve the whole source quickly
- or inspect and approve/reject by context block

This preserves speed while allowing fine-grained governance.

### Header emphasis

The top of the tab must communicate both:

- pipeline state: uploaded, processed, suggested, approved
- strategic value: latest suggestions, context gaps, strongest sources

### Primary CTA

`Add context source`

---

## Operational Tab

### Purpose

The `Operational` tab is a reusable business library for future generation workflows.

It must support, from the MVP onward:

- visual and brand references
- commercial and institutional materials
- previously produced content assets

This tab is explicitly designed to support future post, copy, carousel, visual, and page-generation workflows.

### Accepted inputs in MVP

- file upload
- URL registration

### Operational status model

The operational library should use a lighter workflow than context.

Recommended statuses:

- `active`
- `archived`
- `obsolete`

### AI usage behavior

- the AI can use operational assets before human confirmation is fully complete
- if the visible product metadata has not been fully confirmed, the asset should be internally weighted lower
- this weighting remains hidden from the user

### Header emphasis

The top of the tab must communicate both:

- library organization
- practical readiness for reuse by future AI generation

### Primary CTA

`Add operational asset`

---

## Shared Asset Model

Assets are modeled as a shared foundation with two visible roles:

- contextual role
- operational role

An asset may belong to both roles at the same time.

### Promotion rules

An operational asset may become context-relevant via:

- manual promotion by a human
- AI suggestion followed by human confirmation

Promotion must not force duplication.

Recommended model:

- one asset can appear in both `Context` and `Operational`
- the same underlying asset can serve both purposes simultaneously

---

## User-visible Product Layer vs Hidden AI Layer

### User-visible product layer

The user may see and edit:

- title
- short description
- visible type
- visible category
- visible status
- source kind
- file or URL reference
- created/updated dates
- visible business relations
- visible organizational labels

### Hidden AI layer

The user must not see:

- confidence
- ranking
- internal retrieval metadata
- derived context
- internal classification signals
- AI-only tags and scoring structures

---

## Organization and Retrieval

### Retrieval approach

The system must use a hybrid model:

- human-facing organization for browsing and management
- hidden semantic retrieval for AI use

### Categories

Categories must be hybrid:

- a fixed system base taxonomy
- workspace-specific complementary categories

### Tags

Tags should be:

- suggested by AI
- editable by the user
- open to user-created additions

User-facing tags must remain product-facing, not internal AI retrieval structures.

### Search and discovery

The library should support:

- strong text search
- strong filtering
- useful groupings for exploration

This supports both:

- users who know what they want
- users exploring the library to discover reusable material

---

## Visible Business Relations

Users must be able to associate an asset to:

- campaign
- channel
- product/service
- page
- related output

These relations are visible and user-manageable because they are business-facing product concepts, not AI internals.

---

## Asset Detail View

The asset detail experience must prioritize:

- human recognition of the source
- preview of file or URL
- visible business information
- visible relations
- available workflow actions

It must not expose the hidden AI interpretation layer.

---

## Bulk Actions

The MVP should include meaningful bulk actions.

### Context bulk actions

- approve
- discard
- archive where relevant
- associate visible relations
- promote contextual role when relevant

### Operational bulk actions

- archive
- mark obsolete
- associate visible relations
- promote to contextual role
- remove

---

## Permissions Model

### Access expectations

- system `member` must not access the `Assets` screen by default
- `owner` and `admin` manage the assets library in MVP
- future workflows may allow members to contribute contextually, but not manage the full library by default

### Future contribution rule

When assets are uploaded from future non-library flows, they must carry:

- source workflow origin
- eligibility for future promotion into the library

---

## Integrations Overview

The `Integrations` screen is a frontend-first foundation in this phase.

It is not yet expected to be operationally usable, but it must be architected correctly for later evolution.

### Purpose

The page should model business connectors, not internal platform infrastructure.

It should clearly separate:

- `Context Sources`
- `Publishing Channels`

### Initial connectors

Context sources:

- Google Drive
- Notion
- Website/Crawl

Publishing channels:

- Instagram
- LinkedIn
- Facebook

### Screen structure

The page should use a hybrid presentation:

- catalog-style connector discovery
- operational list/table area for future active connections

### MVP expectation

For now, frontend-only states are enough, such as:

- `available`
- `coming soon`

The UX should still be shaped so that later it can naturally expand to:

- connected
- disconnected
- error
- last sync
- last publish
- scopes and health

---

## Future Content and Pages Onboarding

The future onboarding for content and pages should:

- read from `Assets`
- write back into `Assets`
- partially act as a guided experience on top of the library

It must capture three groups of context:

- visual identity
- content direction
- operational rules

This onboarding should not replace the library, but it should be tightly integrated with it.

---

## Frontend Structure Alignment

New implementation must follow the current project structure:

```text
apps/web/src/
  core/modules/assets/
    pages/
    components/
    hooks/
  core/modules/integrations/
    pages/
    components/
    hooks/
```

Routes must integrate into the existing dashboard shell and workspace navigation.

---

## Backend Structure Alignment

The backend should introduce a dedicated NestJS module for assets.

Recommended location:

```text
apps/api/src/assets/
  assets.module.ts
  assets.controller.ts
  assets.service.ts
  assets.service.spec.ts
  dto/
```

All write operations and sensitive reads must be permission-protected.

---

## Summary

This design treats `Assets` as a foundational product layer for the next stage of AI generation, not just a storage screen.

It treats `Integrations` as an intentionally incomplete but strategically correct business connector surface.

It formalizes five critical rules for the project:

- design for user and AI together
- govern everything with permissions
- always follow project skills
- always follow project identity and components
- never expose the AI internal layer to the user
