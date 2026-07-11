---
name: maestri
description: Send messages to connected AI agents on the Maestri canvas and get their responses. Use when delegating to another agent, asking a teammate, or coordinating parallel work. Read before maestri ask or maestri check on another agent.
---

# Maestri Inter-Agent Communication

Run `maestri list` first for exact agent, note, and portal names.

## Commands

- `maestri list` — connected agents, notes, portals
- `maestri ask "Agent Name" "prompt"` — send prompt; wait for response
- `maestri ask --batch '{"A": "p1", "B": "p2"}'` — parallel asks; JSON array result
- `maestri ask "Agent Name" --raw "2\n"` — raw terminal input (menus, shell)
- `maestri check "Agent Name"` — read terminal output without prompting

CLI fallback: `"$MAESTRI_CLI"` if `maestri` not on PATH.

## Timeouts (Shell tool)

| Task | block_until_ms |
|---|---|
| Status / quick question | 60000 |
| Small focused change | 300000 |
| Review / multi-step | 600000 |
| Debug / investigation | 1200000 |

If timeout expires: **do not** re-send. Run `maestri check "Agent Name"` and wait again.

## Rules

- Never edit files another agent is actively modifying — wait or `check` first.
- Never interrupt an agent still working.
- Destructive note/portal actions only on explicit user request (see `maestri-notes`, `maestri-portal`).

## Related skills

- Terminal errors → `maestri-terminal`
- Sticky notes → `maestri-notes`
- Browser → `maestri-portal`
- Team spawn → `maestri-manager`
