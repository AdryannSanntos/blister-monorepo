---
description: "Gate Maestri: validar skill certa antes de terminal, portal, notas ou equipe no canvas."
---

# Maestri — skill gate

Se `maestri` estiver no PATH, leia **antes de agir**:

1. `.cursor/rules/maestri.mdc` — tabela de qual skill usar
2. O `SKILL.md` correspondente em `.claude/skills/maestri*/`

| Situação | Skill |
|---|---|
| Erro em terminal conectado | `maestri-terminal` |
| Pedir a outro agente | `maestri` |
| Notas sticky | `maestri-notes` |
| Testar UI no portal | `maestri-portal` |
| Montar equipe | `maestri-manager` |
| Workspace / floor | `maestri-workspace` |
| Rotina agendada | `maestri-routines` |

Sempre: `maestri list` primeiro.
