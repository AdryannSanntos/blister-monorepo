---
name: maestri-workspace
description: Create Maestri workspaces and floors from the CLI, including git-isolated experiment floors. Use when provisioning a new project canvas or isolating risky branch work. Requires Maestro terminal.
---

# Maestri Workspace Provisioning

**Maestro only.** No CLI delete/rename for workspaces — destructive actions stay in UI.

## Workspaces

```bash
maestri workspace list
maestri workspace create "Blister Feature X" --dir ~/path/to/repo --group "Blister"
maestri workspace move "Name" --folder "Archive"
```

- `--dir PATH` must exist (`git init` first if needed).
- `--from "Template Workspace"` clones canvas layout retargeted to new dir.

## Floors (within current workspace)

```bash
maestri floor list
maestri floor create "Carousel Experiment" --branch feat/carousel-agent-editor
maestri floor create "Scratch" --no-git
```

- Default: git-isolated clone when APFS/git supports it.
- Staff floor: `maestri recruit "Name" --floor "Carousel Experiment" --role "..."`

## Blister monorepo

Ground floor = main checkout. Use isolated floors for risky agent/carousel experiments without touching ground `node_modules` / DB assumptions.

## Related

- Recruit on floor → `maestri-manager`
- Merge floor branch → user action in Maestri UI (no CLI)
