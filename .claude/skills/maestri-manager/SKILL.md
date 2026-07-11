---
name: maestri-manager
description: Create connected agent terminals, assign roles, wire collaborators on the Maestri canvas. Use when assembling a team, recruiting reviewers, or Maestro Mode orchestration. Requires Maestro terminal.
---

# Maestri Team Orchestration

**Maestro only** for recruit/dismiss/connect/role commands.

## Reuse before recruiting

1. `maestri list` — if a teammate already fits the role, `maestri ask` instead of `recruit`.
2. Only recruit for genuinely missing personas.

## Core commands

- `maestri recruit "Codename" --role "Code Reviewer"` — spawn + auto-connect
- `maestri recruit "Name" --preset "Codex" --role "..."` — `maestri preset list` first
- `maestri recruit "Name" --floor "Experiment" --role "..."` — isolated git floor
- `maestri dismiss "Name"` — stop recruit (only connected agents)
- `maestri connect "A" "B"` — agent↔agent, note↔agent, agent↔portal

## Roles

- `maestri role list` / `create "Name" "Prompt"` / `assign "Recruit" "Role"`
- Bake into role prompts: run `maestri list` before delegating; name peers and shared notes.

## Workflow

1. `maestri list`
2. `maestri role list` → `role create` for gaps
3. `recruit` with codenames (not role names)
4. Optional `connect` for peer collaboration
5. Delegate: `maestri ask` or `maestri ask --batch`

## Blister team patterns

| Role | Typical task |
|---|---|
| Code Reviewer | Review diff; no direct edits |
| Frontend | `apps/web` UI |
| Backend | `apps/api` Nest/agents |
| QA | `maestri-portal` smoke on `/dashboard/*` |
