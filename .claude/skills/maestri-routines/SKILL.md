---
name: maestri-routines
description: Schedule recurring commands and reminders on the Maestri canvas (cron-like). Use to automate standups, nightly audits, or periodic agent prompts. Requires Maestro terminal.
---

# Maestri Routines

**Maestro only.** Run `maestri routine list` before create/edit/delete.

## Schedules (pick one)

- `--every 30m` — interval (`45s`, `2h`, `1h30m`)
- `--daily 09:00`
- `--weekly mon,wed,fri@09:00`
- `--once "2026-07-11 09:00"`

## Targets

- *(default)* — this terminal
- `--terminal "Shell #2"` — another agent
- `--reminder` — desktop notification only

## Examples

```bash
maestri routine create "Dev health" \
  --command "curl -sf http://localhost:3001/api/health || echo API down" \
  --every 15m

maestri routine create "Standup" \
  --command "Time for standup — check todo-adryan note" \
  --weekly mon,tue,wed,thu,fri@09:00 --reminder
```

## Safety

- `routine delete` — **destructive; explicit user request only**
- `routine run "Name"` — test once immediately
- `--pre-run "script"` + `{{output}}` placeholder in `--command` for dynamic input

## Blister ideas

- Periodic `pnpm lint` on a recruit terminal
- Daily reminder to sync `graphify update .` after large refactors
