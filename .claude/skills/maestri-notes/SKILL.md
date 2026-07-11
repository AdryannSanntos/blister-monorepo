---
name: maestri-notes
description: Read and write connected sticky notes on the Maestri canvas. Use for todos, orchestrator notes, project context, or shared specs between agents. Read before maestri note read/write/edit/create.
---

# Maestri Sticky Notes

Run `maestri list` for exact note names (names may change when the first line edits).

## Commands

- `maestri note read "Note Name"` — full note with line numbers
- `maestri note read "Note Name" 10 20` — line range
- `maestri note write "Note Name" "content"` — replace entirely
- `maestri note edit "Note Name" "old" "new"` — substring replace (prefer over write)
- `maestri note create ["content"]` — new note linked to this terminal
- `maestri note delete "Note Name"` — **destructive; user must ask explicitly**

## Rules

- Prefer `edit` when note already has content.
- Re-run `maestri list` after writes that change the first line (auto-rename).
- Notes support markdown; changes appear on canvas in real time.
- Chained notes: `list` shows indented tree — read parent notes for full context.

## Blister project notes (examples)

Often connected: `todo-agent`, `todo-adryan`, `orchestrator-agent-maestr`, `how-the-project-works` — always confirm with `list`.
