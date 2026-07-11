---
name: maestri-portal
description: Automate browser portals on the Maestri canvas — navigate, snapshot, click, fill forms, screenshots. Use when testing localhost UI, login flows, or verifying Blister web without Playwright MCP. Requires a connected portal or maestri portal create.
---

# Maestri Portal Browser Automation

Run `maestri list` for portal names (e.g. `Blister` → `http://localhost:3000`).

## Quick start

```bash
maestri portal snapshot "Portal Name"
maestri portal click "Portal Name" @e3
maestri portal fill "Portal Name" @e2 "user@example.com"
maestri portal key "Portal Name" "Enter"
```

Refs (`@e1`, `@e2`) come from `snapshot` — re-snapshot after navigation.

## Create / manage

- `maestri portal create http://localhost:3000 "Blister"` — desktop viewport
- `maestri portal create URL "Mobile" --size 390x844` — responsive QA
- `maestri portal edit "Name" --url URL`
- `maestri portal close "Name"` — **destructive; user must ask**

## Blister defaults

- Web: `http://localhost:3000`
- API/auth: `http://localhost:3001`
- Login route: `/auth/login`

## Workflow

1. `snapshot` → refs
2. Interact with refs (not coordinates)
3. `snapshot` again to verify
4. `portal logs-start` + `portal logs` for console errors

## Responsive

- `maestri portal resize "Portal" 390 844`
- `maestri portal ua "Portal" ios`

Prefer portal over Playwright MCP when a connected portal already exists on the canvas.
