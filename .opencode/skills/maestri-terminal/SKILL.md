---
name: maestri-terminal
description: Read and diagnose errors from connected Maestri terminals without sending prompts. Use when the user asks to check the terminal, analyze dev server errors, validate pnpm/npm/docker failures, or inspect Shell output on the canvas.
---

# Maestri Terminal Diagnostics

Read-only inspection of connected terminals. Prefer this over restarting `pnpm dev` blindly.

## Protocol

1. `maestri list` — find agent names (`Shell`, `Shell #2`, etc.)
2. `maestri check "Agent Name"` — capture current scrollback
3. Identify: exit code, `command not found`, TypeScript/build errors, port conflicts
4. Fix in repo; tell user to re-run OR delegate with `maestri ask` if appropriate

## Common patterns (Blister monorepo)

| Error | Likely fix |
|---|---|
| `trigger.dev: command not found` | Use `pnpm exec trigger dev` (binary is `trigger`, not `trigger.dev`) |
| `@company-os/api#dev exited` | Read `[api]` and `[trigger]` lines above in same output |
| Prisma / migration errors | `pnpm --dir apps/api prisma migrate status` |
| Port in use | Kill stale process or change `PORT` |

## When to skip

- User pasted the full error already
- You can reproduce with your own Shell in the same cwd

## Related

- Delegate fix to another agent → `maestri` (`ask`)
- After fix, verify in browser → `maestri-portal`
